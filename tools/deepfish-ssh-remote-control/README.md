# SSH 远程控制工具

**中文** | [English](./README.en.md)

## 功能介绍

SSH 远程控制工具是 Deepfish 的自定义工具模块，提供基于 SSH2 协议的远程服务器管理能力。支持多连接管理、远程命令执行、文件上传/下载等功能，适用于日常服务器运维、文件传输、远程调试等场景。

核心能力：

- **连接管理**：支持交互式新增、切换、删除 SSH 连接，支持密码和私钥两种认证方式
- **远程命令执行**：在远程服务器上执行 Shell 命令并获取输出
- **文件传输**：通过 SFTP 协议支持上传/下载单个文件或整个目录，带进度显示
- **连接测试**：快速验证 SSH 连接是否可用，认证失败时提供详细诊断信息
- **配置持久化**：连接配置加密存储于本地 JSON 文件，敏感信息不泄露

## 模块结构

```
├── index.js          # 入口文件，导入并导出所有函数和描述
├── config-manager.js # 连接管理主函数（增删改查）
├── controller-ssh.js # SSH 控制主函数（测试、执行、上传、下载）
└── normal.js         # 工具函数（加解密、配置读写、SSH/SFTP 底层实现等）
```

## 工具清单

### 连接管理函数

| 函数名 | 描述 | 参数 |
|--------|------|------|
| `addConnection` | 交互式新增 SSH 连接并保存到配置文件 | 无 |
| `setCurrentInteractive` | 交互式设置当前活跃的 SSH 连接 | 无 |
| `listConnections` | 列出所有已保存的连接 | 无 |
| `deleteConnection` | 删除指定连接 | `name`: 连接别名 |
| `switchConnection` | 切换到指定连接 | `name`: 连接别名 |
| `getConfigPath` | 获取本地配置文件路径 | 无 |

### SSH 控制函数

| 函数名 | 描述 | 参数 |
|--------|------|------|
| `testCurrentConnection` | 测试当前 SSH 连接是否可用 | 无 |
| `execCommand` | 在远程服务器执行命令 | `command`: 命令（必填），`cwd`: 工作目录（可选），`timeout`: 超时毫秒数（可选） |
| `uploadFile` | 通过 SFTP 协议上传文件或目录到远程服务器 | `localPath`: 本地路径，`remotePath`: 远程路径 |
| `downloadFile` | 通过 SFTP 协议从远程服务器下载文件或目录 | `remotePath`: 远程路径，`localPath`: 本地路径 |

## 快速开始

### 安装 Deepfish

```bash
npm install -g deepfish-ai
```

### 添加工具

```bash
npm install -g @deepfish-ai/deepfish-ssh-remote-control
```

### 使用示例

添加完成后，在 Deepfish 对话中直接使用自然语言调用：

>ai "帮我测试一下当前的 SSH 连接是否正常"

>ai "在远程服务器上执行 `ls -la /root` 命令"

>ai "把本地的 `C:\project\dist` 目录上传到远程服务器的 `/var/www`"

>ai "从远程服务器下载 `/var/log/nginx/access.log` 到本地 `D:\logs`"

>ai "新增一个 SSH 连接"

>ai "切换到名称为 `prod` 的连接"
