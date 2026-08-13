/**
 * core 控制层汇总导出
 *
 * 说明：core 层不依赖 MCP SDK / zod，可独立单元测试。
 */

import * as coord from './coord.js';
import * as screenshot from './screenshot.js';
import * as mouse from './mouse.js';
import * as key from './key.js';
import * as type from './type.js';
import * as clipboard from './clipboard.js';
import * as window from './window.js';
import * as info from './info.js';
import * as wait from './wait.js';

export { coord, screenshot, mouse, key, type, clipboard, window, info, wait };
