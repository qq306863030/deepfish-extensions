# AGENTS.md — computer-use-mcp 开发指南

> 本文件供 AI Agent 与开发者共同遵守：代码规范、文件结构、约束与工作流。
> 与本仓库其他 MCP 项目（deepseek-vision-mcp、ssh-remote-control-mcp）保持一致的风格。

---

## 1. 项目是什么

`computer-use-mcp` 是一个**桌面自动化 MCP 工具**：让 Agent 通过「截图获取画面 → 视觉模型理解 → 用截图像素坐标控制鼠标/键盘 → 截图验证」的闭环操作电脑（Windows）。

- 前身：`D:\code\gitea\skills\computer-use-skill`（一个 CLI 桌面自动化工具，核心能力已重写进 `src/core/`）
- 方案文档：`PLAN.md`；功能测试清单：`TEST-PLAN.md`（**必须全绿才能结束开发**）

## 2. 技术栈与运行环境

| 项 | 值 |
|---|---|
| 语言 | 纯 JavaScript（ESM，`"type": "module"`），**不用 TypeScript** |
| Node | >= 20 |
| 平台 | Windows（真机鼠标键盘/窗口操作） |
| 核心依赖 | `@modelcontextprotocol/server@^2.0.0`、`zod@^4`、`@nut-tree-fork/nut-js@^4.2.6`、`sharp@^0.35.3` |
| 构建 | **不用 esbuild 打包**（nut-js 原生模块无法 bundle），本地 `node index.js` 运行 |
| 测试 | `node:test`（内置），无额外测试框架 |

## 3. 目录结构

```
computer-use-mcp/
├── index.js              # MCP 服务器入口（McpServer + registerTool + serveStdio）
├── cli.mjs               # 调试 CLI（直接调 src/core，物理像素坐标）
├── package.json          # 根包
├── src/
│   ├── core/             # 控制层：纯逻辑、结构化返回、日志走 stderr、无 chalk 噪音
│   │   ├── index.js      # 汇总导出
│   │   ├── coord.js      # DPI 换算 + 区域校验（物理像素 <-> 逻辑像素）
│   │   ├── screenshot.js # 全屏/区域/按窗口截图
│   │   ├── mouse.js      # 移动/滚轮四向/拖拽/长按/取位/点击
│   │   ├── key.js        # 扩展按键表 + 组合解析 + 自动释放
│   │   ├── type.js       # 剪贴板粘贴输入（绕开 IME）+ 可选回车 + 恢复剪贴板
│   │   ├── clipboard.js  # 剪贴板文本读写（带重试）
│   │   ├── window.js     # nut-js 枚举/激活(PowerShell)/移动/缩放 + PowerShell 最小化/最大化/恢复/关闭/启动
│   │   ├── info.js       # 屏幕/鼠标/活动窗口
│   │   └── wait.js       # sleep
├── tests/
│   ├── unit/             # 单元测试（不碰真实设备）
│   └── functional/       # 真机功能测试（WinForms 测试窗口）
├── test.mjs              # MCP stdio 冒烟测试
├── AGENTS.md             # 本文件
├── PLAN.md               # 实施方案
├── TEST-PLAN.md          # 功能测试清单（验收标准）
└── README.md             # 用户文档（mcpServers 配置、环境变量、坐标约定）
```

## 4. 代码规范

### 4.1 分层与依赖方向

```
tools/  (MCP 薄封装：zod schema + 调 core + 组装返回)
   ↓
core/   (控制层：纯业务逻辑，不 import MCP SDK，不 import zod)
   ↓
nut-js / PowerShell / sharp
```

- **`src/core/` 禁止 import `@modelcontextprotocol/server` 或 `zod`** —— 保持可独立单元测试；
- **`src/tools/` 不做业务逻辑**，只做参数翻译、调用 core、组装 MCP 返回；
- **调试 CLI（`cli.mjs`）只调 `src/core`**，不复制逻辑（旧版把逻辑抄了多份，是问题根源，已删除）。

### 4.2 模块导出风格

- 每个 core 模块导出**一个对象/类实例**（如 `new ScreenshotCommand()` 风格），方法与现有 `lib/` 一致；
- 方法返回**结构化 JSON**（`{ success, data, ... }` 判别式），不做终端彩色输出；
- 错误用 `throw new Error(...)` 抛出，由上层（tools/CLI）捕获转换。

### 4.3 日志约定（重要）

- **stdout 只属于 MCP 的 JSON-RPC 通道，任何日志一律 `process.stderr.write`**（或 stderr console）；
- core 层不做终端美化输出（无 chalk）；调试日志统一走 stderr。

### 4.4 坐标约定（核心）

- **所有 MCP 坐标参数 = 截图像素（物理像素）**，与模型看到的截图一致；
- 内部换算 `logical = physical / scale`（`scale = 截图物理宽 / screen.width() 逻辑宽`），封装在 `coord.js`；
- 截图/信息工具返回 `scale` 供 Agent 参考；
- **新增任何"坐标输入"工具必须过 `coord.js` 换算**，禁止裸传物理像素给 `mouse.move()`。

### 4.5 安全与可靠性

- **按键/鼠标按钮一律自动释放**：操作后（含异常路径）`try/finally` 释放，防止卡键/锁鼠标；
- 关闭窗口用 `WM_CLOSE`（优雅）而非强杀；强杀需显式参数（如 `force: true`）；
- 剪贴板粘贴输入会临时占用剪贴板，**默认粘贴后恢复原内容**；
- 破坏性操作要有明确参数开关，不静默执行。

### 4.6 工具定义规范

- 每个工具：`title`（中文）、`description`（中文，含用途/参数说明/注意事项）、`inputSchema: z.object({...}).strict()`；
- 参数用 `.describe('中文说明')`、`.optional()`；枚举用 `z.enum([...])`；
- 返回：成功 `{ content:[{type:'text', text: JSON.stringify(result)}], structuredContent: result }`；
  失败 `{ content:[{type:'text', text: errMsg}], structuredContent: {success:false, error:errMsg}, isError:true }`；
- 工具名用 camelCase（如 `windowActivate`、`clipboardGet`）。

### 4.7 命名与风格

- 文件/变量 camelCase；常量 UPPER_SNAKE_CASE；
- 注释用中文，简洁说明"为什么"多于"是什么"；
- 与兄弟项目保持一致的返回结构（`structuredContent`）。

## 5. 环境变量

| 变量 | 用途 | 默认 |
|---|---|---|
| `COMPUTER_USE_SCREENSHOT_DIR` | 截图输出目录 | `<包内>/screenshots/`（gitignore） |

## 6. 测试要求

- **单元测试**：`tests/unit/`，`node --test "tests/unit/*.test.mjs"`，不碰真实设备（坐标换算、按键解析、区域校验、剪贴板往返）；
- **功能测试**：`tests/functional/`，真机；**必须完成 TEST-PLAN.md 全部用例且全绿才能结束**；
  - 测试目标用 **WinForms 窗口**（`helpers.createTestWindow`，PowerShell 创建，可独立关闭/杀），
    因为这台机器 Win11 的记事本/画图是 UWP 单例（复用实例、不可杀、标题脏）；
- **冒烟测试**：`node test.mjs`（MCP stdio：initialize/tools/list/tools/call/stdout 纯净）；
- 新增功能必须：先加对应测试用例 → 实现 → 测试通过 → 更新 TEST-PLAN.md 勾选。

## 7. 工作流

1. 改代码前先看 `PLAN.md`（方案）与 `TEST-PLAN.md`（验收）；
2. 实现顺序：core 模块 → 单元测试 → 功能测试 → tools 封装 → stdio 冒烟；
3. 提交信息用中文，如 `feat: 新增鼠标滚轮支持` / `fix: 修复 DPI 换算错误`；
4. 完成功能后回填 TEST-PLAN.md 勾选结果。

## 8. 已知限制（不要重复造轮子）

- nut-js：仅主显示器；`minimize()/restore()` 在 Windows 抛异常（需 PowerShell 兜底）；无 close/launch API；
- 滚轮是系统步进（约 120/notch），非像素精确；
- 粘贴输入要求目标应用支持 Ctrl+V（终端类需 Ctrl+Shift+V）；
- 详见 `PLAN.md` 第五节。
