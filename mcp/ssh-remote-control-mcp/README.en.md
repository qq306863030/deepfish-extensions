<div align="center">

[🌏 **English**](README.en.md) &nbsp;|&nbsp; [🇨🇳 **中文**](README.md)

</div>

---

# SSH Remote Control MCP

An MCP (Model Context Protocol) server built on the core capabilities of the SSH Remote Control Skill, adapted into a stdio server that can be called directly by MCP clients.

## Features

- `getUsageRules`: Get the full usage rules, tool list, and task execution order of this MCP (read server notes before the task → run shell commands → update notes after the task)
- `listConnections`: List all saved SSH remote connections
- `addConnection`: Add or manage SSH remote connections (automatically opens the web management page; if full connection details are provided, they are saved directly as well)
- `setCurrentConnection`: Switch the current active SSH connection
- `deleteConnection`: Delete a saved SSH connection
- `getConnectionContent`: Read a connection's notes / Markdown content
- `setConnectionContent`: Append / update server notes (project directories, Docker containers, other notes). It reads the existing content first and merges by entry instead of overwriting
- `getConfigPath`: View the SSH connection config file path
- `testConnection`: Test whether the current connection can authenticate
- `execCommand`: Execute a shell command on the remote server
- `uploadPath`: Upload a local file to the remote server (supports resumable transfer, returns transfer statistics)
- `downloadPath`: Download a file from the remote server to local (supports resumable transfer, returns transfer statistics)
- `openManager`: Open the local web management page (supports file upload/download with real-time progress, speed display, and task cancellation)

## Usage Rules (Task Execution Order)

Every remote server operation must follow these three steps: **read the notes before the task → run shell commands → update the notes after the task**.

| Phase | Tool | Description |
|---|---|---|
| 0. Prepare | `listConnections` → `setCurrentConnection` → `testConnection` | Make sure the target server is the active connection; switch or test it when it is not ready, and use `addConnection` or `openManager` when no connection exists |
| 1. Before the task | `getConnectionContent` | **Read the server notes first** to learn about existing project directories, Docker containers, maintenance windows, forbidden operations, etc. Operating without reading the notes is considered a violation |
| 2. Execute | `execCommand`, `uploadPath`, `downloadPath` | Run shell commands with `execCommand` (preferably with `cwd` pointing to a project directory from the notes); confirm the current state with read-only commands before making changes; use the upload/download tools for file transfers |
| 3. After the task | `setConnectionContent` | Write newly added project directories, created or changed Docker containers, and new notes back to the server notes so they stay in sync with reality |

You can also call the `getUsageRules` tool at any time to get the full usage rules, tool list, and execution order directly inside the session.

### Notes

- Operating a remote server without reading its notes can easily modify the wrong directory or stop the wrong container.
- Before running destructive commands (`rm` / `kill` / `docker rm` / overwriting configs), verify the target with read-only commands first.
- Only record concise "location + purpose" information. Never store passwords, private keys, or tokens in the notes.
- If the notes become outdated after a task (a directory was migrated, a container was removed), fix them with `setConnectionContent` as well.

## Server Notes (content)

Each server's notes are stored as Markdown in the `content` field of its connection config, using the following structure:

```markdown
Demo server (one-line summary)

## Project Directories
- /srv/app: main website project
- /srv/api: API service

## Docker Containers
- nginx: gateway container

## Other Notes
- Restarts every Monday at 03:00
```

- `getConnectionContent`: read the notes (omit `name` for the active connection, pass `name` for a specific server).
- `setConnectionContent`: append / update the notes. It **reads the existing content first and merges by entry** instead of overwriting:

  - Project directories are deduplicated by path (trailing `/` or `\` is ignored), Docker containers by container name;
  - Existing entries are updated, new entries are appended, and anything not provided is left untouched;
  - `mode` defaults to `append` (merge); use `replace` only when a section must be rewritten on purpose.

Example call:

```json
{
  "name": "demo-server",
  "description": "Demo server",
  "projects": [{ "path": "/srv/app", "description": "main website project" }],
  "containers": [{ "name": "nginx", "description": "gateway container" }],
  "notes": ["Restarts every Monday at 03:00"]
}
```

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
