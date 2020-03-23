const fsPromises = require('fs').promises
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const requireFromString = require('require-from-string')
const inquirer = require('inquirer')
const execa = require('execa')
const spinner = require('ora')()
const nodeSsh = require('node-ssh')
const readline = require('readline')
const axios = require('axios')
const spawn = require('cross-spawn')
const semver = require('semver')
const packagec = require('../package.json')

const exit = (sign = 1) => process.exit(sign)

class Deploy {
	constructor({ env, build }) {
		this.parsedConfig = null
		this.config = null
		this.env = env // 部署环境
		this.needBuild = build // 先打包再部署?

		this.clearConsole()
		this.run()
	}

	checkUpgrade() {
		return new Promise((resolve, reject) => {
			return axios
				.get('https://registry.npmjs.org/q-deploy', { timeout: 5000 })
				.then(res => {
					const { status, data } = res
					if (status != 200) {
						throw new Error()
					}

					let distTags = data['dist-tags']['latest']

					console.log('')

					if (!semver.lt(packagec.version, distTags)) {
						spinner.stopAndPersist({
							symbol: chalk.green('✔'),
							text: '当前版本最新, 无需更新',
							prefixText: '  '
						})

						return resolve('success')
					} else {
						spinner.stop()
						this.logWithSpin('发现新版本, 升级中...', '🚁')
						console.log()
						let updateCmd = spawn.sync('npm', ['install', 'q-deploy', '-g'], {
							stdio: 'inherit'
						})
						if (updateCmd.status == 0) {
							spinner.stopAndPersist({
								symbol: chalk.red('✔'),
								text: '升级成功',
								prefixText: ''
							})

							return resolve('success')
						} else {
							throw new Error(updateCmd)
						}
					}
				})
				.catch(err => {
					console.log(chalk.red(err))
					console.log('')
					spinner.stopAndPersist({
						symbol: chalk.red('x'),
						text: '版本升级失败',
						prefixText: '  '
					})
					return reject('版本升级失败')
				})
		})
	}

	async run() {
		this.logWithSpin('版本升级检查中...', '🚁')

		let status = await this.checkUpgrade()
		if (status != 'success') {
			this.logErr('版本升级失败')
		}
		await this.readConfig()
		let chosenEnv
		try {
			if (this.env) {
				chosenEnv = this.config.env[this.env]
				if (!chosenEnv) {
					throw new Error()
				}
			}
		} catch (error) {
			this.logErr(
				chalk.red(
					`找不到环境: ${chalk.yellow(
						this.env
					)}, 请确保配置文件中存在改环境的配置`
				),
				true
			)
		}

		let parsedConfig = await this.prompts()

		this.parsedConfig = Object.assign(
			{},
			{ env: chosenEnv, needBuild: this.needBuild },
			parsedConfig
		)

		if (this.parsedConfig.needBuild) {
			await this.buildProject()
		}

		try {
			fs.accessSync(path.resolve(this.config.distPath), fs.constants.F_OK)
		} catch (error) {
			this.logErr('本地不存在打包文件, 请先打包, 再上传')
		}

		await this.sshConnet()
	}

	logErr(msg, customMsg = false, isExit = true, sign = '❗') {
		console.log(`${sign} ${!customMsg ? chalk.red(msg) : msg}`)
		isExit && exit()
	}

	logWithSpin(message, symbol) {
		spinner.text = message
		spinner.prefixText = symbol
		spinner.start()
	}

	clearConsole() {
		if (process.stdout.isTTY) {
			const blank = '\n'.repeat(process.stdout.rows)
			console.log(blank)
			readline.cursorTo(process.stdout, 0, 0)
			readline.clearScreenDown(process.stdout)
		}
	}

	// 读取配置
	async readConfig() {
		return fsPromises
			.readFile(Deploy.configFile, { encoding: 'utf-8' })
			.then(data => {
				let config = requireFromString(data)
				this.config = config.default || config

				return Promise.resolve()
			})
			.catch(() => {
				this.logErr(
					`${chalk.red(`配置文件 ${chalk.yellow('deploy.conf.js')} 不存在`)}`,
					true,
					false
				)
				console.log(`👉 执行 ${chalk.cyan('q-deploy init')} 获取配置模板`)
				exit()
			})
	}

	// 获取命令行response
	async prompts() {
		const questions = []
		if (this.needBuild == undefined) {
			questions.push({
				type: 'confirm',
				name: 'needBuild',
				message: '部署前是否需要打包项目?',
				default: true
			})
		}

		if (!this.env) {
			let choices = []
			try {
				for (let [k, v] of Object.entries(this.config.env)) {
					choices.push({
						name: v.name ? v.name : k,
						value: v
					})
				}
			} catch {
				this.logErr('配置文件, env环境参数不正确')
			}

			if (!choices.length) {
				this.logErr('配置文件, 缺失env环境参数')
			}

			questions.push({
				type: 'list',
				name: 'env',
				message: '选择部署环境',
				choices
			})
		}

		return inquirer
			.prompt(questions)
			.then(res => {
				return Promise.resolve(res)
			})
			.catch(err => {})
	}

	// 项目编译
	buildProject() {
		return new Promise(async resolve => {
			let npmScript = this.config.buildScript
			if (!npmScript) {
				this.logErr('打包命令缺失')
			}

			this.logWithSpin('项目打包中...', '📦')

			try {
				let res = await execa.command(npmScript, { cwd: process.cwd() })
				console.log(chalk.cyan(res.stdout))
			} catch (error) {
				console.log('')
				this.logErr(chalk.yellow(error.message), true, false)
				console.log('')
				this.logErr(chalk.red('打包失败, 部署终止'), true, true, '⛔')
			}

			spinner.stopAndPersist({
				symbol: chalk.green('✔'),
				text: '打包成功',
				prefixText: '   '
			})

			console.log('')

			return resolve()
		})
	}

	// 连接服务器
		async sshConnet() {
		const ssh = new nodeSsh()
		const { env } = this.parsedConfig
		const { privateKey, distPath } = this.config

		this.logWithSpin('连接远程服务器中...', '🚚')
		console.log()

		try {
			let params = {
				host: env.host,
				port: env.port,
				username: env.username
			}
			if (privateKey) {
				params.privateKey = privateKey
			} else if (env.password) {
				params.password = env.password
			} else {
				throw new Error('配置文件请填写privateKey或password')
			}
			await ssh.connect(params)
		} catch (error) {
			console.log(chalk.red(error))
			this.logErr('连接服务器失败')
		}

		spinner.stopAndPersist({
			symbol: chalk.green('✔'),
			text: '连接服务器成功',
			prefixText: '  '
		})

		console.log('')
		this.logWithSpin('上传打包文件中...', '🚀')

		const failed = []
		const successful = []

		let status = await ssh.putDirectory(path.resolve(distPath), env.webPath, {
			recursive: true,
			concurrency: 4,
			tick(localPath, remotePath, error) {
				if (error) {
					failed.push(localPath)
				} else {
					successful.push(localPath)
				}
			}
		})

		console.log('')
		console.log(chalk.green(`     上传成功文件数: ${successful.length}`))
		console.log(chalk.red(`     上传失败文件数: ${failed.length}`))
		spinner.stopAndPersist({
			symbol: status ? chalk.green('✔') : chalk.red('x'),
			text: status ? chalk.green('上传成功') : chalk.red('上传失败'),
			prefixText: '  '
		})

		ssh.dispose()

		if (failed.length) {
			this.logErr('部署失败')
		}

		this.end()
	}

	end() {
		console.log('')
		this.logErr(chalk.green('恭喜你, 部署完成!!!'), true, true, '🎉')
	}
}

Deploy.configFile = path.resolve(process.cwd(), 'deploy.conf.js')

module.exports = Deploy