/**
 * NeoLoop CLI — Terminal Key Sequence Tokenizer
 *
 * Robust, timeout-free parser for ANSI escape sequences, arrow keys,
 * control keys, bracketed paste, and multi-key input chunks.
 */

export type KeyAction =
  | { type: 'ctrl-c' }
  | { type: 'ctrl-a' }         // Select all
  | { type: 'ctrl-copy' }      // Ctrl+C when text exists (copy, not exit)
  | { type: 'ctrl-v' }         // Paste from clipboard
  | { type: 'ctrl-x' }         // Cut
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
  | { type: 'pgup' }
  | { type: 'pgdn' }
  | { type: 'ctrl-up' }
  | { type: 'ctrl-down' }
  | { type: 'ctrl-home' }
  | { type: 'ctrl-end' }
  | { type: 'wheel-up' }
  | { type: 'wheel-down' }
  | { type: 'paste'; text: string }
  | { type: 'char'; char: string }
  | { type: 'right-click'; x: number; y: number }
  | { type: 'left-click'; x: number; y: number };

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

  // 2.5 SGR mouse event: \x1b[<Pb;Px;PyM (press) or \x1b[<Pb;Px;Pym (release)
  //   button 0 = left, button 2 = right
  const sgrMouseRegex = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
  let mouseMatch: RegExpExecArray | null;
  let mouseLastIndex = 0;
  let hasMouse = false;
  while ((mouseMatch = sgrMouseRegex.exec(s)) !== null) {
    hasMouse = true;
    if (mouseMatch.index > mouseLastIndex) {
      actions.push(...parseKeyActions(s.slice(mouseLastIndex, mouseMatch.index)));
    }
    const rawBtn = parseInt(mouseMatch[1]!, 10);
    const mx  = parseInt(mouseMatch[2]!, 10) - 1; // convert 1-based to 0-based
    const my  = parseInt(mouseMatch[3]!, 10) - 1;
    const isPress = mouseMatch[4] === 'M';
    if (isPress) {
      if (rawBtn === 64) {
        actions.push({ type: 'wheel-up' });
      } else if (rawBtn === 65) {
        actions.push({ type: 'wheel-down' });
      } else {
        const btn = rawBtn & 3; // mask lower 2 bits for button
        if (btn === 2) {
          actions.push({ type: 'right-click', x: mx, y: my });
        } else if (btn === 0) {
          actions.push({ type: 'left-click', x: mx, y: my });
        }
      }
    }
    mouseLastIndex = sgrMouseRegex.lastIndex;
  }
  if (hasMouse) {
    if (mouseLastIndex < s.length) {
      actions.push(...parseKeyActions(s.slice(mouseLastIndex)));
    }
    return actions;
  }

  // 3. Sequential key parsing
  let i = 0;
  while (i < s.length) {
    // Ctrl-A (\x01) — select all
    if (s.charCodeAt(i) === 1) {
      actions.push({ type: 'ctrl-a' });
      i++;
      continue;
    }

    // Ctrl-C (\x03) — disambiguated at dispatch time (exit vs copy)
    if (s.charCodeAt(i) === 3) {
      actions.push({ type: 'ctrl-c' });
      i++;
      continue;
    }

    // Ctrl-V (\x16) — paste from OS clipboard
    if (s.charCodeAt(i) === 22) {
      actions.push({ type: 'ctrl-v' });
      i++;
      continue;
    }

    // Ctrl-X (\x18) — cut
    if (s.charCodeAt(i) === 24) {
      actions.push({ type: 'ctrl-x' });
      i++;
      continue;
    }

    // Escape sequences
    if (s[i] === '\x1b') {
      const rest = s.slice(i);

      // Ctrl+Up: \x1b[1;5A or \x1bO5A
      if (rest.startsWith('\x1b[1;5A') || rest.startsWith('\x1bO5A')) {
        actions.push({ type: 'ctrl-up' });
        i += rest.startsWith('\x1b[1;5A') ? 6 : 4;
        continue;
      }

      // Ctrl+Down: \x1b[1;5B or \x1bO5B
      if (rest.startsWith('\x1b[1;5B') || rest.startsWith('\x1bO5B')) {
        actions.push({ type: 'ctrl-down' });
        i += rest.startsWith('\x1b[1;5B') ? 6 : 4;
        continue;
      }

      // Ctrl+Home: \x1b[1;5H, \x1bO5H, \x1b[7;5~, \x1b[1;5~
      if (rest.startsWith('\x1b[1;5H') || rest.startsWith('\x1bO5H')) {
        actions.push({ type: 'ctrl-home' });
        i += rest.startsWith('\x1b[1;5H') ? 6 : 4;
        continue;
      }
      if (rest.startsWith('\x1b[7;5~') || rest.startsWith('\x1b[1;5~')) {
        actions.push({ type: 'ctrl-home' });
        i += 6;
        continue;
      }

      // Ctrl+End: \x1b[1;5F, \x1bO5F, \x1b[8;5~, \x1b[4;5~
      if (rest.startsWith('\x1b[1;5F') || rest.startsWith('\x1bO5F')) {
        actions.push({ type: 'ctrl-end' });
        i += rest.startsWith('\x1b[1;5F') ? 6 : 4;
        continue;
      }
      if (rest.startsWith('\x1b[8;5~') || rest.startsWith('\x1b[4;5~')) {
        actions.push({ type: 'ctrl-end' });
        i += 6;
        continue;
      }

      // Page Up: \x1b[5~ or \x1b[5;5~ (Ctrl+PgUp)
      if (rest.startsWith('\x1b[5;5~')) {
        actions.push({ type: 'pgup' });
        i += 6;
        continue;
      }
      if (rest.startsWith('\x1b[5~')) {
        actions.push({ type: 'pgup' });
        i += 4;
        continue;
      }

      // Page Down: \x1b[6~ or \x1b[6;5~ (Ctrl+PgDn)
      if (rest.startsWith('\x1b[6;5~')) {
        actions.push({ type: 'pgdn' });
        i += 6;
        continue;
      }
      if (rest.startsWith('\x1b[6~')) {
        actions.push({ type: 'pgdn' });
        i += 4;
        continue;
      }

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
