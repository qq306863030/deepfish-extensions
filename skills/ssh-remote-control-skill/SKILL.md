---
name: ssh-remote-control-skill
description: >-
  Use when user mentions remote connection, remote operation, SSH, server, VPS,
  deploy, remote server login, remote command execution, SFTP, upload to server,
  download from server, or any scenario requiring SSH-based remote server management.
  NOT for local-only operations, Docker containers without SSH, or cloud API management.
---

# SSH Remote Control Skill

> 通过 SSH 协议对远程服务器进行全方位管理：连接管理、命令执行、文件上传/下载。

## 执行前自动检查依赖

> 调用前检测 `<skill所在目录>/scripts/node_modules` 是否存在，不存在则在"<skill所在目录>/scripts"目录下自动 `npm install`

## 核心原则

1. **添加远程连接必须通过 CLI 完成** — 禁止告诉用户"请手动执行 XX 命令"，必须通过 `node <skill所在目录>/scripts/index.js add_connection` 自动弹出交互式表单
2. **敏感信息不泄露** — 密码/私钥内容不出现在终端输出中，仅显示连接名和主机地址
3. **命令执行可设置超时** — 通过 `--timeout` 参数控制，默认不超时

## 执行入口

```bash
# 所有操作通过此命令执行（Skill 工作目录为 ssh-remote-control-skill/）
node <skill所在目录>/scripts/index.js <action> [--key value ...]
```

## 自动依赖检查

首次执行或依赖被删除时，工具会自动检测并安装，**无需手动操作**：

```bash
# 比如直接执行，依赖不存在时会自动 npm install
node <skill所在目录>/scripts/index.js list_connections
# ⚠️  检测到依赖未安装，正在自动执行 npm install...
# ✅ 依赖安装完成
# { "success": true, "data": { ... } }
```

## 命令参考

### 连接管理

| 命令 | 说明 |
|------|------|
| `node <skill所在目录>/scripts/index.js add_connection` | 交互式添加 SSH 连接（弹表单填写） |
| `node <skill所在目录>/scripts/index.js list_connections` | 列出所有保存的连接 |
| `node <skill所在目录>/scripts/index.js switch_connection --name <别名>` | 切换到指定连接 |
| `node <skill所在目录>/scripts/index.js delete_connection --name <别名>` | 删除指定连接 |
| `node <skill所在目录>/scripts/index.js set_current_interactive` | 交互式切换当前连接 |
| `node <skill所在目录>/scripts/index.js get_config_path` | 查看配置文件路径 |

### 远程操作（需先设置当前连接）

| 命令 | 说明 |
|------|------|
| `node <skill所在目录>/scripts/index.js test_connection` | 测试当前连接 SSH 认证是否可用 |
| `node <skill所在目录>/scripts/index.js exec_command --command "<命令>" [--cwd <目录>] [--timeout <毫秒>]` | 远程执行命令 |
| `node <skill所在目录>/scripts/index.js upload_path --localPath <本地路径> --remotePath <远程路径>` | 上传文件或目录 |
| `node <skill所在目录>/scripts/index.js download_path --remotePath <远程路径> --localPath <本地路径>` | 下载文件或目录 |

## 工作流程

### 1. 首次使用 — 添加连接

当用户没有配置过 SSH 连接时，**必须** 通过 CLI 添加：

```bash
# 脚本会自动检测 node_modules → 没有就自动 install → 弹出交互式表单
node <skill所在目录>/scripts/index.js add_connection
```

表单会依次提示输入：
1. 连接别名（name）
2. 主机地址（host）
3. SSH 端口（port，默认 22）
4. 登录账号（username）
5. 认证方式：密码 / 私钥
6. 密码 或 私钥路径（+ 可选 passphrase）

> ⚠️ **严禁** 告诉用户"请手动执行 XXXX" 或让用户自己处理安装依赖。
> Agent 必须直接执行命令完成所有操作，用户只需要提供连接信息。

### 2. 日常操作

#### 执行远程命令

```bash
# 基本用法
node <skill所在目录>/scripts/index.js exec_command --command "ls -la /root"

# 指定工作目录 + 超时
node <skill所在目录>/scripts/index.js exec_command --command "npm run build" --cwd /var/www/project --timeout 60000
```

#### 上传/下载文件

```bash
# 上传文件
node <skill所在目录>/scripts/index.js upload_path --localPath "C:/projects/dist" --remotePath "/var/www/html"

# 下载文件
node <skill所在目录>/scripts/index.js download_path --remotePath "/var/log/nginx/access.log" --localPath "D:/logs/"
```

### 3. 多服务器管理

```bash
# 查看所有连接
node <skill所在目录>/scripts/index.js list_connections

# 切换到目标服务器
node <skill所在目录>/scripts/index.js switch_connection --name prod-server

# 执行命令（在当前连接上执行）
node <skill所在目录>/scripts/index.js exec_command --command "systemctl status nginx"
```

## 配置存储

所有连接配置存储在 `~/.ssh-remote-control-skill/ssh_config.json`。
- 密码使用 AES 加密存储（密钥：`ROMAN-123`）
- 配置文件中不暴露明文密码
- 私钥内容不存储在配置中，只存路径

## 错误处理

所有操作统一输出 JSON 格式：

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "错误信息" }
```

常见错误自动诊断：
- **认证失败** → 提示检查用户名、公钥授权、passphrase
- **无法解析主机** → 检查 host 地址
- **连接被拒绝** → 检查端口和防火墙
- **连接超时** → 检查网络和安全组
- **私钥读取失败** → 检查私钥格式和 passphrase

## 注意事项

- `exec_command` 的 `--timeout` 默认不超时，根据需要自行设置
- `upload_path` / `download_path` 同时支持文件和目录
- 路径中的引号会被自动去除（用户粘贴路径时常见）
- 私钥路径支持绝对路径，不支持 `~` 缩写
- 切换连接后后续操作自动在新连接上执行
