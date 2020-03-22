#!/usr/bin/env node

const fsPromises = require('fs').promises
const path = require('path')
const chalk = require('chalk')
const emoji = require('node-emoji')
const requireFromString = require('require-from-string')
const inquirer = require('inquirer')
const spinner = require('ora')()
const childProcess = require('child_process')

const exit = (sign = 1) => process.exit(sign)

module.exports = class Deploy {
	static configFile = path.resolve(__dirname, '..', 'deploy.conf.js')

	config = null
	parsedConfig = null

	constructor({ env, build }) {
		this.env = env // 部署环境
		this.needBuild = build // 先编译再部署?

		this.run()
	}

	async run() {
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
			this.buildProject()
		}
	}

	logErr(
		msg,
		customMsg = false,
		sign = 'heavy_exclamation_mark',
		isExit = true
	) {
		console.log(`${emoji.get(sign)} ${!customMsg ? chalk.red(msg) : msg}`)
		isExit && exit()
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
					true
				)
				console.log(
					`${emoji.get('point_right')} 执行 ${chalk.cyan(
						'q-deploy init'
					)} 获取配置模板`
				)
				exit()
			})
	}

	// 获取命令行response
	async prompts() {
		const questions = []
		if (!this.needBuild) {
			questions.push({
				type: 'confirm',
				name: 'needBuild',
				message: '部署前是否需要编译项目?',
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

	buildProject() {
		let npmScript = this.config.buildScript
		if (!npmScript) {
			this.logErr('编译命令缺失')
		}

		spinner.text = '项目编译中...'
		spinner.prefixText = emoji.get('package')
		spinner.start()
		childProcess.execSync(npmScript, { cwd: process.cwd() })
		spinner.stop()
	}

	upload() {}

	reload() {}
}
