# computer-use-mcp

桌面自动化 MCP 工具：让 **Agent 通过「截图获取画面 → 视觉模型理解 → 用截图像素坐标控制鼠标键盘 → 截图验证」的闭环操作 Windows 电脑**。

基于 `@nut-tree-fork/nut-js` + PowerShell，提供截图、鼠标、键盘、窗口管理、剪贴板、进程启动等 20 个工具。

## 特性

- ✅ **截图像素坐标系**：所有坐标参数 = 截图像素（物理像素），与视觉模型看到的截图完全一致，消除坐标换算负担
- ✅ **DPI 自动换算**：内部处理 Windows 缩放（125%/150% 等），`logical = physical / scale`
- ✅ **中文输入**：一律走剪贴板粘贴（Ctrl+V），彻底绕开输入法(IME)拦截问题
- ✅ **窗口管理**：列表/激活/最小化/最大化/恢复/移动/缩放/关闭（PowerShell 实现，Unicode 安全）
- ✅ **滚轮 / 拖拽 / 长按**：完整鼠标操作
- ✅ **防卡键**：所有按键/鼠标按钮自动释放（含异常路径）

## 环境要求

- Windows 10/11
- Node.js >= 20

## 安装与运行

```bash
npm install
node index.js          # 启动 MCP 服务器（stdio）
```

## MCP 客户端配置

在你的 MCP 客户端（ZCode / Claude Desktop / Cursor 等）添加：

```json
{
  "mcpServers": {
    "computer-use-mcp": {
      "command": "node",
      "args": ["D:/code/github/deepfish-extensions/mcp/computer-use-mcp/index.js"],
      "env": {
        "COMPUTER_USE_SCREENSHOT_DIR": "D:/path/to/screenshots"
      }
    }
  }
}
```

### 环境变量

| 变量 | 用途 | 默认 |
|---|---|---|
| `COMPUTER_USE_SCREENSHOT_DIR` | 截图输出目录 | `<包内>/screenshots/` |

## 工具清单

### 截图 / 信息
| 工具 | 说明 |
|---|---|
| `screenshot` | 全屏/区域/按窗口截图，返回文件路径+尺寸+scale |
| `getScreenInfo` | 屏幕分辨率(逻辑/物理)、DPI scale、鼠标位置、活动窗口 |

### 鼠标
| 工具 | 说明 |
|---|---|
| `mouseMove` | 移动鼠标（可选平滑） |
| `mouseClick` | 左/右/中键、单击/双击 |
| `mouseScroll` | 滚轮四向滚动 |
| `mouseDrag` | 按住左键拖拽 |
| `mousePress` / `mouseRelease` | 长按（必须配对释放） |
| `getMousePosition` | 当前位置（双坐标系） |

### 键盘
| 工具 | 说明 |
|---|---|
| `keyboardType` | 文本输入（剪贴板粘贴，支持中文） |
| `keyboardKey` | 按键/组合键（ctrl+c、alt+tab 等） |

### 窗口 / 进程
| 工具 | 说明 |
|---|---|
| `windowList` | 列出窗口（句柄/PID/标题/矩形） |
| `windowActivate` | 激活窗口到前台 |
| `windowControl` | 最小化/最大化/恢复/关闭 |
| `windowMove` / `windowResize` | 移动/缩放窗口 |
| `processLaunch` | 启动进程 |

### 剪贴板 / 等待
| 工具 | 说明 |
|---|---|
| `clipboardGet` / `clipboardSet` | 剪贴板文本读写 |
| `wait` | 等待毫秒数 |

## Agent 使用指南（工作循环）

```
① screenshot         → 截图保存，返回路径
② 视觉模型识别截图   → 得到目标坐标（物理像素）
③ mouseClick(x,y)    → 点击 / keyboardType(text) → 输入
④ screenshot         → 再截图验证结果
⑤ 若不对，调整坐标重试
```

**坐标约定**：截图返回的宽高就是坐标空间。模型看到的截图上某点 (px, py)，直接作为鼠标操作坐标传入即可。

## 调试 CLI

```bash
node cli.mjs info
node cli.mjs screenshot --region 100,100,500,400
node cli.mjs click 800 600
node cli.mjs type "你好，世界"
node cli.mjs key ctrl+c
node cli.mjs windows
```

## 测试

```bash
npm test               # 单元测试（坐标/按键/剪贴板）
npm run test:functional  # 功能测试（真机，操作测试窗口）
npm run test:smoke     # MCP stdio 冒烟测试
npm run test:all       # 全部
```

功能测试使用 PowerShell 创建的 WinForms 测试窗口（可独立创建/关闭/移动/缩放），
不依赖系统应用，避免 UWP 单例（记事本等）干扰。

## 已知限制

- **仅主显示器**（nut-js 限制，多屏需补充）
- **滚轮是系统步进**（约 120/notch），非像素精确
- **粘贴输入**要求目标应用支持 Ctrl+V（终端类需 `keyboardType` 传 `shortcut="ctrl+shift+v"`）
- **剪贴板粘贴会临时占用剪贴板**，粘贴后默认恢复原内容
- 关闭窗口用 WM_CLOSE（优雅），强杀需 `force: true`

## 安全说明

- 本工具能真实控制鼠标键盘，**请勿在无人值守时长时间运行**；
- 破坏性操作（关闭窗口、杀进程）需显式参数；
- 测试只操作自建窗口，结束时清理。

## 文档

- `AGENTS.md` — 开发规范、文件结构
- `PLAN.md` — 实施方案
- `TEST-PLAN.md` — 功能测试清单
