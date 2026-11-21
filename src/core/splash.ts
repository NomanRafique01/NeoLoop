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
import { copyToClipboard, readFromClipboard } from './clipboard.js';
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
  lerpColor,
  loadSavedMouseEnabled,
  saveMouseEnabled,
} from './themes.js';
import { COMMAND_REGISTRY, SlashCommand, CommandContext } from './commands.js';
import { parseKeyActions, KeyAction } from './keys.js';
import { LogBuffer, DisplayLine } from './logBuffer.js';
import stringWidth from 'string-width';

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
    if (key.startsWith('\x1b[')) {
      cached = key;
    } else if (key.startsWith('BG:')) {
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
    type Mode = 'input' | 'slashMenu' | 'themePicker' | 'contextMenu';
    let mode: Mode = 'input';

    let inputVisible = false;
    let inputBuffer = '';
    let cursorIdx = 0;
    let inputScrollTop = 0;
    let barHeight = 1;
    let isSelectedAll = false;  // Ctrl+A selection state
    let cursorOn = true;
    let cursorTimer: NodeJS.Timeout | undefined;

    // Command history
    const commandHistory: string[] = [];
    let historyIndex = -1;
    let savedDraft = '';

    // Output viewport & log buffer state
    let scrollTop = 0;
    let followTail = true;
    let linesWhenLeftTail = 0;
    let lastScrollActivityTime = Date.now();
    let mouseEnabled = loadSavedMouseEnabled();

    function setMouseMode(enabled: boolean) {
      mouseEnabled = enabled;
      if (running) {
        if (mouseEnabled) {
          out.write('\x1b[?1000h\x1b[?1002h\x1b[?1006h');
        } else {
          out.write('\x1b[?1000l\x1b[?1002l\x1b[?1006l');
        }
      }
    }

    function updateScroll(newTop: number) {
      const vRows = Math.max(0, H - (streamH + barHeight + 2));
      const max = Math.max(0, logBuffer.lineCount - vRows);
      const clamped = Math.max(0, Math.min(max, newTop));

      if (clamped < max) {
        if (followTail) {
          linesWhenLeftTail = logBuffer.lineCount;
          followTail = false;
        }
        scrollTop = clamped;
      } else {
        scrollTop = max;
        followTail = true;
        linesWhenLeftTail = logBuffer.lineCount;
      }
    }

    // Scroll burst coalescing & auto-repeat acceleration state
    let scrollRepaintTimer: NodeJS.Timeout | null = null;
    let lastScrollRepaintTime = 0;
    const SCROLL_COALESCE_MS = 16;

    const ACCEL_TIMEOUT_MS = 150;
    const ACCEL_MAX_STEP = 8;
    let lastScrollTime = 0;
    let lastScrollDir = 0;
    let accelStep = 1;

    function getScrollStep(dir: number): number {
      const now = Date.now();
      if (now - lastScrollTime <= ACCEL_TIMEOUT_MS && lastScrollDir === dir) {
        accelStep = Math.min(ACCEL_MAX_STEP, accelStep + 1);
      } else {
        accelStep = 1;
      }
      lastScrollTime = now;
      lastScrollDir = dir;
      return accelStep;
    }

    function requestScrollRepaint() {
      if (!running || out.writableLength > MAX_BACKLOG) return;

      const now = Date.now();
      const elapsed = now - lastScrollRepaintTime;

      if (elapsed >= SCROLL_COALESCE_MS) {
        if (scrollRepaintTimer) {
          clearTimeout(scrollRepaintTimer);
          scrollRepaintTimer = null;
        }
        lastScrollRepaintTime = now;
        draw();
      } else if (!scrollRepaintTimer) {
        scrollRepaintTimer = setTimeout(() => {
          scrollRepaintTimer = null;
          if (!running || out.writableLength > MAX_BACKLOG) return;
          lastScrollRepaintTime = Date.now();
          draw();
        }, SCROLL_COALESCE_MS - elapsed);
      }
    }

    const logBuffer = new LogBuffer({
      cols: Math.max(1, (out.columns || 80) - 5),
      onDropLines: (count) => {
        if (!followTail) {
          scrollTop = Math.max(0, scrollTop - count);
          linesWhenLeftTail = Math.max(0, linesWhenLeftTail - count);
        } else {
          linesWhenLeftTail = logBuffer.lineCount;
        }
      },
    });

    for (const initialLog of initialLogs) {
      logBuffer.log(initialLog);
    }

    // Slash menu state
    let slashMenuSelectedIndex = 0;

    // Theme picker state
    let pickerInitialTheme: ThemeTokens = theme;
    let themePickerSelectedIndex = 0;
    let themePickerScrollOffset = 0;
    let filterQuery = '';

    // ── Context menu state ───────────────────────────────────────────────────
    interface ContextMenuItem {
      label: string;
      shortcut: string;
      action: 'copy' | 'paste' | 'cut' | 'clear' | 'selectAll';
    }
    const CONTEXT_MENU_ITEMS: ContextMenuItem[] = [
      { label: 'Copy',       shortcut: 'Ctrl+C', action: 'copy'      },
      { label: 'Paste',      shortcut: 'Ctrl+V', action: 'paste'     },
      { label: 'Cut',        shortcut: 'Ctrl+X', action: 'cut'       },
      { label: 'Select All', shortcut: 'Ctrl+A', action: 'selectAll' },
      { label: 'Clear',      shortcut: 'Esc',    action: 'clear'     },
    ];
    let contextMenuX = 0;      // terminal column (0-based)
    let contextMenuY = 0;      // terminal row    (0-based)
    let contextMenuSelectedIndex = 0;
    let prevMode: Mode = 'input'; // mode to restore on close

    const LETTER_FRAMES = 3;
    const titleDoneFrame = title.length * LETTER_FRAMES;
    const tagStartFrame = titleDoneFrame + 4;
    const TAG_SPEED = 2;
    const tagDoneFrame = tagStartFrame + Math.ceil(tagline.length / TAG_SPEED);
    const hintStartFrame = hint ? tagDoneFrame + 3 : tagDoneFrame;
    const streamStartFrame = hint ? hintStartFrame + 3 : tagDoneFrame + 3;

    // ── Layout helpers & compact header modes ───────────────────────────────
    type HeaderMode = 'full' | 'compact-no-rain' | 'single-line';
    let headerMode: HeaderMode = 'full';

    function recalcLayout() {
      W = Math.max(1, (out.columns || 80) - 1);
      H = Math.max(1, out.rows || 24);

      if (W < 20 || H < 8) {
        streamH = 0;
        return;
      }

      logBuffer.setWidth(Math.max(1, W - 4));

      const sampleLines = buildLines(title, tagline, hint, theme.accent, W, H, theme);
      const y0 = Math.max(0, Math.floor(H / 4 - sampleLines.length / 2));
      const fullBig = bigLogo(title);
      const logoH = fullBig ? fullBig.length : 1;
      const tagRow = y0 + (fullBig ? logoH + 1 : 2);

      const normalStreamH = Math.min(Math.max(6, H - 4), tagRow + 1);
      // Use barHeight=1 (minimum) for layout decisions so a large in-progress
      // input buffer never wrongly triggers compact/single-line header mode.
      const normalOutStartY = normalStreamH + 1 + 2;
      const normalViewportRows = H - normalOutStartY;

      if (normalViewportRows >= 6) {
        headerMode = 'full';
        streamH = normalStreamH;
      } else {
        const noRainStreamH = Math.min(H - 1 - 2, tagRow + 1);
        const noRainViewportRows = H - (noRainStreamH + 1 + 2);
        if (noRainViewportRows >= 6) {
          headerMode = 'compact-no-rain';
          streamH = noRainStreamH;
        } else {
          headerMode = 'single-line';
          streamH = 1;
        }
      }
    }

    function init() {
      const oldScrollTop = scrollTop;
      const oldFollowTail = followTail;

      recalcLayout();
      stream = (headerMode === 'full' && frame >= streamStartFrame)
        ? createStream(W, streamH, rainPalettes.length)
        : null;
      chars = new Array(W * H).fill(' ');
      colors = new Array(W * H).fill('');
      prevC = new Array(W * H).fill(null);
      prevK = new Array(W * H).fill(null);
      lastFull = Date.now();
      out.write('\x1b[0m\x1b[2J\x1b[H');

      const vRows = Math.max(0, H - (streamH + barHeight + 2));
      const maxScroll = Math.max(0, logBuffer.lineCount - vRows);
      if (oldFollowTail) {
        scrollTop = maxScroll;
        followTail = true;
      } else {
        scrollTop = Math.max(0, Math.min(oldScrollTop, maxScroll));
        followTail = false;
      }
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
        if (startX + k >= 0) {
          setCell(y, startX + k, text[k]!, col);
        }
      }
    }

    function writeStyledRow(y: number, startX: number, text: string, col: string) {
      if (y < 0 || y >= H) return;
      let curX = startX;
      for (const ch of text) {
        if (curX >= W) break;
        const w = stringWidth(ch);
        if (w === 0) continue;
        if (w === 2) {
          if (curX >= 0 && curX + 1 < W) {
            setCell(y, curX, ch, col);
            setCell(y, curX + 1, '', '');
          }
          curX += 2;
        } else {
          if (curX >= 0) {
            setCell(y, curX, ch, col);
          }
          curX += 1;
        }
      }
    }

    // ── Paint the logo + tagline into chars/colors ───────────────────────────
    function paintContent() {
      if (headerMode === 'single-line') {
        const titleUpper = title.toUpperCase();
        const sep = '  |  ';
        const tagUpper = tagline.toUpperCase();
        const fullHeader = `${titleUpper}${sep}${tagUpper}`;

        const startX = Math.max(2, Math.floor((W - fullHeader.length) / 2));
        let curX = startX;

        for (let k = 0; k < titleUpper.length && curX < W - 2; k++) {
          setCell(0, curX++, titleUpper[k]!, theme.logo);
        }
        for (let k = 0; k < sep.length && curX < W - 2; k++) {
          setCell(0, curX++, sep[k]!, theme.textMuted || '#6b7280');
        }
        for (let k = 0; k < tagUpper.length && curX < W - 2; k++) {
          setCell(0, curX++, tagUpper[k]!, theme.tagline);
        }
        return;
      }
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

    // ── Input bar geometry & visual rows ──────────────────────────────────────
    interface VisualRow {
      text: string;
      startIdx: number;
      endIdx: number;
    }

    function getVisualInputRows(textCols: number): {
      rows: VisualRow[];
      cursorRow: number;
      cursorCol: number;
    } {
      if (inputBuffer.length === 0) {
        return {
          rows: [{ text: '', startIdx: 0, endIdx: 0 }],
          cursorRow: 0,
          cursorCol: 0,
        };
      }

      const rows: VisualRow[] = [];
      const lines = inputBuffer.split('\n');
      let currentIdx = 0;

      for (let l = 0; l < lines.length; l++) {
        const line = lines[l]!;
        if (line.length === 0) {
          rows.push({
            text: '',
            startIdx: currentIdx,
            endIdx: currentIdx,
          });
        } else {
          let offset = 0;
          while (offset < line.length) {
            const slice = line.slice(offset, offset + textCols);
            rows.push({
              text: slice,
              startIdx: currentIdx + offset,
              endIdx: currentIdx + offset + slice.length,
            });
            offset += textCols;
          }
        }
        currentIdx += line.length + (l < lines.length - 1 ? 1 : 0);
      }

      // Compute cursor row & column within visual rows
      let cursorRow = 0;
      let cursorCol = 0;
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r]!;
        if (cursorIdx >= row.startIdx && cursorIdx <= row.endIdx) {
          cursorRow = r;
          cursorCol = cursorIdx - row.startIdx;
          if (cursorIdx === row.endIdx && r < rows.length - 1) {
            const nextRow = rows[r + 1]!;
            if (nextRow.startIdx === cursorIdx) {
              cursorRow = r + 1;
              cursorCol = 0;
            }
          }
          break;
        }
      }

      return { rows, cursorRow, cursorCol };
    }

    function autoScrollToCursor() {
      const textCols = Math.max(1, W - 7);
      const { rows: inputRows, cursorRow } = getVisualInputRows(textCols);
      const MAX_BAR_ROWS    = 10;
      const MIN_OUTPUT_ROWS = 4;
      const availH          = Math.max(1, H - streamH - 2);
      const maxBarRows      = Math.max(1, Math.min(MAX_BAR_ROWS, availH - MIN_OUTPUT_ROWS));
      const curBarHeight    = Math.max(1, Math.min(inputRows.length, maxBarRows));
      const maxInputScroll  = Math.max(0, inputRows.length - curBarHeight);

      if (cursorRow < inputScrollTop) {
        inputScrollTop = cursorRow;
      } else if (cursorRow >= inputScrollTop + curBarHeight) {
        inputScrollTop = cursorRow - curBarHeight + 1;
      }
      inputScrollTop = Math.max(0, Math.min(inputScrollTop, maxInputScroll));
    }

    // ── Paint dashed border input bar ────────────────────────────────────────
    function paintInputBar() {
      if (!inputVisible) return;

      const borderCol      = theme.inputBorder || theme.border;
      const promptCol      = theme.userTalk?.prompt || theme.accent;
      const userTextCol    = theme.userTalk?.text || theme.inputText;
      const selBg          = theme.selection;
      const selFg          = theme.background;
      const cursorColor    = theme.cursor;
      const placeholderCol = theme.inputPlaceholder;

      const ruleWidth  = Math.max(1, W - 2);
      const dashedRule = '-'.repeat(ruleWidth);
      const textCols   = Math.max(1, W - 7); // columns available per text row (leaves room for scrollbar)
      const textStartX = 4;                   // where text begins (after "> ")

      // ── Compute wrapped rows & cursor ─────────────────────────────────────
      const { rows: inputRows, cursorRow, cursorCol } = getVisualInputRows(textCols);

      // Input bar expands up to 10 lines as user types or pastes.
      // When input has more than 10 lines, it becomes scrollable.
      const MAX_BAR_ROWS    = 10;
      const MIN_OUTPUT_ROWS = 4;
      const availH          = Math.max(1, H - streamH - 2);
      const maxBarRows      = Math.max(1, Math.min(MAX_BAR_ROWS, availH - MIN_OUTPUT_ROWS));
      barHeight = Math.max(1, Math.min(inputRows.length, maxBarRows));

      const isScrollable   = inputRows.length > barHeight;
      const maxInputScroll = Math.max(0, inputRows.length - barHeight);
      inputScrollTop = Math.max(0, Math.min(inputScrollTop, maxInputScroll));

      // Visual cursor row within the displayed window
      const cursorRowVisible = cursorRow - inputScrollTop;

      // ── 1) Top dashed border ──────────────────────────────────────────────
      const topY = streamH;
      if (inputScrollTop > 0) {
        const tag = ` [▲ ${inputScrollTop} line${inputScrollTop > 1 ? 's' : ''} above] `;
        if (tag.length < ruleWidth - 4) {
          const sideLen = Math.floor((ruleWidth - tag.length) / 2);
          const topWithTag = '-'.repeat(sideLen) + tag + '-'.repeat(ruleWidth - sideLen - tag.length);
          writeRow(topY, 1, topWithTag, borderCol);
        } else {
          writeRow(topY, 1, dashedRule, borderCol);
        }
      } else {
        writeRow(topY, 1, dashedRule, borderCol);
      }

      // ── 2) Content rows ───────────────────────────────────────────────────
      if (inputBuffer.length === 0) {
        // Empty: single prompt row with placeholder + blinking cursor
        const promptY = streamH + 1;
        writeRow(promptY, 2, '> ', promptCol);

        // Blinking block cursor at col 4
        setCell(promptY, textStartX, cursorOn ? '█' : ' ', cursorOn ? cursorColor : '');

        // Placeholder text starting at col 6
        const maxPhLen = Math.max(0, W - 6 - 2);
        const ph = BAR_PLACEHOLDER.slice(0, maxPhLen);
        writeRow(promptY, 6, ph, placeholderCol);
      } else {
        for (let r = 0; r < barHeight; r++) {
          const srcRow  = inputScrollTop + r;
          const rowY    = streamH + 1 + r;
          const vRow    = inputRows[srcRow];
          const rowText = vRow ? vRow.text : '';

          // Prompt symbol only on the first logical row; continuations get indent
          if (srcRow === 0) {
            writeRow(rowY, 2, '> ', promptCol);
          } else {
            writeRow(rowY, 2, '  ', '');
          }

          if (isSelectedAll) {
            // ── Selection highlight: entire buffer selected ──────────────────
            const displayText = rowText.padEnd(Math.min(rowText.length + 1, textCols));
            for (let k = 0; k < displayText.length && textStartX + k < W - 2; k++) {
              setCell(rowY, textStartX + k, displayText[k]!, `BG:${selBg};FG:${selFg};BOLD`);
            }
          } else {
            // ── Normal text rendering ────────────────────────────────────────
            writeRow(rowY, textStartX, rowText, userTextCol);

            // ── Cursor (only on the row that contains the cursor) ─────────────
            if (r === cursorRowVisible) {
              const curX = textStartX + cursorCol;
              if (curX < W - 2) {
                if (cursorCol < rowText.length) {
                  // Over a character — inverted block
                  const ch = rowText[cursorCol]!;
                  setCell(rowY, curX, ch,
                    cursorOn ? `BG:${cursorColor};FG:#0a0a0a;BOLD` : userTextCol);
                } else {
                  // After text (end of line)
                  setCell(rowY, curX, cursorOn ? '█' : ' ', cursorOn ? cursorColor : '');
                }
              }
            }
          }

          // ── Scrollbar track & thumb on the right edge if scrollable ─────────
          if (isScrollable) {
            const scrollbarX = W - 2;
            const thumbRow = maxInputScroll > 0
              ? Math.round((inputScrollTop / maxInputScroll) * (barHeight - 1))
              : 0;
            if (r === thumbRow) {
              setCell(rowY, scrollbarX, '█', theme.accent);
            } else {
              setCell(rowY, scrollbarX, '│', borderCol);
            }
          }
        }
      }

      // ── 3) Bottom dashed border (always after all content rows) ───────────
      const botY = streamH + 1 + barHeight;
      const linesBelow = maxInputScroll - inputScrollTop;
      if (linesBelow > 0) {
        const tag = ` [▼ ${linesBelow} line${linesBelow > 1 ? 's' : ''} below (scroll to see)] `;
        if (tag.length < ruleWidth - 4) {
          const sideLen = Math.floor((ruleWidth - tag.length) / 2);
          const botWithTag = '-'.repeat(sideLen) + tag + '-'.repeat(ruleWidth - sideLen - tag.length);
          writeRow(botY, 1, botWithTag, borderCol);
        } else {
          writeRow(botY, 1, dashedRule, borderCol);
        }
      } else {
        writeRow(botY, 1, dashedRule, borderCol);
      }
    }

    // ── Paint theme picker panel ─────────────────────────────────────────────
    function getFilteredThemes(): ThemeTokens[] {
      if (!filterQuery) return THEMES;
      const q = filterQuery.toLowerCase();
      return THEMES.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }

    function paintThemePicker() {
      const pickerStartY = streamH + barHeight + 2;
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
      const menuStartY = streamH + barHeight + 2;
      const availRows = Math.max(0, H - menuStartY);
      if (availRows <= 1) return;

      const dimColor = '#6b7280';
      const bgTint = '#1e222a';

      const matching = getMatchingCommands();
      if (matching.length === 0) {
        // Only show "no match" hint when user has actually typed a /command prefix
        if (inputBuffer.trimStart().startsWith('/')) {
          writeRow(menuStartY, 2, 'No matching commands', dimColor);
        }
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
      const outputStartY = streamH + barHeight + 2;
      const viewportRows = Math.max(0, H - outputStartY);
      if (viewportRows <= 0) return;

      const totalLines = logBuffer.lineCount;
      const maxScroll = Math.max(0, totalLines - viewportRows);

      if (followTail) {
        scrollTop = maxScroll;
        linesWhenLeftTail = totalLines;
      } else {
        scrollTop = Math.max(0, Math.min(scrollTop, maxScroll));
        if (scrollTop >= maxScroll) {
          followTail = true;
          linesWhenLeftTail = totalLines;
        }
      }

      if (totalLines === 0) return;

      const lines = logBuffer.getLines(scrollTop, viewportRows);
      const userTextCol = theme.userTalk?.text || theme.inputText;
      const stepCol     = theme.tagline || theme.accent;
      const errorCol    = theme.error || '#ef4444';
      const textCol     = theme.text;
      const dimCol      = theme.textMuted || '#6b7280';

      lines.forEach((line, idx) => {
        const rowY = outputStartY + idx;
        if (rowY >= H) return;

        if (line.type === 'command') {
          writeStyledRow(rowY, 2, '> ', dimCol);
          const cmdText = line.text.startsWith('> ') ? line.text.slice(2) : line.text;
          writeStyledRow(rowY, 4, cmdText, userTextCol);
        } else if (line.type === 'step') {
          writeStyledRow(rowY, 2, line.text, stepCol);
        } else if (line.type === 'error') {
          writeStyledRow(rowY, 2, line.text, errorCol);
        } else if (line.type === 'info') {
          writeStyledRow(rowY, 2, line.text, dimCol);
        } else {
          if (line.segments && line.segments.length > 0) {
            let curX = 2;
            for (const seg of line.segments) {
              const segStyle = seg.style || textCol;
              writeStyledRow(rowY, curX, seg.text, segStyle);
              curX += stringWidth(seg.text);
            }
          } else {
            writeStyledRow(rowY, 2, line.text, textCol);
          }
        }
      });

      // ── New lines indicator when scrolled up ─────────────────────────────
      const unreadCount = Math.max(0, totalLines - linesWhenLeftTail);
      if (!followTail && unreadCount > 0 && scrollTop < maxScroll && viewportRows >= 2) {
        const botRowY = outputStartY + viewportRows - 1;
        const msg = ` v ${unreadCount} new line${unreadCount === 1 ? '' : 's'}  (End to jump) `;
        if (msg.length + 4 <= W) {
          const pillX = Math.max(2, W - msg.length - 2);
          const pillBg = theme.surfaceElevated || theme.surface || '#161922';
          const pillFg = theme.textMuted || '#9ca3af';

          for (let k = 0; k < msg.length && pillX + k < W - 1; k++) {
            const ch = msg[k]!;
            const isGlyph = ch === 'v';
            const col = `BG:${pillBg};FG:${isGlyph ? theme.accent : pillFg}`;
            setCell(botRowY, pillX + k, ch, col);
          }
        }
      }

      paintScrollbar();
    }

    // ── Paint scrollbar ──────────────────────────────────────────────────────
    function paintScrollbar() {
      const outputStartY = streamH + barHeight + 2;
      const viewportRows = Math.max(0, H - outputStartY);
      const totalLines = logBuffer.lineCount;

      // Appears only when lineCount > viewportRows
      if (viewportRows <= 0 || totalLines <= viewportRows || W < 4) return;

      const maxScroll = totalLines - viewportRows;
      const thumbSize = Math.max(1, Math.min(viewportRows, Math.round((viewportRows * viewportRows) / totalLines)));
      const travelRows = viewportRows - thumbSize;

      let thumbY = 0;
      if (travelRows > 0 && maxScroll > 0) {
        if (scrollTop >= maxScroll) {
          thumbY = travelRows;
        } else if (scrollTop <= 0) {
          thumbY = 0;
        } else {
          thumbY = Math.max(0, Math.min(travelRows, Math.round((scrollTop / maxScroll) * travelRows)));
        }
      }

      const isUtf8 = !process.env.LC_ALL?.includes('ASCII') && !process.env.LANG?.includes('ASCII');
      const trackChar = isUtf8 ? '│' : '|';
      const thumbChar = isUtf8 ? '┃' : '#';

      // Colors from active theme tokens
      const trackColor = theme.logoDeep ?? theme.logoShadow ?? theme.surfaceElevated ?? '#2f3d4f';
      const activeThumbColor = theme.accent || theme.tagline || theme.logo;

      // Idle dimming after ~1.2 seconds without scroll activity
      const isScrollActive = Date.now() - lastScrollActivityTime < 1200;
      let idleThumbColor = theme.textMuted || '#6b7280';
      try {
        idleThumbColor = lerpColor(activeThumbColor, theme.background || '#0a0a0a', 0.55);
      } catch {
        /* fallback to theme.textMuted */
      }
      const thumbColor = isScrollActive ? activeThumbColor : idleThumbColor;

      const unreadCount = Math.max(0, totalLines - linesWhenLeftTail);
      const scrollCol = W - 1;
      for (let r = 0; r < viewportRows; r++) {
        const rowY = outputStartY + r;
        if (rowY >= H) break;
        const isThumb = r >= thumbY && r < thumbY + thumbSize;
        const isBottomTrack = !isThumb && r === viewportRows - 1 && !followTail && unreadCount > 0;
        setCell(
          rowY,
          scrollCol,
          isThumb ? thumbChar : (isBottomTrack ? 'v' : trackChar),
          isThumb ? thumbColor : (isBottomTrack ? theme.accent : trackColor)
        );
      }
    }

    // ── Paint right-click context menu ───────────────────────────────────────
    function paintContextMenu() {
      if (mode !== 'contextMenu') return;

      const MENU_INNER_WIDTH = 24;
      const BOX_WIDTH = MENU_INNER_WIDTH + 2;
      const MENU_HEIGHT = CONTEXT_MENU_ITEMS.length + 2;

      // Clamp so the menu never bleeds off-screen
      const mx = Math.max(0, Math.min(contextMenuX, W - BOX_WIDTH));
      const my = Math.max(0, Math.min(contextMenuY, H - MENU_HEIGHT));

      // ── Derive perfectly-themed colors from the live theme ────────────────
      const panelBg   = theme.surfaceElevated || theme.surface || '#12131a';
      const borderCol = theme.inputBorder || theme.accent || theme.border;
      const selBg     = theme.selection || theme.accent;

      // High-contrast selection text
      let selFg = '#ffffff';
      try {
        const rgb = parseHex(selBg);
        const lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
        selFg = lum > 140 ? '#0a0a0a' : '#ffffff';
      } catch {
        selFg = '#ffffff';
      }

      const itemFg     = theme.text || '#f0f0f0';
      const shortcutFg = theme.textMuted || theme.accent;
      const titleFg    = theme.accent || '#ffffff';
      const hintFg     = theme.textMuted || theme.accent;

      // ── 1) Paint a solid background slab first (clear previous content) ───
      for (let row = 0; row < MENU_HEIGHT; row++) {
        for (let col = 0; col < BOX_WIDTH; col++) {
          setCell(my + row, mx + col, ' ', `BG:${panelBg};FG:${itemFg}`);
        }
      }

      // ── 2) Top border with "Clipboard" title: ┌─ Clipboard ────────────┐ ──
      const title = ' Clipboard ';
      const topDashes = Math.max(1, BOX_WIDTH - 2 - title.length - 1);
      const topBorder = '┌─' + title + '─'.repeat(topDashes) + '┐';
      for (let k = 0; k < topBorder.length && mx + k < W; k++) {
        const ch = topBorder[k]!;
        const isTitleChar = k >= 2 && k < 2 + title.length;
        setCell(
          my,
          mx + k,
          ch,
          isTitleChar
            ? `BG:${panelBg};FG:${titleFg};BOLD`
            : `BG:${panelBg};FG:${borderCol}`
        );
      }

      // ── 3) Item rows: │ > Copy          Ctrl+C │ ──────────────────────────
      for (let i = 0; i < CONTEXT_MENU_ITEMS.length; i++) {
        const item = CONTEXT_MENU_ITEMS[i]!;
        const rowY = my + 1 + i;
        const isSelected = i === contextMenuSelectedIndex;

        const rowBg = isSelected ? selBg : panelBg;
        const ptr = isSelected ? '>' : ' ';
        const shortcut = item.shortcut || '';
        const rightMargin = ' ';
        const spaceCount = Math.max(
          1,
          MENU_INNER_WIDTH - 2 - item.label.length - shortcut.length - rightMargin.length
        );

        // Left border
        setCell(rowY, mx, '│', `BG:${panelBg};FG:${borderCol}`);

        // Pointer: '>' or ' '
        setCell(
          rowY,
          mx + 1,
          ptr,
          isSelected ? `BG:${rowBg};FG:${selFg};BOLD` : `BG:${rowBg};FG:${itemFg}`
        );
        // Space
        setCell(rowY, mx + 2, ' ', `BG:${rowBg};FG:${itemFg}`);

        // Label
        let curCol = mx + 3;
        for (let k = 0; k < item.label.length && curCol < W; k++, curCol++) {
          setCell(
            rowY,
            curCol,
            item.label[k]!,
            isSelected ? `BG:${rowBg};FG:${selFg};BOLD` : `BG:${rowBg};FG:${itemFg}`
          );
        }

        // Filler spaces
        for (let k = 0; k < spaceCount && curCol < W; k++, curCol++) {
          setCell(rowY, curCol, ' ', `BG:${rowBg};FG:${itemFg}`);
        }

        // Shortcut
        for (let k = 0; k < shortcut.length && curCol < W; k++, curCol++) {
          setCell(
            rowY,
            curCol,
            shortcut[k]!,
            isSelected
              ? `BG:${rowBg};FG:${selFg};BOLD`
              : `BG:${rowBg};FG:${shortcutFg}`
          );
        }

        // Trailing margin
        for (let k = 0; k < rightMargin.length && curCol < W; k++, curCol++) {
          setCell(rowY, curCol, ' ', `BG:${rowBg};FG:${itemFg}`);
        }

        // Right border
        const rCol = mx + BOX_WIDTH - 1;
        if (rCol < W) {
          setCell(rowY, rCol, '│', `BG:${panelBg};FG:${borderCol}`);
        }
      }

      // ── 4) Bottom border with hint: └────── enter·esc ───────┘ ────────────
      const hintText = ' enter·esc ';
      const leftDashes = Math.max(1, Math.floor((MENU_INNER_WIDTH - hintText.length) / 2));
      const rightDashes = Math.max(1, MENU_INNER_WIDTH - hintText.length - leftDashes);
      const bottomBorder = '└' + '─'.repeat(leftDashes) + hintText + '─'.repeat(rightDashes) + '┘';
      const botY = my + MENU_HEIGHT - 1;

      for (let k = 0; k < bottomBorder.length && mx + k < W; k++) {
        const ch = bottomBorder[k]!;
        const isHintChar = k > leftDashes && k <= leftDashes + hintText.length;
        setCell(
          botY,
          mx + k,
          ch,
          isHintChar
            ? `BG:${panelBg};FG:${hintFg}`
            : `BG:${panelBg};FG:${borderCol}`
        );
      }
    }

    // ── Execute a context menu action ────────────────────────────────────────
    function executeContextMenuAction(action: string) {
      mode = prevMode;
      isSelectedAll = false;
      switch (action) {
        case 'copy':
          if (inputBuffer) {
            copyToClipboard(inputBuffer);
            logBuffer.log('Copied to clipboard');
          }
          break;
        case 'cut':
          if (inputBuffer) {
            copyToClipboard(inputBuffer);
            inputBuffer = '';
            cursorIdx   = 0;
            inputScrollTop = 0;
            logBuffer.log('Cut to clipboard');
          }
          break;
        case 'paste':
          readFromClipboard().then(text => {
            if (text) {
              const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
              inputBuffer = inputBuffer.slice(0, cursorIdx) + clean + inputBuffer.slice(cursorIdx);
              cursorIdx  += clean.length;
              autoScrollToCursor();
              if (inputBuffer.startsWith('/') && !inputBuffer.includes('\n')) {
                mode = 'slashMenu';
                slashMenuSelectedIndex = 0;
              }
              draw();
            }
          });
          break;
        case 'selectAll':
          if (inputBuffer.length > 0) {
            isSelectedAll = true;
            cursorIdx = inputBuffer.length;
          }
          break;
        case 'clear':
          inputBuffer = '';
          cursorIdx   = 0;
          inputScrollTop = 0;
          break;
      }
      autoScrollToCursor();
      draw();
    }

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

      // Minimal fallback for extremely small terminals (< 20 columns or < 8 rows)
      if (W < 20 || H < 8) {
        const msg = 'Terminal too small';
        const my = Math.floor(H / 2);
        const mx = Math.max(0, Math.floor((W - msg.length) / 2));
        writeRow(my, mx, msg.slice(0, W), theme.accent);
        const s = diff();
        if (s) out.write(s);
        prevC = chars.slice();
        prevK = colors.slice();
        return;
      }

      if (stream && headerMode === 'full') {
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
      } else {
        // Always paint the scrollable log first so the output viewport is never
        // invisible. The slash-command menu is then drawn on top as an overlay —
        // this way logs remain visible (and scrollable) even while typing a command.
        paintLogs();
        if (mode === 'slashMenu') {
          paintSlashMenu();
        }
      }

      paintContextMenu();

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
      if (scrollRepaintTimer) {
        clearTimeout(scrollRepaintTimer);
        scrollRepaintTimer = null;
      }
      logBuffer.destroy();
      unsubTheme();
      if (timer) clearTimeout(timer);
      if (cursorTimer) clearInterval(cursorTimer);
      out.off('resize', init);
      inp.off('data', onData);
      process.off('exit', cleanup);
      process.off('SIGINT', onSigInt);
      process.off('SIGTERM', onSigTerm);
      process.off('uncaughtException', onUncaught);

      // Restore terminal: disable bracketed paste, mouse tracking off, show cursor, exit alt screen
      out.write('\x1b[?2004l\x1b[?1000l\x1b[?1002l\x1b[?1006l\x1b[0m\x1b[?25h\x1b[?1049l');
      try {
        inp.setRawMode(false);
      } catch {
        /* ignore */
      }
      inp.pause();
    }

    const onSigInt = () => { cleanup(); process.exit(0); };
    const onSigTerm = () => { cleanup(); process.exit(0); };
    const onUncaught = (err: unknown) => { cleanup(); console.error(err); process.exit(1); };

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
      toggleMouse: (arg?: string) => {
        const lower = arg?.trim().toLowerCase();
        let next = !mouseEnabled;
        if (lower === 'on') next = true;
        if (lower === 'off') next = false;
        setMouseMode(next);
        saveMouseEnabled(next);
        logBuffer.log(`Mouse wheel scrolling ${next ? 'enabled' : 'disabled'}`);
      },
      showHelp: () => {
        logBuffer.log('Commands:');
        logBuffer.log('  /theme    Change color theme');
        logBuffer.log('  /mouse    Toggle mouse wheel scrolling (on|off)');
        logBuffer.log('  /help     Show commands and shortcuts');
        logBuffer.log('  /clear    Clear the output log');
        logBuffer.log('  /exit     Quit NeoLoop');
        logBuffer.log('');
        logBuffer.log('Shortcuts:');
        logBuffer.log('  Ctrl+C    Quit NeoLoop');
        logBuffer.log('  Esc       Clear line / Close menu');
        logBuffer.log('  Tab       Complete slash command');
        logBuffer.log('  ↑/↓       Command history / Menu navigation');
        logBuffer.log('  PgUp/PgDn Scroll output up / down');
        logBuffer.log('  Ctrl+↑/↓  Scroll output 1 line');
        logBuffer.log('  Ctrl+Home Jump to top of output');
        logBuffer.log('  Ctrl+End  Jump to bottom of output');
        logBuffer.log('  Wheel     Scroll output 3 lines/notch');
      },
      clearLogs: () => {
        logBuffer.clear();
        scrollTop = 0;
        followTail = true;
        linesWhenLeftTail = 0;
      },
      exit: () => {
        cleanup();
        process.exit(0);
      },
      log: (msg: string) => {
        logBuffer.log(msg);
        if (followTail) {
          lastScrollActivityTime = Date.now();
        }
      },
    };

    // ── Key Event Dispatcher ─────────────────────────────────────────────────
    function handleKeyAction(action: KeyAction) {
      // Ctrl-C: copy text when input has content; otherwise exit cleanly
      if (action.type === 'ctrl-c') {
        if (inputBuffer.length > 0 && (mode === 'input' || mode === 'slashMenu')) {
          copyToClipboard(inputBuffer);
          isSelectedAll = false;
          return;
        }
        cleanup();
        process.exit(0);
      }

      // Ctrl-A: select all text in input buffer
      if (action.type === 'ctrl-a') {
        if (inputBuffer.length > 0 && (mode === 'input' || mode === 'slashMenu')) {
          isSelectedAll = true;
          cursorIdx = inputBuffer.length;
        }
        return;
      }

      // Ctrl-V: paste from OS clipboard into input
      if (action.type === 'ctrl-v') {
        if (mode === 'input' || mode === 'slashMenu') {
          readFromClipboard().then(text => {
            if (text) {
              const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
              if (isSelectedAll) {
                inputBuffer = clean;
                cursorIdx = clean.length;
                isSelectedAll = false;
              } else {
                inputBuffer = inputBuffer.slice(0, cursorIdx) + clean + inputBuffer.slice(cursorIdx);
                cursorIdx += clean.length;
              }
              autoScrollToCursor();
              if (inputBuffer.startsWith('/') && !inputBuffer.includes('\n')) {
                mode = 'slashMenu';
                slashMenuSelectedIndex = 0;
              } else {
                mode = 'input';
              }
            }
          });
        }
        return;
      }

      // Ctrl-X: cut (copy + clear)
      if (action.type === 'ctrl-x') {
        if (inputBuffer.length > 0 && (mode === 'input' || mode === 'slashMenu')) {
          copyToClipboard(inputBuffer);
          inputBuffer = '';
          cursorIdx = 0;
          isSelectedAll = false;
          mode = 'input';
        }
        return;
      }

      // ── Mouse click handling ────────────────────────────────────────────────
      if (action.type === 'left-click' || action.type === 'right-click') {
        // If all text was selected (via Ctrl+A), clicking anywhere unselects it (like real editors)
        if (isSelectedAll) {
          isSelectedAll = false;
        }

        // If context menu is active: handle item click or dismiss
        if (mode === 'contextMenu') {
          const MENU_INNER_WIDTH = 24;
          const BOX_WIDTH = MENU_INNER_WIDTH + 2;
          const MENU_HEIGHT = CONTEXT_MENU_ITEMS.length + 2;
          const mx = Math.max(0, Math.min(contextMenuX, W - BOX_WIDTH));
          const my = Math.max(0, Math.min(contextMenuY, H - MENU_HEIGHT));

          // Right click while menu is open: re-position menu if clicked outside
          if (action.type === 'right-click') {
            contextMenuX = action.x;
            contextMenuY = action.y;
            contextMenuSelectedIndex = 0;
            draw();
            return;
          }

          if (
            action.x >= mx &&
            action.x < mx + BOX_WIDTH &&
            action.y >= my + 1 &&
            action.y <= my + CONTEXT_MENU_ITEMS.length
          ) {
            const itemIdx = action.y - (my + 1);
            if (CONTEXT_MENU_ITEMS[itemIdx]) {
              executeContextMenuAction(CONTEXT_MENU_ITEMS[itemIdx]!.action);
              draw();
              return;
            }
          }
          mode = prevMode;
          draw();
          return;
        }

        // Right-click: open context menu at click location
        if (action.type === 'right-click') {
          prevMode = mode;
          mode = 'contextMenu';
          contextMenuX = action.x;
          contextMenuY = action.y;
          contextMenuSelectedIndex = 0;
          draw();
          return;
        }

        // Left-click:
        if (action.type === 'left-click') {
          // If theme picker is active, allow clicking on theme rows
          if (mode === 'themePicker') {
            const filtered = getFilteredThemes();
            const pickerStartY = streamH + barHeight + 2;
            const listStartY = pickerStartY + 2;
            const listHeight = Math.max(1, Math.max(0, H - pickerStartY) - 2);
            if (action.y >= listStartY && action.y < listStartY + listHeight) {
              const clickedRow = action.y - listStartY;
              const targetIdx = themePickerScrollOffset + clickedRow;
              if (targetIdx >= 0 && targetIdx < filtered.length) {
                const selected = filtered[targetIdx]!;
                setCurrentTheme(selected, true);
                mode = 'input';
                filterQuery = '';
                logBuffer.log(`Theme set to ${selected.name}`);
                draw();
                return;
              }
            }
            draw();
            return;
          }

          // If in slash menu:
          if (mode === 'slashMenu') {
            const menuStartY = streamH + barHeight + 2;
            const matching = getMatchingCommands();
            if (action.y >= menuStartY && action.y < menuStartY + matching.length) {
              const chosen = matching[action.y - menuStartY]!;
              inputBuffer = chosen.name;
              cursorIdx = inputBuffer.length;
              mode = 'input';
              autoScrollToCursor();
              draw();
              return;
            }
            // Clicked outside slash menu options -> close slash menu
            mode = 'input';
          }

          // If clicked inside input bar rows, place cursor at the clicked position (like real editors)
          const inputContentStartY = streamH + 1;
          const inputContentEndY = streamH + barHeight;
          if (action.y >= inputContentStartY && action.y <= inputContentEndY) {
            const textCols = Math.max(1, W - 7);
            const { rows: vRows } = getVisualInputRows(textCols);
            const rowOffset = action.y - inputContentStartY;
            const targetVisualRowIdx = inputScrollTop + rowOffset;
            if (targetVisualRowIdx >= 0 && targetVisualRowIdx < vRows.length) {
              const vRow = vRows[targetVisualRowIdx]!;
              const textStartX = 4;
              const colOffset = action.x - textStartX;
              if (colOffset <= 0) {
                cursorIdx = vRow.startIdx;
              } else {
                const clampedCol = Math.min(colOffset, vRow.text.length);
                cursorIdx = vRow.startIdx + clampedCol;
              }
              autoScrollToCursor();
            }
          }
        }

        draw();
        return;
      }

      // ───────────────────────────────────────────────────────────────────────
      // MODE: Context Menu
      // ───────────────────────────────────────────────────────────────────────
      if (mode === 'contextMenu') {
        if (action.type === 'esc') {
          mode = prevMode;
          draw();
          return;
        }
        if (action.type === 'up') {
          contextMenuSelectedIndex =
            (contextMenuSelectedIndex - 1 + CONTEXT_MENU_ITEMS.length) % CONTEXT_MENU_ITEMS.length;
          draw();
          return;
        }
        if (action.type === 'down') {
          contextMenuSelectedIndex = (contextMenuSelectedIndex + 1) % CONTEXT_MENU_ITEMS.length;
          draw();
          return;
        }
        if (action.type === 'enter') {
          executeContextMenuAction(CONTEXT_MENU_ITEMS[contextMenuSelectedIndex]!.action);
          return;
        }
        // Any other key dismisses the menu
        mode = prevMode;
        draw();
        return;
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
            logBuffer.log(`Theme set to ${confirmed.name}`);
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
            logBuffer.append('command', chosen.name);
            mode = 'input';
            chosen.run(commandContext);
          } else {
            mode = 'input';
          }
          return;
        }

        if (action.type === 'newline') {
          inputBuffer = inputBuffer.slice(0, cursorIdx) + '\n' + inputBuffer.slice(cursorIdx);
          cursorIdx++;
          mode = 'input';
          autoScrollToCursor();
          draw();
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

      // ── Viewport scroll keys ────────────────────────────────────────────────
      const viewportRows = Math.max(0, H - (streamH + barHeight + 2));
      const maxScroll = Math.max(0, logBuffer.lineCount - viewportRows);

      if (
        action.type === 'pgup' ||
        action.type === 'pgdn' ||
        action.type === 'ctrl-up' ||
        action.type === 'ctrl-down' ||
        action.type === 'ctrl-home' ||
        action.type === 'ctrl-end' ||
        action.type === 'wheel-up' ||
        action.type === 'wheel-down'
      ) {
        lastScrollActivityTime = Date.now();
      }

      if (action.type === 'pgup') {
        const textCols = Math.max(1, W - 7);
        const { rows: vRows } = getVisualInputRows(textCols);
        if (vRows.length > barHeight) {
          inputScrollTop = Math.max(0, inputScrollTop - Math.max(1, barHeight - 1));
          return;
        }
        accelStep = 1;
        updateScroll(scrollTop - Math.max(1, viewportRows - 1));
        requestScrollRepaint();
        return;
      }

      if (action.type === 'pgdn') {
        const textCols = Math.max(1, W - 7);
        const { rows: vRows } = getVisualInputRows(textCols);
        const maxInputScroll = Math.max(0, vRows.length - barHeight);
        if (vRows.length > barHeight) {
          inputScrollTop = Math.min(maxInputScroll, inputScrollTop + Math.max(1, barHeight - 1));
          return;
        }
        accelStep = 1;
        updateScroll(scrollTop + Math.max(1, viewportRows - 1));
        requestScrollRepaint();
        return;
      }

      if (action.type === 'shift-up') {
        const textCols = Math.max(1, W - 7);
        const { rows: vRows } = getVisualInputRows(textCols);
        if (vRows.length > barHeight) {
          inputScrollTop = Math.max(0, inputScrollTop - 1);
        }
        return;
      }

      if (action.type === 'shift-down') {
        const textCols = Math.max(1, W - 7);
        const { rows: vRows } = getVisualInputRows(textCols);
        const maxInputScroll = Math.max(0, vRows.length - barHeight);
        if (vRows.length > barHeight) {
          inputScrollTop = Math.min(maxInputScroll, inputScrollTop + 1);
        }
        return;
      }

      if (action.type === 'ctrl-up') {
        const step = getScrollStep(-1);
        updateScroll(scrollTop - step);
        requestScrollRepaint();
        return;
      }

      if (action.type === 'ctrl-down') {
        const step = getScrollStep(1);
        updateScroll(scrollTop + step);
        requestScrollRepaint();
        return;
      }

      if (action.type === 'ctrl-home') {
        accelStep = 1;
        updateScroll(0);
        requestScrollRepaint();
        return;
      }

      if (action.type === 'ctrl-end') {
        accelStep = 1;
        updateScroll(maxScroll);
        requestScrollRepaint();
        return;
      }

      if (action.type === 'wheel-up') {
        if (!mouseEnabled) return;
        const textCols = Math.max(1, W - 7);
        const { rows: vRows } = getVisualInputRows(textCols);

        const isOverLogs = action.y !== undefined && action.y >= streamH + barHeight + 2;
        const canScrollInput = vRows.length > barHeight && !isOverLogs;

        if (canScrollInput && inputScrollTop > 0) {
          inputScrollTop = Math.max(0, inputScrollTop - 2);
          requestScrollRepaint();
          return;
        }

        const mult = getScrollStep(-1);
        const step = Math.min(12, 3 + (mult > 1 ? mult : 0));
        updateScroll(scrollTop - step);
        requestScrollRepaint();
        return;
      }

      if (action.type === 'wheel-down') {
        if (!mouseEnabled) return;
        const textCols = Math.max(1, W - 7);
        const { rows: vRows } = getVisualInputRows(textCols);
        const maxInputScroll = Math.max(0, vRows.length - barHeight);

        const isOverLogs = action.y !== undefined && action.y >= streamH + barHeight + 2;
        const canScrollInput = vRows.length > barHeight && !isOverLogs;

        if (canScrollInput && inputScrollTop < maxInputScroll) {
          inputScrollTop = Math.min(maxInputScroll, inputScrollTop + 2);
          requestScrollRepaint();
          return;
        }

        const mult = getScrollStep(1);
        const step = Math.min(12, 3 + (mult > 1 ? mult : 0));
        updateScroll(scrollTop + step);
        requestScrollRepaint();
        return;
      }

      if (action.type === 'esc') {
        if (isSelectedAll) {
          isSelectedAll = false;
          return;
        }
        // Esc clears the line
        inputBuffer = '';
        cursorIdx = 0;
        inputScrollTop = 0;
        historyIndex = -1;
        savedDraft = '';
        return;
      }

      if (action.type === 'left') {
        isSelectedAll = false;
        cursorIdx = Math.max(0, cursorIdx - 1);
        autoScrollToCursor();
        return;
      }

      if (action.type === 'right') {
        isSelectedAll = false;
        cursorIdx = Math.min(inputBuffer.length, cursorIdx + 1);
        autoScrollToCursor();
        return;
      }

      if (action.type === 'home') {
        isSelectedAll = false;
        const textCols = Math.max(1, W - 7);
        const { rows: vRows, cursorRow } = getVisualInputRows(textCols);
        const curRow = vRows[cursorRow];
        if (curRow && cursorIdx !== curRow.startIdx) {
          cursorIdx = curRow.startIdx;
        } else {
          cursorIdx = 0;
          inputScrollTop = 0;
        }
        return;
      }

      if (action.type === 'end') {
        if (inputBuffer.length === 0) {
          lastScrollActivityTime = Date.now();
          accelStep = 1;
          scrollTop = maxScroll;
          followTail = true;
          requestScrollRepaint();
          return;
        }
        isSelectedAll = false;
        const textCols = Math.max(1, W - 7);
        const { rows: vRows, cursorRow } = getVisualInputRows(textCols);
        const curRow = vRows[cursorRow];
        if (curRow && cursorIdx !== curRow.endIdx) {
          cursorIdx = curRow.endIdx;
        } else {
          cursorIdx = inputBuffer.length;
        }
        return;
      }

      if (action.type === 'delete') {
        if (isSelectedAll) {
          inputBuffer = '';
          cursorIdx = 0;
          isSelectedAll = false;
          inputScrollTop = 0;
          return;
        }
        if (cursorIdx < inputBuffer.length) {
          inputBuffer = inputBuffer.slice(0, cursorIdx) + inputBuffer.slice(cursorIdx + 1);
          autoScrollToCursor();
        }
        return;
      }

      if (action.type === 'backspace') {
        if (isSelectedAll) {
          inputBuffer = '';
          cursorIdx = 0;
          isSelectedAll = false;
          inputScrollTop = 0;
          return;
        }
        if (cursorIdx > 0) {
          inputBuffer = inputBuffer.slice(0, cursorIdx - 1) + inputBuffer.slice(cursorIdx);
          cursorIdx--;
          autoScrollToCursor();
        }
        return;
      }

      if (action.type === 'up') {
        isSelectedAll = false;
        const textCols = Math.max(1, W - 7);
        const { rows: vRows, cursorRow, cursorCol } = getVisualInputRows(textCols);

        // If in multi-line prompt and not on the first visual row, navigate up
        if (vRows.length > 1 && cursorRow > 0) {
          const targetRow = vRows[cursorRow - 1]!;
          const targetCol = Math.min(cursorCol, targetRow.text.length);
          cursorIdx = targetRow.startIdx + targetCol;
          if (cursorRow - 1 < inputScrollTop) {
            inputScrollTop = cursorRow - 1;
          }
          return;
        }

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
            inputScrollTop = 0;
          }
        }
        return;
      }

      if (action.type === 'down') {
        isSelectedAll = false;
        const textCols = Math.max(1, W - 7);
        const { rows: vRows, cursorRow, cursorCol } = getVisualInputRows(textCols);

        // If in multi-line prompt and not on the last visual row, navigate down
        if (vRows.length > 1 && cursorRow < vRows.length - 1) {
          const targetRow = vRows[cursorRow + 1]!;
          const targetCol = Math.min(cursorCol, targetRow.text.length);
          cursorIdx = targetRow.startIdx + targetCol;
          if (cursorRow + 1 >= inputScrollTop + barHeight) {
            inputScrollTop = cursorRow + 1 - barHeight + 1;
          }
          return;
        }

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
          inputScrollTop = 0;
        }
        return;
      }

      if (action.type === 'newline') {
        if (isSelectedAll) {
          inputBuffer = '\n';
          cursorIdx = 1;
          isSelectedAll = false;
        } else {
          inputBuffer = inputBuffer.slice(0, cursorIdx) + '\n' + inputBuffer.slice(cursorIdx);
          cursorIdx++;
        }
        autoScrollToCursor();
        draw();
        return;
      }

      if (action.type === 'paste') {
        const pasteText = action.text;
        if (isSelectedAll) {
          inputBuffer = pasteText;
          cursorIdx = pasteText.length;
          isSelectedAll = false;
        } else {
          inputBuffer = inputBuffer.slice(0, cursorIdx) + pasteText + inputBuffer.slice(cursorIdx);
          cursorIdx += pasteText.length;
        }
        autoScrollToCursor();
        if (inputBuffer.startsWith('/') && !inputBuffer.includes('\n')) {
          mode = 'slashMenu';
          slashMenuSelectedIndex = 0;
        }
        return;
      }

      if (action.type === 'char') {
        if (isSelectedAll) {
          inputBuffer = action.char;
          cursorIdx = 1;
          isSelectedAll = false;
        } else {
          inputBuffer = inputBuffer.slice(0, cursorIdx) + action.char + inputBuffer.slice(cursorIdx);
          cursorIdx += action.char.length;
        }
        autoScrollToCursor();
        if (inputBuffer.startsWith('/') && !inputBuffer.includes('\n')) {
          mode = 'slashMenu';
          slashMenuSelectedIndex = 0;
        }
        return;
      }

      if (action.type === 'enter') {
        isSelectedAll = false;
        const trimmed = inputBuffer.trim();
        inputBuffer = '';
        cursorIdx = 0;
        inputScrollTop = 0;
        historyIndex = -1;
        savedDraft = '';

        if (!trimmed) return;

        commandHistory.push(trimmed);
        logBuffer.append('command', trimmed);

        // Command routing
        if (trimmed === '/theme') {
          commandContext.openThemePicker();
          return;
        }

        if (trimmed === '/mouse' || trimmed.startsWith('/mouse ')) {
          const arg = trimmed.slice(6).trim();
          commandContext.toggleMouse?.(arg);
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
            logBuffer.log(`Theme set to ${target.name}`);
          } else {
            logBuffer.log(`Unknown theme: ${themeNameOrId}`);
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
          logBuffer.log(`Unknown command: ${trimmed}. Type /help for available commands.`);
          return;
        }

        // Forward user message to execution flow
        if (onCommand) {
          try {
            Promise.resolve(
              onCommand(trimmed, (msg: string) => {
                logBuffer.log(msg);
                if (followTail) {
                  lastScrollActivityTime = Date.now();
                }
              })
            ).catch(err => {
              logBuffer.append('error', `error: ${err?.message || err}`);
            });
          } catch (err: any) {
            logBuffer.append('error', `error: ${err?.message || err}`);
          }
        } else {
          logBuffer.log(`processing: "${trimmed}"`);
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

    // UTF-8 mode, enter alternate screen buffer, hide cursor, enable bracketed paste.
    out.write('\x1b%G\x1b[?1049h\x1b[?25l\x1b[?2004h');
    if (mouseEnabled) {
      out.write('\x1b[?1000h\x1b[?1002h\x1b[?1006h');
    }
    init();
    out.on('resize', init);
    process.on('exit', cleanup);
    process.on('SIGINT', onSigInt);
    process.on('SIGTERM', onSigTerm);
    process.on('uncaughtException', onUncaught);

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
        if (headerMode === 'full') {
          if (!stream) {
            stream = createStream(W, streamH, rainPalettes.length);
          }
          stepStream(stream);

          if (stream.hasHitBottom) {
            inputVisible = true;
          }
        } else {
          inputVisible = true;
        }
      }

      draw();
      timer = setTimeout(loop, Math.max(0, 1000 / FPS - (Date.now() - t0)));
    })();
  });
}
