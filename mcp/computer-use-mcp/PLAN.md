# computer-use-mcp 实施方案

> 版本：v1.0 草案（2026-08-13）
> 状态：待实施
> 目标：把 `scripts/` 里的桌面自动化 CLI 改造成可靠的 MCP 工具，形成「Agent 截图 → 视觉模型理解 → 用截图像素坐标控制鼠标键盘 → 截图验证」的闭环。

---

## 一、背景与目标

原 `scripts/`（从 `computer-use-skill` 拷贝）是一个基于 `@nut-tree-fork/nut-js` 的桌面自动化 CLI，
存在较多问题（窗口管理是 mock、无滚动/拖拽、DPI 未处理、无测试等）。

本次改造的目标：

1. 先测试、再完善核心，最后包一层 MCP 服务器；
2. **坐标约定**：Agent 通过截图（物理像素）获取画面 → 视觉模型理解 → 用**截图像素坐标**下发鼠标/键盘操作 → 再截图验证；
3. 全功能覆盖：截图、鼠标（含滚动/拖拽/长按）、键盘（含组合键）、窗口管理、剪贴板、进程启动、信息查询、等待。

用户决策（2026-08-13 已确认）：

- 功能范围：**全功能**；
- 中文/特殊字符输入：**一律走剪贴板粘贴**（绕开 IME/CJK 问题，简化 type 逻辑）；
- 截图结果交给视觉模型：**返回文件路径**（配合现有 deepseek-vision-mcp 读图）。

---

## 二、核心设计决策

### 1. 坐标系统（最重要，先实测后定稿）

nut-js 4.2.6 关键事实（已核实源码）：

- `screen.grab()` 返回**物理像素**截图（`SetThreadDpiAwarenessContext(PER_MONITOR_AWARE_V2)` 后 BitBlt）；
- `mouse.move()` / `screen.width()` 使用**逻辑像素**（`GetSystemMetrics(SM_CXSCREEN)`，DPI 感知后）；
- 高 DPI（125%/150%）下两者不一致：截图更大。

**约定**：MCP 所有坐标参数一律使用**截图像素（物理像素）**——与模型看到的截图一致，消除"看到哪点哪"的换算负担。

**内部自动换算**：

```
scale = 截图物理宽 / screen.width() 逻辑宽
logical = physical / scale
```

截图 / 信息工具返回 `scale` 供 Agent 参考。实施第 2 步先在真机实测本机缩放行为，验证公式再写转换器（`src/core/coord.js`）。

### 2. 目录结构（重组为一个顶层包）

```
computer-use-mcp/
├── package.json          # 根包：type:module, node>=20
├── index.js              # MCP 服务器入口 (McpServer + registerTool + serveStdio)
├── src/
│   ├── core/             # 控制层（纯逻辑、结构化返回、日志走 stderr、无 chalk 噪音）
│   │   ├── coord.js      # DPI 换算 + 区域校验
│   │   ├── screenshot.js # 全屏/区域/按窗口截图
│   │   ├── mouse.js      # 移动/滚轮四向/拖拽/长按/取位
│   │   ├── click.js      # 左/右/中键、单击/双击
│   │   ├── key.js        # 扩展按键表 + 组合解析 + 自动释放
│   │   ├── type.js       # 剪贴板粘贴输入（绕开 IME）+ 可选回车 + 恢复剪贴板
│   │   ├── clipboard.js  # 剪贴板文本读写
│   │   ├── window.js     # nut-js 枚举/激活/移动/缩放 + PowerShell 最小化/最大化/恢复/关闭/启动
│   │   ├── info.js       # 屏幕/鼠标/活动窗口
│   │   └── wait.js
│   └── tools/            # MCP 工具薄封装（每工具一个 zod schema + handler）
├── tests/
│   ├── unit/             # node:test 纯逻辑单测（不碰真实设备）
│   └── functional/       # 真机功能测试（安全设计，见下）
├── scripts/              # 旧 CLI 保留为调试工具（改为调用新 src/core），flow.js 删除
├── AGENTS.md             # 本文件：代码规范、文件结构说明
├── PLAN.md               # 本方案文档
├── TEST-PLAN.md          # 功能测试清单
└── README.md             # 用户文档（mcpServers 配置、环境变量、坐标约定）
```

- 依赖：`@modelcontextprotocol/server@^2.0.0`、`zod@^4`、`@nut-tree-fork/nut-js@^4.2.6`、`sharp@^0.35.3`；
- **不用 esbuild 打包**（nut-js 原生模块无法 bundle），本地 `node index.js` 运行；
- 旧 `scripts/` 保留为调试 CLI（改为调用新 `src/core`），`flow.js` 删除（MCP 本身就是流程引擎）；
- 仓库根目录无 `.gitignore`，需新建（排除 node_modules、screenshots 产物等）。

### 3. 功能清单（全功能）

| 能力 | 实现 |
|---|---|
| 截图 | 全屏/区域/按窗口标题；输出到 `COMPUTER_USE_SCREENSHOT_DIR`（默认包内 screenshots/，gitignore）；返回绝对路径+尺寸+scale |
| 鼠标 | move(平滑可选)、click(按钮/双击)、scroll(四向)、drag(起止点+步数)、press/release(长按)、getPosition |
| 键盘 | type(剪贴板粘贴+回车+恢复剪贴板)、key(组合键/扩展键表)、自动释放防卡键 |
| 窗口 | list(hwnd/标题/矩形)、activate(按hwnd/标题/PID)、minimize/maximize/restore/close(PowerShell)、move/resize(nut-js) |
| 进程 | launch(Start-Process) |
| 剪贴板 | get/set 文本 |
| 信息 | 屏幕(物理+逻辑+scale)、鼠标(双坐标系)、活动窗口 |
| 等待 | wait(ms) |

### 4. MCP 封装（照搬兄弟项目模式）

- `McpServer({name:'computer-use-mcp', version}, {capabilities:{tools:{}}})` + `serveStdio(() => server)`；
- ~19 个工具：screenshot / getScreenInfo / mouseMove / mouseClick / mouseScroll / mouseDrag / mousePress / mouseRelease / getMousePosition / keyboardType / keyboardKey / windowList / windowActivate / windowControl / windowMove / windowResize / processLaunch / clipboardGet / clipboardSet / wait；
- 返回格式：成功 `{content:[{type:'text',text:JSON}], structuredContent}`；失败 `isError:true`；日志仅 stderr；
- 环境变量：`COMPUTER_USE_SCREENSHOT_DIR`。

---

## 三、测试策略（先测试后完善）

- **单元测试**（`node:test`，不碰设备）：坐标换算、按键解析、区域校验、PS1 输出解析、按键表完整性、剪贴板往返（标记功能）；
- **功能测试**（真机、安全设计、仅操作专用测试窗口、可随时人工中止）：
  1. 环境实测：逻辑/物理宽高、scale → 验证坐标公式；
  2. 全屏/区域截图 → 校验 PNG 尺寸与物理像素一致；
  3. 记事本闭环：launch → 定位点击 → type("Hello 中文123") → ctrl+a+c → clipboardGet 比对 → 证明"定位+输入"全链路正确；
  4. 快捷键组合验证；
  5. 窗口生命周期：list/activate/minimize/restore/move/resize/close 逐步验证；
  6. 滚动验证：长文记事本滚轮 → 前后截图像素差 > 阈值；
  7. 拖拽验证：选中文本后 ctrl+c → 剪贴板内容变化；
- 安全：测试只碰专用测试窗口；所有按键/按钮 try/finally 释放。

---

## 四、实施步骤

1. 根 package.json + 安装依赖（nut-js/sharp/SDK/zod）；
2. **环境实测**：DPI/坐标行为验证（决定换算公式定稿）；
3. 重构 `src/core` 各模块（结构化返回 + stderr 日志）；
4. 单元测试全绿；
5. 功能测试全绿（记事本闭环等）；
6. `index.js` MCP 封装 + `test.mjs` stdio 冒烟测试；
7. README + 保留调试 CLI；
8. 模拟 Agent 端到端联调（截图→视觉识别→操作→再截图）。

---

## 五、已知限制（写入 README）

- 仅主显示器（nut-js 限制，多屏需 PowerShell 补充，v1 不做）；
- 滚轮是系统步进（约 120/notch）非像素精确；
- 粘贴输入要求目标应用支持 Ctrl+V（终端类需 Ctrl+Shift+V，文档注明）；
- 剪贴板粘贴会临时占用剪贴板（粘贴后默认恢复原内容）；
- 真机操作类工具天然有安全边界：不做无确认的破坏性操作（关闭窗口用 WM_CLOSE 而非强杀，kill 需显式传参）。

---

## 六、风险

- DPI 行为因机器而异 → 步骤 2 先实测；
- nut-js 原生模块在 Windows 的稳定性 → 功能测试逐项验证；
- 功能测试会动真实鼠标/键盘 → 全部限定在测试窗口内，可随时人工中止。
