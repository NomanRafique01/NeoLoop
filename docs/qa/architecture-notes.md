# NeoLoop UI Architecture Notes (Phase 0 Recon)

*Date: 2026-11-21*
*Environment: Windows 10 Pro (Build 19045, x64), Node v24.14.1, Legacy ConHost / PowerShell 5.1*

---

## 1. Input Entry Points

- **Non-TTY Fallback**:
  - `neoloop.tsx` -> `NonTTYApp`: driven by Ink's `useInput()` hook on `process.stdin` if `SKIP_SPLASH` is active (`!isTTY || NO_COLOR || --no-splash`).
- **Interactive Terminal Engine**:
  - `src/core/splash.ts` -> `inp.on('data', onData)` where `inp` is `process.stdin`.
  - Raw chunks pass to `parseKeyActions(buf)` in `src/core/keys.ts`.
  - `parseKeyActions` handles:
    1. Bracketed paste: `\x1b[200~ ... \x1b[201~` parsed via regex into `{ type: 'paste', text: clean }`.
    2. Unbracketed multi-line paste: chunks > 2 chars with `\r` or `\n` not starting with `\x1b` treated as paste.
    3. SGR mouse tracking: `\x1b[<Pb;Px;PyM` and `\x1b[<Pb;Px;Pym` (button 64/65 for wheel up/down; 0/2 for left/right click).
    4. Escape sequences & control codes: arrows (`\x1b[A..D`), home/end, page up/down (`\x1b[5~`, `\x1b[6~`), Ctrl+arrows (`\x1b[1;5A..D`), Ctrl+Home/End (`\x1b[1;5H`, `\x1b[1;5F`), Backspace, Delete, Tab, Esc (`\x1b`), Ctrl-A/C/V/X.
  - Parsed actions dispatched to `handleKeyAction(action)` in `splash.ts`.
  - Mode state machine: `input`, `slashMenu`, `themePicker`, `contextMenu`.

---

## 2. Screen Write Path

- **Alternate Screen Buffer**:
  - Activated at boot: `out.write('\x1b%G\x1b[?1049h\x1b[?25l\x1b[?2004h')` (UTF-8, enter alt screen, hide cursor, enable bracketed paste).
  - Optional mouse tracking: `out.write('\x1b[?1000h\x1b[?1006h')`.
- **In-Memory Frame Buffer**:
  - Arrays `chars` and `colors` of size `W * H`.
  - Painted layers:
    1. Matrix digital rain stream (`composeStream` -> `chars`/`colors`).
    2. Logo & typography (`paintContent` -> block logo, shimmering tagline, hint).
    3. Input bar (`paintInputBar` -> dashed rules, `> `, text, blinking cursor).
    4. Modal overlays: Theme picker (`paintThemePicker`), slash menu (`paintSlashMenu`), or log scrollback (`paintLogs`).
    5. Scrollbar (`paintScrollbar` on column `W - 1` across viewport rows).
    6. Context menu (`paintContextMenu`).
- **Differential ANSI Output**:
  - `diff()` compares current `chars`/`colors` with previous frame `prevC`/`prevK`.
  - Emits cursor positioning `\x1b[<row>;<col>H` and ANSI SGR styling `\x1b[...m` only for dirty runs.
  - Backpressure guard: skips draw if `out.writableLength > MAX_BACKLOG` (32,768 bytes).
  - Full refresh timer: every 8,000ms (`FULL_REPAINT_MS`), invalidates `prevC`/`prevK` to self-heal terminal glitches.

---

## 3. Timers

1. **Animation Loop**:
   - `loop()` at 20 FPS (`FPS = 20` -> ~50ms interval) via dynamic `setTimeout(loop, Math.max(0, 1000 / FPS - elapsed))`.
   - Driven by `frame++`. Advances rain stream, shimmer light sweep, and calls `draw()`.
2. **Cursor Blink Timer**:
   - `cursorTimer = setInterval(..., 530)` toggles `cursorOn` boolean.
3. **Scroll Repaint Coalescing Timer**:
   - `scrollRepaintTimer = setTimeout(..., 16)` coalesces rapid wheel/scroll key bursts at 60 FPS cap.
4. **LogBuffer Resize Re-wrap Debounce**:
   - `resizeTimer` in `LogBuffer.setWidth(cols, debounceMs)` (default 50ms) to prevent main thread starvation during window dragging.
5. **Full Repaint Refresh**:
   - Compares `Date.now() - lastFull > 8000ms` during draw.

---

## 4. Terminal Modes Toggled & Teardown

- **At Boot**:
  - `disableWinQuickEdit()`: executes PowerShell C# P/Invoke to clear `ENABLE_QUICK_EDIT_MODE` (0x0040) on Windows `CONIN$`.
  - `\x1b%G`: select UTF-8 character set.
  - `\x1b[?1049h`: activate alternate screen buffer.
  - `\x1b[?25l`: hide hardware cursor.
  - `\x1b[?2004h`: enable bracketed paste mode.
  - If mouse enabled: `\x1b[?1000h\x1b[?1006h` (SGR normal mouse tracking).
  - `inp.setRawMode(true)` & `inp.resume()`.
- **Teardown (`cleanup()` in `splash.ts`)**:
  - Triggered on: normal exit (`/exit`), Ctrl-C, `SIGINT`, `SIGTERM`, `uncaughtException`, and process `exit`.
  - Sets `running = false`.
  - Clears `timer`, `cursorTimer`, `scrollRepaintTimer`, and destroys `logBuffer`.
  - Detaches event listeners: `out.off('resize')`, `inp.off('data')`, process signal handlers.
  - Restores terminal with ANSI sequence:
    `\x1b[?2004l\x1b[?1000l\x1b[?1002l\x1b[?1006l\x1b[0m\x1b[?25h\x1b[?1049l`
    (bracketed paste off, mouse tracking off, color reset, cursor visible, alternate screen exit).
  - `inp.setRawMode(false)` and `inp.pause()`.

---

## 5. Scroll State Management

- **State Variables**:
  - `scrollTop`: index of the topmost line visible in the viewport.
  - `followTail`: boolean flag. True when docked at the very bottom; automatically follows incoming log entries.
  - `linesWhenLeftTail`: line count snapshot when `followTail` transitioned to false; used to calculate `unreadCount = totalLines - linesWhenLeftTail`.
  - `lastScrollActivityTime`: timestamp used for scrollbar idle dimming (1200ms threshold).
  - `accelStep`, `lastScrollTime`, `lastScrollDir`: held-key acceleration up to `ACCEL_MAX_STEP = 8`.
- **Scroll Viewport Bounds**:
  - `viewportRows = Math.max(0, H - (streamH + barHeight + 2))`
  - `maxScroll = Math.max(0, totalLines - viewportRows)`
  - `updateScroll(newTop)` clamps `newTop` between `0` and `maxScroll`. If clamped `< maxScroll`, `followTail` becomes `false`. If clamped `== maxScroll`, `followTail` becomes `true`.
- **Log Buffer Cap Eviction Interaction**:
  - When `maxLines` (20,000) is exceeded, `LogBuffer` drops oldest lines and invokes `onDropLines(count)`.
  - `onDropLines`: if `!followTail`, subtracts `count` from `scrollTop` and `linesWhenLeftTail` so the user's viewport does not jump.

---

## 6. Theme Colors & The Scrollbar

- **Theme Engine**:
  - Central registry in `src/theme/themes.ts` (10 default themes: Red Eclipse, Dusk Circuit, Cyberpunk, Neon Tokyo, Arctic Gold, Aurora Mint, Royal Sunset, Ghost Protocol, Rose Signature, Deep Space).
  - Registered with `onThemeChange(nextTheme)`.
- **Scrollbar Color Path**:
  - Track color: `theme.logoDeep ?? theme.logoShadow ?? theme.surfaceElevated ?? '#2f3d4f'`.
  - Active thumb color: `theme.accent || theme.tagline || theme.logo`.
  - Idle thumb color: computed via `lerpColor(activeThumbColor, theme.background, 0.55)` or fallback `theme.textMuted`.
  - Active state: `Date.now() - lastScrollActivityTime < 1200`.
  - When a theme change occurs in `themePicker` (live preview on arrow up/down), `onThemeChange` immediately clears `sgrCache`, resets `prevC`/`prevK`, and redraws, updating scrollbar track and thumb colors in real time.

---

## 7. Suspicions & Areas of High Risk Under Abuse

1. **ConPTY Escape Leakage on Windows 10**:
   - In `disableWinQuickEdit()`, PowerShell is spawned synchronously (`spawnSync('powershell', ...)`). If ConPTY or PowerShell hangs or takes >1s, startup latency spikes.
2. **Terminal Resize Race Conditions**:
   - In `recalcLayout()`, `barHeight` is computed from `inputBuffer.length / (W - 6)`. If `W` shrinks dramatically (e.g. < 20), `streamH` becomes 0, but `paintLogs()` and `paintScrollbar()` might access coordinates close to or exceeding `H`.
3. **Unbracketed Paste with Newlines**:
   - In `keys.ts`: `s.length > 2 && (s.includes('\r') || s.includes('\n')) && !s.startsWith('\x1b')`. What if user pastes a short string like `ls\n` (length 3)? It is treated as paste and newlines replaced with spaces, which prevents execution! What if an escape chunk gets split and starts with something non-escape?
4. **LogBuffer Cap Re-indexing**:
   - If user is scrolled up at `scrollTop = 10` and 500 lines are dropped, `scrollTop = Math.max(0, 10 - 500) = 0`. The viewport hits top. Does this create an unexpected visual jump?
5. **Held Key Acceleration on Ctrl+Up/Down**:
   - `getScrollStep` accelerates up to 8 rows per tick within 150ms. If rapid bursts arrive, coalescing may drop frames or skip unread lines unexpectedly.
6. **Multi-line Input Growth Pushing Viewport Down**:
   - As user pastes a 10,000 char prompt, `barHeight` could grow to dozens of rows, shrinking `viewportRows` to zero or negative! Does `recalcLayout` or `paintLogs` guard against `viewportRows <= 0` gracefully?
7. **Wide Characters in Scrollbar Column**:
   - If wide characters (emoji / CJK) end at column `W - 2`, does `writeStyledRow` spill into column `W - 1` (the scrollbar column) or overwrite the scrollbar?
