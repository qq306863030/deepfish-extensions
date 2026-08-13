const { keyboard, Key } = require('@nut-tree-fork/nut-js');
const chalk = require('chalk');
const ime = require('./ime');

class TypeCommand {
  async execute(text, options) {
    const startTime = Date.now();

    try {
      // Display execution info
      console.log(chalk.blue(`\u2328\ufe0f  Start typing...`));
      console.log(chalk.gray(`  Content: "${text}"`));
      console.log(chalk.gray(`  Length: ${text.length} chars`));

      const delay = parseInt(options.delay) || 50;
      const enter = options.enter || false;
      // IME handling options:
      //   --english        : switch to a non-Chinese IME before typing, restore after
      //   --no-restore     : do not restore the previous IME state after typing
      //   --no-switch      : do not touch the IME at all (use whatever is active)
      //   --ime-strict     : fail (throw) if no non-Chinese IME can be found
      const wantEnglish = !!options.english;
      const doRestore = wantEnglish && !options.noRestore;
      const doSwitch = wantEnglish && !options.noSwitch;
      const strict = !!options.imeStrict;

      console.log(chalk.gray(`  Delay: ${delay}ms`));
      console.log(chalk.gray(`  Enter after: ${enter ? 'yes' : 'no'}`));
      console.log(chalk.gray(`  IME switch: ${doSwitch ? (wantEnglish ? 'to-english' : 'off') : 'no'}`));
      if (doSwitch) {
        console.log(chalk.gray(`  IME restore: ${doRestore ? 'yes' : 'no'}`));
      }

      // Set keyboard delay
      keyboard.config.autoDelayMs = delay;

      // Capture current IME state and optionally switch
      let prevIme = null;
      let switchResult = null;
      if (doSwitch) {
        prevIme = await ime.getCurrent();
        console.log(chalk.gray(`  IME before: layout=${prevIme.layoutHex} isChinese=${prevIme.isChinese} (${prevIme.title})`));
        switchResult = await ime.switchToEnglish({ maxSteps: 5, settleMs: 300 });
        console.log(chalk.gray(`  IME switch: ${switchResult.switched ? 'OK' : 'FAILED'} (${switchResult.reason}, attempts=${switchResult.attempts})`));
        if (!switchResult.switched && strict) {
          throw new Error(`Cannot switch to a non-Chinese IME: ${switchResult.reason}. Install an English keyboard or pass --no-switch.`);
        }
        if (!switchResult.switched) {
          console.log(chalk.yellow(`  \u26a0\ufe0f  Could not switch IME (${switchResult.reason}); typing into the active IME. If you see Chinese output, install an English keyboard layout.`));
        }
      }

      // Type the text
      await keyboard.type(text);

      // Optional: press Enter and auto-release
      if (enter) {
        await keyboard.pressKey(Key.Enter);
        await keyboard.releaseKey(Key.Enter);
        console.log(chalk.gray(`  Pressed Enter`));
      }

      // Restore previous IME state
      if (doSwitch && doRestore && prevIme && switchResult && switchResult.switched) {
        const restoreResult = await ime.restore(prevIme, { maxSteps: 5, settleMs: 300 });
        console.log(chalk.gray(`  IME restore: ${restoreResult.restored ? 'OK' : 'FAILED'} (${restoreResult.reason}, attempts=${restoreResult.attempts})`));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(chalk.green(`\u2705 Type done!`));
      console.log(chalk.gray(`  Duration: ${duration}ms`));

      return {
        success: true,
        text,
        length: text.length,
        enter,
        duration,
        ime: {
          switched: switchResult ? switchResult.switched : null,
          before: prevIme,
          switchResult,
        },
      };
    } catch (error) {
      console.error(chalk.red(`\u274c Type failed:`), error.message);
      throw error;
    }
  }
}

module.exports = new TypeCommand();
