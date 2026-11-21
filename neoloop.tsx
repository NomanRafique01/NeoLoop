/**
 * NeoLoop CLI — Main Entrypoint
 *
 * Terminal-native CLI with persistent matrix animation,
 * anchored ASCII typography and tagline shimmer, dotted rain boundary,
 * live input bar, and dynamic token-based theme engine (Phantom, Matrix, etc.).
 */
import React, { useState } from 'react';
import { render, useInput } from 'ink';
import { runSplash } from './src/core/splash.js';
import { WelcomeScreen } from './src/ui/WelcomeScreen.js';
import { copyToClipboard, readFromClipboard } from './src/core/clipboard.js';
import { ThemeProvider, processSlashCommand, getCurrentTheme } from './src/theme/index.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const APP_NAME = 'NEOLOOP';
const TAGLINE  = 'THINK. CODE. EXECUTE.';

const hasTTY = process.stdout.isTTY === true || (process.stdout.columns ?? 0) > 0;
const SKIP_SPLASH =
  !hasTTY ||
  Boolean(process.env.NO_COLOR) ||
  process.argv.includes('--no-splash');

// ---------------------------------------------------------------------------
// Fallback Ink App for non-TTY / no-color environments
// ---------------------------------------------------------------------------
function NonTTYApp() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([
    `[neoloop] Active theme: ${getCurrentTheme().name} (type /theme or /help for commands)`,
  ]);
  const [isSelectedAll, setIsSelectedAll] = useState(false);

  useInput((ch, key) => {
    // Mouse click event or sequence: unselect if selected all
    if (ch && (ch.includes('\x1b[<') || ch.includes('\x1b[M'))) {
      if (isSelectedAll) {
        setIsSelectedAll(false);
      }
      return;
    }

    // Ctrl + A: select all text in input bar
    if (key.ctrl && (ch === 'a' || ch === '\x01')) {
      if (input.length > 0) {
        setIsSelectedAll(true);
      }
      return;
    }

    // Ctrl + C: copy selection or full input text
    if (key.ctrl && (ch === 'c' || ch === '\x03')) {
      if (input) {
        copyToClipboard(input);
        return;
      }
      process.exit(0);
    }

    // Ctrl + V: paste and replace selection if selected
    if (key.ctrl && (ch === 'v' || ch === '\x16')) {
      readFromClipboard().then(pasted => {
        if (pasted) {
          const clean = pasted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          if (isSelectedAll) {
            setInput(clean);
            setIsSelectedAll(false);
          } else {
            setInput(prev => prev + clean);
          }
        }
      });
      return;
    }

    // Ctrl + X: cut selection or input
    if (key.ctrl && (ch === 'x' || ch === '\x18')) {
      if (input) {
        copyToClipboard(input);
        setInput('');
        setIsSelectedAll(false);
      }
      return;
    }

    // Escape: clear selection first, then clear input
    if (key.escape) {
      if (isSelectedAll) {
        setIsSelectedAll(false);
        return;
      }
      setInput('');
      return;
    }

    // Shift + Enter / Linefeed: change line like WhatsApp instead of sending
    if ((key.return && key.shift) || (ch === '\n' && !key.return)) {
      if (isSelectedAll) {
        setInput('\n');
        setIsSelectedAll(false);
      } else {
        setInput(prev => prev + '\n');
      }
      return;
    }

    // Enter / Return (without shift): submit command
    if (key.return) {
      setIsSelectedAll(false);
      const trimmed = input.trim();
      if (trimmed) {
        setHistory(prev => [...prev, '> ' + trimmed]);
        const handled = processSlashCommand(trimmed, line => {
          setHistory(prev => [...prev, line]);
        });
        if (!handled) {
          setHistory(prev => [...prev, `[neoloop] processing: "${trimmed}"`]);
        }
      }
      setInput('');
      return;
    }

    // Backspace / Delete: delete selection if active, otherwise delete 1 char
    if (key.backspace || key.delete) {
      if (isSelectedAll) {
        setInput('');
        setIsSelectedAll(false);
        return;
      }
      setInput(prev => prev.slice(0, -1));
      return;
    }

    // Arrow keys: navigation clears selection
    if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
      setIsSelectedAll(false);
      return;
    }

    // Printable character: replace selection if selected all, else append
    if (ch && !key.ctrl && !key.meta) {
      if (isSelectedAll) {
        setInput(ch);
        setIsSelectedAll(false);
      } else {
        setInput(prev => prev + ch);
      }
    }
  }, { isActive: Boolean(process.stdin.isTTY) });

  return (
    <ThemeProvider>
      <WelcomeScreen input={input} history={history} isSelectedAll={isSelectedAll} />
    </ThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
if (SKIP_SPLASH) {
  render(<NonTTYApp />);
} else {
  // Splash screen stays permanently anchored and animated at 20 FPS.
  // Input bar sits just under the rain with the theme border separator.
  // Output logs scroll down naturally below as commands execute.
  await runSplash({
    title: APP_NAME,
    tagline: TAGLINE,
    onCommand: async (cmd, log) => {
      // Wire command into coding-agent execution flow
      log(`processing: "${cmd}"`);
    },
  });
}
