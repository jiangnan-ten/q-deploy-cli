const { program } = require('commander')
const chalk = require('chalk')
const emoji = require('node-emoji')

program
	.name('q-deploy')
	.version(`飞天部署, 当前版本 ${require('../package').version}`)
	.usage('<command> [options]')

program
	.command('init')
	.description('获取部署模板')
	.action(() => {})

program
	.command('deploy')
	.description('部署环境')
	.option('-e --env <env>', '部署环境', '')
	.option('--build', '先编译再部署', false)
	.action(cmd => {
		let Deploy = require('../lib/deploy')
		new Deploy({ ...cleanArgs(cmd) })
	})

program.on('command:*', function(operands) {
	program.outputHelp()
	console.log()
	console.log(
		`  ` +
			chalk.red(
				`无此命令 ${chalk.yellow(operands[0])}, 输错了吧? ${emoji.get(
					'stuck_out_tongue_winking_eye'
				)}`
			)
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
