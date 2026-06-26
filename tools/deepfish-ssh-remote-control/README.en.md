# SSH Remote Control Tool

[中文](./README.md) | **English**

## Introduction

The SSH Remote Control Tool is a custom Deepfish tool module that provides remote server management capabilities based on the SSH2 protocol. It supports multiple connection management, remote command execution, file upload/download, and is suitable for daily server operations, file transfer, remote debugging, and similar scenarios.

Core capabilities:

- **Connection management**: Add, switch, and delete SSH connections interactively. Supports both password and private key authentication.
- **Remote command execution**: Execute shell commands on remote servers and retrieve command output.
- **File transfer**: Upload or download a single file or an entire directory with progress display.
- **Connection testing**: Quickly verify whether the current SSH connection is available, with detailed diagnostics for authentication failures.
- **Persistent configuration**: Store connection configurations in an encrypted local JSON file to help protect sensitive information.

## Tool List

| Function | Description |
|----------|-------------|
| `sshRemoteControl` | Main SSH remote control function. Operation types are selected by the `action` parameter. |

### Supported Actions

| action | Description |
|--------|-------------|
| `init` | Initialize or read the current SSH connection |
| `test_connection` | Test whether the current SSH connection is available |
| `list_connections` | List all saved connections |
| `get_config_path` | Get the local configuration file path |
| `add_connection` | Add an SSH connection interactively |
| `set_current_interactive` | Set the current connection interactively |
| `switch_connection` | Switch to a specified connection |
| `delete_connection` | Delete a specified connection |
| `exec_command` | Execute a command on the remote server |
| `upload_path` | Upload a file or directory to the remote server |
| `download_path` | Download a file or directory from the remote server |

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