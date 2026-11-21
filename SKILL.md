---
name: neoloop-ui-qa
description: Pressure-test the NeoLoop terminal UI with simulated fake users and fake agents, and produce a complete bug, glitch, and lag report in one markdown file for the owner to review. Covers the anchored header, input bar, scrollable output viewport, auto-follow, scrollbar, scroll keys and mouse wheel, theme picker, slash menu, keyboard input, paste, resize, and terminal cleanup, on Windows 10 and Windows 11 with PowerShell, CMD, Windows Terminal and the legacy console, plus related platforms. Use this skill whenever the user mentions testing NeoLoop, QA, bugs, glitches, lag, stress testing, fake users, bots, breaking the UI, scroll problems, flicker, freezing, terminal compatibility, or asks for a bug report, even if they do not say "skill".
---

# NeoLoop UI QA

Goal: find where the NeoLoop terminal UI breaks, glitches, or lags under realistic and abusive use, and report it clearly so the owner can decide what to fix.

Work at a slow, careful pace. Keep everything simple. This skill finds and reports. It does not fix anything until the owner approves the report.

## Hard rules

1. **Report first, fix later.** Do not edit any file under `src/` or `neoloop.tsx` during testing. Test code lives in `tests/qa/` only.
2. **Use the public API.** Drive the app through its real entry point and through `runSplash` with a custom `onCommand`. Do not add test hooks to the app.
3. **Reproducible.** Every run has a seed. Every bug has exact reproduction steps and the seed. Re-run a failure up to 3 times; label it `intermittent` if it does not always reproduce.
4. **Evidence over opinion.** Show screen snapshots, escape output, and numbers.
5. **Honest coverage.** You can only run on the machine you are on. List what you could not test. Never write "passed" for something you did not run.
6. **No heavy dependencies.** `devDependencies` only: `node-pty` and `@xterm/headless`. Ask before adding anything else. If `node-pty` fails to install because native build tools are missing, tell the owner exactly what is needed and stop; do not silently switch approaches. (A prebuilt fork may exist on npm; mention it as an option.)
7. **No real personal data.** All fake identities and fake text are generated.

## What is under test

**Layout and anchoring**
- Header (logo, tagline, rain animation) never moves or scrolls, whatever the agent does.
- Input bar stays on its fixed rows.
- Only the output viewport below the input bar scrolls.
- Nothing is written to the normal (non-alternate) screen buffer during the run.

**Output viewport**
- Auto-follow while at the bottom; smooth.
- Absolute anchoring: while the user is scrolled up, new output must not move the lines they are reading.
- "New lines" indicator while scrolled up; it disappears at the bottom.
- Scrolling during heavy streaming stays instant.
- Wrapping: long lines, long unbroken tokens, wide characters (emoji, CJK), right-to-left text, combining marks, colored (ANSI) tool output, tabs, CRLF, carriage returns, partial lines streamed in chunks.
- Buffer cap: old lines dropped without the view jumping.
- Resize while idle, while streaming, and while scrolled up.
- Compact header mode on short terminals; clean fallback on tiny terminals.

**Scrollbar**
- Not visible at startup or while output fits in the viewport.
- Appears once output exceeds the viewport rows.
- Drawn only in the viewport rows, not through the header or input bar.
- Thumb size and position are accurate: thumb at the very top at scrollTop 0, at the very bottom when following live output; thumb size shrinks as content grows; minimum 1 row.
- Colors come from the active theme and update on theme change (including the live preview in the picker).
- Idle dimming works and recovers on scroll.

**Scroll controls**
- PgUp, PgDn, Ctrl+Up, Ctrl+Down, Ctrl+Home, Ctrl+End, End, and mouse wheel (if enabled).
- Held-key acceleration and burst coalescing.
- `/mouse on|off` toggle and cleanup of mouse mode on every exit.
- Plain Up/Down/Home/End keep their input meaning.

**Input and commands**
- Typing, cursor movement, Backspace, Delete, Home, End, history, paste (single line, multi-line, 10,000 characters, bracketed paste), split escape sequences, lone Esc, unknown sequences, wide characters.
- Slash menu: opens on `/`, filters, arrows, Tab/Enter, Esc.
- Theme picker: arrows, live preview, Enter keeps, Esc restores, filtering, wrap-around, switching quickly while streaming and while scrolled.
- Commands submitted while the agent is busy.

**Lifecycle**
- Startup time, idle CPU, memory over time.
- Exit by quit command, Ctrl-C (idle, during streaming, during picker), closing the pty, SIGTERM: terminal restored (alternate screen left, cursor visible, raw mode off, mouse and paste modes off, colors reset).
- Config file missing, empty, corrupt, read-only.

## Environments

Detect the current environment first and record it in the report.

- Windows version: read `os.release()`. Build 22000 or higher is Windows 11; lower builds starting at 10.0.1 are Windows 10. Record the exact build number.
- Windows Terminal: `WT_SESSION` is set.
- VS Code terminal: `TERM_PROGRAM` is `vscode`.
- Shell: PowerShell 5.1 (`powershell.exe`), PowerShell 7 (`pwsh.exe`), CMD (`cmd.exe`), Git Bash, WSL.
- Legacy console host: not Windows Terminal and not a VS Code terminal.

Target matrix (run every row the current machine supports):

| Windows 10 and 11 | Notes |
|---|---|
| Windows Terminal + PowerShell 7 | Modern default |
| Windows Terminal + PowerShell 5.1 | Ships with Windows |
| Windows Terminal + CMD | |
| Legacy console host + PowerShell 5.1 | Highest risk on Windows 10: older ANSI support, QuickEdit freeze |
| Legacy console host + CMD | |
| VS Code integrated terminal | Different key handling |
| Git Bash (mintty), WSL | Different TTY behavior |

Related platforms, when available: macOS Terminal and iTerm2, Linux terminals (gnome-terminal, xterm), tmux, SSH.

Terminal conditions to vary: sizes 120x30, 80x24, 60x20, 40x12, 200x60, tiny 20x8 and 1x1; truecolor versus 256 versus 16 colors; `NO_COLOR`; `TERM=dumb`; UTF-8 versus code page 437; output piped or redirected.

Windows 10 and Windows 11 can differ in ConPTY behavior and in the legacy console. If the machine is only one of them, say so and put the other in the manual checklist.

## Workflow

After each phase, give the owner a 2 or 3 line update.

### Phase 0: Recon (read only)

Read `neoloop.tsx`, `src/core/splash.ts`, and the log buffer, theme, command, and config modules. Write `docs/qa/architecture-notes.md` listing: input entry points, screen write path, timers, every terminal mode toggled and where it is restored, where scroll state lives, how theme colors reach the scrollbar. List suspicions. Do not fix anything.

### Phase 1: Build the harness

Create `tests/qa/`. Keep the harness small (about 300 lines).

- `node-pty` runs a command in a real pseudo-terminal (ConPTY on Windows).
- `@xterm/headless` emulates the terminal; pipe pty output into it and read the screen as text and per-cell colors. Verify the current API in each package's README (writes are asynchronous, so wait for the write callback before reading the screen).

```ts
import * as pty from 'node-pty';
import { Terminal } from '@xterm/headless';

export function launch(o: { file: string; args: string[]; cols: number; rows: number; env?: NodeJS.ProcessEnv }) {
  const term = new Terminal({ cols: o.cols, rows: o.rows, allowProposedApi: true });
  const proc = pty.spawn(o.file, o.args, {
    name: 'xterm-256color', cols: o.cols, rows: o.rows,
    cwd: process.cwd(), env: { ...process.env, ...o.env },
  });
  let bytes = 0;
  const writes: number[] = [];
  proc.onData(d => { bytes += d.length; writes.push(Date.now()); term.write(d); });
  const screen = () =>
    Array.from({ length: term.rows }, (_, y) => term.buffer.active.getLine(y)?.translateToString(true) ?? '');
  return { proc, term, screen, writes, bytes: () => bytes,
    send: (s: string) => proc.write(s),
    resize: (c: number, r: number) => { proc.resize(c, r); term.resize(c, r); } };
}
```

Harness requirements:
- Seeded random generator; print the seed; accept `--seed` to replay.
- Helpers: `send`, `sendSlowly`, `sendBurst`, `resize`, `waitForText`, `settle`, `screen`, `cellColor(x, y)`.
- Fake data generator (seeded): fake names, emails, file paths, shell commands, code snippets, stack traces, JSON, markdown, multilingual text (English, Urdu, Arabic, Chinese, Japanese, emoji), ANSI-colored text, very long lines, binary-looking garbage.
- Timing helpers: key-to-screen latency, frames per second (from pty write timestamps), CPU and memory sampling of the child process.

**Fake agent entry.** Create `tests/qa/entry.ts` that calls `runSplash` (public API) with an `onCommand` that understands test commands and streams output through the `log` callback:

| Command | Behavior |
|---|---|
| `stream N [ms]` | N lines, one every ms milliseconds |
| `firehose N` | N lines as fast as possible |
| `chunks N` | text split at random points, including mid-line and mid-character-pair |
| `wide` | emoji, CJK, right-to-left, combining marks |
| `ansi` | colored and styled output, cursor-movement codes, carriage returns |
| `longline N` | one line of N characters, with and without spaces |
| `huge` | one 1 MB chunk |
| `steps` | simulated agent steps (read file, edit, run command) with realistic timing |
| `burst` | many commands' worth of output interleaved |
| `error` | an error and a thrown exception inside `onCommand` |

Also run the real entry (`neoloop.tsx`) for startup, exit, and config tests. If the app's public API has changed so that `entry.ts` no longer works, adapt it and note it in the report.

### Phase 2: Fake users and agents

Each persona has a fake identity (name, typing speed, habits) and a script. Run every persona in every supported environment profile, at least 3 seeds each.

| Persona | Pressure |
|---|---|
| Beginner "Sara" | Slow typing, typos, empty Enter, unknown commands, `/` experiments |
| Fast typist "Hamza" | 15+ characters per second, long sentences, bursts |
| Paster "Ali" | 1 line, 50 lines, 10,000 characters, tabs, CRLF, bracketed and unbracketed paste |
| Key masher "Noor" | 60 seconds of random keys: printable, arrows, Home/End, Delete, Esc, Tab, Ctrl combos, F-keys |
| Reader "Ayesha" | While `stream` runs, scrolls up to read, stays there, then returns to the bottom. Checks anchoring. |
| Scroll spammer "Bilal" | Holds PgUp/PgDn/Ctrl+Up/Ctrl+Down, mashes End, wheel bursts, during streaming and idle |
| Firehose watcher "Zain" | `firehose 20000` and `huge` while scrolling continuously |
| Theme hopper "Mina" | Switches themes 100 times, in the picker, while streaming, while scrolled up |
| Resizer "Omar" | Gradual and instant resizes, many per second, during typing, streaming, and scrolled-up reading |
| International user "Yuki" | Emoji, CJK, Urdu, Arabic, combining marks, in input and in streamed output |
| Impatient user "Dev" | Spams Enter, submits while busy, Ctrl-C during streaming, during picker, during scroll |
| Long-session user "Hira" | 10 minutes idle then active, 5,000 commands, buffer cap reached |
| Adversary "Eve" | Raw escape sequences, partial sequences split across chunks, mouse reports and drags, focus events, null bytes, invalid UTF-8, lone ESC |
| Non-interactive user "Pip" | Piped input, redirected output, `NO_COLOR`, `TERM=dumb`, no TTY |

One small file per persona in `tests/qa/personas/`.

### Phase 3: Oracles (what counts as a bug)

After every action, and during soak runs, check:

**Stability**
- Process alive, no uncaught exception, no unexpected stderr, exits cleanly.

**Anchoring**
- Header rows (logo rows, tagline row) and input bar rows keep the same text and position through the whole run. Ignore the rain region.
- Nothing is written to the normal buffer.

**Scrolling**
- Absolute anchoring: scroll up 30 lines, record the visible viewport text, stream 500 more lines; the viewport text must be unchanged. Only the indicator row and scrollbar may change.
- Follow: at the bottom, the newest line is always visible within one frame of arrival.
- Returning to the bottom resumes following.
- The indicator shows the correct count and disappears at the bottom.
- Scroll to the top and bottom: first and last lines are exactly reachable; no off-by-one, no blank rows, no duplicate lines.
- PgUp/PgDn moves by viewport height minus 1 with no skipped or repeated line.
- Held-key acceleration caps and resets.

**Scrollbar**
- Absent while content fits; present after overflow.
- Only in viewport rows.
- Thumb at top at scrollTop 0 and at bottom when following; size matches the formula (visible rows squared divided by total lines, minimum 1).
- Colors equal the active theme tokens (read per-cell colors); updated after a theme change.

**Screen correctness**
- No torn lines, ghost characters, stuck colors, text overflowing the width or running into the scrollbar column, misaligned wide characters, or wrapped ANSI codes counted as text.
- Cursor position matches the input buffer.
- Tiny terminals show a clean fallback.

**Input**
- Paste arrives complete and in order; multi-line paste does not submit early.
- Split escape sequences never become text; unknown sequences ignored; lone Esc handled.
- Plain Up/Down/Home/End keep input meaning; scroll keys do not insert characters.

**Performance**
- Key-to-screen latency: target under 100 ms; flag over 200 ms. Measure scroll keys separately, also during streaming.
- Frames per second while streaming: flag drops below the animation target.
- Event-loop stalls over 100 ms.
- Idle CPU over 30 seconds, CPU during streaming.
- Memory over a 10-minute soak: must flatten once the buffer cap is reached.
- Output volume: flag full-screen repaints on small changes.

**Terminal hygiene on every exit path**
- Alternate screen left, cursor shown, raw mode off, mouse and bracketed-paste modes off, colors reset. Verify from the emitted escape sequences and the final screen.

**Windows specifics**
- Output freezing when the user clicks in a legacy console (QuickEdit).
- Garbled block, box, or scrollbar glyphs under a legacy code page.
- ANSI sequences shown as literal text.
- Different key sequences for PgUp, PgDn, Ctrl+arrows between legacy console, Windows Terminal, and VS Code.
- Mouse wheel events not arriving, or arriving as garbage input.
- Slow startup.

### Phase 4: Write the report (STOP here)

Write one file: `docs/qa/report-<YYYY-MM-DD>.md`. Use this structure exactly.

```
# NeoLoop UI QA Report - <date>

## 1. Summary
- Verdict in 3 lines, counts of bugs by severity, the 3 most important problems.
- What was tested, what was not.

## 2. Test environment
- Machine, Windows version and build (10 or 11), shell, terminal, Node version, package versions.

## 3. Coverage matrix
- Table: feature area x environment profile, each cell Pass / Fail / Not run.

## 4. Bugs
- One summary table: ID, severity, area, title, environments, reproducible?
- Then one section per bug (QA-001, ...):
  - Severity (S1 crash or broken terminal, S2 visibly broken, S3 glitch or lag, S4 polish)
  - Where it happens (environment, persona, seed)
  - Steps to reproduce
  - Expected / Actual
  - Evidence (screen snapshot as a code block, timing numbers)
  - Suspected cause (file and line)
  - Proposed fix (smallest change that works) and risk
  - Regression test to add

## 5. Glitches and lag
- Table of measurements: latency, frame rate, CPU, memory, stalls, each with target, measured, verdict.

## 6. Fix plan
- Ordered, small batches, estimated size of each change, dependencies between fixes.

## 7. Manual checklist
- Things that need human eyes or other machines (flicker, fonts, DPI, real mouse wheel, other Windows versions, other terminals), as quick yes/no steps.

## 8. Not tested and known limits

## 9. How to reproduce
- Commands to re-run the suite and replay any seed.
```

Also save raw results (JSON, screen snapshots) under `docs/qa/runs/<date>/`.

Then tell the owner the report is ready and **stop**. Wait for approval before touching app code.

### Phase 5: Fixes (only after approval)

For each approved bug, in order:
1. Write a regression test that fails.
2. Make the smallest fix.
3. Run that test, the full QA suite, and `npm run typecheck`.
4. Commit: `fix(QA-003): <short title>`.
5. Update the report with status, commit, and test name.

After every 2 or 3 fixes, pause and confirm. If a fix needs a bigger change than planned, stop and ask.

### Phase 6: Cleanup (separate commit, no behavior change, only after fixes are accepted)

Run the full suite before and after; results must match.

Remove: comments that restate code, commented-out code, stale TODOs, decorative divider comments, unused imports and variables, duplicate helpers. List any file or function deletions for approval first (including the unused Ink path).

Keep: comments that explain why (Windows quirks, escape sequences, non-obvious math). One short summary line on each exported function or module.

Fix typos in user-visible text.

### Phase 7: Final verification

Re-run everything with fresh seeds plus every seed that failed before. Run a 10-minute soak. Update the report with before and after. State what is verified and what is still unverified. Never claim "bug-free".

## Files created

```
tests/qa/
  harness.ts
  oracles.ts
  entry.ts
  fakeData.ts
  profiles.ts
  personas/*.ts
  run.ts
docs/qa/
  architecture-notes.md
  report-<date>.md
  runs/<date>/
```

Add npm scripts only after asking: `qa`, `qa:soak`, `qa:seed`.

## Communication style

Plain language, short updates, numbers instead of adjectives. When unsure whether something is a bug or intended, put it in the report as a question for the owner.
