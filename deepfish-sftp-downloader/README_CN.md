# DeepFish SFTP 下载扩展

[English](https://github.com/qq306863030/deepfish-extensions/blob/master/deepfish-sftp-downloader/README.md) | **中文**

## 总体功能描述

DeepFish SFTP 下载扩展是一个专门为 DeepFish AI 工作流设计的扩展工具，提供了从 SFTP 服务器下载文件和目录的功能。该扩展支持递归下载整个目录结构、实时进度显示、并发下载控制，并能够实时输出下载状态，包括已下载文件数、总文件数、下载速度等信息。扩展新增了配置管理功能，允许用户保存多个SFTP服务器配置，方便重复使用。

### 核心价值
- **自动化文件传输**：在 AI 工作流中自动从 SFTP 服务器获取所需文件
- **配置管理**：保存多个SFTP服务器配置，方便重复使用和快速切换
- **交互式操作**：支持交互式问答方式输入参数，简化使用流程
- **实时进度反馈**：使用 `process.stdout.write` 实时显示下载进度，便于监控长时间任务
- **递归目录下载**：支持下载整个目录结构，保持原有文件层次
- **错误处理与重试**：完善的错误处理机制，确保下载任务的可靠性
- **并发下载控制**：可配置的并发数，优化下载性能

### 适用场景
- 从远程服务器批量下载训练数据
- 自动化部署流程中的文件获取
- 定期备份远程文件到本地
- AI 工作流中需要访问远程资源的场景
- 需要管理多个SFTP服务器连接的情况

## 快速开始

### 安装步骤

1. **安装 deepfish-ai 全局库**（如尚未安装）：
   ```bash
   npm install deepfish-ai -g
   ```

2. **安装 SFTP 下载扩展**：
   ```bash
   npm install @deepfish-ai/sftp-downloader -g
   ```

3. **在 AI 工作流中运行扩展**：
   在命令行中输入: ai "我要从SFTP服务器下载文件"

## 函数列表及功能描述

### `sftpDownload_downloadFiles`
**功能描述**：从 SFTP 服务器下载文件或目录

**核心功能**：
- 连接到指定的 SFTP 服务器
- 支持密码和私钥两种认证方式
- 可下载单个文件或整个目录（递归）
- 实时显示下载进度、文件计数和速度
- 支持并发下载控制
- 自动创建本地目录结构

**参数说明**：
- `host`：SFTP 服务器主机地址（必需）
- `port`：SFTP 服务器端口，默认 22
- `username`：SFTP 服务器用户名（必需）
- `password`：SFTP 服务器密码（可选，与私钥二选一）
- `remotePath`：远程服务器上的文件或目录路径（必需）
- `localPath`：本地保存路径（必需）
- `privateKey`：私钥路径（可选）
- `passphrase`：私钥密码（可选）
- `recursive`：是否递归下载目录，默认为 true
- `concurrency`：并发下载数量，默认为 5

**输出格式**：
- 实时进度显示：使用 `process.stdout.write` 输出，格式为：`进度: 45% | 已下载: 9/20 | 速度: 2.34 文件/秒 | 当前: filename.txt`
- 函数返回值：包含下载结果的 JSON 对象

### `sftpDownload_manageConfig`
**功能描述**：管理SFTP服务器配置

**核心功能**：
- 添加新的SFTP服务器配置（通过交互式问答）
- 查看已保存的所有配置
- 从多个配置中选择要使用的配置
- 配置信息保存在 `config.js` 文件中

**参数说明**：
- `action`：操作类型，可选值：`add`（添加配置）、`list`（查看配置）、`select`（选择配置），默认为 `select`
- `configName`：配置名称（添加配置时使用）

**配置信息**：
配置信息包括：服务器地址、端口、用户名、密码、私钥路径等，不包含下载目录信息。

### `sftpDownload_interactiveDownload`
**功能描述**：交互式SFTP下载

**核心功能**：
- 通过交互式问答方式获取所有必要参数
- 支持从已保存的配置中选择服务器
- 适合手动操作场景

**参数说明**：
- `useConfig`：是否使用已保存的配置，默认为 true

### `sftpDownload_smartDownload`
**功能描述**：智能SFTP下载

**核心功能**：
- 自动检测缺失的必要参数
- 如果参数缺失，通过交互式问答获取
- 支持从已保存的配置中选择服务器
- 兼容原有调用方式

**参数说明**：
- 所有参数都是可选的，如果缺失会自动通过交互式获取
- `useConfig`：是否使用已保存的配置，默认为 true

## 配置管理

### 配置文件
- **位置**：`config.js`（与扩展文件同一目录）
- **格式**：`module.exports = [配置数组]`
- **内容**：包含多个SFTP服务器配置对象的数组

### 配置对象结构
```javascript
{
  "id": "唯一标识",
  "name": "配置名称",
  "host": "服务器地址",
  "port": 22,
  "username": "用户名",
  "password": "密码",
  "privateKey": "私钥路径",
  "passphrase": "私钥密码",
  "createdAt": "创建时间"
}
```

### 使用流程
1. **首次使用**：通过 `sftpDownload_manageConfig` 函数添加配置
2. **后续使用**：可以直接选择已保存的配置
3. **多配置管理**：支持保存多个服务器配置，方便切换

## 使用示例

### 示例1：基本下载（传统方式）
```javascript
// 通过 AI 工作流调用扩展函数
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

### 示例2：配置管理
```javascript
// 添加新配置
const config = await this.aiCli.Tools.executeExtensionFunction(
  'sftpDownload_manageConfig',
  {
    action: 'add',
    configName: '我的服务器'
  }
);

// 选择配置
const selectedConfig = await this.aiCli.Tools.executeExtensionFunction(
  'sftpDownload_manageConfig',
  {
    action: 'select'
  }
);
```

### 示例3：交互式下载
```javascript
// 通过交互式问答下载文件
const result = await this.aiCli.Tools.executeExtensionFunction(
  'sftpDownload_interactiveDownload',
  {
    useConfig: true  // 从已保存配置中选择
  }
);
```

### 示例4：智能下载
```javascript
// 智能下载，自动补全缺失参数
const result = await this.aiCli.Tools.executeExtensionFunction(
  'sftpDownload_smartDownload',
  {
    host: 'sftp.example.com',
    username: 'user'
    // 其他参数缺失会自动通过交互式获取
  }
);
```

## 注意事项

1. **网络连接**：确保本地网络可以访问目标 SFTP 服务器
2. **权限认证**：提供正确的用户名和密码或私钥
3. **目录权限**：确保有权限读取远程文件和写入本地目录
4. **大文件处理**：对于超大文件，建议适当调整并发数
5. **进度显示**：进度信息通过 `process.stdout.write` 输出，适合在命令行界面查看
6. **配置文件安全**：`config.js` 中包含敏感信息，请妥善保管

## 故障排除

### 常见问题
1. **连接失败**：检查主机地址、端口、用户名和密码是否正确
2. **权限被拒**：确认远程文件的可读权限和本地目录的可写权限
3. **目录不存在**：确保远程路径存在且类型正确（文件或目录）
4. **网络超时**：调整网络设置或使用更稳定的网络连接
5. **配置文件错误**：如果 `config.js` 损坏，可以删除该文件重新创建

### 错误处理
扩展函数会捕获大多数常见错误，并返回详细的错误信息。错误信息会通过 `process.stdout.write` 输出，同时也会在函数返回值中体现。

## 版本历史

- **v1.0.0** (2024-01-01)
  - 初始版本发布
  - 支持 SFTP 文件下载和目录递归下载
  - 实现实时进度显示功能
  - 添加并发下载控制

- **v1.1.0** (当前版本)
  - 新增配置管理功能
  - 添加交互式下载功能
  - 添加智能下载功能
  - 支持多服务器配置保存和选择

---

**提示**：该扩展是 DeepFish AI 生态系统的一部分，专为自动化工作流设计。如需进一步定制或遇到问题，请参考 DeepFish AI 官方文档。