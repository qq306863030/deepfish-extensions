# DeepFish SFTP Download Extension

**English** | [中文](./README_CN.md)

## Overview

The DeepFish SFTP Download Extension is a specialized tool designed for DeepFish AI workflows, providing functionality to download files and directories from SFTP servers. This extension supports recursive directory downloads, real-time progress display, concurrent download control, and real-time status output including downloaded file count, total files, download speed, and more. The extension now includes configuration management features, allowing users to save multiple SFTP server configurations for easy reuse.

### Core Value
- **Automated File Transfer**: Automatically retrieve required files from SFTP servers within AI workflows
- **Configuration Management**: Save multiple SFTP server configurations for easy reuse and quick switching
- **Interactive Operation**: Support interactive Q&A mode for parameter input, simplifying the usage process
- **Real-time Progress Feedback**: Uses `process.stdout.write` to display real-time download progress for monitoring long-running tasks
- **Recursive Directory Download**: Supports downloading entire directory structures while maintaining original file hierarchy
- **Error Handling & Retry**: Robust error handling mechanisms ensure download task reliability
- **Concurrent Download Control**: Configurable concurrency settings optimize download performance

### Use Cases
- Batch downloading training data from remote servers
- File retrieval in automated deployment pipelines
- Regular backup of remote files to local storage
- Scenarios requiring remote resource access in AI workflows
- Managing multiple SFTP server connections

## Quick Start

### Installation Steps

1. **Install deepfish-ai global library** (if not already installed):
   ```bash
   npm install deepfish-ai -g
   ```

2. **Install SFTP Download Extension**:
   ```bash
   npm install deepfish-sftp-downloader -g
   ```

3. **Dependencies**:
   This extension depends on the `ssh2-sftp-client` library, which will be installed automatically.

## Function List & Description

### `sftpDownload_downloadFiles`
**Function Description**: Download files or directories from an SFTP server

**Core Features**:
- Connect to specified SFTP servers
- Support both password and private key authentication methods
- Download individual files or entire directories (recursive)
- Real-time display of download progress, file counts, and speed
- Concurrent download control support
- Automatic creation of local directory structure

**Parameter Description**:
- `host`: SFTP server host address (required)
- `port`: SFTP server port, defaults to 22
- `username`: SFTP server username (required)
- `password`: SFTP server password (optional, use with private key)
- `remotePath`: File or directory path on the remote server (required)
- `localPath`: Local save path (required)
- `privateKey`: Private key path (optional)
- `passphrase`: Private key passphrase (optional)
- `recursive`: Whether to download directories recursively, defaults to true
- `concurrency`: Number of concurrent downloads, defaults to 5

**Output Format**:
- Real-time progress display: Uses `process.stdout.write` with format: `Progress: 45% | Downloaded: 9/20 | Speed: 2.34 files/sec | Current: filename.txt`
- Function return value: JSON object containing download results

### `sftpDownload_manageConfig`
**Function Description**: Manage SFTP server configurations

**Core Features**:
- Add new SFTP server configurations (through interactive Q&A)
- View all saved configurations
- Select from multiple configurations to use
- Configuration information saved in `config.js` file

**Parameter Description**:
- `action`: Operation type, options: `add` (add configuration), `list` (view configurations), `select` (select configuration), defaults to `select`
- `configName`: Configuration name (used when adding configuration)

**Configuration Information**:
Configuration information includes: server address, port, username, password, private key path, etc. Does not include download directory information.

### `sftpDownload_interactiveDownload`
**Function Description**: Interactive SFTP download

**Core Features**:
- Obtain all necessary parameters through interactive Q&A
- Support selecting server from saved configurations
- Suitable for manual operation scenarios

**Parameter Description**:
- `useConfig`: Whether to use saved configurations, defaults to true

### `sftpDownload_smartDownload`
**Function Description**: Smart SFTP download

**Core Features**:
- Automatically detect missing required parameters
- If parameters are missing, obtain them through interactive Q&A
- Support selecting server from saved configurations
- Compatible with original calling methods

**Parameter Description**:
- All parameters are optional, if missing they will be obtained interactively
- `useConfig`: Whether to use saved configurations, defaults to true

## Configuration Management

### Configuration File
- **Location**: `config.js` (same directory as extension file)
- **Format**: `module.exports = [configuration array]`
- **Content**: Array containing multiple SFTP server configuration objects

### Configuration Object Structure
```javascript
{
  "id": "unique identifier",
  "name": "configuration name",
  "host": "server address",
  "port": 22,
  "username": "username",
  "password": "password",
  "privateKey": "private key path",
  "passphrase": "private key passphrase",
  "createdAt": "creation time"
}
```

### Usage Flow
1. **First Use**: Add configurations through `sftpDownload_manageConfig` function
2. **Subsequent Use**: Directly select from saved configurations
3. **Multi-configuration Management**: Support saving multiple server configurations for easy switching

## Usage Examples

### Example 1: Basic Download (Traditional Method)
```javascript
// Call extension function through AI workflow
const result = await this.aiCli.Tools.executeExtensionFunction(
  'sftpDownload_downloadFiles',
  {
    host: 'sftp.example.com',
    port: 22,
    username: 'user',
    password: 'password',
    remotePath: '/remote/data/files',
    localPath: './downloads',
    recursive: true,
    concurrency: 5
  }
);
```

### Example 2: Configuration Management
```javascript
// Add new configuration
const config = await this.aiCli.Tools.executeExtensionFunction(
  'sftpDownload_manageConfig',
  {
    action: 'add',
    configName: 'My Server'
  }
);

// Select configuration
const selectedConfig = await this.aiCli.Tools.executeExtensionFunction(
  'sftpDownload_manageConfig',
  {
    action: 'select'
  }
);
```

### Example 3: Interactive Download
```javascript
// Download files through interactive Q&A
const result = await this.aiCli.Tools.executeExtensionFunction(
  'sftpDownload_interactiveDownload',
  {
    useConfig: true  // Select from saved configurations
  }
);
```

### Example 4: Smart Download
```javascript
// Smart download, automatically completes missing parameters
const result = await this.aiCli.Tools.executeExtensionFunction(
  'sftpDownload_smartDownload',
  {
    host: 'sftp.example.com',
    username: 'user'
    // Other missing parameters will be obtained interactively
  }
);
```

## Important Notes

1. **Network Connectivity**: Ensure local network can access the target SFTP server
2. **Authentication**: Provide correct username and password or private key
3. **Directory Permissions**: Ensure read permissions for remote files and write permissions for local directories
4. **Large File Handling**: For very large files, consider adjusting concurrency settings
5. **Progress Display**: Progress information is output via `process.stdout.write`, suitable for viewing in command-line interfaces
6. **Configuration File Security**: `config.js` contains sensitive information, please store it securely

## Troubleshooting

### Common Issues
1. **Connection Failed**: Check host address, port, username, and password
2. **Permission Denied**: Verify read permissions for remote files and write permissions for local directories
3. **Directory Not Found**: Ensure remote path exists and is of correct type (file or directory)
4. **Network Timeout**: Adjust network settings or use more stable network connections
5. **Configuration File Error**: If `config.js` is corrupted, delete it and recreate

### Error Handling
The extension function catches most common errors and returns detailed error messages. Error information is output via `process.stdout.write` and also reflected in the function return value.

## Version History

- **v1.0.0** (2024-01-01)
  - Initial release
  - Support for SFTP file downloads and recursive directory downloads
  - Real-time progress display functionality
  - Added concurrent download control

- **v1.1.0** (Current Version)
  - Added configuration management features
  - Added interactive download functionality
  - Added smart download functionality
  - Support for multiple server configuration saving and selection

---

**Note**: This extension is part of the DeepFish AI ecosystem, designed specifically for automated workflows. For further customization or issues, please refer to the DeepFish AI official documentation.