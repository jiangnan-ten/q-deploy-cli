#!/usr/bin/env node

const { program } = require('commander')
const chalk = require('chalk')
const semver = require('semver')
const spinner = require('ora')()
const package = require('../package.json')

function checkNodeVersion(wanted) {
	if (!semver.satisfies(process.version, wanted)) {
		console.log(
			chalk.red(
				'你的nodejs版本: ' +
					process.version +
					', 但是系统需要最低的版本是 ' +
					wanted +
					'.\n请升级你的nodejs版本.'
			)
		)
		process.exit(1)
	}
}

function main() {
	checkNodeVersion(package.engines.node)
}

program
	.name('q-deploy')
	.version(`前端快速部署cli, 当前版本 ${require('../package').version}`)
	.usage('<command> [options]')

program
	.command('init')
	.description('获取部署模板')
	.action(() => {
		require('../lib/init')()
	})

program
	.command('deploy')
	.description('部署环境')
	.option('-e --env <env>', '部署环境', '')
	.option('--build', '先编译再部署')
	.action(cmd => {
		let Deploy = require('../lib/deploy')
		new Deploy({ ...cleanArgs(cmd) })
	})

program.on('command:*', function(operands) {
	program.outputHelp()
	console.log()
	console.log(
		`  ` + chalk.red(`无此命令 ${chalk.yellow(operands[0])}, 输错了吧? 😂`)
	)
	console.log()
})

program.on('--help', () => {
	console.log()
	console.log(`  运行 ${chalk.cyan(`q-deploy <command> --help`)} 获取详情`)
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
	program.outputHelp()
}

function camelize(str) {
	return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ''))
}

function cleanArgs(cmd) {
	const args = {}
	cmd.options.forEach(o => {
		const key = camelize(o.long.replace(/^--/, ''))
		if (typeof cmd[key] !== 'function' && typeof cmd[key] !== 'undefined') {
			args[key] = cmd[key]
		}
	})
	return args
}
