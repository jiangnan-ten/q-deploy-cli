module.exports = {
	privateKey: '',
	buildScript: 'npm run build',
	distPath: 'dist',
	env: {
		dev: {
			name: '测试环境',
			// buildScript: '', // dev环境打包命令, 没有走最外层buildScript
			host: '',
			port: 80,
			password: '',
			username: '',
			webPath: '' // 服务器项目存放处
		},
		prod: {
			name: '生产环境',
			// buildScript: 'npm run build:prod', // prod环境打包命令, 没有走最外buildScript
			host: '',
			port: 80,
			password: '',
			username: '',
			webPath: '',
		}
	}
}
