<div align="center">

[🌏 **English**](README.en.md) &nbsp;|&nbsp; [🇨🇳 **中文**](README.md)

</div>

---

# SSH Remote Control MCP

An MCP (Model Context Protocol) server built on the core capabilities of the SSH Remote Control Skill, adapted into a stdio server that can be called directly by MCP clients.

## Features

- `listConnections`: List all saved SSH remote connections
- `addConnection`: Add or manage SSH remote connections (automatically opens the web management page; if full connection details are provided, they are saved directly as well)
- `setCurrentConnection`: Switch the current active SSH connection
- `deleteConnection`: Delete a saved SSH connection
- `getConnectionContent`: Read a connection's notes / Markdown content
- `getConfigPath`: View the SSH connection config file path
- `testConnection`: Test whether the current connection can authenticate
- `execCommand`: Execute a shell command on the remote server
- `uploadPath`: Upload a local file to the remote server (supports resumable transfer, returns transfer statistics)
- `downloadPath`: Download a file from the remote server to local (supports resumable transfer, returns transfer statistics)
- `openManager`: Open the local web management page (supports file upload/download with real-time progress, speed display, and task cancellation)

## Configuration

The config file is saved by default at:

- Windows: `%USERPROFILE%\.ssh-remote-control-mcp\ssh_config.json`
- Linux/macOS: `~/.ssh-remote-control-mcp/ssh_config.json`

## MCP Client Configuration Examples

### 1. Use npx directly (no local install)

Suitable for quickly connecting in any MCP-capable client:

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

### 2. Point to a local project directory (local development / debugging)

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

### 3. Claude Desktop configuration example

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

### 4. Cursor / Cherry Studio / other generic MCP clients

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

### Environment Variables

| Environment Variable | Description |
|---|---|
| `SSH_REMOTE_CONTROL_CONFIG_PATH` | Optional. Specifies the SSH connection config file path; uses the default when not set |
| `SSH_REMOTE_CONTROL_PORT` | Specifies the web management page listening port, default `11889` |
| `SSH_REMOTE_CONTROL_TIMEOUT` | Optional. Global operation timeout in milliseconds for command execution, file upload and download. Set to `-1` for no timeout limit; defaults to no limit when not set |

## Running

```bash
cd mcp/ssh-remote-control-mcp
npm install
node index.js
```

After startup, the service provides both:

- MCP stdio service: for MCP clients to call
- Web management page: open http://127.0.0.1:11889/ in a browser to manage SSH connection configs directly
