# zip-packer-mcp

A high-performance Model Context Protocol (MCP) server for packaging directories into `.zip` archives. Features granular Include & Exclude filtering rules with strict **"Excludes evaluated on Includes"** precedence logic, streaming compression, self-inclusion recursion guard, and zero-install execution via `npx`.

## ✨ Key Features

1. **Combined Include & Exclude Filtering**:
   - Supports `includes` glob patterns.
   - Supports `excludes` glob patterns.
   - **Core Precedence**: When both are supplied, exclusion patterns are evaluated against the included set ($Filtered = Includes - Excludes$).
2. **Self-Inclusion Recursion Guard**:
   - If the output `.zip` archive is specified within the source directory being zipped, it is automatically excluded to prevent recursion loops or corrupted archives.
3. **Smart Sibling Default Output**:
   - When `outputPath` is omitted, the zip is created alongside the source folder as `<dirName>.zip` (with timestamp fallback to avoid accidental overwrites).
4. **Streaming Compression**:
   - Built on `archiver` streams for low memory overhead and fast processing.
5. **Dry-Run Preview**:
   - `preview_zip_contents` tool lets LLM agents inspect matched files, excluded items, and estimated sizes prior to physical compression.
6. **NPX Ready**:
   - Bundled into a standalone executable with `esbuild`, ready for `npx -y zip-packer-mcp`.

---

## 🚀 MCP Client Setup

### Method A: Run via NPX (Recommended)

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

### Method B: Run from Local Source

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

> **💡 Timeout Tip**: Compressing large directories may take longer than the default 60-second MCP client timeout. Adding `"defaultToolTimeout": 604800000` (7 days in ms: `7 * 24 * 60 * 60 * 1000`) prevents client timeouts during archiving.

---

## 🛠️ MCP Tools

### 1. `zip_directory`

Compresses a target directory into a `.zip` archive.

**Parameters**:

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `sourcePath` | `string` | **Yes** | - | Path to the directory to zip (absolute or relative) |
| `outputPath` | `string` | No | Sibling dir | Target `.zip` file path |
| `includes` | `string[]` | No | `[]` (all) | Glob patterns to include (e.g. `["src/**", "*.json"]`) |
| `excludes` | `string[]` | No | `[]` | Glob patterns to exclude (e.g. `["node_modules/**", "*.log"]`) |
| `compressionLevel` | `integer` | No | `6` | 0 (store) to 9 (maximum compression) |
| `overwrite` | `boolean` | No | `false` | Whether to overwrite existing file |
| `rootPrefix` | `string` | No | `""` | Top-level folder prefix inside archive |

---

### 2. `preview_zip_contents`

Dry-run tool returning matched and excluded files without creating an archive.

**Parameters**:

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `sourcePath` | `string` | **Yes** | - | Directory path to inspect |
| `includes` | `string[]` | No | `[]` | Glob patterns to include |
| `excludes` | `string[]` | No | `[]` | Glob patterns to exclude |
| `maxPreviewItems` | `integer` | No | `100` | Max entries in preview samples |

---

## 📦 Build & Test

```bash
npm install
npm test
npm run build
```

## 📄 License

[MIT](LICENSE)
