<div align="center">

[🌏 **English**](README.en.md) &nbsp;|&nbsp; [🇨🇳 **中文**](README.md)

</div>

---

# SSH Remote Control MCP

基于 SSH Remote Control Skill 的核心能力，改造成可直接被 MCP 客户端调用的 stdio server。

## 功能

- `listConnections`：列出所有已保存的 SSH 远程连接
- `addConnection`：添加或管理 SSH 远程连接（自动打开 Web 管理页面，可在页面中添加；若提供完整连接信息也会直接保存）
- `setCurrentConnection`：切换当前活动的 SSH 连接
- `deleteConnection`：删除已保存的 SSH 连接
- `getConnectionContent`：读取连接的备注 / Markdown 内容
- `getConfigPath`：查看 SSH 连接配置文件路径
- `testConnection`：测试当前连接是否可认证
- `execCommand`：在远程服务器上执行 shell 命令
- `uploadPath`：上传本地文件到远程服务器（支持断点续传，返回传输统计）
- `downloadPath`：从远程服务器下载文件到本地（支持断点续传，返回传输统计）
- `openManager`：打开本地 Web 管理页面（页面支持文件上传/下载，实时显示传输进度与速度，可取消任务）

## 配置

配置文件默认保存在：

- Windows: `%USERPROFILE%\.ssh-remote-control-mcp\ssh_config.json`
- Linux/macOS: `~/.ssh-remote-control-mcp/ssh_config.json`

## MCP 客户端配置示例

### 1. 直接使用 npx（无需本地安装）

适合直接在支持 MCP 的客户端中快速接入：

```json
{
  "mcpServers": {
    "ssh-remote-control-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["ssh-remote-control-mcp@latest"],
      "env": {
        "SSH_REMOTE_CONTROL_PORT": "11889",
        "SSH_REMOTE_CONTROL_TIMEOUT": "-1"
      }
    }
  }
}
```

### 2. 指向本地项目目录（本地开发/调试）

```json
{
  "mcpServers": {
    "ssh-remote-control-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["D:/code/.../mcp/ssh-remote-control-mcp/index.js"],
      "env": {
        "SSH_REMOTE_CONTROL_PORT": "11889",
        "SSH_REMOTE_CONTROL_TIMEOUT": "-1"
      }
    }
  }
}
```

### 3. Claude Desktop 配置示例

```json
{
  "mcpServers": {
    "ssh-remote-control-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["D:/code/.../mcp/ssh-remote-control-mcp/index.js"],
      "env": {
        "SSH_REMOTE_CONTROL_PORT": "11889",
        "SSH_REMOTE_CONTROL_TIMEOUT": "-1"
      }
    }
  }
}
```

### 4. Cursor / Cherry Studio / 其他通用 MCP 客户端

```json
{
  "mcpServers": {
    "ssh-remote-control-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["ssh-remote-control-mcp@latest"],
      "env": {
        "SSH_REMOTE_CONTROL_PORT": "11889",
        "SSH_REMOTE_CONTROL_TIMEOUT": "-1"
      }
    }
  }
}
```

### 环境变量说明

| 环境变量 | 说明 |
|---|---|
| `SSH_REMOTE_CONTROL_CONFIG_PATH` | 可选，指定 SSH 连接配置文件路径；不设置时使用默认值 |
| `SSH_REMOTE_CONTROL_PORT` | 指定 Web 管理页面监听端口，默认 `11889` |
| `SSH_REMOTE_CONTROL_TIMEOUT` | 可选，全局操作超时（毫秒），作用于命令执行、文件上传与下载；设置为 `-1` 表示不限制超时，不设置时默认不限制 |

## 运行

```bash
cd mcp/ssh-remote-control-mcp
npm install
node index.js
```

启动后，服务会同时提供：

- MCP stdio 服务：供 MCP 客户端调用
- Web 管理页面：浏览器打开 http://127.0.0.1:11889/，可直接管理 SSH 连接配置
