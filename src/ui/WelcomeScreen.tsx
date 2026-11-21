/**
 * NeoLoop CLI — Welcome Screen with Terminal Input Bar
 *
 * Renders the post-splash welcome UI: a full-width terminal input bar that
 * appears immediately below the matrix animation zone. Matches the NEOLOOP
 * logo colour palette exactly — no alien colours introduced.
 *
 * Color palette (mirrors splash.ts):
 *   LOGO_BODY    #39ff6a  — primary neon green (prompt glyph, top/bottom borders)
 *   LOGO_SHADING #1f9e47  — dim green (placeholder, muted output lines)
 *   TAGLINE      #39FF88  — bright accent (typed text)
 *   HEAD         #d7ffe1  — near-white highlight (blinking cursor block)
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

// ---------------------------------------------------------------------------
// Theme — single source of truth, matches splash.ts exactly
// ---------------------------------------------------------------------------
const THEME = {
  border:      '#39ff6a',  // LOGO_BODY  — top/bottom bar borders
  prompt:      '#39ff6a',  // LOGO_BODY  — the ">" glyph
  typed:       '#39FF88',  // TAGLINE    — user-typed text
  placeholder: '#1f9e47',  // LOGO_SHADING — muted hint text
  cursor:      '#d7ffe1',  // HEAD       — blinking block cursor
  history:     '#1f9e47',  // LOGO_SHADING — submitted-line echo
} as const;

const PLACEHOLDER = 'Type your message or ask NEDLOOP anything...';
const CURSOR_INTERVAL_MS = 530;

// ---------------------------------------------------------------------------
// Blinking cursor — solid block, toggles on the classic terminal cadence
// ---------------------------------------------------------------------------
function BlinkingCursor() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setVisible(v => !v), CURSOR_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Always occupies one character cell so the layout stays stable
  return (
    <Text backgroundColor={visible ? THEME.cursor : undefined} color={visible ? '#000000' : THEME.cursor}>
      {' '}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Thin horizontal rule using box-drawing characters
// ---------------------------------------------------------------------------
function HRule({ color }: { color: string }) {
  return (
    <Box>
      <Text color={color}>{'─'.repeat(1)}</Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// History line — dim echo of a previously submitted command
// ---------------------------------------------------------------------------
function HistoryLine({ text }: { text: string }) {
  return (
    <Box paddingLeft={1}>
      <Text color={THEME.history} dimColor>
        {'> '}
        {text}
      </Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// The input bar itself — top border / prompt / text / cursor / bottom border
// ---------------------------------------------------------------------------
interface InputBarProps {
  value: string;
  showPlaceholder: boolean;
}

function InputBar({ value, showPlaceholder }: InputBarProps) {
  return (
    <Box flexDirection="column" width="100%">
      {/* ── top border ── */}
      <Box width="100%">
        <Text color={THEME.border}>
          {'─'.repeat(Math.max(1, (process.stdout.columns || 80) - 1))}
        </Text>
      </Box>

      {/* ── prompt row ── */}
      <Box flexDirection="row" paddingLeft={1} paddingRight={1}>
        {/* classic terminal ">" */}
        <Text color={THEME.prompt} bold>{'> '}</Text>

        {/* typed text or muted placeholder */}
        {showPlaceholder ? (
          <Text color={THEME.placeholder}>{PLACEHOLDER}</Text>
        ) : (
          <Text color={THEME.typed}>{value}</Text>
        )}

        {/* blinking solid cursor — only shown when no placeholder */}
        {!showPlaceholder && <BlinkingCursor />}
        {/* when placeholder is shown, still render cursor after it */}
        {showPlaceholder && <BlinkingCursor />}
      </Box>

      {/* ── bottom border ── */}
      <Box width="100%">
        <Text color={THEME.border}>
          {'─'.repeat(Math.max(1, (process.stdout.columns || 80) - 1))}
        </Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// WelcomeScreen — composes history + input bar
// ---------------------------------------------------------------------------
export interface WelcomeScreenProps {
  input: string;
  history: string[];
}

export function WelcomeScreen({ input, history }: WelcomeScreenProps) {
  const showPlaceholder = input.length === 0;

  return (
    <Box flexDirection="column" width="100%">
      {/* Submitted lines echoed above the input bar */}
      {history.map((line, idx) => (
        <HistoryLine key={idx} text={line} />
      ))}

      {/* Terminal input bar — sits right where the matrix animation ended */}
      <InputBar value={input} showPlaceholder={showPlaceholder} />
    </Box>
  );
}
