# SSH Remote Control Tool

[中文](./README.md) | **English**

## Introduction

The SSH Remote Control Tool is a custom Deepfish tool module that provides remote server management capabilities based on the SSH2 protocol. It supports multiple connection management, remote command execution, file upload/download, and is suitable for daily server operations, file transfer, remote debugging, and similar scenarios.

Core capabilities:

- **Connection management**: Add, switch, and delete SSH connections interactively. Supports both password and private key authentication.
- **Remote command execution**: Execute shell commands on remote servers and retrieve command output.
- **File transfer**: Upload or download a single file or an entire directory via SFTP with progress display.
- **Connection testing**: Quickly verify whether the current SSH connection is available, with detailed diagnostics for authentication failures.
- **Persistent configuration**: Store connection configurations in an encrypted local JSON file to help protect sensitive information.

## Module Structure

```
├── index.js          # Entry point, imports and exports all functions and descriptions
├── config-manager.js # Connection management functions (CRUD)
├── controller-ssh.js # SSH control functions (test, exec, upload, download)
└── normal.js         # Utility functions (encryption, config I/O, SSH/SFTP low-level impl, etc.)
```

## Tool List

### Connection Management Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `addConnection` | Add an SSH connection interactively and save to config | None |
| `setCurrentInteractive` | Set the current active SSH connection interactively | None |
| `listConnections` | List all saved connections | None |
| `deleteConnection` | Delete a specified connection | `name`: connection alias |
| `switchConnection` | Switch to a specified connection | `name`: connection alias |
| `getConfigPath` | Get the local configuration file path | None |

### SSH Control Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `testCurrentConnection` | Test whether the current SSH connection is available | None |
| `execCommand` | Execute a command on the remote server | `command`: command (required), `cwd`: working directory (optional), `timeout`: timeout in ms (optional) |
| `uploadFile` | Upload file or directory to remote server via SFTP | `localPath`: local path, `remotePath`: remote path |
| `downloadFile` | Download file or directory from remote server via SFTP | `remotePath`: remote path, `localPath`: local path |

## Quick Start

### Install Deepfish

```bash
npm install -g deepfish-ai
```

### Add the Tool

```bash
npm install -g @deepfish-ai/deepfish-ssh-remote-control
```

### Usage Examples

After adding the tool, you can invoke it directly in a Deepfish conversation using natural language:

> ai "Test whether the current SSH connection is working properly"

> ai "Run the `ls -la /root` command on the remote server"

> ai "Upload the local `C:\project\dist` directory to `/var/www` on the remote server"

> ai "Download `/var/log/nginx/access.log` from the remote server to local `D:\logs`"

> ai "Add a new SSH connection"

> ai "Switch to the connection named `prod`"