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
  | { type: 'newline' }        // Shift+Enter / Alt+Enter / multiline insert
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
  | { type: 'shift-up' }
  | { type: 'shift-down' }
  | { type: 'ctrl-up' }
  | { type: 'ctrl-down' }
  | { type: 'ctrl-home' }
  | { type: 'ctrl-end' }
  | { type: 'wheel-up'; x?: number; y?: number }
  | { type: 'wheel-down'; x?: number; y?: number }
  | { type: 'paste'; text: string }
  | { type: 'char'; char: string }
  | { type: 'right-click'; x: number; y: number }
  | { type: 'left-click'; x: number; y: number }
  | { type: 'mouse-drag'; x: number; y: number }
  | { type: 'mouse-up'; x: number; y: number };

/**
 * Clean pasted text: normalize newlines to \n, strip non-printable control characters.
 */
function cleanPastedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
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
  //   button 0 = left, button 2 = right, 64 = wheel up, 65 = wheel down
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

    if ((rawBtn & 64) !== 0) {
      // Wheel events (can be sent with 'M' or 'm' depending on terminal/driver)
      const dir = rawBtn & 3;
      if (dir === 0) {
        actions.push({ type: 'wheel-up', x: mx, y: my });
      } else if (dir === 1) {
        actions.push({ type: 'wheel-down', x: mx, y: my });
      }
    } else if (!isPress) {
      // Mouse release (ends with lowercase 'm')
      actions.push({ type: 'mouse-up', x: mx, y: my });
    } else if ((rawBtn & 32) !== 0) {
      // Mouse drag motion (button held down and moving across X and Y)
      const btn = rawBtn & 3;
      if (btn === 0 || btn === 1) {
        actions.push({ type: 'mouse-drag', x: mx, y: my });
      }
    } else {
      const btn = rawBtn & 3; // mask lower 2 bits for button
      if (btn === 2) {
        actions.push({ type: 'right-click', x: mx, y: my });
      } else if (btn === 0 || btn === 1) {
        actions.push({ type: 'left-click', x: mx, y: my });
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

  // 2.6 Standard X10/X11 mouse event: \x1b[M followed by 3 bytes (Cb, Cx, Cy)
  if (s.includes('\x1b[M')) {
    const x10Regex = /\x1b\[M([\s\S]{3})/g;
    let x10Match: RegExpExecArray | null;
    let x10LastIndex = 0;
    let hasX10 = false;
    while ((x10Match = x10Regex.exec(s)) !== null) {
      hasX10 = true;
      if (x10Match.index > x10LastIndex) {
        actions.push(...parseKeyActions(s.slice(x10LastIndex, x10Match.index)));
      }
      const bytes = x10Match[1]!;
      const cb = bytes.charCodeAt(0) - 32;
      const cx = bytes.charCodeAt(1) - 32 - 1;
      const cy = bytes.charCodeAt(2) - 32 - 1;

      if ((cb & 64) !== 0) {
        const dir = cb & 3;
        if (dir === 0) {
          actions.push({ type: 'wheel-up', x: cx, y: cy });
        } else if (dir === 1) {
          actions.push({ type: 'wheel-down', x: cx, y: cy });
        }
      } else if ((cb & 3) === 3) {
        actions.push({ type: 'mouse-up', x: cx, y: cy });
      } else if ((cb & 32) !== 0) {
        actions.push({ type: 'mouse-drag', x: cx, y: cy });
      } else {
        const btn = cb & 3;
        if (btn === 2) {
          actions.push({ type: 'right-click', x: cx, y: cy });
        } else if (btn === 0 || btn === 1) {
          actions.push({ type: 'left-click', x: cx, y: cy });
        }
      }
      x10LastIndex = x10Regex.lastIndex;
    }
    if (hasX10) {
      if (x10LastIndex < s.length) {
        actions.push(...parseKeyActions(s.slice(x10LastIndex)));
      }
      return actions;
    }
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

      // Shift+Enter / Alt+Enter / Ctrl+Enter: newline action
      // CSI u: \x1b[13;<mod>u or \x1b[13;<mod>;<event>u or \x1b[13u (Kitty keyboard protocol)
      const csiUEnterMatch = /^\x1b\[13(?:;(\d+))?(?:;(\d+))?u/.exec(rest);
      if (csiUEnterMatch) {
        const mod = csiUEnterMatch[1] ? parseInt(csiUEnterMatch[1], 10) : 1;
        if (mod > 1) {
          actions.push({ type: 'newline' });
        } else {
          actions.push({ type: 'enter' });
        }
        i += csiUEnterMatch[0].length;
        continue;
      }

      // Windows Terminal / ConPTY win32-input-mode: \x1b[Vk;Sc;Uc;Kd;Cs;Rc_
      const win32InputMatch = /^\x1b\[(\d+);(\d+);(\d+);(\d+);(\d+);(\d+)_/.exec(rest);
      if (win32InputMatch) {
        const vk = parseInt(win32InputMatch[1]!, 10);
        const uc = parseInt(win32InputMatch[3]!, 10);
        const kd = parseInt(win32InputMatch[4]!, 10);
        const cs = parseInt(win32InputMatch[5]!, 10);
        i += win32InputMatch[0].length;

        // kd === 0 is key release -> ignore
        if (kd === 1) {
          const isShift = (cs & 0x0010) !== 0;
          const isAlt   = (cs & 0x0003) !== 0;
          const isCtrl  = (cs & 0x000c) !== 0;

          if (vk === 13) {
            // VK_RETURN: if Shift or Alt or Ctrl is held, newline; else enter
            if (isShift || isAlt || isCtrl) {
              actions.push({ type: 'newline' });
            } else {
              actions.push({ type: 'enter' });
            }
          } else if (vk === 38) {
            // VK_UP
            actions.push({ type: isShift ? 'shift-up' : (isCtrl ? 'ctrl-up' : 'up') });
          } else if (vk === 40) {
            // VK_DOWN
            actions.push({ type: isShift ? 'shift-down' : (isCtrl ? 'ctrl-down' : 'down') });
          } else if (vk === 37) {
            actions.push({ type: 'left' });
          } else if (vk === 39) {
            actions.push({ type: 'right' });
          } else if (vk === 27) {
            actions.push({ type: 'esc' });
          } else if (vk === 8) {
            actions.push({ type: 'backspace' });
          } else if (vk === 46) {
            actions.push({ type: 'delete' });
          } else if (vk === 9) {
            actions.push({ type: 'tab' });
          } else if (vk === 36) {
            actions.push({ type: isCtrl ? 'ctrl-home' : 'home' });
          } else if (vk === 35) {
            actions.push({ type: isCtrl ? 'ctrl-end' : 'end' });
          } else if (vk === 33) {
            actions.push({ type: 'pgup' });
          } else if (vk === 34) {
            actions.push({ type: 'pgdn' });
          } else if (isCtrl && (vk === 65 || vk === 97)) {
            actions.push({ type: 'ctrl-a' });
          } else if (isCtrl && (vk === 67 || vk === 99)) {
            actions.push({ type: 'ctrl-c' });
          } else if (isCtrl && (vk === 86 || vk === 118)) {
            actions.push({ type: 'ctrl-v' });
          } else if (isCtrl && (vk === 88 || vk === 120)) {
            actions.push({ type: 'ctrl-x' });
          } else if (uc >= 32) {
            actions.push({ type: 'char', char: String.fromCharCode(uc) });
          }
        }
        continue;
      }

      // CSI u LineFeed: \x1b[10;...u or \x1b[10u
      const csiULFMatch = /^\x1b\[10(?:;(\d+))*(?:;\d+)?u/.exec(rest);
      if (csiULFMatch) {
        actions.push({ type: 'newline' });
        i += csiULFMatch[0].length;
        continue;
      }

      // Xterm modifyOtherKeys Enter: \x1b[27;<mod>;13~
      const xtermEnterMatch = /^\x1b\[27;(\d+);13~/.exec(rest);
      if (xtermEnterMatch) {
        const mod = parseInt(xtermEnterMatch[1]!, 10);
        if (mod > 1) {
          actions.push({ type: 'newline' });
        } else {
          actions.push({ type: 'enter' });
        }
        i += xtermEnterMatch[0].length;
        continue;
      }

      // Xterm modifyOtherKeys LineFeed: \x1b[27;<mod>;10~
      const xtermLFMatch = /^\x1b\[27;(\d+);10~/.exec(rest);
      if (xtermLFMatch) {
        actions.push({ type: 'newline' });
        i += xtermLFMatch[0].length;
        continue;
      }

      // CSI ~ Enter: \x1b[13;<mod>~
      const csiTildeEnterMatch = /^\x1b\[13;(\d+)~/.exec(rest);
      if (csiTildeEnterMatch) {
        const mod = parseInt(csiTildeEnterMatch[1]!, 10);
        if (mod > 1) {
          actions.push({ type: 'newline' });
        } else {
          actions.push({ type: 'enter' });
        }
        i += csiTildeEnterMatch[0].length;
        continue;
      }

      // Keypad Enter in application mode / VT sequence / Shift+Enter variants
      if (rest.startsWith('\x1bOM') || rest.startsWith('\x1bO2M')) {
        actions.push({ type: 'newline' });
        i += rest.startsWith('\x1bO2M') ? 4 : 3;
        continue;
      }
      if (rest.startsWith('\x1b[1;2M') || rest.startsWith('\x1b[13;2F')) {
        actions.push({ type: 'newline' });
        i += rest.startsWith('\x1b[1;2M') ? 6 : 7;
        continue;
      }

      // Alt/Meta/Escape + Return
      if (rest.startsWith('\x1b\r\n')) {
        actions.push({ type: 'newline' });
        i += 3;
        continue;
      }
      if (rest.startsWith('\x1b\r') || rest.startsWith('\x1b\n')) {
        actions.push({ type: 'newline' });
        i += 2;
        continue;
      }

      // Shift+Up / Alt+Up: \x1b[1;2A or \x1b[1;3A
      if (rest.startsWith('\x1b[1;2A') || rest.startsWith('\x1b[1;3A')) {
        actions.push({ type: 'shift-up' });
        i += 6;
        continue;
      }

      // Shift+Down / Alt+Down: \x1b[1;2B or \x1b[1;3B
      if (rest.startsWith('\x1b[1;2B') || rest.startsWith('\x1b[1;3B')) {
        actions.push({ type: 'shift-down' });
        i += 6;
        continue;
      }

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

      // Check for generic CSI sequence: \x1b\[[0-9;]*[a-zA-Z~_]
      const csiMatch = /^\x1b\[[0-9;]*[a-zA-Z~_]/.exec(rest);
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

    // CRLF (\r\n) or CR (\r) — Normal Enter / Send
    if (s[i] === '\r') {
      actions.push({ type: 'enter' });
      if (s[i + 1] === '\n') {
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    // Bare Line Feed (\n / 0x0A) — Shift+Enter / Ctrl+J newline (like WhatsApp)
    if (s[i] === '\n') {
      actions.push({ type: 'newline' });
      i++;
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
