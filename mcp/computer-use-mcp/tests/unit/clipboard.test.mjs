/**
 * 剪贴板单元测试（读写真实剪贴板，但会恢复原内容）
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getText, setText, withClipboard } from '../../src/core/clipboard.js';

test('剪贴板 set/get 往返（含中文/emoji）', async () => {
  const orig = (await getText()).text;
  const sample = '测试文本-中文-emoji-🚀-special-!@#$%';
  await setText(sample);
  const back = (await getText()).text;
  assert.equal(back, sample);
  // 恢复原内容
  await setText(orig);
});

test('withClipboard 临时设置后恢复原内容', async () => {
  const orig = (await getText()).text;
  const marker = 'TEMPORARY-CLIPBOARD-测试';
  const result = await withClipboard(marker, async () => {
    const cur = (await getText()).text;
    assert.equal(cur, marker);
    return 'done';
  });
  assert.equal(result, 'done');
  const after = (await getText()).text;
  assert.equal(after, orig, '应恢复原剪贴板内容');
});

test('setText 非字符串抛错', async () => {
  await assert.rejects(() => setText(123), /必须是字符串/);
});
