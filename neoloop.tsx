/**
 * NeoLoop CLI — Main Entrypoint
 *
 * Terminal-native CLI with persistent cyberpunk matrix animation,
 * anchored ASCII typography and tagline shimmer, dotted rain boundary,
 * and live input bar. As user inputs commands and the tool proceeds,
 * logs scroll down below while the splash screen stays permanently anchored.
 */
import React, { useState } from 'react';
import { render, useInput } from 'ink';
import { runSplash } from './src/core/splash.js';
import { WelcomeScreen } from './src/ui/WelcomeScreen.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const APP_NAME = 'NEOLOOP';
const TAGLINE  = 'THINK. CODE. EXECUTE.';

// PowerShell + CMD both expose a real TTY — but when npm spawns tsx as a child
// process on some shells (PowerShell in particular), isTTY can come back
// undefined even though the terminal is fully interactive.  We detect a live
// terminal by the presence of stdout.columns (always set when a real console
// is attached) and fall through to the full splash unless explicitly opted out.
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
  const [history, setHistory] = useState<string[]>([]);

  useInput((ch, key) => {
    if (key.ctrl && ch === 'c') process.exit(0);
    if (key.return) {
      const trimmed = input.trim();
      if (trimmed) setHistory(prev => [...prev, trimmed]);
      setInput('');
      return;
    }
    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }
    if (ch) setInput(prev => prev + ch);
  });

  return <WelcomeScreen input={input} history={history} />;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
if (SKIP_SPLASH) {
  render(<NonTTYApp />);
} else {
  // Splash screen stays permanently anchored and animated at 20 FPS.
  // Input bar sits just under the rain with the colored dotted separator.
  // Output logs scroll down naturally below as commands execute.
  await runSplash({
    title: APP_NAME,
    tagline: TAGLINE,
    onCommand: async (cmd, log) => {
      // Wire command into coding-agent execution flow
      log(`[neoloop] processing: "${cmd}"`);
      // Future agent step outputs scroll down below here
    },
  });
}
