# zip-packer-mcp

面向 Model Context Protocol (MCP) 的高性能目录压缩与打包工具服务。支持细粒度的包含 (Includes) 与排除 (Excludes) 规则，遵循**“在包含集合中剔除排除项”**的严格过滤逻辑，具备流式安全压缩、防自包死循环拦截，并支持通过 `npx` 直接运行。

## ✨ 特性亮点

1. **包含与排除规则联合过滤**：
   - 支持设置包含规则 (`includes`)。
   - 支持设置排除规则 (`excludes`)。
   - **核心逻辑**：若同时设置了包含与排除，则在包含的文件或目录结果中进行排除（$Filtered = Includes - Excludes$）。
2. **防自包含死循环拦截**：
   - 若生成的 zip 目标文件被指定在待打包的源目录内部，工具会自动将输出的 zip 文件加入排除清单，防止一边写入一边读取造成文件损坏或磁盘爆满。
3. **智能同级缺省输出**：
   - 未指定 `outputPath` 时，自动在源目录同级生成 `<源目录名>.zip`；若存在同名文件且未指定覆盖，自动追加时间戳防意外覆盖。
4. **流式压缩与实时进度通知**：
   - 基于 `archiver` 流式处理，内存占用极低。
   - **终端实时进度条**：在控制台/stderr 实时打印压缩进度条与已处理文件计数（不干扰 stdio JSON-RPC）。
   - **MCP 官方协议进度支持**：完整支持客户端传入的 `_meta.progressToken`，向 AI 客户端实时推送 `notifications/progress` 协议事件，动态更新进度条。
5. **试运行预览 (Dry-run)**：
   - 提供 `preview_zip_contents` 工具，在实际压缩前查看预估文件总数、总大小与匹配/排除样例，防止误操作。
6. **零安装 npx 即用**：
   - 通过 `esbuild` 预打包为单文件并配置 `bin`，客户端可通过 `npx -y zip-packer-mcp` 极速启动。

---

## 🚀 快速接入配置

在您的 MCP 客户端配置中（例如 `claude_desktop_config.json` 或 Antigravity IDE `mcp_config.json`）添加如下配置：

### 方式 A：通过 NPX 运行（推荐）

```json
{
  "mcpServers": {
    "zip-packer": {
      "command": "npx",
      "args": ["-y", "zip-packer-mcp"],
      "defaultToolTimeout": 604800000
    }
  }
}
```

### 方式 B：本地源码运行

```json
{
  "mcpServers": {
    "zip-packer": {
      "command": "node",
      "args": ["d:/.../zip-packer-mcp/dist/index.js"],
      "defaultToolTimeout": 604800000
    }
  }
}
```

> **💡 超时配置提示**：由于打包大型目录或海量文件耗时可能超过 MCP 默认的 60 秒限制，建议在配置中加上 `"defaultToolTimeout": 604800000`（即 7 天，`7 * 24 * 60 * 60 * 1000` 毫秒），彻底避免客户端因超时中断打包。

---

## 🛠️ MCP 工具定义

### 1. `zip_directory` (执行打包)

将指定目录打包为 `.zip` 文件。

**参数列表**：

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `sourcePath` | `string` | **是** | - | 待打包的源目录路径（支持绝对或相对路径） |
| `outputPath` | `string` | 否 | 源目录同级 | 输出 `.zip` 文件的目标路径 |
| `includes` | `string[]` | 否 | `[]` (全量) | 包含的文件或目录 Glob 规则（如 `["src/**", "*.json"]`） |
| `excludes` | `string[]` | 否 | `[]` | 排除的文件或目录 Glob 规则（如 `["node_modules/**", "*.log"]`） |
| `compressionLevel` | `integer` | 否 | `6` | 压缩级别 (0 ~ 9，0为不压缩，9为最高压缩比) |
| `overwrite` | `boolean` | 否 | `false` | 若目标 zip 文件已存在是否允许覆盖 |
| `rootPrefix` | `string` | 否 | `""` | 压缩包内顶层根目录前缀（如 `"my-project/"`） |

**返回格式示例**：
```json
{
  "success": true,
  "archivePath": "D:/workspace/my-app.zip",
  "sourcePath": "D:/workspace/my-app",
  "totalFiles": 128,
  "uncompressedSizeBytes": 1420580,
  "compressedSizeBytes": 381200,
  "compressionRatio": "73.2%",
  "durationMs": 145,
  "sampleFiles": [
    "package.json",
    "src/index.js"
  ],
  "excludedFilesCount": 54
}
```

---

### 2. `preview_zip_contents` (试运行预览)

在不生成 zip 文件的前提下，预览将被打包和被排除的文件列表及预估大小。

**参数列表**：

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `sourcePath` | `string` | **是** | - | 待检查的源目录路径 |
| `includes` | `string[]` | 否 | `[]` | 包含的文件或目录 Glob 规则 |
| `excludes` | `string[]` | 否 | `[]` | 排除的文件或目录 Glob 规则 |
| `maxPreviewItems` | `integer` | 否 | `100` | 样例列表中最多返回的文件条目数 |

---

## 🎯 过滤规则匹配示例

- **仅打包前端源码，排除单元测试**：
  ```json
  {
    "sourcePath": "./my-project",
    "includes": ["src/**", "public/**", "package.json"],
    "excludes": ["**/*.test.*", "**/*.spec.*", "**/*.map"]
  }
  ```
- **全量打包但排除依赖与构建产物**：
  ```json
  {
    "sourcePath": "./my-project",
    "excludes": ["node_modules", "dist", ".git", "*.log"]
  }
  ```

---

## 📦 构建与开发

```bash
# 安装依赖
npm install

# 运行自动化测试
npm test

# 构建单文件可执行产物
npm run build
```

## 📄 开源许可

[MIT](LICENSE)
