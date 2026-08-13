/**
 * IME (Input Method Editor) management module for Windows.
 *
 * Problem: When typing via simulated keystrokes (e.g. keyboard.type('hello')),
 * Windows will run the keystrokes through the active IME. If a Chinese IME
 * (Microsoft Pinyin, Sogou, etc.) is active, the typed characters will be
 * interpreted as pinyin and converted to Chinese characters. This is almost
 * never what an automation script wants.
 *
 * This module provides tools to:
 *   - Query the current IME state (Chinese vs non-Chinese, layout hex)
 *   - Switch to a non-Chinese IME by simulating Win+Space
 *   - Restore the previous IME state after typing
 *
 * Implementation notes:
 *   - Win+Space is the standard Windows shortcut to switch IMEs
 *   - We use PowerShell + Win32 GetKeyboardLayout API to detect the layout
 *   - We keep a PowerShell script (ime_query.ps1) and shell out to it
 *     because PowerShell here-strings (@"..."@) cannot live inside
 *     -Command "..." arguments
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { keyboard, Key } = require('@nut-tree-fork/nut-js');
const chalk = require('chalk');

const SCRIPT_DIR = __dirname;
const QUERY_PS1 = path.join(SCRIPT_DIR, 'ime_query.ps1');

class IMEManager {
  /**
   * Get the current keyboard layout of the foreground window.
   * Returns: Promise<{ title, layoutHex, isChinese }>
   */
  async getCurrent() {
    return new Promise((resolve) => {
      let stdout = '';
      try {
        stdout = execFileSync('powershell.exe', [
          '-NoProfile',
          '-ExecutionPolicy', 'Bypass',
          '-File', QUERY_PS1
        ], { encoding: 'utf8', windowsHide: true });
      } catch (e) {
        stdout = (e.stdout || '') + (e.stderr || '');
      }
      let title = '';
      let layoutHex = '0x0';
      let isChinese = false;
      for (const line of stdout.split(/\r?\n/)) {
        const t = line.match(/^TITLE=(.*)$/);
        if (t) title = t[1];
        const l = line.match(/^LAYOUT=(.*)$/);
        if (l) layoutHex = l[1];
        const c = line.match(/^ISCN=(.*)$/);
        if (c) isChinese = c[1].toLowerCase() === 'true';
      }
      resolve({ title, layoutHex, isChinese });
    });
  }

  /**
   * Press Win+Space N times to cycle through IMEs.
   */
  async pressWinSpace(times = 1) {
    keyboard.config.autoDelayMs = 80;
    for (let i = 0; i < times; i++) {
      await keyboard.pressKey(Key.LeftMeta, Key.Space);
      await keyboard.releaseKey(Key.LeftMeta, Key.Space);
      await this.sleep(150);
    }
  }

  /**
   * Try to switch to a non-Chinese IME by pressing Win+Space and re-checking
   * the layout. Stops when isChinese becomes false, or after maxSteps.
   *
   * Returns: { switched, before, after, attempts, reason }
   */
  async switchToEnglish({ maxSteps = 5, settleMs = 300 } = {}) {
    const before = await this.getCurrent();
    if (!before.isChinese) {
      return { switched: false, before, after: before, attempts: 0, reason: 'already-non-chinese' };
    }
    let after = before;
    let attempts = 0;
    for (let i = 0; i < maxSteps; i++) {
      await this.pressWinSpace(1);
      await this.sleep(settleMs);
      after = await this.getCurrent();
      attempts++;
      if (!after.isChinese) {
        return { switched: true, before, after, attempts, reason: 'win-space-cycled' };
      }
    }
    return { switched: false, before, after, attempts, reason: 'no-english-ime-available' };
  }

  /**
   * Restore the IME to a previously captured state.
   * Compares the current isChinese flag against the snapshot and presses
   * Win+Space until they match (or maxSteps reached).
   */
  async restore(prevState, { maxSteps = 5, settleMs = 300 } = {}) {
    if (!prevState) {
      return { restored: false, reason: 'no-prev-state' };
    }
    const cur = await this.getCurrent();
    if (cur.isChinese === prevState.isChinese) {
      return { restored: true, attempts: 0, reason: 'already-target' };
    }
    let attempts = 0;
    for (let i = 0; i < maxSteps; i++) {
      await this.pressWinSpace(1);
      await this.sleep(settleMs);
      attempts++;
      const c = await this.getCurrent();
      if (c.isChinese === prevState.isChinese) {
        return { restored: true, attempts, reason: 'win-space-cycled' };
      }
    }
    return { restored: false, attempts, reason: 'unable-to-restore' };
  }

  /**
   * List installed languages / IMEs.
   * Returns: Promise<Array<{ tag, name }>>
   */
  async list() {
    return new Promise((resolve, reject) => {
      try {
        const out = execFileSync('powershell.exe', [
          '-NoProfile', '-ExecutionPolicy', 'Bypass',
          '-Command', "Get-WinUserLanguageList | ForEach-Object { Write-Output ($_.LanguageTag + '|' + $_.EnglishName) }"
        ], { encoding: 'utf8', windowsHide: true });
        const list = out.split(/\r?\n/).filter(Boolean).map((line) => {
          const [tag, name] = line.split('|');
          return { tag: (tag || '').trim(), name: (name || '').trim() };
        });
        resolve(list);
      } catch (e) {
        reject(e);
      }
    });
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = new IMEManager();
