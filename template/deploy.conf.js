module.exports = {
  privateKey: '',
  buildScript: 'npm run build',
  distPath: 'dist',
	env: {
		dev: {
			host: '',
      port: 80,
      username: 'platform_user',
      webPath: '' // 服务器项目存放处
    },
    prod: {
      host: '',
      port: 80,
      username: 'platform_user',
      webPath: ''
    }
	}
}
