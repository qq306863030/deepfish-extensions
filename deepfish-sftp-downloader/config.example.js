// SFTP 服务器配置文件示例
// 将此文件复制为 config.js 并修改配置信息
// 注意：此文件包含敏感信息，请妥善保管

module.exports = [
  {
    "id": "example-config-1",
    "name": "示例服务器1",
    "host": "sftp.example.com",
    "port": 22,
    "username": "your-username",
    "password": "your-password",
    "privateKey": "",
    "passphrase": "",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "example-config-2",
    "name": "示例服务器2",
    "host": "another-sftp.example.com",
    "port": 2222,
    "username": "another-user",
    "password": "",
    "privateKey": "/path/to/private/key",
    "passphrase": "key-password",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
];

// 使用说明：
// 1. 将此文件重命名为 config.js
// 2. 修改配置信息为实际的 SFTP 服务器信息
// 3. 可以通过 sftpDownload_manageConfig 函数交互式添加配置
// 4. 配置文件会自动被扩展工具读取和使用