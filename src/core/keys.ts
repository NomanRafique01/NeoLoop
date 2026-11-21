/**
 * NeoLoop CLI — Terminal Key Sequence Tokenizer
 *
 * Robust, timeout-free parser for ANSI escape sequences, arrow keys,
 * control keys, bracketed paste, and multi-key input chunks.
 */

export type KeyAction =
  | { type: 'ctrl-c' }
  | { type: 'esc' }
  | { type: 'enter' }
  | { type: 'tab' }
  | { type: 'backspace' }
  | { type: 'delete' }
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'home' }
  | { type: 'end' }
  | { type: 'paste'; text: string }
  | { type: 'char'; char: string };

/**
 * Clean pasted text: replace newlines with space, strip non-printable control characters.
 */
function cleanPastedText(raw: string): string {
  return raw
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

/**
 * Parse an incoming terminal raw data chunk into a sequence of KeyAction tokens.
 */
export function parseKeyActions(buf: Buffer | string): KeyAction[] {
  const s = typeof buf === 'string' ? buf : buf.toString();
  const actions: KeyAction[] = [];

  // 1. Bracketed paste handling: \x1b[200~ ... \x1b[201~
  if (s.includes('\x1b[200~')) {
    const bpRegex = /\x1b\[200~([\s\S]*?)\x1b\[201~/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = bpRegex.exec(s)) !== null) {
      if (match.index > lastIndex) {
        actions.push(...parseKeyActions(s.slice(lastIndex, match.index)));
      }
      const clean = cleanPastedText(match[1] || '');
      if (clean) {
        actions.push({ type: 'paste', text: clean });
      }
      lastIndex = bpRegex.lastIndex;
    }

    if (lastIndex < s.length) {
      actions.push(...parseKeyActions(s.slice(lastIndex)));
    }
    return actions;
  }

  // 2. Unbracketed multi-line paste detection:
  // If the chunk is long, contains newlines, and does not start with an escape sequence,
  // treat it as pasted text rather than a premature Enter submission.
  if (s.length > 2 && (s.includes('\r') || s.includes('\n')) && !s.startsWith('\x1b')) {
    const clean = cleanPastedText(s);
    if (clean) {
      actions.push({ type: 'paste', text: clean });
    }
    return actions;
  }

  // 3. Sequential key parsing
  let i = 0;
  while (i < s.length) {
    // Ctrl-C (\x03)
    if (s.charCodeAt(i) === 3) {
      actions.push({ type: 'ctrl-c' });
      i++;
      continue;
    }

    // Escape sequences
    if (s[i] === '\x1b') {
      const rest = s.slice(i);

      // Up arrow: \x1b[A or \x1bOA
      if (rest.startsWith('\x1b[A') || rest.startsWith('\x1bOA')) {
        actions.push({ type: 'up' });
        i += 3;
        continue;
      }

      // Down arrow: \x1b[B or \x1bOB
      if (rest.startsWith('\x1b[B') || rest.startsWith('\x1bOB')) {
        actions.push({ type: 'down' });
        i += 3;
        continue;
      }

      // Right arrow: \x1b[C or \x1bOC
      if (rest.startsWith('\x1b[C') || rest.startsWith('\x1bOC')) {
        actions.push({ type: 'right' });
        i += 3;
        continue;
      }

      // Left arrow: \x1b[D or \x1bOD
      if (rest.startsWith('\x1b[D') || rest.startsWith('\x1bOD')) {
        actions.push({ type: 'left' });
        i += 3;
        continue;
      }

      // Home: \x1b[H, \x1bOH, \x1b[1~, \x1b[7~
      if (rest.startsWith('\x1b[H') || rest.startsWith('\x1bOH')) {
        actions.push({ type: 'home' });
        i += 3;
        continue;
      }
      if (rest.startsWith('\x1b[1~') || rest.startsWith('\x1b[7~')) {
        actions.push({ type: 'home' });
        i += 4;
        continue;
      }

      // End: \x1b[F, \x1bOF, \x1b[4~, \x1b[8~
      if (rest.startsWith('\x1b[F') || rest.startsWith('\x1bOF')) {
        actions.push({ type: 'end' });
        i += 3;
        continue;
      }
      if (rest.startsWith('\x1b[4~') || rest.startsWith('\x1b[8~')) {
        actions.push({ type: 'end' });
        i += 4;
        continue;
      }

      // Delete: \x1b[3~
      if (rest.startsWith('\x1b[3~')) {
        actions.push({ type: 'delete' });
        i += 4;
        continue;
      }

      // Insert: \x1b[2~ (consume)
      if (rest.startsWith('\x1b[2~')) {
        i += 4;
        continue;
      }

      // Check for generic CSI sequence: \x1b\[[0-9;]*[a-zA-Z~]
      const csiMatch = /^\x1b\[[0-9;]*[a-zA-Z~]/.exec(rest);
      if (csiMatch) {
        i += csiMatch[0].length;
        continue;
      }

      // Check for generic SS3 sequence: \x1bO[a-zA-Z]
      const ss3Match = /^\x1bO[a-zA-Z]/.exec(rest);
      if (ss3Match) {
        i += ss3Match[0].length;
        continue;
      }

      // Bare Escape: alone or at end of input or not followed by '[' / 'O'
      actions.push({ type: 'esc' });
      i++;
      continue;
    }

    // Enter / Return (\r, \n, \r\n)
    if (s[i] === '\r' || s[i] === '\n') {
      actions.push({ type: 'enter' });
      if (s[i] === '\r' && s[i + 1] === '\n') {
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    // Tab (\t or \x09)
    if (s[i] === '\t') {
      actions.push({ type: 'tab' });
      i++;
      continue;
    }

    // Backspace (\x7f or \x08)
    if (s.charCodeAt(i) === 127 || s.charCodeAt(i) === 8) {
      actions.push({ type: 'backspace' });
      i++;
      continue;
    }

    // Printable character (code >= 32)
    if (s.charCodeAt(i) >= 32) {
      actions.push({ type: 'char', char: s[i]! });
      i++;
      continue;
    }

    // Skip unhandled control characters
    i++;
  }

  return actions;
}
