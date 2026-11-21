/**
 * NeoLoop CLI — Main Entrypoint
 *
 * Boots the terminal splash screen then renders the interactive welcome UI
 * with the terminal-style input bar. Keyboard handling drives the agent
 * execution flow: Enter submits, Backspace/Delete edits, Ctrl-C exits.
 */
import React, { useState } from 'react';
import { render, useInput } from 'ink';
import { runSplash } from './src/core/index.js';
import { WelcomeScreen } from './src/ui/index.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const APP_NAME = 'NEOLOOP';
const TAGLINE  = 'THINK. CODE. EXECUTE.';

const SKIP_SPLASH =
  !process.stdout.isTTY ||
  Boolean(process.env.NO_COLOR) ||
  process.argv.includes('--no-splash');

// ---------------------------------------------------------------------------
// Root App — keyboard handling + agent execution hook
// ---------------------------------------------------------------------------
function App({ initialInput }: { initialInput: string }) {
  const [input,   setInput]   = useState(initialInput);
  const [history, setHistory] = useState<string[]>([]);

  useInput((ch, key) => {
    // ── Global exits ──────────────────────────────────────────────────────
    if (key.ctrl && ch === 'c') process.exit(0);

    // ── Ignore modifier-only or escape sequences ──────────────────────────
    if (key.meta) return;
    if (key.escape || key.tab) return;

    // ── Enter — submit through agent execution flow ───────────────────────
    if (key.return) {
      const trimmed = input.trim();
      if (trimmed) {
        // TODO: wire trimmed into the coding-agent execution engine
        setHistory(prev => [...prev, trimmed]);
      }
      setInput('');
      return;
    }

    // ── Backspace / Delete ────────────────────────────────────────────────
    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }

    // ── Printable character ───────────────────────────────────────────────
    if (ch) {
      setInput(prev => prev + ch);
    }
  });

  return <WelcomeScreen input={input} history={history} />;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
const firstKey = SKIP_SPLASH
  ? ''
  : await runSplash({ title: APP_NAME, tagline: TAGLINE });

render(<App initialInput={firstKey} />);
