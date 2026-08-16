<div align="center">

[🇨🇳 **中文**](README.md) &nbsp;|&nbsp; [🌏 **English**](README.en.md)

</div>

---

# Win Computer Use MCP

An MCP (Model Context Protocol) Server built on **[@nut-tree-fork/nut-js](https://www.npmjs.com/package/@nut-tree-fork/nut-js)** + PowerShell for **desktop automation**: enables Agents to control a Windows computer through the closed loop of "screenshot → vision model understanding → mouse/keyboard control using screenshot pixel coordinates → screenshot verification".

Provides **20 tools** for screenshots, mouse, keyboard, window management, clipboard, and process launching.

> Works with any MCP-compatible client (Claude Desktop, Cursor, ZCode, Cherry Studio, etc.).

## Features

- ✅ **Screenshot pixel coordinate system**: All coordinate parameters = screenshot pixels (physical pixels), identical to what the vision model sees — no coordinate conversion burden
- ✅ **DPI auto-conversion**: Handles Windows scaling (125%/150% etc.) internally, `logical = physical / scale`
- ✅ **Chinese input**: Always via clipboard paste (Ctrl+V), completely bypassing IME interception issues
- ✅ **Window management**: List/activate/minimize/maximize/restore/move/resize/close (PowerShell implementation, Unicode-safe)
- ✅ **Reliable Win key combos**: `win+d` etc. use `Shell.Application.MinimizeAll()` / `keybd_event` fallback — verified stable (3/3 success)
- ✅ **Scroll / drag / long-press**: Full mouse operations; drag auto-holds for Shell recognition and releases to prevent lockups
- ✅ **Key-release safety**: All keys/mouse buttons auto-release (including error paths)
- ✅ **Clean stdout**: All logs go to stderr, never polluting the MCP JSON-RPC channel
- ✅ **Screenshot color fix**: nut-js returns BGRA on Windows; R/B channels are swapped automatically so screenshot colors match the screen exactly

## Requirements

- Windows 10/11 (real mouse/keyboard/window control)
- Node.js >= 20

## MCP Client Configuration

MCP clients start the server via stdio.

### 1. Use npx directly (no local install, recommended)

Quickly connect in any MCP-capable client (Claude Desktop / Cursor / ZCode / Cherry Studio, etc.):

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

> When `SCREENSHOT_DIR` is not set, screenshots are saved to the `index.js` directory (the npx cache directory); it is recommended to explicitly set it to a convenient location.

### 2. Point to a local project directory (local dev/debug)

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

### 3. Claude Desktop (claude_desktop_config.json)

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

### 4. Cursor (.cursor/mcp.json)

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

### Environment Variables

| Env Variable | Purpose | Default |
|---|---|---|
| `SCREENSHOT_DIR` | Screenshot output directory; if unset or empty, automatically uses the directory containing `index.js` (package root) | Directory of `index.js` |
| `SCREENSHOT_MIX_COUNT` | Max files kept in screenshot dir; `-1` = never delete, `>0` = keep only the latest N files after each capture | `10` |

## Tools (20)

### Screenshot / Info
| Tool | Description |
|---|---|
| `screenshot` | Fullscreen/region/window capture, returns file path + size + scale |
| `getScreenInfo` | Screen resolution (logical/physical), DPI scale, mouse position, active window |

### Mouse
| Tool | Description |
|---|---|
| `mouseMove` | Move mouse (optional smooth) |
| `mouseClick` | Left/right/middle click, single/double |
| `mouseScroll` | Scroll wheel 4 directions |
| `mouseDrag` | Hold left button and drag |
| `mousePress` / `mouseRelease` | Long-press (must pair with release) |
| `getMousePosition` | Current position (dual coordinate systems) |

### Keyboard
| Tool | Description |
|---|---|
| `keyboardType` | Text input (clipboard paste, supports Chinese) |
| `keyboardKey` | Key / key combos (ctrl+c, alt+tab, etc.) |

### Window / Process
| Tool | Description |
|---|---|
| `windowList` | List windows (handle/PID/title/rect) |
| `windowActivate` | Bring window to foreground |
| `windowControl` | Minimize/maximize/restore/close |
| `windowMove` / `windowResize` | Move/resize window |
| `processLaunch` | Launch a process |

### Clipboard / Wait
| Tool | Description |
|---|---|
| `clipboardGet` / `clipboardSet` | Read/write clipboard text |
| `wait` | Wait milliseconds |

## Agent Usage Guide (Work Loop)

```
① screenshot         → save screenshot, returns path + size + scale
② vision model       → get target coordinates (physical pixels)
③ mouseClick(x,y)    → click / keyboardType(text) → type
④ screenshot         → verify result
⑤ if wrong, adjust coordinates and retry (max 2 times)
```

**Coordinate convention**: The screenshot's returned width/height IS the coordinate space. A point (px, py) the model sees on the screenshot is used directly as the mouse operation coordinate.

**Recognition tips** (verified on 2K/4K screens):

- Vision models may hallucinate **absolute pixel coordinates** on fullscreen screenshots (especially high-res 2K/4K); ask the model to return **percentage coordinates relative to the top-left corner**, then convert using the `screenshot` tool's actual dimensions;
- For small targets (icons/menu items/search boxes), use the `screenshot` tool's `region` parameter to crop & enlarge before recognition;
- For deterministic targets like desktop icons, fall back to Windows OCR API + pixel color analysis (sharp) — highest success rate;
- For icon drag, the start point must precisely hit the icon center (offset >10px becomes "select instead of drag"); use `steps>=30`, `duration>=800ms`.

## Running

```bash
cd mcp/computer-use-mcp
npm install
node index.js          # Start MCP server (stdio)
```

## Debug CLI

```bash
node cli.mjs info
node cli.mjs screenshot --region 100,100,500,400
node cli.mjs click 800 600
node cli.mjs type "Hello, World"
node cli.mjs key ctrl+c
node cli.mjs windows
```

## Testing

```bash
npm test               # Unit tests (coords/keys/clipboard)
npm run test:functional  # Functional tests (real machine, WinForms test window)
npm run test:smoke     # MCP stdio smoke test
npm run test:all       # All
```

Functional tests use PowerShell-created WinForms test windows (independently creatable/closable/movable/resizable), avoiding UWP singleton interference (Notepad etc.).

## Known Limitations

- **Primary monitor only** (nut-js limitation; multi-monitor needs extension)
- **Scroll is system-stepped** (~120/notch), not pixel-precise
- **Paste input** requires the target app to support Ctrl+V (terminals need `keyboardType` with `shortcut="ctrl+shift+v"`)
- **Clipboard paste temporarily occupies the clipboard**; original content is restored after paste by default
- Window close uses WM_CLOSE (graceful); force-kill requires `force: true`
- **Desktop icons snap to a grid** (~56px steps): dropped positions snap to the nearest grid intersection

## Safety

- This tool really controls mouse/keyboard — **do NOT run unattended for long periods**;
- Destructive operations (close windows, kill processes) require explicit parameters;
- Tests only operate self-created windows and clean up afterward.

## FAQ

- **stdout polluted?** All logs go to stderr — never interferes with the MCP JSON-RPC channel.
- **`win+d` not working?** Built-in `Shell.Application.MinimizeAll()` fallback (verified 3/3 success) — no manual handling needed.
- **Chinese input garbled/ignored?** `keyboardType` uses clipboard-paste; the target app must support Ctrl+V; terminals use `shortcut="ctrl+shift+v"`.
- **Recognition coordinates inaccurate?** Vision models may hallucinate on fullscreen images; use "percentage coordinates + conversion by screenshot size" or crop-zoom recognition (see Agent Usage Guide).
- **Icon drag not working?** Start point must precisely hit the icon center (offset >10px becomes "select instead of drag"); use `steps>=30`, `duration>=800ms`.
- **Window missing after minimize?** `windowList` uses PowerShell `GetWindowRect`; minimized windows (-32000 coords) are filtered — call `windowControl restore` first.

## Docs

- `AGENTS.md` — Dev conventions, file structure
- `PLAN.md` — Implementation plan
- `TEST-PLAN.md` — Functional test checklist
- `测试报告.md` — Real-machine desktop automation test report (3 complex tasks all passed)
