/**
 * 按键解析单元测试
 * 不触碰真实键盘
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKeys, listKeys } from '../../src/core/key.js';

test('解析组合键 ctrl+shift+esc', () => {
  const keys = parseKeys('ctrl+shift+esc');
  assert.equal(keys.length, 3);
});

test('esc（枚举值为 0）能正确解析', () => {
  const keys = parseKeys('esc');
  assert.equal(keys.length, 1);
});

test('单个字母 a', () => {
  const keys = parseKeys('a');
  assert.equal(keys.length, 1);
});

test('大写输入归一化（CTRL+C -> 小写）', () => {
  const keys = parseKeys('CTRL+C');
  assert.equal(keys.length, 2);
});

test('数字键 digit', () => {
  const keys = parseKeys('1');
  assert.equal(keys.length, 1);
});

test('小键盘 num0', () => {
  const keys = parseKeys('num0');
  assert.equal(keys.length, 1);
});

test('F13-F24 存在', () => {
  for (let i = 13; i <= 24; i++) {
    const keys = parseKeys(`f${i}`);
    assert.equal(keys.length, 1, `f${i} 应可解析`);
  }
});

test('多媒体键', () => {
  const v = parseKeys('volumeup');
  assert.equal(v.length, 1);
});

test('未知按键抛错', () => {
  assert.throws(() => parseKeys('notakey'), /未知按键/);
});

test('空按键串抛错', () => {
  assert.throws(() => parseKeys(''), /按键串为空/);
  assert.throws(() => parseKeys('   '), /按键串为空/);
});

test('按键表非空且无重复', () => {
  const keys = listKeys();
  assert.ok(keys.length > 30, '按键表应覆盖常见按键');
  assert.equal(new Set(keys).size, keys.length, '按键表无重复');
});

test('三键组合', () => {
  const keys = parseKeys('ctrl+shift+esc');
  assert.equal(keys.length, 3);
});
