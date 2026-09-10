<div align="center">

[🌏 **English**](README.en.md) &nbsp;|&nbsp; [🇨🇳 **中文**](README.md)

</div>

---

# SSH Remote Control MCP

基于 SSH Remote Control Skill 的核心能力，改造成可直接被 MCP 客户端调用的 stdio server。

## 功能

- `getUsageRules`：获取本 MCP 的完整使用规则、工具清单与任务执行顺序说明（任务前读备注 → 执行 shell 命令 → 任务后更新备注）
- `listConnections`：列出所有已保存的 SSH 远程连接
- `addConnection`：添加或管理 SSH 远程连接（自动打开 Web 管理页面，可在页面中添加；若提供完整连接信息也会直接保存）
- `setCurrentConnection`：切换当前活动的 SSH 连接
- `deleteConnection`：删除已保存的 SSH 连接
- `getConnectionContent`：读取连接的备注 / Markdown 内容
- `setConnectionContent`：追加 / 更新服务器备注（项目目录、Docker 容器、其他说明），先读取已有内容再按条目合并，不会直接覆盖
- `getConfigPath`：查看 SSH 连接配置文件路径
- `testConnection`：测试当前连接是否可认证
- `execCommand`：在远程服务器上执行 shell 命令
- `uploadPath`：上传本地文件到远程服务器（支持断点续传，返回传输统计）
- `downloadPath`：从远程服务器下载文件到本地（支持断点续传，返回传输统计）
- `openManager`：打开本地 Web 管理页面（页面支持文件上传/下载，实时显示传输进度与速度，可取消任务）

## 使用规则（任务执行顺序）

每次操作远程服务器都必须遵循 **「任务前读备注 → 执行 shell 命令 → 任务后更新备注」** 三步：

| 阶段 | 工具 | 说明 |
|---|---|---|
| 0. 准备 | `listConnections` → `setCurrentConnection` → `testConnection` | 确认目标服务器是当前活动连接；连接未就绪时先切换/测试，没有连接时用 `addConnection` 或 `openManager` 添加 |
| 1. 任务前 | `getConnectionContent` | **先读取服务器备注**，了解已有的项目目录、Docker 容器、维护窗口、禁用操作等；未读备注直接操作视为违规 |
| 2. 执行 | `execCommand`、`uploadPath`、`downloadPath` | 用 `execCommand` 执行 shell 命令（尽量带 `cwd` 指向备注中记录的项目目录），先只读命令确认现状再执行变更；需要传文件时使用上传/下载工具 |
| 3. 任务后 | `setConnectionContent` | 把新增的项目目录、新建或变更的 Docker 容器、新的注意事项写回备注，保持备注与实际一致 |

也可以随时调用 `getUsageRules` 工具，在会话内获取完整的使用规则、工具清单与执行顺序说明。

### 注意事项

- 未读备注就操作远程服务器，容易误改目录、误停容器。
- 变更类命令（`rm` / `kill` / `docker rm` / 覆盖配置等）执行前，先用只读命令核对目标。
- 备注只记录「位置 + 用途」这类简洁信息，不记录账号密码、私钥、Token 等敏感信息。
- 任务结束后若发现备注过时（目录已迁移、容器已下线），同样用 `setConnectionContent` 修正。

## 服务器备注（content）

每台服务器的备注以 Markdown 保存在连接配置的 `content` 字段中，约定结构如下：

```markdown
示例服务器（一句话简介）

## 项目目录
- /srv/app：主站项目
- /srv/api：接口服务

## Docker 容器
- nginx：网关容器

## 其他说明
- 每周一凌晨 3 点重启
```

- `getConnectionContent`：读取备注（不传 `name` 读当前连接，传 `name` 读指定服务器）。
- `setConnectionContent`：追加 / 更新备注。会**先读取已有内容再按条目合并**，而非直接覆盖：

  - 项目目录按路径去重（忽略路径末尾 `/`、`\` 差异），Docker 容器按容器名去重；
  - 已存在的条目更新说明，不存在的条目追加，未传入的部分原样保留；
  - `mode` 默认 `append`（合并），仅当明确需要重写某个小节时才使用 `replace`。

调用示例：

```json
{
  "name": "demo-server",
  "description": "示例服务器",
  "projects": [{ "path": "/srv/app", "description": "主站项目" }],
  "containers": [{ "name": "nginx", "description": "网关容器" }],
  "notes": ["每周一凌晨 3 点重启"]
}
```

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
