/**
 * NeoLoop CLI — Welcome Screen with Terminal Input Bar
 *
 * Renders the post-splash welcome UI: a full-width terminal input bar that
 * appears immediately below the static ANSI banner (logo + tagline).
 *
 * Driven by the centralized theme token engine (useTheme hook).
 */

import React, { useEffect, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import { useTheme } from '../theme/index.js';

// ---------------------------------------------------------------------------
// Blinking solid cursor
// ---------------------------------------------------------------------------
function BlinkingCursor() {
  const theme = useTheme();
  const [on, setOn] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setOn(v => !v), 530);
    return () => clearInterval(id);
  }, []);

  return (
    <Text
      backgroundColor={on ? theme.cursor : undefined}
      color={on ? theme.background : theme.cursor}
    >
      {' '}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// History line — dim echo of a submitted command or log line
// ---------------------------------------------------------------------------
function HistoryLine({ text }: { text: string }) {
  const theme = useTheme();
  const isCommand = text.startsWith('> ');
  const isError = text.includes('[error') || text.includes('error:');
  const isSuccess = text.includes('[theme]') || text.includes('success:');
  const isWarning = text.includes('[warn') || text.includes('warning:');
  const isAgent = text.startsWith('[neoloop]') || text.startsWith('agent:');

  if (isCommand) {
    const promptCol = theme.userTalk?.prompt || theme.accent;
    const textCol = theme.userTalk?.text || theme.inputText;
    return (
      <Box paddingLeft={1} flexDirection="row">
        <Text color={promptCol} bold>{'> '}</Text>
        <Text color={textCol}>{text.slice(2)}</Text>
      </Box>
    );
  }

  if (isAgent && text.startsWith('[neoloop]')) {
    const badgeCol = theme.agentTalk?.badge || theme.accentStrong;
    const textCol = theme.agentTalk?.text || theme.secondary;
    return (
      <Box paddingLeft={1} flexDirection="row">
        <Text color={badgeCol} bold>[neoloop]</Text>
        <Text color={textCol}>{text.slice('[neoloop]'.length)}</Text>
      </Box>
    );
  }

  let color = theme.text;
  if (isError) color = theme.error;
  else if (isSuccess) color = theme.success;
  else if (isWarning) color = theme.warning;
  else if (isAgent) color = theme.agentTalk?.text || theme.secondary;
  else color = theme.accent;

  return (
    <Box paddingLeft={1}>
      <Text color={color}>
        {text}
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
  isSelectedAll?:  boolean;
}

function InputBar({ value, showPlaceholder, cols, isSelectedAll }: InputBarProps) {
  const theme = useTheme();
  const ruleWidth = Math.max(1, cols - 2);
  const dashedRule = '-'.repeat(ruleWidth);
  const placeholder = 'Type your message or ask NEOLOOP anything (try /theme)...';
  const borderCol = theme.inputBorder || theme.border;
  const promptCol = theme.userTalk?.prompt || theme.accent;
  const userTextCol = theme.userTalk?.text || theme.inputText;

  const rawLines = value.split('\n');
  const MAX_VISIBLE = 10;
  const isScrollable = rawLines.length > MAX_VISIBLE;
  const startIdx = isScrollable ? rawLines.length - MAX_VISIBLE : 0;
  const visibleLines = rawLines.slice(startIdx);

  return (
    <Box flexDirection="column">
      {/* ── top dashed border ── */}
      <Box paddingLeft={1} paddingRight={1}>
        <Text color={borderCol}>
          {startIdx > 0 ? `-[▲ ${startIdx} line${startIdx > 1 ? 's' : ''} above]`.padEnd(ruleWidth, '-') : dashedRule}
        </Text>
      </Box>

      {/* ── prompt rows ── */}
      {showPlaceholder ? (
        <Box flexDirection="row" paddingLeft={2} paddingRight={1}>
          <Text color={promptCol} bold>{'> '}</Text>
          <Text color={theme.inputPlaceholder}>{placeholder}</Text>
          <BlinkingCursor />
        </Box>
      ) : (
        visibleLines.map((line, idx) => {
          const isFirst = (startIdx + idx) === 0;
          const isLast = idx === visibleLines.length - 1;
          return (
            <Box key={idx} flexDirection="row" paddingLeft={2} paddingRight={1}>
              <Text color={promptCol} bold>{isFirst ? '> ' : '  '}</Text>
              {isSelectedAll ? (
                <Text backgroundColor={theme.selection} color={theme.text} bold>
                  {line}
                </Text>
              ) : (
                <Text color={userTextCol}>{line}</Text>
              )}
              {isLast && <BlinkingCursor />}
            </Box>
          );
        })
      )}

      {/* ── bottom dashed border ── */}
      <Box paddingLeft={1} paddingRight={1}>
        <Text color={borderCol}>{dashedRule}</Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// WelcomeScreen — history list + input bar
// ---------------------------------------------------------------------------
export interface WelcomeScreenProps {
  input:          string;
  history:        string[];
  isSelectedAll?: boolean;
}

export function WelcomeScreen({ input, history, isSelectedAll }: WelcomeScreenProps) {
  const { stdout } = useStdout();
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
        isSelectedAll={isSelectedAll}
      />
    </Box>
  );
}
