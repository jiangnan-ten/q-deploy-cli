const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const spinner = require('ora')()

const exit = (sign = 1) => process.exit(sign)

function main() {
	fs.access(path.resolve('deploy.conf.js'), fs.constants.F_OK, err => {
		if (err) {
			copyConf()
		} else {
			console.log(
				chalk.red(
					`❗ 本地已存在 ${chalk.yellow('deploy.conf.js')} 无需重复下载`
				)
			)
			exit()
		}
	})
}

function logWithSpin(message, symbol) {
	spinner.text = message
	spinner.prefixText = symbol
	spinner.start()
}

function copyConf() {
	const configPath = path.resolve(__dirname, '../template/deploy.conf.js')
	const destPath = path.resolve(process.cwd(), 'deploy.conf.js')
	console.log('')
	logWithSpin('获取配置模板中...', '📗')
	console.log('')
	fs.readFile(configPath, 'utf8', (err, data) => {
		if (err) {
			spinner.stopAndPersist({
				symbol: chalk.red('x'),
				text: '读取配置文件出错',
				prefixText: '  '
			})
			exit()
		}

		fs.writeFile(destPath, data, err => {
			if (err) {
				spinner.stopAndPersist({
					symbol: chalk.red('x'),
					text: '写入配置文件出错',
					prefixText: '  '
				})
				exit()
			}

			spinner.stopAndPersist({
				symbol: chalk.green('✔'),
				text: '配置模板获取成功',
				prefixText: '  '
			})
			exit()
		})
	})
}

module.exports = main
