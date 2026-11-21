/**
 * NeoLoop CLI — Terminal Splash Screen Engine
 *
 * Renders the NeoLoop ASCII block typography, cyberpunk matrix background
 * simulation, and continuous neon shimmer light sweep using raw ANSI
 * differential updates on the terminal alternate screen buffer.
 *
 * Driven by the centralized theme token engine (Phantom, Matrix, etc.)
 * with live real-time theme morphing via slash commands.
 */
import { spawnSync } from 'child_process';
import { copyToClipboard, readFromClipboard } from './clipboard.js';
import {
  ThemeTokens,
  RainPalette,
  getCurrentTheme,
  setCurrentTheme,
  onThemeChange,
  generateMatrixRainPalette,
  generateShimmerColor,
  parseHex,
  ansiRgb,
  processSlashCommand,
} from '../theme/index.js';

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
}

function newDrop(h: number, x: number, initialPause = 0): Drop {
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
  };
}

function createStream(w: number, h: number): StreamState {
  const state: StreamState = {
    w,
    h,
    drops: [],
    grid: Array.from({ length: w }, () => Array.from({ length: h }, randomChar)),
    chars: new Array(w * h).fill(' '),
    colors: new Array(w * h).fill(''),
    tick: 0,
    hasHitBottom: false,
  };

  const numLanes = Math.max(1, Math.floor(w / LANE_SPACING));
  const maxIntroTicks = Math.min(30, Math.max(16, Math.floor(numLanes * 0.6)));

  let lane = 0;
  state.drops = Array.from({ length: w }, (_, x) => {
    if (x % LANE_SPACING !== 0) return null;
    const laneIndex = lane++;
    const rank = (laneIndex * 13) % numLanes;
    const initialPause = Math.floor((rank / numLanes) * maxIntroTicks);
    return newDrop(h, x, initialPause);
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

function composeStream(state: StreamState, palette: RainPalette): void {
  const { w, h, drops, grid, chars, colors } = state;
  chars.fill(' ');
  colors.fill('');

  const splashChars = ['*', 'o', '~', '.'];
  const splashColors = palette.splashColors;

  for (let x = 0; x < w; x++) {
    const dr = drops[x];
    if (!dr || dr.pause > 0) continue;

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
      colorAt: i => (row[i] === '█' ? theme.logo : theme.logoGlow),
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
function sgr(hexCode: string, theme: ThemeTokens): string {
  let s = sgrCache.get(hexCode);
  if (!s) {
    if (hexCode.startsWith('SEL:')) {
      const bg = parseHex(theme.selection);
      const fg = parseHex(theme.text);
      s = `\x1b[0;1;38;2;${fg.r};${fg.g};${fg.b};48;2;${bg.r};${bg.g};${bg.b}m`;
    } else {
      const { r, g, b } = parseHex(hexCode);
      const isGlow =
        hexCode.toLowerCase() === theme.accent.toLowerCase() ||
        hexCode.toLowerCase() === theme.cursor.toLowerCase() ||
        hexCode.toLowerCase() === theme.shimmer.toLowerCase();
      const boldCode = isGlow ? '1;' : '';
      s = `\x1b[0;${boldCode}38;2;${r};${g};${b}m`;
    }
    sgrCache.set(hexCode, s);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Static Banner — printed on the main buffer after splash exits
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
        if (c === '█') line += ansiRgb(theme.logo) + c + RESET;
        else if (c !== ' ') line += ansiRgb(theme.logoGlow) + c + RESET;
        else line += c;
      }
      out.write(line + '\n');
    }

    // tagline centered, bold accent
    const x0_tag = Math.max(0, Math.floor((W - tagline.length) / 2));
    out.write('\n' + ' '.repeat(x0_tag) + ansiRgb(theme.tagline, true) + tagline + RESET + '\n\n');
  } else {
    // narrow terminal fallback
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
      setCurrentTheme(initialThemeOverride);
    }

    const out = process.stdout;
    const inp = process.stdin;

    let theme = getCurrentTheme();
    let rainPalette = generateMatrixRainPalette(theme);

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

    // ── input-bar & tool log state ─────────────────────────────────────────
    let inputVisible = false;
    let inputBuffer = '';
    let cursorIdx = 0;
    let isSelectedAll = false;
    let cursorOn = true;
    let cursorTimer: NodeJS.Timeout | undefined;
    const logs: string[] = [...initialLogs];

    // ── Clipboard & Custom Copy Window State ──────────────────────────────
    let copyWindowOpen = false;
    let copyWindowX = 0;
    let copyWindowY = 0;
    let selectedOptionIdx = 1;
    let lastCtrlCTime = 0;

    const LETTER_FRAMES = 3;
    const titleDoneFrame = title.length * LETTER_FRAMES;
    const tagStartFrame = titleDoneFrame + 4;
    const TAG_SPEED = 2;
    const tagDoneFrame = tagStartFrame + Math.ceil(tagline.length / TAG_SPEED);
    const hintStartFrame = hint ? tagDoneFrame + 3 : tagDoneFrame;
    const streamStartFrame = hint ? hintStartFrame + 3 : tagDoneFrame + 3;

    // ── layout helpers ─────────────────────────────────────────────────────
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
      stream = frame >= streamStartFrame ? createStream(W, streamH) : null;
      chars = new Array(W * H).fill(' ');
      colors = new Array(W * H).fill('');
      prevC = new Array(W * H).fill(null);
      prevK = new Array(W * H).fill(null);
      lastFull = Date.now();
      out.write('\x1b[0m\x1b[2J\x1b[H');
    }

    // Subscribe to live theme changes (e.g. from /theme command)
    const unsubTheme = onThemeChange((nextTheme) => {
      theme = nextTheme;
      rainPalette = generateMatrixRainPalette(theme);
      sgrCache.clear();
      prevC.fill(null);
      prevK.fill(null);
      lastFull = Date.now();
    });

    function showToast(_msg: string) {
      // Disabled toast banner
    }

    interface MenuAction {
      id: string;
      title: string;
      badge: string;
      action: () => void | Promise<void>;
    }

    function getMenuActions(): MenuAction[] {
      return [
        {
          id: 'copy',
          title: 'Copy',
          badge: 'Ctrl+C',
          action: () => {
            if (inputBuffer) {
              copyToClipboard(inputBuffer);
              showToast(`Copied input (${inputBuffer.length} chars)`);
            } else if (logs.length > 0) {
              const lastLog = logs[logs.length - 1]!;
              copyToClipboard(lastLog);
              showToast('Copied latest log line');
            } else {
              showToast('Input bar is empty');
            }
            copyWindowOpen = false;
          },
        },
        {
          id: 'paste',
          title: 'Paste',
          badge: 'Ctrl+V',
          action: async () => {
            copyWindowOpen = false;
            try {
              const pasted = await readFromClipboard();
              if (pasted) {
                const clean = pasted.replace(/[\r\n]+/g, ' ');
                if (isSelectedAll) {
                  inputBuffer = clean;
                  cursorIdx = clean.length;
                  isSelectedAll = false;
                } else {
                  inputBuffer = inputBuffer.slice(0, cursorIdx) + clean + inputBuffer.slice(cursorIdx);
                  cursorIdx += clean.length;
                }
                showToast(`Pasted ${clean.length} chars`);
              } else {
                showToast('Clipboard is empty');
              }
            } catch {
              showToast('Could not read clipboard');
            }
          },
        },
        {
          id: 'selectAll',
          title: 'Select All',
          badge: 'Ctrl+A',
          action: () => {
            if (inputBuffer.length > 0) {
              isSelectedAll = true;
              cursorIdx = inputBuffer.length;
              showToast(`Selected all (${inputBuffer.length} chars)`);
            } else {
              showToast('Input bar is empty');
            }
            copyWindowOpen = false;
          },
        },
        {
          id: 'cut',
          title: 'Cut',
          badge: 'Ctrl+X',
          action: () => {
            if (inputBuffer) {
              copyToClipboard(inputBuffer);
              showToast(`Cut ${inputBuffer.length} chars`);
              inputBuffer = '';
              cursorIdx = 0;
              isSelectedAll = false;
            } else {
              showToast('Input bar is empty');
            }
            copyWindowOpen = false;
          },
        },
        {
          id: 'logs',
          title: 'Copy Terminal Logs',
          badge: 'Logs',
          action: () => {
            if (logs.length > 0) {
              copyToClipboard(logs.join('\n'));
              showToast(`Copied ${logs.length} log lines`);
            } else {
              showToast('No terminal logs yet');
            }
            copyWindowOpen = false;
          },
        },
      ];
    }

    // ── paint the logo + tagline into chars/colors ─────────────────────────
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
            colors[idx] = c === '█' ? theme.logo : theme.logoGlow;
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

    // ── paint dashed border input bar & tool logs (under rain) ────────────
    function paintInputBar() {
      if (!inputVisible) return;

      const ruleWidth = Math.max(1, W - 2);
      const dashedRule = '-'.repeat(ruleWidth);

      const writeRow = (y: number, startX: number, text: string, color: string) => {
        if (y < 0 || y >= H) return;
        for (let k = 0; k < text.length && startX + k < W; k++) {
          chars[y * W + startX + k] = text[k]!;
          colors[y * W + startX + k] = color;
        }
      };

      // 1) Top dashed border line
      const topY = streamH;
      writeRow(topY, 1, dashedRule, theme.border);

      // 2) Prompt row:  "> " then placeholder/text then cursor
      const promptY = streamH + 1;
      writeRow(promptY, 2, '> ', theme.accent);
      const contentX = 4;

      if (inputBuffer.length === 0) {
        const maxPhLen = Math.max(0, W - contentX - 2);
        const ph = BAR_PLACEHOLDER.slice(0, maxPhLen);
        writeRow(promptY, contentX, ph, theme.inputPlaceholder);
        const curX = contentX;
        if (curX < W) {
          chars[promptY * W + curX] = cursorOn ? '█' : (ph[0] || ' ');
          colors[promptY * W + curX] = cursorOn ? theme.cursor : theme.inputPlaceholder;
        }
      } else {
        const maxVisible = Math.max(1, W - contentX - 2);
        let viewOffset = 0;
        if (cursorIdx >= maxVisible) {
          viewOffset = cursorIdx - maxVisible + 1;
        }
        const visible = inputBuffer.slice(viewOffset, viewOffset + maxVisible);

        if (isSelectedAll) {
          for (let k = 0; k < visible.length; k++) {
            const posX = contentX + k;
            if (posX < W) {
              const idx = promptY * W + posX;
              chars[idx] = visible[k]!;
              colors[idx] = `SEL:${theme.selection}`;
            }
          }
          const curX = contentX + (cursorIdx - viewOffset);
          if (curX < W && curX >= contentX && curX === contentX + visible.length) {
            chars[promptY * W + curX] = cursorOn ? '█' : ' ';
            colors[promptY * W + curX] = cursorOn ? theme.cursor : '';
          }
        } else {
          writeRow(promptY, contentX, visible, theme.inputText);

          const curX = contentX + (cursorIdx - viewOffset);
          if (curX < W && curX >= contentX) {
            const charUnder = (cursorIdx - viewOffset < visible.length)
              ? visible[cursorIdx - viewOffset]!
              : ' ';
            chars[promptY * W + curX] = (charUnder === ' ' && cursorOn) ? '█' : charUnder;
            colors[promptY * W + curX] = cursorOn ? theme.cursor : theme.inputText;
          }
        }
      }

      // 3) Bottom dashed rule
      const botY = streamH + 2;
      writeRow(botY, 1, dashedRule, theme.border);

      // 4) Tool logs / execution history scrolling down below the input bar
      const outputStartY = streamH + 3;
      const availableRows = Math.max(0, H - outputStartY);

      if (availableRows > 0 && logs.length > 0) {
        const visibleLogs = logs.slice(-availableRows);
        visibleLogs.forEach((logLine, idx) => {
          const rowY = outputStartY + idx;
          const isHistoryCmd = logLine.startsWith('> ');
          const isError = logLine.includes('[error') || logLine.includes('error:');
          const isSuccess = logLine.includes('[theme]') || logLine.includes('success:');
          const isWarning = logLine.includes('[warn') || logLine.includes('warning:');
          let logColor = theme.inputText;
          if (isHistoryCmd) logColor = theme.textMuted;
          else if (isError) logColor = theme.error;
          else if (isSuccess) logColor = theme.success;
          else if (isWarning) logColor = theme.warning;
          else logColor = theme.accent;
          writeRow(rowY, 2, logLine.slice(0, W - 3), logColor);
        });
      }
    }

    // ── paint custom copy / paste window ───────────────────────────────────
    function paintCopyWindow() {
      const actions = getMenuActions();
      const winW = 31;
      const winH = actions.length + 2;
      const innerW = winW - 2;

      const winX0 = Math.max(2, Math.min(W - winW - 2, copyWindowX));
      const winY0 = Math.max(streamH + 3, copyWindowY);

      const setCell = (y: number, x: number, ch: string, col: string) => {
        if (y >= 0 && y < H && x >= 0 && x < W) {
          const idx = y * W + x;
          chars[idx] = ch;
          colors[idx] = col;
        }
      };

      const writeStr = (y: number, startX: number, text: string, col: string) => {
        for (let k = 0; k < text.length && startX + k < W; k++) {
          setCell(y, startX + k, text[k]!, col);
        }
      };

      // Clear window interior
      for (let y = winY0; y < winY0 + winH; y++) {
        for (let x = winX0; x < winX0 + winW; x++) {
          setCell(y, x, ' ', theme.surface);
        }
      }

      // Top border: ┌─ CLIPBOARD ─────────────────┐
      const titleTag = ' CLIPBOARD ';
      const rightDashes = innerW - 1 - titleTag.length;
      const topBorder = '┌─' + titleTag + '─'.repeat(Math.max(0, rightDashes)) + '┐';
      writeStr(winY0, winX0, topBorder, theme.border);
      writeStr(winY0, winX0 + 2, titleTag, theme.accent);

      // Menu items
      actions.forEach((act, idx) => {
        const isSelected = idx === selectedOptionIdx;
        const y = winY0 + 1 + idx;
        const prefix = isSelected ? ` > ${act.title}` : `   ${act.title}`;
        const badge = act.badge;
        const padding = Math.max(1, innerW - prefix.length - badge.length - 1);
        const rowStr = '│' + prefix + ' '.repeat(padding) + badge + ' │';

        writeStr(y, winX0, rowStr, theme.border);
        writeStr(y, winX0 + 1, prefix, isSelected ? theme.accent : theme.text);
        writeStr(y, winX0 + winW - 2 - badge.length, badge, isSelected ? theme.accent : theme.textMuted);
      });

      // Bottom border: └─────────────────────────────┘
      const botBorder = '└' + '─'.repeat(innerW) + '┘';
      writeStr(winY0 + winH - 1, winX0, botBorder, theme.border);
    }

    // ── mouse event handler ───────────────────────────────────────────────
    function handleMouseEvent(b: number, col: number, row: number, isPress: boolean, isRelease: boolean) {
      const btn = b & 3;
      const isLeft = btn === 0;
      const isRight = btn === 2;
      const isMotion = (b & 32) !== 0;
      const isWheelUp = b === 64;
      const isWheelDown = b === 65;

      const actions = getMenuActions();
      const winW = 31;
      const winH = actions.length + 2;
      const winX0 = Math.max(2, Math.min(W - winW - 2, copyWindowX));
      const winY0 = Math.max(streamH + 3, copyWindowY);

      if (copyWindowOpen && (isWheelUp || isWheelDown)) {
        if (isWheelUp) {
          selectedOptionIdx = (selectedOptionIdx - 1 + actions.length) % actions.length;
        } else {
          selectedOptionIdx = (selectedOptionIdx + 1) % actions.length;
        }
        return;
      }

      if (copyWindowOpen) {
        if (isMotion) {
          if (col >= winX0 && col < winX0 + winW && row > winY0 && row < winY0 + winH - 1) {
            const optIdx = row - (winY0 + 1);
            if (optIdx >= 0 && optIdx < actions.length) {
              selectedOptionIdx = optIdx;
            }
          }
          return;
        }

        if (isLeft && isPress) {
          if (col >= winX0 && col < winX0 + winW && row >= winY0 && row < winY0 + winH) {
            const optIdx = row - (winY0 + 1);
            if (optIdx >= 0 && optIdx < actions.length) {
              actions[optIdx]!.action();
              return;
            }
            return;
          }
          copyWindowOpen = false;
        }
      }

      const topY = streamH;
      const promptY = streamH + 1;
      const botY = streamH + 2;

      if (isRight && isPress) {
        if (row >= topY && row <= botY) {
          copyWindowX = Math.max(2, Math.min(W - winW - 2, col - 2));
          copyWindowY = streamH + 3;
          copyWindowOpen = true;
          selectedOptionIdx = inputBuffer ? 0 : 1;
          return;
        } else {
          if (copyWindowOpen) {
            copyWindowOpen = false;
          }
          return;
        }
      }

      if (isLeft && isPress) {
        if (row >= topY && row <= botY) {
          const contentX = 4;
          if (row === promptY && col >= contentX) {
            cursorIdx = Math.max(0, Math.min(inputBuffer.length, col - contentX));
            isSelectedAll = false;
          }
          if (copyWindowOpen) {
            copyWindowOpen = false;
          }
          return;
        }
      }
    }

    // ── diff & flush ───────────────────────────────────────────────────────
    function diff(): string {
      let s = '';
      for (let y = 0; y < H; y++) {
        const base = y * W;
        let x = 0;
        while (x < W) {
          let i = base + x;
          if (chars[i] === prevC[i] && colors[i] === prevK[i]) { x++; continue; }
          let end = x;
          let gap = 0;
          for (let k = x + 1; k < W; k++) {
            i = base + k;
            if (chars[i] !== prevC[i] || colors[i] !== prevK[i]) { end = k; gap = 0; }
            else if (++gap > 4) break;
          }
          s += `\x1b[${y + 1};${x + 1}H`;
          let last = '';
          for (let k = x; k <= end; k++) {
            const key = colors[base + k]!;
            if (key !== last) { s += key ? sgr(key, theme) : '\x1b[0m'; last = key; }
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
        composeStream(stream, rainPalette);
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

      if (copyWindowOpen) {
        paintCopyWindow();
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

    // ── cleanup & resolve ──────────────────────────────────────────────────
    function cleanup() {
      if (!running) return;
      running = false;
      unsubTheme();
      if (timer) clearTimeout(timer);
      if (cursorTimer) clearInterval(cursorTimer);
      out.off('resize', init);
      inp.off('data', onData);
      process.off('exit', cleanup);
      out.write('\x1b[?1006l\x1b[?1002l\x1b[?1000l\x1b[0m\x1b[?25h\x1b[?1049l');
      try { inp.setRawMode(false); } catch { /* ignore */ }
      inp.pause();
    }

    // ── keyboard & mouse data dispatcher ───────────────────────────────────
    function onData(buf: Buffer) {
      const s = buf.toString();

      let match: RegExpExecArray | null;
      const sgrRegex = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
      let mouseHandled = false;

      while ((match = sgrRegex.exec(s)) !== null) {
        mouseHandled = true;
        const b = parseInt(match[1]!, 10);
        const col = parseInt(match[2]!, 10) - 1;
        const row = parseInt(match[3]!, 10) - 1;
        const isRelease = match[4] === 'm';
        const isPress = match[4] === 'M';
        handleMouseEvent(b, col, row, isPress, isRelease);
      }

      const x10Regex = /\x1b\[M([\s\S]{3})/g;
      while ((match = x10Regex.exec(s)) !== null) {
        mouseHandled = true;
        const b3 = match[1]!;
        const b = b3.charCodeAt(0) - 32;
        const col = b3.charCodeAt(1) - 32 - 1;
        const row = b3.charCodeAt(2) - 32 - 1;
        const isRelease = (b & 3) === 3;
        const isPress = !isRelease;
        handleMouseEvent(b, col, row, isPress, isRelease);
      }

      const remaining = s.replace(sgrRegex, '').replace(x10Regex, '');
      if (!remaining && mouseHandled) {
        return;
      }

      const keyInput = remaining || s;

      // Ctrl-C
      if (keyInput === '\x03' || (buf.length === 1 && buf[0] === 3)) {
        if (copyWindowOpen) {
          copyWindowOpen = false;
          return;
        }
        if (isSelectedAll && inputBuffer) {
          copyToClipboard(inputBuffer);
          showToast(`Copied selection (${inputBuffer.length} chars)`);
          return;
        }
        if (inputBuffer) {
          copyToClipboard(inputBuffer);
          const now = Date.now();
          if (now - lastCtrlCTime < 1500) {
            cleanup();
            process.exit(0);
          }
          lastCtrlCTime = now;
          showToast('Copied input! (Press Ctrl+C again to exit)');
          return;
        }
        cleanup();
        process.exit(0);
      }

      if (copyWindowOpen) {
        const actions = getMenuActions();

        if (keyInput === '\x1b[A' || keyInput === '\x1bOA') {
          selectedOptionIdx = (selectedOptionIdx - 1 + actions.length) % actions.length;
          return;
        }
        if (keyInput === '\x1b[B' || keyInput === '\x1bOB') {
          selectedOptionIdx = (selectedOptionIdx + 1) % actions.length;
          return;
        }
        if (keyInput === '\r' || keyInput === '\n' || keyInput === ' ') {
          actions[selectedOptionIdx]!.action();
          return;
        }
        if (/^[1-5]$/.test(keyInput)) {
          const idx = parseInt(keyInput, 10) - 1;
          if (actions[idx]) actions[idx]!.action();
          return;
        }
        if (keyInput === 'c' || keyInput === 'C') {
          actions[0]!.action();
          return;
        }
        if (keyInput === 'v' || keyInput === 'V') {
          actions[1]!.action();
          return;
        }
        if (keyInput === 'a' || keyInput === 'A') {
          actions[2]!.action();
          return;
        }
        if (keyInput === 'x' || keyInput === 'X') {
          actions[3]!.action();
          return;
        }
        if (keyInput === 'l' || keyInput === 'L') {
          actions[4]!.action();
          return;
        }
        if (keyInput === '\x1b') {
          copyWindowOpen = false;
          return;
        }
        return;
      }

      // Ctrl+A (Select All)
      if (keyInput === '\x01' || (buf.length === 1 && buf[0] === 1)) {
        if (copyWindowOpen) {
          copyWindowOpen = false;
        }
        if (inputBuffer.length > 0) {
          isSelectedAll = true;
          cursorIdx = inputBuffer.length;
          showToast(`Selected all (${inputBuffer.length} chars)`);
        } else {
          showToast('Input bar is empty');
        }
        return;
      }

      // Ctrl+V (Paste) or Shift+Insert
      if (keyInput === '\x16' || (buf.length === 1 && buf[0] === 22) || keyInput === '\x1b[2~') {
        readFromClipboard().then(pasted => {
          if (pasted) {
            const clean = pasted.replace(/[\r\n]+/g, ' ');
            if (isSelectedAll) {
              inputBuffer = clean;
              cursorIdx = clean.length;
              isSelectedAll = false;
            } else {
              inputBuffer = inputBuffer.slice(0, cursorIdx) + clean + inputBuffer.slice(cursorIdx);
              cursorIdx += clean.length;
            }
            showToast(`Pasted ${clean.length} chars`);
          } else {
            showToast('Clipboard is empty');
          }
        }).catch(() => {
          showToast('Could not read clipboard');
        });
        return;
      }

      // Bracketed Paste Mode
      if (keyInput.includes('\x1b[200~')) {
        const bpMatch = /\x1b\[200~([\s\S]*?)\x1b\[201~/.exec(keyInput);
        if (bpMatch) {
          const clean = bpMatch[1]!.replace(/[\r\n]+/g, ' ');
          if (isSelectedAll) {
            inputBuffer = clean;
            cursorIdx = clean.length;
            isSelectedAll = false;
          } else {
            inputBuffer = inputBuffer.slice(0, cursorIdx) + clean + inputBuffer.slice(cursorIdx);
            cursorIdx += clean.length;
          }
          showToast(`Pasted ${clean.length} chars`);
          return;
        }
      }

      // Ctrl+X (Cut)
      if (keyInput === '\x18' || (buf.length === 1 && buf[0] === 24)) {
        if (inputBuffer) {
          copyToClipboard(inputBuffer);
          showToast(`Cut ${inputBuffer.length} chars`);
          inputBuffer = '';
          cursorIdx = 0;
          isSelectedAll = false;
        } else {
          showToast('Input bar is empty');
        }
        return;
      }

      // F2 or Alt+C toggles Custom Copy Window
      if (keyInput === '\x1bOQ' || keyInput === '\x1b[12~' || keyInput === '\x1b[OQ' || keyInput === '\x1bc') {
        const winW = 31;
        copyWindowX = Math.max(2, Math.floor((W - winW) / 2));
        copyWindowY = streamH + 3;
        copyWindowOpen = !copyWindowOpen;
        selectedOptionIdx = inputBuffer ? 0 : 1;
        return;
      }

      // Escape key clears selection or input bar
      if (keyInput === '\x1b') {
        if (isSelectedAll) {
          isSelectedAll = false;
          showToast('Selection cleared');
          return;
        }
        if (inputBuffer) {
          inputBuffer = '';
          cursorIdx = 0;
          showToast('Input bar cleared');
        }
        return;
      }

      if (!inputVisible) {
        return;
      }

      // ── Cursor navigation ───────────────────────────────────────────────
      if (keyInput === '\x1b[D' || keyInput === '\x1bOD') {
        isSelectedAll = false;
        cursorIdx = Math.max(0, cursorIdx - 1);
        return;
      }
      if (keyInput === '\x1b[C' || keyInput === '\x1bOC') {
        isSelectedAll = false;
        cursorIdx = Math.min(inputBuffer.length, cursorIdx + 1);
        return;
      }
      if (keyInput === '\x1b[H' || keyInput === '\x1b[1~' || keyInput === '\x1b[7~') {
        isSelectedAll = false;
        cursorIdx = 0;
        return;
      }
      if (keyInput === '\x1b[F' || keyInput === '\x1b[4~' || keyInput === '\x1b[8~') {
        isSelectedAll = false;
        cursorIdx = inputBuffer.length;
        return;
      }
      if (keyInput === '\x1b[3~') {
        if (isSelectedAll) {
          inputBuffer = '';
          cursorIdx = 0;
          isSelectedAll = false;
          return;
        }
        if (cursorIdx < inputBuffer.length) {
          inputBuffer = inputBuffer.slice(0, cursorIdx) + inputBuffer.slice(cursorIdx + 1);
        }
        return;
      }

      if (keyInput.startsWith('\x1b')) return;

      // ── Enter: submit command ───────────────────────────────────────────
      if (keyInput === '\r' || keyInput === '\n') {
        isSelectedAll = false;
        const trimmed = inputBuffer.trim();
        if (trimmed) {
          logs.push('> ' + trimmed);
          const cmd = trimmed;
          inputBuffer = '';
          cursorIdx = 0;

          // Dispatch slash commands (/theme, /themes, /help)
          const isSlash = processSlashCommand(cmd, (msg: string) => {
            logs.push(msg);
          });

          if (!isSlash) {
            if (onCommand) {
              try {
                Promise.resolve(onCommand(cmd, (msg: string) => {
                  logs.push(msg);
                })).catch(err => {
                  logs.push(`[error] ${err?.message || err}`);
                });
              } catch (err: any) {
                logs.push(`[error] ${err?.message || err}`);
              }
            } else {
              logs.push(`[neoloop] processing: "${cmd}"`);
            }
          }
        }
        return;
      }

      // ── Backspace ───────────────────────────────────────────────────────
      if (keyInput === '\x7f' || keyInput === '\x08') {
        if (isSelectedAll) {
          inputBuffer = '';
          cursorIdx = 0;
          isSelectedAll = false;
          return;
        }
        if (cursorIdx > 0) {
          inputBuffer = inputBuffer.slice(0, cursorIdx - 1) + inputBuffer.slice(cursorIdx);
          cursorIdx--;
        }
        return;
      }

      // ── Printable characters ────────────────────────────────────────────
      const printable = keyInput.replace(/[\x00-\x1f\x7f]/g, '');
      if (printable) {
        if (isSelectedAll) {
          inputBuffer = printable;
          cursorIdx = printable.length;
          isSelectedAll = false;
        } else {
          inputBuffer = inputBuffer.slice(0, cursorIdx) + printable + inputBuffer.slice(cursorIdx);
          cursorIdx += printable.length;
        }
      }
    }

    // ── boot ───────────────────────────────────────────────────────────────
    disableWinQuickEdit();
    out.write('\x1b%G');
    out.write('\x1b[?1049h\x1b[?25l\x1b[?1000h\x1b[?1002h\x1b[?1006h');
    init();
    out.on('resize', init);
    process.on('exit', cleanup);
    try { inp.setRawMode(true); } catch { /* non-TTY pipe */ }
    inp.resume();
    inp.on('data', onData);

    cursorTimer = setInterval(() => { cursorOn = !cursorOn; }, CURSOR_BLINK_MS);

    (function loop() {
      if (!running) return;
      const t0 = Date.now();
      frame++;

      if (frame >= streamStartFrame) {
        if (!stream) {
          stream = createStream(W, streamH);
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
