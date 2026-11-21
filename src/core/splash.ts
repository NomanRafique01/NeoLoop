/**
 * NeoLoop CLI — Terminal Splash Screen Engine
 *
 * Renders the NeoLoop ASCII block typography, cyberpunk matrix background
 * simulation, and continuous neon shimmer light sweep using raw ANSI
 * differential updates on the terminal alternate screen buffer at 20 FPS.
 *
 * Driven by the centralized theme token engine (Cyberpunk, Dusk Circuit, etc.)
 * with live real-time theme morphing via slash commands and interactive picker.
 */

import { spawnSync } from 'child_process';
import {
  ThemeTokens,
  RainPalette,
  getCurrentTheme,
  setCurrentTheme,
  onThemeChange,
  generateMultiRainPalettes,
  generateShimmerColor,
  parseHex,
  ansiRgb,
} from '../theme/index.js';
import {
  THEMES,
  getTheme,
  DEFAULT_THEME_ID,
  loadSavedThemeId,
  saveThemeId,
  getThemeDisplayNameColor,
} from './themes.js';
import { COMMAND_REGISTRY, SlashCommand, CommandContext } from './commands.js';
import { parseKeyActions, KeyAction } from './keys.js';

// ---------------------------------------------------------------------------
// Windows QuickEdit guard & Console Mode
// ---------------------------------------------------------------------------
function disableWinQuickEdit(): void {
  if (process.platform !== 'win32') return;
  try {
    const psScript = [
      "$d=@'",
      'using System;using System.Runtime.InteropServices;',
      'public static class _QE{',
      '[DllImport("kernel32.dll",CharSet=CharSet.Auto,SetLastError=true)]',
      'public static extern IntPtr CreateFile(string f,uint da,uint sm,IntPtr sa,uint cd,uint fa,IntPtr tf);',
      '[DllImport("kernel32.dll",SetLastError=true)]public static extern bool GetConsoleMode(IntPtr h,out uint m);',
      '[DllImport("kernel32.dll",SetLastError=true)]public static extern bool SetConsoleMode(IntPtr h,uint m);',
      'public static void Disable(){',
      'IntPtr h=CreateFile("CONIN$",0x80000000u|0x40000000u,1|2,IntPtr.Zero,3,0,IntPtr.Zero);',
      'if(h==(IntPtr)(-1))return;',
      'uint m=0;',
      'if(GetConsoleMode(h,out m)){SetConsoleMode(h,(m&~0x0040u)|0x0080u|0x0010u|0x0200u);}',
      '}}',
      "'@",
      'Add-Type -TypeDefinition $d -ErrorAction SilentlyContinue',
      '[_QE]::Disable()',
    ].join('\n');

    const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
    spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', b64], {
      stdio: 'inherit',
      timeout: 3000,
    });
  } catch {
    /* ignore on non-Windows / Windows Terminal */
  }
}

export interface SplashOptions {
  title: string;
  tagline?: string;
  hint?: string;
  theme?: ThemeTokens | string;
  onCommand?: (command: string, log: (text: string) => void) => void | Promise<void>;
  initialLogs?: string[];
}

// ---------------------------------------------------------------------------
// Animation & Engine Constants
// ---------------------------------------------------------------------------
const FPS = 20;
const FULL_REPAINT_MS = 8000;
const MAX_BACKLOG = 32768;
const BAR_PLACEHOLDER = 'Type your message or ask NEOLOOP anything (try /theme)...';
const CURSOR_BLINK_MS = 530;
const RESET = '\x1b[0m';

// ---------------------------------------------------------------------------
// Typography: 6-Row Block Font
// ---------------------------------------------------------------------------
const LOGO_HEIGHT = 6;

/**
 * Map a logo glyph character to the correct theme colour layer.
 *
 * Four-layer depth model (light source: top-right):
 *   █          → logo        (e.g. Neon Gold front face)
 *   ╗ ╔ ║ ╦ ╠  → logoGlow    (e.g. Hot Red — bright top/right connectors)
 *   ═ ╝ ╣ ╩ ╬  → logoShadow  (e.g. Electric Blue — horizontal bars & bottom-right)
 *   ╚           → logoDeep   (e.g. Electric Blue / Deep corner trace)
 */
function logoCharColor(c: string, theme: ThemeTokens): string {
  if (c === '█') return theme.logo;
  if (c === '╚') return theme.logoDeep ?? theme.logoShadow ?? theme.logoGlow;
  if (c === '═' || c === '╝' || c === '╣' || c === '╩' || c === '╬')
    return theme.logoShadow ?? theme.logoGlow;
  return theme.logoGlow; // ╗ ╔ ║ ╦ ╠ and anything else
}

const FONT: Record<string, string[]> = {
  N: ['███╗   ██╗', '████╗  ██║', '██╔██╗ ██║', '██║╚██╗██║', '██║ ╚████║', '╚═╝  ╚═══╝'],
  E: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
  O: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  L: ['██╗     ', '██║     ', '██║     ', '██║     ', '███████╗', '╚══════╝'],
  P: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔═══╝ ', '██║     ', '╚═╝     '],
};

export function bigLogo(name: string): string[] | null {
  const letters = name.toUpperCase().split('');
  const rows: string[] = Array.from({ length: LOGO_HEIGHT }, () => '');
  for (const ch of letters) {
    if (ch === ' ') {
      for (let r = 0; r < LOGO_HEIGHT; r++) rows[r] += '   ';
      continue;
    }
    const glyph = FONT[ch];
    if (!glyph) return null;
    for (let r = 0; r < LOGO_HEIGHT; r++) rows[r] += glyph[r];
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Matrix Digital Stream Simulation
// ---------------------------------------------------------------------------
const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randomChar = () => CHARSET[(Math.random() * CHARSET.length) | 0]!;
const LANE_SPACING = 2;

interface Drop {
  x: number;
  y: number;
  tailY: number;
  speedTicks: number;
  tickAcc: number;
  len: number;
  floorY: number;
  landed: boolean;
  splash: number;
  splashMax: number;
  pause: number;
  paletteIdx: number; // which colour family this drop uses
}

interface StreamState {
  w: number;
  h: number;
  drops: Array<Drop | null>;
  grid: string[][];
  chars: string[];
  colors: string[];
  tick: number;
  hasHitBottom: boolean;
  numPalettes: number; // total colour families available
}

function newDrop(h: number, x: number, numPalettes = 1, initialPause = 0): Drop {
  const floorY = Math.max(0, h - 1);
  const len = Math.max(3, Math.min(floorY, 5 + Math.floor(Math.random() * 4)));
  const laneIndex = Math.floor(x / LANE_SPACING);
  const speedPattern = [2, 1, 2, 2, 3, 2, 1, 2];
  const speedTicks = speedPattern[laneIndex % speedPattern.length]!;

  return {
    x,
    y: -1,
    tailY: -1 - len,
    speedTicks,
    tickAcc: 0,
    len,
    floorY,
    landed: false,
    splash: 0,
    splashMax: 4,
    pause: initialPause,
    paletteIdx: Math.floor(Math.random() * Math.max(1, numPalettes)),
  };
}

function createStream(w: number, h: number, numPalettes = 1): StreamState {
  const state: StreamState = {
    w,
    h,
    drops: [],
    grid: Array.from({ length: w }, () => Array.from({ length: h }, randomChar)),
    chars: new Array(w * h).fill(' '),
    colors: new Array(w * h).fill(''),
    tick: 0,
    hasHitBottom: false,
    numPalettes,
  };

  const numLanes = Math.max(1, Math.floor(w / LANE_SPACING));
  const maxIntroTicks = Math.min(30, Math.max(16, Math.floor(numLanes * 0.6)));

  let lane = 0;
  state.drops = Array.from({ length: w }, (_, x) => {
    if (x % LANE_SPACING !== 0) return null;
    const laneIndex = lane++;
    const rank = (laneIndex * 13) % numLanes;
    const initialPause = Math.floor((rank / numLanes) * maxIntroTicks);
    return newDrop(h, x, numPalettes, initialPause);
  });

  return state;
}

function stepStream(state: StreamState): void {
  const { w, h, drops, grid } = state;
  state.tick++;
  const mutateGlyphs = state.tick % 2 === 0;

  for (let x = 0; x < w; x++) {
    const d = drops[x];
    if (!d) continue;

    if (d.pause > 0) {
      d.pause--;
      continue;
    }

    d.tickAcc++;
    if (d.tickAcc >= d.speedTicks) {
      d.tickAcc = 0;

      if (!d.landed) {
        d.y++;
        d.tailY++;

        if (d.y >= 0 && d.y < h) {
          grid[x]![d.y] = randomChar();
        }

        if (d.y >= d.floorY) {
          d.y = d.floorY;
          d.landed = true;
          d.splash = 0;
          state.hasHitBottom = true;
        }
      } else {
        d.tailY++;
        d.splash++;

        if (d.tailY >= d.floorY) {
          d.y = -1;
          d.tailY = -1 - d.len;
          d.landed = false;
          d.splash = 0;
          d.pause = d.speedTicks * 3 + Math.floor(Math.random() * 4);
          // Pick a new random colour on each respawn for variety
          d.paletteIdx = Math.floor(Math.random() * Math.max(1, state.numPalettes));
        }
      }
    } else if (d.landed && d.splash < d.splashMax) {
      d.splash++;
    }

    if (mutateGlyphs && Math.random() < 0.2) {
      const activeHead = d.landed ? d.floorY : d.y;
      const start = Math.max(0, d.tailY + 1);
      if (activeHead > start) {
        const my = start + Math.floor(Math.random() * (activeHead - start));
        if (my >= 0 && my < h) {
          grid[x]![my] = randomChar();
        }
      }
    }
  }
}

function composeStream(state: StreamState, palettes: RainPalette[]): void {
  const { w, h, drops, grid, chars, colors } = state;
  chars.fill(' ');
  colors.fill('');

  const splashChars = ['*', 'o', '~', '.'];

  for (let x = 0; x < w; x++) {
    const dr = drops[x];
    if (!dr || dr.pause > 0) continue;

    // Pick this drop's colour palette
    const palette = palettes[dr.paletteIdx % palettes.length]!;
    const splashColors = palette.splashColors;

    const headY = dr.landed ? dr.floorY : dr.y;
    const startY = Math.max(0, dr.tailY + 1);
    const endY = dr.landed ? dr.floorY - 1 : Math.min(dr.floorY, dr.y);

    for (let y = startY; y <= endY; y++) {
      if (y < 0 || y >= h) continue;
      const i = y * w + x;
      chars[i] = grid[x]![y]!;

      if (y === dr.y && !dr.landed) {
        colors[i] = palette.head;
      } else {
        const dist = headY - y;
        const t = Math.max(0, 1 - dist / Math.max(1, dr.len));
        const shadeIdx = Math.min(
          palette.shades.length - 1,
          Math.round(t * t * (palette.shades.length - 1))
        );
        colors[i] = palette.shades[shadeIdx]!;
      }
    }

    if (dr.landed && dr.splash < dr.splashMax && dr.floorY >= 0 && dr.floorY < h) {
      const i = dr.floorY * w + x;
      const sIdx = Math.min(splashChars.length - 1, dr.splash);
      chars[i] = splashChars[sIdx]!;
      colors[i] = splashColors[sIdx]!;
    }
  }
}

// ---------------------------------------------------------------------------
// Layout & Terminal Rendering
// ---------------------------------------------------------------------------
interface Line {
  text: string;
  colorAt: (i: number) => string;
}

const plain = (text: string, color: string): Line => ({ text, colorAt: () => color });

function buildLines(
  title: string,
  tagline: string,
  hint: string,
  hintColor: string,
  w: number,
  h: number,
  theme: ThemeTokens
): Line[] {
  const avail = h - 2;
  const fits = (s: string) => s.length > 0 && s.length + 6 <= w;

  const big = bigLogo(title);
  if (big && big[0]!.length + 6 <= w && avail >= big.length) {
    const logo: Line[] = big.map(row => ({
      text: row,
      colorAt: i => (row[i] !== ' ' ? logoCharColor(row[i]!, theme) : theme.logoGlow),
    }));
    const use: Line[] = [];
    const hasSpacing = avail >= logo.length + 1 + (fits(tagline) ? 1 : 0) + (fits(hint) ? 2 : 0);
    if (fits(tagline)) use.push(plain(tagline, theme.tagline));
    if (fits(hint)) {
      if (hasSpacing && use.length) use.push(plain('', theme.logoGlow));
      use.push(plain(hint, hintColor));
    }
    return use.length ? [...logo, plain('', theme.logoGlow), ...use] : logo;
  }

  const spaced = title.toUpperCase().split('').join(' ');
  const name = fits(spaced) ? spaced : title.toUpperCase();
  const lines: Line[] = [plain(name, theme.logo)];
  if (fits(tagline) && avail >= 3) lines.push(plain('', theme.logoGlow), plain(tagline, theme.tagline));
  if (fits(hint) && avail >= lines.length + 2) lines.push(plain('', theme.logoGlow), plain(hint, hintColor));
  return lines;
}

const sgrCache = new Map<string, string>();
function sgr(key: string): string {
  let cached = sgrCache.get(key);
  if (!cached) {
    if (key.startsWith('BG:')) {
      // Format: BG:<bgHex>;FG:<fgHex>[;BOLD]
      const parts = key.split(';');
      const bgHex = parts[0]!.slice(3);
      const fgHex = parts[1]!.slice(3);
      const isBold = parts.includes('BOLD');
      const bg = parseHex(bgHex);
      const fg = parseHex(fgHex);
      cached = `\x1b[0;${isBold ? '1;' : ''}38;2;${fg.r};${fg.g};${fg.b};48;2;${bg.r};${bg.g};${bg.b}m`;
    } else if (key.startsWith('BOLD:')) {
      const fgHex = key.slice(5);
      const fg = parseHex(fgHex);
      cached = `\x1b[0;1;38;2;${fg.r};${fg.g};${fg.b}m`;
    } else {
      const { r, g, b } = parseHex(key);
      cached = `\x1b[0;38;2;${r};${g};${b}m`;
    }
    sgrCache.set(key, cached);
  }
  return cached;
}

// ---------------------------------------------------------------------------
// Static Banner — printed if splash screen exits cleanly
// ---------------------------------------------------------------------------
export function printBanner(title: string, tagline: string): void {
  const out = process.stdout;
  const W = Math.max(20, (out.columns || 80) - 1);
  const theme = getCurrentTheme();

  const big = bigLogo(title);
  if (big && big[0]!.length + 6 <= W) {
    const x0 = Math.max(0, Math.floor((W - big[0]!.length) / 2));
    const pad = ' '.repeat(x0);

    out.write('\n');
    for (const row of big) {
      let line = pad;
      for (let k = 0; k < row.length; k++) {
        const c = row[k]!;
        if (c === ' ') {
          line += c;
          continue;
        }
        line += ansiRgb(logoCharColor(c, theme)) + c + RESET;
      }
      out.write(line + '\n');
    }

    const x0_tag = Math.max(0, Math.floor((W - tagline.length) / 2));
    out.write('\n' + ' '.repeat(x0_tag) + ansiRgb(theme.tagline, true) + tagline + RESET + '\n\n');
  } else {
    out.write('\n' + ansiRgb(theme.logo, true) + title.toUpperCase() + RESET + '\n');
    out.write(ansiRgb(theme.tagline, true) + tagline + RESET + '\n\n');
  }
}

// ---------------------------------------------------------------------------
// Main Splash Lifecycle
// ---------------------------------------------------------------------------
export function runSplash({
  title,
  tagline = 'THINK. CODE. EXECUTE.',
  hint = '',
  theme: initialThemeOverride,
  onCommand,
  initialLogs = [],
}: SplashOptions): Promise<string> {
  return new Promise(resolve => {
    if (initialThemeOverride) {
      const resolved = typeof initialThemeOverride === 'string'
        ? getTheme(initialThemeOverride)
        : initialThemeOverride;
      setCurrentTheme(resolved, false);
    }

    const out = process.stdout;
    const inp = process.stdin;

    let theme = getCurrentTheme();
    let rainPalettes = generateMultiRainPalettes(theme);

    let W = 0;
    let H = 0;
    let streamH = 0;
    let stream: StreamState | null = null;
    let chars: string[] = [];
    let colors: string[] = [];
    let prevC: (string | null)[] = [];
    let prevK: (string | null)[] = [];
    let frame = 0;
    let lastFull = 0;
    let running = true;
    let timer: NodeJS.Timeout | undefined;

    // ── Input bar & dispatcher state ─────────────────────────────────────────
    type Mode = 'input' | 'slashMenu' | 'themePicker';
    let mode: Mode = 'input';

    let inputVisible = false;
    let inputBuffer = '';
    let cursorIdx = 0;
    let cursorOn = true;
    let cursorTimer: NodeJS.Timeout | undefined;

    // Command history
    const commandHistory: string[] = [];
    let historyIndex = -1;
    let savedDraft = '';

    // Logs buffer
    const logs: string[] = [...initialLogs];

    // Slash menu state
    let slashMenuSelectedIndex = 0;

    // Theme picker state
    let pickerInitialTheme: ThemeTokens = theme;
    let themePickerSelectedIndex = 0;
    let themePickerScrollOffset = 0;
    let filterQuery = '';

    const LETTER_FRAMES = 3;
    const titleDoneFrame = title.length * LETTER_FRAMES;
    const tagStartFrame = titleDoneFrame + 4;
    const TAG_SPEED = 2;
    const tagDoneFrame = tagStartFrame + Math.ceil(tagline.length / TAG_SPEED);
    const hintStartFrame = hint ? tagDoneFrame + 3 : tagDoneFrame;
    const streamStartFrame = hint ? hintStartFrame + 3 : tagDoneFrame + 3;

    // ── Layout helpers ───────────────────────────────────────────────────────
    function recalcLayout() {
      W = Math.max(20, (out.columns || 80) - 1);
      H = Math.max(8, out.rows || 24);

      const sampleLines = buildLines(title, tagline, hint, theme.accent, W, H, theme);
      const y0 = Math.max(0, Math.floor(H / 4 - sampleLines.length / 2));
      const fullBig = bigLogo(title);
      const logoH = fullBig ? fullBig.length : 1;
      const tagRow = y0 + (fullBig ? logoH + 1 : 2);

      streamH = Math.min(Math.max(6, H - 4), tagRow + 1);
    }

    function init() {
      recalcLayout();
      stream = frame >= streamStartFrame ? createStream(W, streamH, rainPalettes.length) : null;
      chars = new Array(W * H).fill(' ');
      colors = new Array(W * H).fill('');
      prevC = new Array(W * H).fill(null);
      prevK = new Array(W * H).fill(null);
      lastFull = Date.now();
      out.write('\x1b[0m\x1b[2J\x1b[H');
    }

    // Subscribe to live theme changes (e.g. from picker navigation)
    const unsubTheme = onThemeChange((nextTheme) => {
      theme = nextTheme;
      rainPalettes = generateMultiRainPalettes(theme);
      if (stream) stream.numPalettes = rainPalettes.length;
      sgrCache.clear();
      prevC.fill(null);
      prevK.fill(null);
      lastFull = Date.now();
    });

    function setCell(y: number, x: number, ch: string, col: string) {
      if (y >= 0 && y < H && x >= 0 && x < W) {
        const idx = y * W + x;
        chars[idx] = ch;
        colors[idx] = col;
      }
    }

    function writeRow(y: number, startX: number, text: string, col: string) {
      if (y < 0 || y >= H) return;
      for (let k = 0; k < text.length && startX + k < W; k++) {
        setCell(y, startX + k, text[k]!, col);
      }
    }

    // ── Paint the logo + tagline into chars/colors ───────────────────────────
    function paintContent() {
      const fullLines = buildLines(title, tagline, hint, theme.accent, W, H, theme);
      const y0 = Math.max(0, Math.floor(H / 4 - fullLines.length / 2));
      const fullBig = bigLogo(title);
      const fullLogoW = fullBig && fullBig[0] ? fullBig[0].length : title.length;
      const x0_logo = Math.max(0, Math.floor((W - fullLogoW) / 2));

      const widest = Math.max(...fullLines.map(l => l.text.length));
      const cx0 = Math.max(0, Math.floor((W - widest) / 2) - 3);
      const cx1 = Math.min(W, Math.floor((W + widest) / 2) + 3);
      for (let y = Math.max(0, y0 - 1); y < streamH; y++) {
        for (let x = cx0; x < cx1; x++) {
          chars[y * W + x] = ' ';
          colors[y * W + x] = '';
        }
      }

      const titleLetters = Math.min(title.length, Math.floor(frame / LETTER_FRAMES) + 1);
      const currentTitle = title.slice(0, titleLetters);
      const currentBig = bigLogo(currentTitle);

      if (currentBig) {
        currentBig.forEach((row, j) => {
          for (let k = 0; k < row.length; k++) {
            const c = row[k]!;
            if (c === ' ') continue;
            const idx = (y0 + j) * W + x0_logo + k;
            chars[idx] = c;
            colors[idx] = logoCharColor(c, theme);
          }
        });
      }

      const tagRow = y0 + (currentBig ? currentBig.length + 1 : 2);
      if (tagline && frame >= tagStartFrame) {
        const tagChars = Math.min(tagline.length, (frame - tagStartFrame) * TAG_SPEED);
        const currentTag = tagline.slice(0, tagChars);
        const x0_tag = Math.max(0, Math.floor((W - tagline.length) / 2));

        const SWEEP_FRAMES = 24;
        const beamWidth = 4.0;
        const span = tagline.length + beamWidth;

        const isSweeping = frame >= tagDoneFrame;
        const animFrame = isSweeping ? (frame - tagDoneFrame) % SWEEP_FRAMES : -1;
        const center = isSweeping ? -beamWidth + (animFrame / SWEEP_FRAMES) * span : -999;

        for (let k = 0; k < currentTag.length; k++) {
          const c = currentTag[k]!;
          if (c === ' ') continue;
          const idx = tagRow * W + x0_tag + k;
          chars[idx] = c;

          if (isSweeping) {
            let maxT = 0;
            for (const cPos of [center - span, center, center + span]) {
              const dist = Math.abs(k - cPos);
              if (dist < beamWidth) {
                const t = 0.5 * (1 + Math.cos((dist / beamWidth) * Math.PI));
                if (t > maxT) maxT = t;
              }
            }
            colors[idx] = generateShimmerColor(theme, maxT);
          } else {
            colors[idx] = theme.tagline;
          }
        }
      }

      const hasSpacing = H - 2 >= (currentBig ? currentBig.length : 1) + 1 + (tagline ? 1 : 0) + (hint ? 2 : 0);
      const hintRow = tagRow + (tagline ? (hasSpacing ? 2 : 1) : 1);
      if (hint && frame >= hintStartFrame) {
        const x0_hint = Math.max(0, Math.floor((W - hint.length) / 2));
        const hintColor = (frame >> 3) & 1 ? theme.accent : theme.textMuted;

        for (let k = 0; k < hint.length; k++) {
          const c = hint[k]!;
          if (c === ' ') continue;
          const idx = hintRow * W + x0_hint + k;
          chars[idx] = c;
          colors[idx] = hintColor;
        }
      }
    }

    // ── Paint dashed border input bar ────────────────────────────────────────
    function paintInputBar() {
      if (!inputVisible) return;

      const ruleWidth = Math.max(1, W - 2);
      const dashedRule = '-'.repeat(ruleWidth);

      const borderCol = theme.inputBorder || theme.border;
      const promptCol = theme.userTalk?.prompt || theme.accent;
      const userTextCol = theme.userTalk?.text || theme.inputText;
      const cursorCol = theme.cursor;
      const placeholderCol = theme.inputPlaceholder;

      // 1) Top dashed border line
      const topY = streamH;
      writeRow(topY, 1, dashedRule, borderCol);

      // 2) Prompt row: "> " then typed text or placeholder, with cursor
      const promptY = streamH + 1;
      writeRow(promptY, 2, '> ', promptCol);

      const cursorCellX = 4;
      const textStartX = 4;
      const placeholderStartX = 6;

      if (inputBuffer.length === 0) {
        // Blinking cursor sits at cell 4 BEFORE placeholder
        if (cursorOn) {
          setCell(promptY, cursorCellX, '█', cursorCol);
        } else {
          setCell(promptY, cursorCellX, ' ', '');
        }

        // Placeholder starts at cell 6 so every character is fully visible
        const maxPhLen = Math.max(0, W - placeholderStartX - 2);
        const ph = BAR_PLACEHOLDER.slice(0, maxPhLen);
        writeRow(promptY, placeholderStartX, ph, placeholderCol);
      } else {
        const maxVisible = Math.max(1, W - textStartX - 2);
        let viewOffset = 0;
        if (cursorIdx >= maxVisible) {
          viewOffset = cursorIdx - maxVisible + 1;
        }
        const visible = inputBuffer.slice(viewOffset, viewOffset + maxVisible);

        // Draw typed text
        writeRow(promptY, textStartX, visible, userTextCol);

        // Draw cursor at active position
        const curX = textStartX + (cursorIdx - viewOffset);
        if (curX < W && curX >= textStartX) {
          if (cursorIdx - viewOffset < visible.length) {
            // Cursor is over a character: inverted block highlight
            const ch = visible[cursorIdx - viewOffset]!;
            if (cursorOn) {
              setCell(promptY, curX, ch, `BG:${cursorCol};FG:#0a0a0a;BOLD`);
            } else {
              setCell(promptY, curX, ch, userTextCol);
            }
          } else {
            // Cursor is at end of line
            if (cursorOn) {
              setCell(promptY, curX, '█', cursorCol);
            } else {
              setCell(promptY, curX, ' ', '');
            }
          }
        }
      }

      // 3) Bottom dashed border line
      const botY = streamH + 2;
      writeRow(botY, 1, dashedRule, borderCol);
    }

    // ── Paint theme picker panel ─────────────────────────────────────────────
    function getFilteredThemes(): ThemeTokens[] {
      if (!filterQuery) return THEMES;
      const q = filterQuery.toLowerCase();
      return THEMES.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }

    function paintThemePicker() {
      const pickerStartY = streamH + 3;
      const availRows = Math.max(0, H - pickerStartY);
      if (availRows <= 2) return;

      const dimColor = '#6b7280';
      const bgTint = '#1e222a';

      const filtered = getFilteredThemes();

      // 1. Header line: title + hints
      const titleLeft = filterQuery ? `Select theme (search: "${filterQuery}")` : 'Select theme';
      const hintsRight = '↑↓ move · enter apply · esc cancel';
      const headerY = pickerStartY;

      writeRow(headerY, 2, titleLeft, dimColor);
      const hintX = Math.max(2 + titleLeft.length + 2, W - hintsRight.length - 2);
      writeRow(headerY, hintX, hintsRight, dimColor);

      // 2. Separator line
      const sepY = pickerStartY + 1;
      const sepWidth = Math.max(1, W - 4);
      writeRow(sepY, 2, '─'.repeat(sepWidth), dimColor);

      // 3. Theme list
      const listStartY = pickerStartY + 2;
      const listHeight = Math.max(1, availRows - 2);

      if (filtered.length === 0) {
        writeRow(listStartY, 2, 'No matching themes', dimColor);
        return;
      }

      // Adjust scroll offset
      if (themePickerSelectedIndex < themePickerScrollOffset) {
        themePickerScrollOffset = themePickerSelectedIndex;
      } else if (themePickerSelectedIndex >= themePickerScrollOffset + listHeight) {
        themePickerScrollOffset = themePickerSelectedIndex - listHeight + 1;
      }

      const visibleCount = Math.min(filtered.length - themePickerScrollOffset, listHeight);

      for (let i = 0; i < visibleCount; i++) {
        const themeIdx = themePickerScrollOffset + i;
        const t = filtered[themeIdx]!;
        const isSelected = themeIdx === themePickerSelectedIndex;
        const isCurrent = t.id === pickerInitialTheme.id;
        const rowY = listStartY + i;

        const rowBg = isSelected ? bgTint : '';
        const nameColor = getThemeDisplayNameColor(t);
        const rowWidth = Math.min(W - 4, 46);

        if (isSelected) {
          for (let x = 2; x < 2 + rowWidth; x++) {
            setCell(rowY, x, ' ', `BG:${rowBg};FG:${dimColor}`);
          }
        }

        // Selection pointer: ❯
        const pointer = isSelected ? '❯' : ' ';
        const pointerKey = isSelected ? `BG:${rowBg};FG:${dimColor};BOLD` : dimColor;
        setCell(rowY, 2, pointer, pointerKey);

        // Theme name (padded to 16 characters)
        const displayName = t.name.padEnd(16);
        const nameKey = isSelected ? `BG:${rowBg};FG:${nameColor};BOLD` : nameColor;
        for (let k = 0; k < displayName.length && 4 + k < W; k++) {
          setCell(rowY, 4 + k, displayName[k]!, nameKey);
        }

        // Four color swatches: ■ ■ ■ ■
        const swatchStartX = 21;
        const swatches = [
          t.logo,
          t.logoGlow,
          t.logoShadow ?? t.textMuted,
          t.tagline,
        ];
        for (let s = 0; s < 4; s++) {
          const sx = swatchStartX + s * 2;
          const sColor = isSelected ? `BG:${rowBg};FG:${swatches[s]!}` : swatches[s]!;
          setCell(rowY, sx, '■', sColor);
          if (s < 3) {
            setCell(rowY, sx + 1, ' ', isSelected ? `BG:${rowBg};FG:${dimColor}` : '');
          }
        }

        // 'current' label if this was the active theme
        if (isCurrent) {
          const currentLabel = 'current';
          const curX = swatchStartX + 10;
          const curKey = isSelected ? `BG:${rowBg};FG:${dimColor}` : dimColor;
          for (let c = 0; c < currentLabel.length && curX + c < W; c++) {
            setCell(rowY, curX + c, currentLabel[c]!, curKey);
          }
        }
      }
    }

    // ── Paint slash-command menu ─────────────────────────────────────────────
    function getMatchingCommands(): SlashCommand[] {
      const q = inputBuffer.trim().toLowerCase();
      return COMMAND_REGISTRY.filter(cmd => cmd.name.startsWith(q));
    }

    function paintSlashMenu() {
      const menuStartY = streamH + 3;
      const availRows = Math.max(0, H - menuStartY);
      if (availRows <= 1) return;

      const dimColor = '#6b7280';
      const bgTint = '#1e222a';

      const matching = getMatchingCommands();
      if (matching.length === 0) {
        writeRow(menuStartY, 2, 'No matching commands', dimColor);
        return;
      }

      const visibleCount = Math.min(matching.length, availRows);

      for (let i = 0; i < visibleCount; i++) {
        const cmd = matching[i]!;
        const isSelected = i === slashMenuSelectedIndex;
        const rowY = menuStartY + i;

        const rowBg = isSelected ? bgTint : '';
        const rowWidth = Math.min(W - 4, 46);

        if (isSelected) {
          for (let x = 2; x < 2 + rowWidth; x++) {
            setCell(rowY, x, ' ', `BG:${rowBg};FG:${dimColor}`);
          }
        }

        const pointer = isSelected ? '❯' : ' ';
        const pointerKey = isSelected ? `BG:${rowBg};FG:${theme.accent};BOLD` : '';
        setCell(rowY, 2, pointer, pointerKey);

        const nameStr = cmd.name.padEnd(10);
        const nameKey = isSelected
          ? `BG:${rowBg};FG:${theme.accent};BOLD`
          : theme.tagline;
        for (let k = 0; k < nameStr.length && 4 + k < W; k++) {
          setCell(rowY, 4 + k, nameStr[k]!, nameKey);
        }

        const descX = 15;
        const descKey = isSelected ? `BG:${rowBg};FG:#9ca3af` : dimColor;
        for (let k = 0; k < cmd.description.length && descX + k < W; k++) {
          setCell(rowY, descX + k, cmd.description[k]!, descKey);
        }
      }
    }

    // ── Paint logs / terminal scrollback ─────────────────────────────────────
    function paintLogs() {
      const outputStartY = streamH + 3;
      const availableRows = Math.max(0, H - outputStartY);

      if (availableRows > 0 && logs.length > 0) {
        const visibleLogs = logs.slice(-availableRows);
        const promptCol = theme.userTalk?.prompt || theme.accent;
        const userTextCol = theme.userTalk?.text || theme.inputText;
        const badgeCol = theme.agentTalk?.badge || theme.accentStrong;
        const agentTextCol = theme.agentTalk?.text || theme.secondary;

        visibleLogs.forEach((logLine, idx) => {
          const rowY = outputStartY + idx;
          if (logLine.startsWith('> ')) {
            // User submitted command line
            writeRow(rowY, 2, '> ', promptCol);
            writeRow(rowY, 4, logLine.slice(2, W - 5), userTextCol);
          } else if (logLine.startsWith('Theme set to ')) {
            // Dim confirmation line
            writeRow(rowY, 2, logLine.slice(0, W - 3), '#6b7280');
          } else if (logLine.startsWith('[error') || logLine.includes('error:')) {
            writeRow(rowY, 2, logLine.slice(0, W - 3), theme.error);
          } else if (logLine.startsWith('Commands:') || logLine.startsWith('Shortcuts:')) {
            writeRow(rowY, 2, logLine.slice(0, W - 3), theme.accent);
          } else if (logLine.startsWith('[neoloop]') || logLine.startsWith('agent:')) {
            const badge = '[neoloop]';
            if (logLine.startsWith(badge)) {
              writeRow(rowY, 2, badge, badgeCol);
              writeRow(rowY, 2 + badge.length, logLine.slice(badge.length, W - 3), agentTextCol);
            } else {
              writeRow(rowY, 2, logLine.slice(0, W - 3), agentTextCol);
            }
          } else {
            // Generic minimal unprefixed log output
            writeRow(rowY, 2, logLine.slice(0, W - 3), theme.text);
          }
        });
      }
    }

    // ── Diff & flush frame ───────────────────────────────────────────────────
    function diff(): string {
      let s = '';
      for (let y = 0; y < H; y++) {
        const base = y * W;
        let x = 0;
        while (x < W) {
          let i = base + x;
          if (chars[i] === prevC[i] && colors[i] === prevK[i]) {
            x++;
            continue;
          }
          let end = x;
          let gap = 0;
          for (let k = x + 1; k < W; k++) {
            i = base + k;
            if (chars[i] !== prevC[i] || colors[i] !== prevK[i]) {
              end = k;
              gap = 0;
            } else if (++gap > 4) {
              break;
            }
          }
          s += `\x1b[${y + 1};${x + 1}H`;
          let last = '';
          for (let k = x; k <= end; k++) {
            const key = colors[base + k]!;
            if (key !== last) {
              s += key ? sgr(key) : '\x1b[0m';
              last = key;
            }
            s += chars[base + k];
          }
          x = end + 1;
        }
      }
      return s ? s + '\x1b[0m' : '';
    }

    function draw() {
      if (out.writableLength > MAX_BACKLOG) return;
      chars.fill(' ');
      colors.fill('');

      if (stream) {
        composeStream(stream, rainPalettes);
        for (let y = 0; y < stream.h; y++) {
          for (let x = 0; x < stream.w; x++) {
            const source = y * stream.w + x;
            const target = y * W + x;
            chars[target] = stream.chars[source]!;
            colors[target] = stream.colors[source]!;
          }
        }
      }

      paintContent();
      paintInputBar();

      if (mode === 'themePicker') {
        paintThemePicker();
      } else if (mode === 'slashMenu') {
        paintSlashMenu();
      } else {
        paintLogs();
      }

      if (Date.now() - lastFull > FULL_REPAINT_MS) {
        prevC.fill(null);
        prevK.fill(null);
        lastFull = Date.now();
      }

      const s = diff();
      if (s) out.write(s);
      prevC = chars.slice();
      prevK = colors.slice();
    }

    // ── Cleanup & teardown ───────────────────────────────────────────────────
    function cleanup() {
      if (!running) return;
      running = false;
      unsubTheme();
      if (timer) clearTimeout(timer);
      if (cursorTimer) clearInterval(cursorTimer);
      out.off('resize', init);
      inp.off('data', onData);
      process.off('exit', cleanup);

      // Restore terminal: disable bracketed paste, ensure mouse tracking off, show cursor, exit alt screen
      out.write('\x1b[?2004l\x1b[?1000l\x1b[?1002l\x1b[?1006l\x1b[0m\x1b[?25h\x1b[?1049l');
      try {
        inp.setRawMode(false);
      } catch {
        /* ignore */
      }
      inp.pause();
    }

    // ── Command execution context ────────────────────────────────────────────
    const commandContext: CommandContext = {
      openThemePicker: () => {
        pickerInitialTheme = theme;
        const curIdx = THEMES.findIndex(t => t.id === theme.id);
        themePickerSelectedIndex = curIdx >= 0 ? curIdx : 0;
        themePickerScrollOffset = 0;
        filterQuery = '';
        mode = 'themePicker';
      },
      showHelp: () => {
        logs.push('Commands:');
        logs.push('  /theme    Change color theme');
        logs.push('  /help     Show commands and shortcuts');
        logs.push('  /clear    Clear the output log');
        logs.push('  /exit     Quit NeoLoop');
        logs.push('');
        logs.push('Shortcuts:');
        logs.push('  Ctrl+C    Quit NeoLoop');
        logs.push('  Esc       Clear line / Close menu');
        logs.push('  Tab       Complete slash command');
        logs.push('  ↑/↓       Command history / Menu navigation');
      },
      clearLogs: () => {
        logs.length = 0;
      },
      exit: () => {
        cleanup();
        process.exit(0);
      },
      log: (msg: string) => {
        logs.push(msg);
      },
    };

    // ── Key Event Dispatcher ─────────────────────────────────────────────────
    function handleKeyAction(action: KeyAction) {
      // Ctrl-C always exits cleanly
      if (action.type === 'ctrl-c') {
        cleanup();
        process.exit(0);
      }

      // ───────────────────────────────────────────────────────────────────────
      // MODE: Theme Picker
      // ───────────────────────────────────────────────────────────────────────
      if (mode === 'themePicker') {
        const filtered = getFilteredThemes();

        if (action.type === 'esc') {
          // Esc cancels: restore initial theme and close picker
          setCurrentTheme(pickerInitialTheme, false);
          mode = 'input';
          filterQuery = '';
          return;
        }

        if (action.type === 'up') {
          if (filtered.length > 0) {
            themePickerSelectedIndex =
              (themePickerSelectedIndex - 1 + filtered.length) % filtered.length;
            // Live preview immediately
            setCurrentTheme(filtered[themePickerSelectedIndex]!, false);
          }
          return;
        }

        if (action.type === 'down') {
          if (filtered.length > 0) {
            themePickerSelectedIndex = (themePickerSelectedIndex + 1) % filtered.length;
            // Live preview immediately
            setCurrentTheme(filtered[themePickerSelectedIndex]!, false);
          }
          return;
        }

        if (action.type === 'enter') {
          if (filtered.length > 0) {
            const confirmed = filtered[themePickerSelectedIndex]!;
            setCurrentTheme(confirmed, true);
            pickerInitialTheme = confirmed;
            logs.push(`Theme set to ${confirmed.name}`);
          } else {
            setCurrentTheme(pickerInitialTheme, false);
          }
          mode = 'input';
          filterQuery = '';
          return;
        }

        if (action.type === 'backspace') {
          if (filterQuery.length > 0) {
            filterQuery = filterQuery.slice(0, -1);
            const nextFiltered = getFilteredThemes();
            themePickerSelectedIndex = 0;
            if (nextFiltered.length > 0) {
              setCurrentTheme(nextFiltered[0]!, false);
            }
          }
          return;
        }

        if (action.type === 'char') {
          // Keys 1-9 jump to that row in the filtered list
          if (/^[1-9]$/.test(action.char)) {
            const jumpIdx = parseInt(action.char, 10) - 1;
            if (jumpIdx < filtered.length) {
              themePickerSelectedIndex = jumpIdx;
              setCurrentTheme(filtered[jumpIdx]!, false);
              return;
            }
          }

          // Letters and characters filter the list by name
          filterQuery += action.char;
          const nextFiltered = getFilteredThemes();
          themePickerSelectedIndex = 0;
          if (nextFiltered.length > 0) {
            setCurrentTheme(nextFiltered[0]!, false);
          }
          return;
        }

        return;
      }

      // ───────────────────────────────────────────────────────────────────────
      // MODE: Slash Command Menu
      // ───────────────────────────────────────────────────────────────────────
      if (mode === 'slashMenu') {
        const matching = getMatchingCommands();

        if (action.type === 'esc') {
          // Esc closes the menu without clearing the input
          mode = 'input';
          return;
        }

        if (action.type === 'up') {
          if (matching.length > 0) {
            slashMenuSelectedIndex =
              (slashMenuSelectedIndex - 1 + matching.length) % matching.length;
          }
          return;
        }

        if (action.type === 'down') {
          if (matching.length > 0) {
            slashMenuSelectedIndex = (slashMenuSelectedIndex + 1) % matching.length;
          }
          return;
        }

        if (action.type === 'tab') {
          if (matching.length > 0) {
            const chosen = matching[slashMenuSelectedIndex]!;
            inputBuffer = chosen.name;
            cursorIdx = inputBuffer.length;
          }
          return;
        }

        if (action.type === 'enter') {
          if (matching.length > 0) {
            const chosen = matching[slashMenuSelectedIndex]!;
            inputBuffer = '';
            cursorIdx = 0;
            historyIndex = -1;
            savedDraft = '';
            commandHistory.push(chosen.name);
            logs.push('> ' + chosen.name);
            chosen.run(commandContext);
          } else {
            mode = 'input';
          }
          return;
        }

        if (action.type === 'backspace') {
          if (cursorIdx > 0) {
            inputBuffer = inputBuffer.slice(0, cursorIdx - 1) + inputBuffer.slice(cursorIdx);
            cursorIdx--;
            if (!inputBuffer.startsWith('/')) {
              mode = 'input';
            } else {
              slashMenuSelectedIndex = 0;
            }
          }
          return;
        }

        if (action.type === 'delete') {
          if (cursorIdx < inputBuffer.length) {
            inputBuffer = inputBuffer.slice(0, cursorIdx) + inputBuffer.slice(cursorIdx + 1);
            if (!inputBuffer.startsWith('/')) {
              mode = 'input';
            } else {
              slashMenuSelectedIndex = 0;
            }
          }
          return;
        }

        if (action.type === 'left') {
          cursorIdx = Math.max(0, cursorIdx - 1);
          return;
        }

        if (action.type === 'right') {
          cursorIdx = Math.min(inputBuffer.length, cursorIdx + 1);
          return;
        }

        if (action.type === 'home') {
          cursorIdx = 0;
          return;
        }

        if (action.type === 'end') {
          cursorIdx = inputBuffer.length;
          return;
        }

        if (action.type === 'paste') {
          inputBuffer =
            inputBuffer.slice(0, cursorIdx) + action.text + inputBuffer.slice(cursorIdx);
          cursorIdx += action.text.length;
          if (!inputBuffer.startsWith('/')) {
            mode = 'input';
          } else {
            slashMenuSelectedIndex = 0;
          }
          return;
        }

        if (action.type === 'char') {
          inputBuffer =
            inputBuffer.slice(0, cursorIdx) + action.char + inputBuffer.slice(cursorIdx);
          cursorIdx += action.char.length;
          slashMenuSelectedIndex = 0;
          return;
        }

        return;
      }

      // ───────────────────────────────────────────────────────────────────────
      // MODE: Input
      // ───────────────────────────────────────────────────────────────────────
      if (!inputVisible) return;

      if (action.type === 'esc') {
        // Esc clears the line
        inputBuffer = '';
        cursorIdx = 0;
        historyIndex = -1;
        savedDraft = '';
        return;
      }

      if (action.type === 'left') {
        cursorIdx = Math.max(0, cursorIdx - 1);
        return;
      }

      if (action.type === 'right') {
        cursorIdx = Math.min(inputBuffer.length, cursorIdx + 1);
        return;
      }

      if (action.type === 'home') {
        cursorIdx = 0;
        return;
      }

      if (action.type === 'end') {
        cursorIdx = inputBuffer.length;
        return;
      }

      if (action.type === 'delete') {
        if (cursorIdx < inputBuffer.length) {
          inputBuffer = inputBuffer.slice(0, cursorIdx) + inputBuffer.slice(cursorIdx + 1);
        }
        return;
      }

      if (action.type === 'backspace') {
        if (cursorIdx > 0) {
          inputBuffer = inputBuffer.slice(0, cursorIdx - 1) + inputBuffer.slice(cursorIdx);
          cursorIdx--;
        }
        return;
      }

      if (action.type === 'up') {
        // Browse command history backwards
        if (commandHistory.length > 0) {
          if (historyIndex === -1) {
            savedDraft = inputBuffer;
            historyIndex = commandHistory.length - 1;
          } else if (historyIndex > 0) {
            historyIndex--;
          }
          if (historyIndex >= 0 && historyIndex < commandHistory.length) {
            inputBuffer = commandHistory[historyIndex]!;
            cursorIdx = inputBuffer.length;
          }
        }
        return;
      }

      if (action.type === 'down') {
        // Browse command history forwards
        if (historyIndex !== -1) {
          historyIndex++;
          if (historyIndex >= commandHistory.length) {
            historyIndex = -1;
            inputBuffer = savedDraft;
            cursorIdx = inputBuffer.length;
          } else {
            inputBuffer = commandHistory[historyIndex]!;
            cursorIdx = inputBuffer.length;
          }
        }
        return;
      }

      if (action.type === 'paste') {
        inputBuffer =
          inputBuffer.slice(0, cursorIdx) + action.text + inputBuffer.slice(cursorIdx);
        cursorIdx += action.text.length;
        if (inputBuffer.startsWith('/')) {
          mode = 'slashMenu';
          slashMenuSelectedIndex = 0;
        }
        return;
      }

      if (action.type === 'char') {
        inputBuffer =
          inputBuffer.slice(0, cursorIdx) + action.char + inputBuffer.slice(cursorIdx);
        cursorIdx += action.char.length;
        if (inputBuffer.startsWith('/')) {
          mode = 'slashMenu';
          slashMenuSelectedIndex = 0;
        }
        return;
      }

      if (action.type === 'enter') {
        const trimmed = inputBuffer.trim();
        inputBuffer = '';
        cursorIdx = 0;
        historyIndex = -1;
        savedDraft = '';

        if (!trimmed) return;

        commandHistory.push(trimmed);
        logs.push('> ' + trimmed);

        // Command routing
        if (trimmed === '/theme') {
          commandContext.openThemePicker();
          return;
        }

        if (trimmed.startsWith('/theme ')) {
          const themeNameOrId = trimmed.slice(7).trim();
          const target = THEMES.find(
            t =>
              t.id.toLowerCase() === themeNameOrId.toLowerCase() ||
              t.name.toLowerCase() === themeNameOrId.toLowerCase()
          );
          if (target) {
            setCurrentTheme(target, true);
            logs.push(`Theme set to ${target.name}`);
          } else {
            logs.push(`Unknown theme: ${themeNameOrId}`);
          }
          return;
        }

        if (trimmed === '/help') {
          commandContext.showHelp();
          return;
        }

        if (trimmed === '/clear') {
          commandContext.clearLogs();
          return;
        }

        if (trimmed === '/exit') {
          commandContext.exit();
          return;
        }

        if (trimmed.startsWith('/')) {
          logs.push(`Unknown command: ${trimmed}. Type /help for available commands.`);
          return;
        }

        // Forward user message to execution flow
        if (onCommand) {
          try {
            Promise.resolve(
              onCommand(trimmed, (msg: string) => {
                logs.push(msg);
              })
            ).catch(err => {
              logs.push(`error: ${err?.message || err}`);
            });
          } catch (err: any) {
            logs.push(`error: ${err?.message || err}`);
          }
        } else {
          logs.push(`processing: "${trimmed}"`);
        }
      }
    }

    function onData(buf: Buffer) {
      const actions = parseKeyActions(buf);
      for (const action of actions) {
        handleKeyAction(action);
      }
    }

    // ── Boot ─────────────────────────────────────────────────────────────────
    disableWinQuickEdit();

    // UTF-8 mode, enter alternate screen buffer, hide cursor, enable bracketed paste,
    // turn OFF mouse tracking explicitly (never enable \x1b[?1000h)
    out.write('\x1b%G\x1b[?1049h\x1b[?25l\x1b[?2004h\x1b[?1000l\x1b[?1002l\x1b[?1006l');
    init();
    out.on('resize', init);
    process.on('exit', cleanup);

    try {
      inp.setRawMode(true);
    } catch {
      /* non-TTY pipe */
    }
    inp.resume();
    inp.on('data', onData);

    cursorTimer = setInterval(() => {
      cursorOn = !cursorOn;
    }, CURSOR_BLINK_MS);

    (function loop() {
      if (!running) return;
      const t0 = Date.now();
      frame++;

      if (frame >= streamStartFrame) {
        if (!stream) {
          stream = createStream(W, streamH, rainPalettes.length);
        }
        stepStream(stream);

        if (stream.hasHitBottom) {
          inputVisible = true;
        }
      }

      draw();
      timer = setTimeout(loop, Math.max(0, 1000 / FPS - (Date.now() - t0)));
    })();
  });
}
