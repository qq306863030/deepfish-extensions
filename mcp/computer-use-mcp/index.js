#!/usr/bin/env node
/**
 * computer-use-mcp —— 桌面自动化 MCP 服务器
 *
 * 让 Agent 通过「截图获取画面 → 视觉模型理解 → 用截图像素坐标控制鼠标键盘 → 截图验证」
 * 的闭环操作 Windows 电脑。
 *
 * 坐标约定：所有坐标参数均为"截图像素（物理像素）"，与视觉模型看到的截图一致。
 * 内部自动换算逻辑像素（DPI 感知）。
 *
 * 运行：node index.js （stdio 传输）
 */

import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

import * as core from './src/core/index.js';

// 所有日志走 stderr（stdout 只属于 MCP JSON-RPC 通道）
function log(...args) {
  process.stderr.write(args.map(String).join(' ') + '\n');
}

/** 统一成功返回 */
function ok(result) {
  const text = JSON.stringify(result, null, 2);
  return { content: [{ type: 'text', text }], structuredContent: result };
}

/** 统一失败返回 */
function fail(err, meta = {}) {
  const msg = err?.message || String(err);
  const result = { success: false, error: msg, ...meta };
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
    isError: true,
  };
}

/** 包装工具处理器：捕获异常转 fail */
function wrap(handler) {
  return async (args) => {
    try {
      const r = await handler(args);
      return ok(r);
    } catch (e) {
      log('tool error:', e.message);
      return fail(e);
    }
  };
}

const server = new McpServer(
  { name: 'computer-use-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ============ 截图 ============

server.registerTool(
  'screenshot',
  {
    title: '截取屏幕画面',
    description:
      '截取屏幕并保存为 PNG，返回文件绝对路径 + 尺寸 + scale。' +
      '可全屏、区域（x,y,width,height 为物理像素）、或按窗口标题/句柄。' +
      '坐标空间：截图为物理像素，后续鼠标操作坐标以此为准（逻辑 = 物理 / scale）。',
    inputSchema: z
      .object({
        region: z
          .object({
            x: z.number().int().describe('左上角物理 x'),
            y: z.number().int().describe('左上角物理 y'),
            width: z.number().int().positive().describe('物理宽度'),
            height: z.number().int().positive().describe('物理高度'),
          })
          .optional()
          .describe('区域截图（缺省全屏）'),
        window: z
          .object({
            handle: z.number().int().optional().describe('窗口句柄'),
            title: z.string().optional().describe('窗口标题（子串匹配）'),
          })
          .optional()
          .describe('按窗口截图（与 region 二选一）'),
      })
      .strict(),
  },
  wrap(async ({ region, window: winTarget }) => {
    if (region) return await core.screenshot.captureRegion(region);
    if (winTarget) return await core.screenshot.captureWindow(winTarget);
    return await core.screenshot.captureFullscreen();
  })
);

// ============ 屏幕信息 ============

server.registerTool(
  'getScreenInfo',
  {
    title: '获取屏幕信息',
    description:
      '获取屏幕分辨率（逻辑/物理）、DPI 缩放比例 scale、当前鼠标位置（双坐标系）、活动窗口。' +
      '供 Agent 确定坐标系与可用区域。',
    inputSchema: z.object({}).strict(),
  },
  wrap(async () => {
    return await core.info.systemInfo();
  })
);

// ============ 鼠标 ============

server.registerTool(
  'mouseMove',
  {
    title: '移动鼠标',
    description: '移动鼠标到物理像素坐标 (x,y)。smooth=true 时平滑移动（duration 毫秒）。',
    inputSchema: z
      .object({
        x: z.number().int().describe('目标物理 x'),
        y: z.number().int().describe('目标物理 y'),
        smooth: z.boolean().optional().default(false).describe('平滑移动'),
        duration: z.number().int().optional().default(300).describe('平滑移动时长 ms'),
      })
      .strict(),
  },
  wrap(async ({ x, y, smooth, duration }) => {
    return await core.mouse.move(x, y, { smooth, duration });
  })
);

server.registerTool(
  'mouseClick',
  {
    title: '鼠标点击',
    description:
      '在物理像素坐标 (x,y) 点击。button: left/right/middle；double=true 双击。' +
      '注意：点击前会先移动到该位置。',
    inputSchema: z
      .object({
        x: z.number().int().describe('物理 x'),
        y: z.number().int().describe('物理 y'),
        button: z.enum(['left', 'right', 'middle']).optional().default('left'),
        double: z.boolean().optional().default(false).describe('双击'),
      })
      .strict(),
  },
  wrap(async ({ x, y, button, double }) => {
    return await core.mouse.click(x, y, { button, double });
  })
);

server.registerTool(
  'mouseScroll',
  {
    title: '鼠标滚轮滚动',
    description: '滚轮滚动。direction: up/down/left/right；amount 为滚动格数（系统步进）。',
    inputSchema: z
      .object({
        direction: z.enum(['up', 'down', 'left', 'right']),
        amount: z.number().int().positive().optional().default(1).describe('滚动格数'),
      })
      .strict(),
  },
  wrap(async ({ direction, amount }) => {
    return await core.mouse.scroll(direction, amount);
  })
);

server.registerTool(
  'mouseDrag',
  {
    title: '鼠标拖拽',
    description:
      '按住左键从 (fromX,fromY) 拖到 (toX,toY) 后释放（拖拽选中/移动）。' +
      'steps 为插值步数，duration 为总时长 ms。拖拽结束自动释放左键。',
    inputSchema: z
      .object({
        fromX: z.number().int().describe('起点物理 x'),
        fromY: z.number().int().describe('起点物理 y'),
        toX: z.number().int().describe('终点物理 x'),
        toY: z.number().int().describe('终点物理 y'),
        steps: z.number().int().positive().optional().default(20),
        duration: z.number().int().positive().optional().default(300),
      })
      .strict(),
  },
  wrap(async ({ fromX, fromY, toX, toY, steps, duration }) => {
    return await core.mouse.drag(fromX, fromY, toX, toY, { steps, duration });
  })
);

server.registerTool(
  'mousePress',
  {
    title: '按住鼠标按钮',
    description: '在 (x,y) 按住指定按钮（长按起点）。必须与 mouseRelease 配对，防止锁死。',
    inputSchema: z
      .object({
        x: z.number().int(),
        y: z.number().int(),
        button: z.enum(['left', 'right', 'middle']).optional().default('left'),
      })
      .strict(),
  },
  wrap(async ({ x, y, button }) => {
    return await core.mouse.press(x, y, button);
  })
);

server.registerTool(
  'mouseRelease',
  {
    title: '释放鼠标按钮',
    description: '释放指定按钮。长按/拖拽结束必须调用，防止鼠标锁死。',
    inputSchema: z
      .object({
        button: z.enum(['left', 'right', 'middle']).optional().default('left'),
      })
      .strict(),
  },
  wrap(async ({ button }) => {
    return await core.mouse.release(button);
  })
);

server.registerTool(
  'getMousePosition',
  {
    title: '获取鼠标位置',
    description: '获取当前鼠标位置（物理像素 + 逻辑像素双坐标系）。',
    inputSchema: z.object({}).strict(),
  },
  wrap(async () => {
    return await core.mouse.getPosition();
  })
);

// ============ 键盘 ============

server.registerTool(
  'keyboardType',
  {
    title: '输入文本（剪贴板粘贴）',
    description:
      '输入文本（含中文/特殊字符），走"剪贴板粘贴 + Ctrl+V"方案，绕开输入法(IME)问题。' +
      '默认粘贴后恢复原剪贴板内容。enter=true 时输入后按回车。' +
      '终端类应用可能需 shortcut="ctrl+shift+v"。',
    inputSchema: z
      .object({
        text: z.string().describe('要输入的文本（支持中文/换行）'),
        enter: z.boolean().optional().default(false).describe('输入后按回车'),
        shortcut: z.enum(['ctrl+v', 'ctrl+shift+v']).optional().default('ctrl+v').describe('粘贴快捷键'),
      })
      .strict(),
  },
  wrap(async ({ text, enter, shortcut }) => {
    return await core.type.typeText(text, { enter, shortcut });
  })
);

server.registerTool(
  'keyboardKey',
  {
    title: '按键/组合键',
    description:
      '按键或组合键，如 "enter"、"ctrl+c"、"alt+tab"、"ctrl+shift+esc"、"win+r"。' +
      '支持修饰键 ctrl/shift/alt/win、字母、数字、F1-F24、方向键、小键盘 num0-9 等。' +
      '按键自动释放，防止卡键。',
    inputSchema: z
      .object({
        keys: z.string().min(1).describe('按键组合，+ 连接'),
      })
      .strict(),
  },
  wrap(async ({ keys }) => {
    return await core.key.key(keys);
  })
);

// ============ 窗口 ============

server.registerTool(
  'windowList',
  {
    title: '列出窗口',
    description: '列出所有可见顶层窗口：句柄、PID、标题、矩形（逻辑坐标）。',
    inputSchema: z.object({}).strict(),
  },
  wrap(async () => {
    const wins = await core.window.listWindows();
    return { success: true, count: wins.length, windows: wins };
  })
);

server.registerTool(
  'windowActivate',
  {
    title: '激活窗口',
    description: '将窗口激活到前台。target 可按窗口句柄 handle / 标题 title（子串）/ PID 定位。',
    inputSchema: z
      .object({
        handle: z.number().int().optional(),
        title: z.string().optional(),
        pid: z.number().int().optional(),
      })
      .strict()
      .refine((t) => t.handle !== undefined || t.title !== undefined || t.pid !== undefined, {
        message: '需提供 handle / title / pid 之一',
      }),
  },
  wrap(async (target) => {
    return await core.window.activateWindow(target);
  })
);

server.registerTool(
  'windowControl',
  {
    title: '窗口控制（最小化/最大化/恢复/关闭）',
    description:
      '控制窗口状态。action: minimize/maximize/restore/close。' +
      'target 按 handle/title/pid 定位。close 默认优雅关闭（WM_CLOSE），force=true 强杀进程。',
    inputSchema: z
      .object({
        action: z.enum(['minimize', 'maximize', 'restore', 'close']),
        handle: z.number().int().optional(),
        title: z.string().optional(),
        pid: z.number().int().optional(),
        force: z.boolean().optional().default(false).describe('close 时强杀进程'),
      })
      .strict()
      .refine((t) => t.handle !== undefined || t.title !== undefined || t.pid !== undefined, {
        message: '需提供 handle / title / pid 之一',
      }),
  },
  wrap(async ({ action, handle, title, pid, force }) => {
    const target = { handle, title, pid };
    switch (action) {
      case 'minimize': return await core.window.minimizeWindow(target);
      case 'maximize': return await core.window.maximizeWindow(target);
      case 'restore': return await core.window.restoreWindow(target);
      case 'close': return await core.window.closeWindow(target, { force });
    }
  })
);

server.registerTool(
  'windowMove',
  {
    title: '移动窗口',
    description: '将窗口移动到物理像素坐标 (x,y)（左上角）。target 按 handle/title/pid 定位。',
    inputSchema: z
      .object({
        x: z.number().int(),
        y: z.number().int(),
        handle: z.number().int().optional(),
        title: z.string().optional(),
        pid: z.number().int().optional(),
      })
      .strict()
      .refine((t) => t.handle !== undefined || t.title !== undefined || t.pid !== undefined, {
        message: '需提供 handle / title / pid 之一',
      }),
  },
  wrap(async ({ x, y, handle, title, pid }) => {
    return await core.window.moveWindow({ handle, title, pid }, x, y);
  })
);

server.registerTool(
  'windowResize',
  {
    title: '缩放窗口',
    description: '将窗口缩放到物理像素尺寸 (width,height)。target 按 handle/title/pid 定位。',
    inputSchema: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        handle: z.number().int().optional(),
        title: z.string().optional(),
        pid: z.number().int().optional(),
      })
      .strict()
      .refine((t) => t.handle !== undefined || t.title !== undefined || t.pid !== undefined, {
        message: '需提供 handle / title / pid 之一',
      }),
  },
  wrap(async ({ width, height, handle, title, pid }) => {
    return await core.window.resizeWindow({ handle, title, pid }, width, height);
  })
);

// ============ 进程 / 剪贴板 / 等待 ============

server.registerTool(
  'processLaunch',
  {
    title: '启动进程',
    description: '启动一个程序/命令，返回 PID。例：processLaunch("notepad.exe")、processLaunch("powershell.exe", ["-NoProfile"])。',
    inputSchema: z
      .object({
        command: z.string().min(1).describe('可执行文件路径或命令'),
        args: z.array(z.string()).optional().default([]).describe('参数列表'),
      })
      .strict(),
  },
  wrap(async ({ command, args }) => {
    return await core.window.launchProcess(command, args);
  })
);

server.registerTool(
  'clipboardGet',
  {
    title: '读取剪贴板',
    description: '读取当前剪贴板文本。常用于验证复制操作结果。',
    inputSchema: z.object({}).strict(),
  },
  wrap(async () => {
    return await core.clipboard.getText();
  })
);

server.registerTool(
  'clipboardSet',
  {
    title: '设置剪贴板',
    description: '设置剪贴板文本（临时存储，供粘贴等使用）。',
    inputSchema: z.object({ text: z.string() }).strict(),
  },
  wrap(async ({ text }) => {
    return await core.clipboard.setText(text);
  })
);

server.registerTool(
  'wait',
  {
    title: '等待',
    description: '等待指定毫秒数。用于等待窗口出现/动画完成/网络响应。',
    inputSchema: z.object({ ms: z.number().int().min(0).describe('毫秒') }).strict(),
  },
  wrap(async ({ ms }) => {
    return await core.wait.wait(ms);
  })
);

// ============ 启动 ============

try {
  await serveStdio(() => server);
} catch (e) {
  log('computer-use-mcp 启动失败:', e.message);
  process.exit(1);
}
