module.exports = {
  privateKey: '',
  buildScript: 'npm run build',
  distPath: 'dist',
	env: {
		dev: {
      name: '测试环境',
			host: '',
      port: 80,
      username: 'platform_user',
      webPath: '' // 服务器项目存放处
    },
    prod: {
      name: '生产环境',
      host: '',
      port: 80,
      username: 'platform_user',
      webPath: ''
    }
	}
}
