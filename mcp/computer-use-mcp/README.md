<div align="center">

[🌏 **English**](README.en.md) &nbsp;|&nbsp; [🇨🇳 **中文**](README.md)

</div>

---

# Win Computer Use MCP

基于 **[@nut-tree-fork/nut-js](https://www.npmjs.com/package/@nut-tree-fork/nut-js)** + PowerShell 构建的 MCP（Model Context Protocol）Server，用于**桌面自动化**：让 Agent 通过「截图获取画面 → 视觉模型理解 → 用截图像素坐标控制鼠标键盘 → 截图验证」的闭环操作 Windows 电脑。

提供截图、鼠标、键盘、窗口管理、剪贴板、进程启动等 **20 个工具**。

> 可在任意支持 MCP 的客户端（Claude Desktop、Cursor、ZCode、Cherry Studio 等）中使用。

## 功能

- ✅ **截图像素坐标系**：所有坐标参数 = 截图像素（物理像素），与视觉模型看到的截图完全一致，消除坐标换算负担
- ✅ **DPI 自动换算**：内部处理 Windows 缩放（125%/150% 等），`logical = physical / scale`
- ✅ **中文输入**：一律走剪贴板粘贴（Ctrl+V），彻底绕开输入法(IME)拦截问题
- ✅ **窗口管理**：列表/激活/最小化/最大化/恢复/移动/缩放/关闭（PowerShell 实现，Unicode 安全）
- ✅ **win 组合键可靠**：`win+d` 等走 `Shell.Application.MinimizeAll()` / `keybd_event` 兜底，实测稳定（3/3 成功）
- ✅ **截图十字准星**：`screenshot(showCursor=true)` 在鼠标位置绘制红色十字，模型可直观验证点击是否命中
- ✅ **截图降采样**：`screenshot(maxSize=1568)` 降采样并返回 `scale`，模型坐标按 scale 换算回物理像素，根治 2K/4K 大图坐标幻觉
- ✅ **滚轮 / 拖拽 / 长按**：完整鼠标操作；拖拽自动 hold 识别 + 释放防锁死
- ✅ **防卡键**：所有按键/鼠标按钮自动释放（含异常路径）
- ✅ **stdout 纯净**：所有日志输出到 stderr，不污染 MCP 的 JSON-RPC 通道
- ✅ **截图颜色修正**：nut-js 在 Windows 返回 BGRA，已自动交换 R/B 通道，截图颜色与屏幕完全一致

## 环境要求

- Windows 10/11（真实控制鼠标键盘/窗口）
- Node.js >= 20

## MCP 客户端配置

MCP 客户端以 stdio 方式启动该 server。

### 1. 直接使用 npx（无需本地安装，推荐）

适合在支持 MCP 的客户端（Claude Desktop / Cursor / ZCode / Cherry Studio 等）中快速接入：

```json
{
  "mcpServers": {
    "win-computer-use-mcp": {
      "command": "npx",
      "args": ["-y", "win-computer-use-mcp@latest"],
      "env": {
        "SCREENSHOT_MIX_COUNT": "10"
      }
    }
  }
}
```

> 未设置 `SCREENSHOT_DIR` 时，截图自动保存到 `index.js` 所在目录（npx 缓存目录）；建议显式指定到你方便查看的位置。

### 2. 指向本地项目目录（本地开发/调试）

```json
{
  "mcpServers": {
    "win-computer-use-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["D:/code/.../mcp/computer-use-mcp/index.js"],
      "env": {
        "SCREENSHOT_DIR": "D:/code/.../mcp/computer-use-mcp/screenshots",
        "SCREENSHOT_MIX_COUNT": "10"
      }
    }
  }
}
```

### 3. Claude Desktop（claude_desktop_config.json）

```json
{
  "mcpServers": {
    "win-computer-use-mcp": {
      "command": "node",
      "args": ["D:/code/.../mcp/computer-use-mcp/index.js"],
      "env": {
        "SCREENSHOT_DIR": "D:/code/.../mcp/computer-use-mcp/screenshots",
        "SCREENSHOT_MIX_COUNT": "10"
      }
    }
  }
}
```

### 4. Cursor（.cursor/mcp.json）

```json
{
  "mcpServers": {
    "win-computer-use-mcp": {
      "command": "node",
      "args": ["D:/code/.../mcp/computer-use-mcp/index.js"],
      "env": {
        "SCREENSHOT_DIR": "D:/code/.../mcp/computer-use-mcp/screenshots",
        "SCREENSHOT_MIX_COUNT": "10"
      }
    }
  }
}
```

### 环境变量

| 环境变量 | 用途 | 默认 |
|---|---|---|
| `SCREENSHOT_DIR` | 截图输出目录；未设置或为空时自动使用 `index.js` 所在目录（包根） | `index.js` 所在目录 |
| `SCREENSHOT_MIX_COUNT` | 截图目录保留文件数；`-1` 表示不自动删除，`>0` 表示每次截图后仅保留最近 N 个文件 | `10` |

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
① screenshot         → 截图保存，返回路径 + 尺寸 + scale
② 视觉模型识别截图   → 得到目标坐标（物理像素）
③ mouseClick(x,y)    → 点击 / keyboardType(text) → 输入
④ screenshot         → 再截图验证结果
⑤ 若不对，调整坐标重试（最多 2 次）
```

**坐标约定**：截图返回的宽高就是坐标空间。模型看到的截图上某点 (px, py)，直接作为鼠标操作坐标传入即可。

**识别技巧**（2K/4K 屏实测有效）：

- **降采样模式**：全屏截图传 `maxSize`（如 1568），返回 `imageWidth/imageHeight/scale`，让模型在降采样后的尺寸内工作（`physical = model / scale`）——从根上消除大图被视觉 API 降采样导致的坐标幻觉；
- 视觉模型对全屏截图（尤其 2K/4K 高分辨率）可能产生**绝对像素坐标幻觉**；也可要求模型返回「相对截图左上角的**百分比坐标**」，再按 `screenshot` 返回的实际尺寸换算物理像素；
- **十字准星验证**：点击后用 `screenshot(showCursor=true)` 截图，红色十字标记当前鼠标位置，对照目标判断是否命中，按偏差比例调整重试；
- 小目标（图标/菜单项/搜索框）先用 `screenshot` 的 `region` 参数裁剪放大，再交给视觉模型识别；
- 定位桌面图标等确定性目标，可用 Windows OCR API + 像素颜色分析（sharp）兜底，成功率最高；
- 拖拽图标时起点必须精确命中图标中心（偏移 >10px 会变成"选中而非拖拽"），建议 `steps>=30`、`duration>=800ms`。

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
- **桌面图标位置有网格吸附**：放下位置会吸附到最近网格交点（约 56px 步进），拖拽落点需考虑吸附偏移

## 安全说明

> [!WARNING]
> 本工具赋予模型对电脑的**完全控制权**（真实鼠标键盘/窗口）。当前模型仍会犯错且易受 **prompt injection（提示注入）** 影响——恶意网页/文档内容可能诱导模型执行危险操作。请像"把电脑交给一个多动的小朋友"一样对待它：
> - **请勿在无人值守时长时间运行**；
> - 建议在**沙箱/专用用户账号**中运行，限制权限；
> - 只访问可信内容，警惕陌生网页/文档中的隐藏指令；
> - 破坏性操作（关闭窗口、杀进程）需显式参数；
> - 测试只操作自建窗口，结束时清理。

## 常见问题

- **stdout 被污染？** 本 server 所有日志统一输出到 stderr，不干扰 MCP 的 JSON-RPC 通道。
- **`win+d` 无效？** 已内置 `Shell.Application.MinimizeAll()` 兜底（实测 3/3 成功），无需手动处理。
- **中文输入乱码/无效？** `keyboardType` 走剪贴板粘贴方案，需目标应用支持 Ctrl+V；终端类应用传 `shortcut="ctrl+shift+v"`。
- **截图识别坐标不准？** 视觉模型对全屏图可能产生坐标幻觉，改用「百分比坐标 + 按截图尺寸换算」或裁剪区域放大识别更稳（见 Agent 使用指南）。
- **拖拽图标没反应？** 起点必须精确命中图标中心（偏移 >10px 会变成"选中而非拖拽"），建议 `steps>=30`、`duration>=800ms`。
- **窗口最小化后找不到？** `windowList` 已用 PowerShell `GetWindowRect` 读取矩形，最小化窗口（-32000 坐标）会被过滤，先用 `windowControl restore` 恢复再操作。

## 文档

- `AGENTS.md` — 开发规范、文件结构
- `PLAN.md` — 实施方案
- `TEST-PLAN.md` — 功能测试清单
- `测试报告.md` — 桌面自动化真机测试报告（3 个复杂任务全部通过）
