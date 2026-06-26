# SSH 远程控制工具

**中文** | [English](./README.en.md)

## 功能介绍

SSH 远程控制工具是 Deepfish 的自定义工具模块，提供基于 SSH2 协议的远程服务器管理能力。支持多连接管理、远程命令执行、文件上传/下载等功能，适用于日常服务器运维、文件传输、远程调试等场景。

核心能力：

- **连接管理**：支持交互式新增、切换、删除 SSH 连接，支持密码和私钥两种认证方式
- **远程命令执行**：在远程服务器上执行 Shell 命令并获取输出
- **文件传输**：支持上传/下载单个文件或整个目录，带进度显示
- **连接测试**：快速验证 SSH 连接是否可用，认证失败时提供详细诊断信息
- **配置持久化**：连接配置加密存储于本地 JSON 文件，敏感信息不泄露

## 工具清单

| 函数名 | 描述 |
|--------|------|
| `sshRemoteControl` | SSH 远程控制主函数，通过 `action` 参数区分操作类型 |

### 支持的操作类型

| action | 描述 |
|--------|------|
| `init` | 初始化或读取当前 SSH 连接 |
| `test_connection` | 测试当前 SSH 连接是否可用 |
| `list_connections` | 列出所有已保存的连接 |
| `get_config_path` | 获取本地配置文件路径 |
| `add_connection` | 交互式新增 SSH 连接 |
| `set_current_interactive` | 交互式设置当前连接 |
| `switch_connection` | 切换到指定连接 |
| `delete_connection` | 删除指定连接 |
| `exec_command` | 在远程服务器执行命令 |
| `upload_path` | 上传文件或目录到远程服务器 |
| `download_path` | 从远程服务器下载文件或目录 |

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
