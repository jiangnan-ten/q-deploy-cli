# 前端快速部署cli

## 使用
```
npm i q-deploy -g // 安装
```

```
q-deploy --help //查看详情
```

```bash
q-deploy init // 获取配置模板

module.exports = {
	privateKey: '', // 私钥地址(不填写根据用户名, 密码登录)
	buildScript: 'npm run build', // 打包执行的命令
	distPath: 'dist', // 打包文件本地路径
	env: {
		dev: {
			name: '测试环境',
			host: '',
			port: 80,
			password: '',
			username: '',
			webPath: '' // 服务器项目存放处
		},
		prod: {
			name: '生产环境',
			host: '',
			port: 80,
			password: '',
			username: '',
			webPath: '',
		}
	}
}

```

```bash
q-deploy deploy // 部署
q-deploy --build --env=dev/prod  // env 根据配置文件中的env字段
```