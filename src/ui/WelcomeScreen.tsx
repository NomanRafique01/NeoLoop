/**
 * NeoLoop CLI — Welcome Screen with Terminal Input Bar
 *
 * Renders the post-splash welcome UI: a full-width terminal input bar that
 * appears immediately below the static ANSI banner (logo + tagline).
 *
 * Color palette mirrors splash.ts exactly:
 *   LOGO_BODY    #39ff6a  — borders, prompt ">"
 *   LOGO_SHADING #1f9e47  — placeholder, history echo
 *   TAGLINE      #39FF88  — user-typed text
 *   HEAD         #d7ffe1  — blinking cursor block
 */

import React, { useEffect, useState } from 'react';
import { Box, Text, useStdout } from 'ink';

// ---------------------------------------------------------------------------
// Theme — single source of truth, copied from splash.ts constants
// ---------------------------------------------------------------------------
const THEME = {
  border:      '#39ff6a',  // LOGO_BODY    — top / bottom bar rules
  prompt:      '#39ff6a',  // LOGO_BODY    — the ">" glyph
  typed:       '#39FF88',  // TAGLINE      — user-typed text
  placeholder: '#1f9e47',  // LOGO_SHADING — muted hint
  cursor:      '#d7ffe1',  // HEAD         — blinking block
  history:     '#1f9e47',  // LOGO_SHADING — submitted-line echo
} as const;

const PLACEHOLDER      = 'Type your message or ask NEDLOOP anything...';
const CURSOR_BLINK_MS  = 530;

// ---------------------------------------------------------------------------
// Blinking solid cursor
// ---------------------------------------------------------------------------
function BlinkingCursor() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setOn(v => !v), CURSOR_BLINK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Text
      backgroundColor={on ? THEME.cursor : undefined}
      color={on ? '#000000' : THEME.cursor}
    >
      {' '}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// History line — dim echo of a submitted command
// ---------------------------------------------------------------------------
function HistoryLine({ text }: { text: string }) {
  return (
    <Box paddingLeft={1}>
      <Text color={THEME.history} dimColor>
        {'> '}{text}
      </Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// InputBar — top border / prompt row / bottom border
// ---------------------------------------------------------------------------
interface InputBarProps {
  value:           string;
  showPlaceholder: boolean;
  cols:            number;
}

function InputBar({ value, showPlaceholder, cols }: InputBarProps) {
  // subtract 2 for the 1-char left + right padding inside the bar
  const ruleWidth = Math.max(1, cols - 2);
  const rule      = '─'.repeat(ruleWidth);

  return (
    <Box flexDirection="column">

      {/* ── top border ── */}
      <Box paddingLeft={1} paddingRight={1}>
        <Text color={THEME.border}>{rule}</Text>
      </Box>

      {/* ── prompt row: > [placeholder OR typed text][cursor] ── */}
      <Box flexDirection="row" paddingLeft={2} paddingRight={1}>
        <Text color={THEME.prompt} bold>{'> '}</Text>

        {showPlaceholder ? (
          /*
           * Placeholder visible — cursor sits immediately after it.
           * The moment the user types one character showPlaceholder flips
           * to false and the placeholder disappears entirely.
           */
          <>
            <Text color={THEME.placeholder}>{PLACEHOLDER}</Text>
            <BlinkingCursor />
          </>
        ) : (
          /*
           * User is typing — show typed text in accent color followed by
           * blinking cursor. No placeholder rendered at all.
           */
          <>
            <Text color={THEME.typed}>{value}</Text>
            <BlinkingCursor />
          </>
        )}
      </Box>

      {/* ── bottom border ── */}
      <Box paddingLeft={1} paddingRight={1}>
        <Text color={THEME.border}>{rule}</Text>
      </Box>

    </Box>
  );
}

// ---------------------------------------------------------------------------
// WelcomeScreen — history list + input bar
// ---------------------------------------------------------------------------
export interface WelcomeScreenProps {
  input:   string;
  history: string[];
}

export function WelcomeScreen({ input, history }: WelcomeScreenProps) {
  const { stdout } = useStdout();
  // useStdout gives us the live stream; cols updates on terminal resize
  const cols = stdout.columns ?? 80;

  return (
    <Box flexDirection="column">
      {history.map((line, idx) => (
        <HistoryLine key={idx} text={line} />
      ))}

      <InputBar
        value={input}
        showPlaceholder={input.length === 0}
        cols={cols}
      />
    </Box>
  );
}
