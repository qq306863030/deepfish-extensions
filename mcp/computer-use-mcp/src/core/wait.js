/**
 * 等待模块：sleep 指定毫秒（MCP 场景下没有 shell sleep 可用）
 */

/**
 * 等待指定毫秒数。
 * @param {number} ms 毫秒（>=0）
 */
export async function wait(ms) {
  const n = Math.max(0, Math.round(Number(ms) || 0));
  await new Promise((r) => setTimeout(r, n));
  return { success: true, waited: n };
}
