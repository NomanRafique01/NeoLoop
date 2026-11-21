/**
 * NeoLoop CLI — Terminal Splash Screen Engine
 *
 * Renders the NeoLoop ASCII block typography, cyberpunk matrix background
 * simulation, and continuous neon shimmer light sweep using raw ANSI
 * differential updates on the terminal alternate screen buffer.
 */

export interface SplashOptions {
  title: string;
  tagline?: string;
  hint?: string;
  onCommand?: (command: string, log: (text: string) => void) => void | Promise<void>;
  initialLogs?: string[];
}

// ---------------------------------------------------------------------------
// Input Bar Layout Constants
// ---------------------------------------------------------------------------
// Number of terminal rows reserved at the very bottom for the input bar.
// Layout (3 rows):  top-rule | prompt row | bottom-rule
const INPUT_BAR_ROWS = 3;

const FPS = 20;
const LOGO_BODY = '#39ff6a';
const LOGO_SHADING = '#1f9e47';
const TAGLINE_COLOR = '#39FF88';
const HINT_ON = '#6fbf8c';
const HINT_OFF = '#2f6f4a';
const FULL_REPAINT_MS = 8000;
const MAX_BACKLOG = 32768;

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
const LEVELS = 20;

const hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

const SHADES = Array.from({ length: LEVELS + 1 }, (_, i) => {
  const g = 25 + (230 * i) / LEVELS;
  return hex(i > LEVELS * 0.8 ? 40 : 0, g, g * 0.25);
});
const HEAD = '#d7ffe1';

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

function composeStream(state: StreamState): void {
  const { w, h, drops, grid, chars, colors } = state;
  chars.fill(' ');
  colors.fill('');

  const splashChars = ['*', 'o', '~', '.'];
  const splashColors = [HEAD, SHADES[17]!, SHADES[11]!, SHADES[5]!];

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
        colors[i] = HEAD;
      } else {
        const dist = headY - y;
        const t = Math.max(0, 1 - dist / Math.max(1, dr.len));
        const shadeIdx = Math.min(SHADES.length - 1, Math.round(t * t * (SHADES.length - 1)));
        colors[i] = SHADES[shadeIdx]!;
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
// Continuous Shimmer Light Sweep Calculations
// ---------------------------------------------------------------------------
function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function hexColor(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function getShimmerColor(t: number): string {
  if (t <= 0) return '#145c32';
  if (t < 0.55) {
    const u = t / 0.55;
    return hexColor(lerp(20, 0, u), lerp(92, 255, u), lerp(50, 102, u));
  } else if (t < 0.8) {
    const u = (t - 0.55) / 0.25;
    return hexColor(lerp(0, 57, u), lerp(255, 255, u), lerp(102, 136, u));
  } else {
    const u = (t - 0.8) / 0.2;
    return hexColor(lerp(57, 180, u), lerp(255, 255, u), lerp(136, 208, u));
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
const blank: Line = plain('', LOGO_SHADING);

function buildLines(title: string, tagline: string, hint: string, hintColor: string, w: number, h: number): Line[] {
  const avail = h - 2;
  const fits = (s: string) => s.length > 0 && s.length + 6 <= w;

  const big = bigLogo(title);
  if (big && big[0]!.length + 6 <= w && avail >= big.length) {
    const logo: Line[] = big.map(row => ({ text: row, colorAt: i => (row[i] === '█' ? LOGO_BODY : LOGO_SHADING) }));
    const use: Line[] = [];
    const hasSpacing = avail >= logo.length + 1 + (fits(tagline) ? 1 : 0) + (fits(hint) ? 2 : 0);
    if (fits(tagline)) use.push(plain(tagline, TAGLINE_COLOR));
    if (fits(hint)) {
      if (hasSpacing && use.length) use.push(blank);
      use.push(plain(hint, hintColor));
    }
    return use.length ? [...logo, blank, ...use] : logo;
  }

  const spaced = title.toUpperCase().split('').join(' ');
  const name = fits(spaced) ? spaced : title.toUpperCase();
  const lines: Line[] = [plain(name, LOGO_BODY)];
  if (fits(tagline) && avail >= 3) lines.push(blank, plain(tagline, TAGLINE_COLOR));
  if (fits(hint) && avail >= lines.length + 2) lines.push(blank, plain(hint, hintColor));
  return lines;
}

const sgrCache = new Map<string, string>();
function sgr(hexCode: string): string {
  let s = sgrCache.get(hexCode);
  if (!s) {
    const r = parseInt(hexCode.slice(1, 3), 16);
    const g = parseInt(hexCode.slice(3, 5), 16);
    const b = parseInt(hexCode.slice(5, 7), 16);
    const isGlow = (g >= 220 && b >= 90) || hexCode.toLowerCase() === TAGLINE_COLOR.toLowerCase();
    const boldCode = isGlow ? '1;' : '';
    s = `\x1b[0;${boldCode}38;2;${r};${g};${b}m`;
    sgrCache.set(hexCode, s);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Static Banner — printed on the main buffer after splash exits
// Anchors the logo in place so Ink renders the input bar directly below it.
// ---------------------------------------------------------------------------

/** ANSI SGR for a hex color string, inlined to keep this self-contained. */
function ansiRgb(hex: string, bold = false): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[${bold ? '1;' : '0;'}38;2;${r};${g};${b}m`;
}
const RESET = '\x1b[0m';

/**
 * Print a static ANSI rendering of the logo + tagline directly to stdout on
 * the main screen buffer.  Call this once after runSplash() resolves so the
 * logo stays anchored at the top while Ink renders the input bar below.
 */
export function printBanner(title: string, tagline: string): void {
  const out = process.stdout;
  const W   = Math.max(20, (out.columns || 80) - 1);

  const big = bigLogo(title);

  if (big && big[0]!.length + 6 <= W) {
    const x0  = Math.max(0, Math.floor((W - big[0]!.length) / 2));
    const pad = ' '.repeat(x0);

    out.write('\n');
    for (const row of big) {
      let line = pad;
      for (let k = 0; k < row.length; k++) {
        const c = row[k]!;
        if      (c === '█') line += ansiRgb(LOGO_BODY) + c + RESET;
        else if (c !== ' ') line += ansiRgb(LOGO_SHADING) + c + RESET;
        else                line += c;
      }
      out.write(line + '\n');
    }

    // tagline centered, bold bright green
    const x0_tag = Math.max(0, Math.floor((W - tagline.length) / 2));
    out.write('\n' + ' '.repeat(x0_tag) + ansiRgb(TAGLINE_COLOR, true) + tagline + RESET + '\n\n');
  } else {
    // narrow terminal fallback
    out.write('\n' + ansiRgb(LOGO_BODY, true) + title.toUpperCase() + RESET + '\n');
    out.write(ansiRgb(TAGLINE_COLOR, true) + tagline + RESET + '\n\n');
  }
}

// ---------------------------------------------------------------------------
// Main Splash Lifecycle
// ---------------------------------------------------------------------------

// Theme colours shared by the input bar rendered inside the splash
const BAR_BORDER  = '#39ff6a';   // bright green rule lines
const BAR_DOTTED  = '#39ff6a';   // proper colour dotted line where rain is ending
const BAR_PROMPT  = '#39ff6a';   // ">" glyph
const BAR_TYPED   = '#39FF88';   // typed text
const BAR_HOLDER  = '#1f9e47';   // placeholder / muted hint
const BAR_CURSOR  = '#d7ffe1';   // blinking block
const BAR_PLACEHOLDER = 'Type your message or ask NEOLOOP anything...';
const CURSOR_BLINK_MS = 530;

export function runSplash({
  title,
  tagline = 'THINK. CODE. EXECUTE.',
  hint = '',
  onCommand,
  initialLogs = [],
}: SplashOptions): Promise<string> {
  return new Promise(resolve => {
    const out = process.stdout;
    const inp = process.stdin;

    let W = 0;
    let H = 0;
    let streamH = 0;           // matrix rain only fills rows 0 .. streamH-1
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
    let inputVisible  = false;   // only appears AFTER matrix rain starts
    let inputBuffer   = '';      // characters typed by user
    let cursorIdx     = 0;       // active cursor position in inputBuffer
    let cursorOn      = true;    // blinking cursor phase
    let cursorTimer: NodeJS.Timeout | undefined;
    const logs: string[] = [...initialLogs];

    const LETTER_FRAMES = 3;
    const titleDoneFrame  = title.length * LETTER_FRAMES;
    const tagStartFrame   = titleDoneFrame + 4;
    const TAG_SPEED       = 2;
    const tagDoneFrame    = tagStartFrame + Math.ceil(tagline.length / TAG_SPEED);
    const hintStartFrame  = hint ? tagDoneFrame + 3 : tagDoneFrame;
    const streamStartFrame = hint ? hintStartFrame + 3 : tagDoneFrame + 3;

    // ── layout helpers ─────────────────────────────────────────────────────
    function recalcLayout() {
      W = Math.max(20, (out.columns || 80) - 1);
      H = Math.max(8, out.rows || 24);

      const sampleLines = buildLines(title, tagline, hint, HINT_ON, W, H);
      const y0 = Math.max(0, Math.floor(H / 4 - sampleLines.length / 2));
      const fullBig = bigLogo(title);
      const logoH = fullBig ? fullBig.length : 1;
      const tagRow = y0 + (fullBig ? logoH + 1 : 2);

      // Rain stops at the tagline row (no rain under the tagline or under the logo)
      streamH = Math.min(Math.max(6, H - 4), tagRow + 1);
    }

    function init() {
      recalcLayout();
      stream = frame >= streamStartFrame ? createStream(W, streamH) : null;
      chars  = new Array(W * H).fill(' ');
      colors = new Array(W * H).fill('');
      prevC  = new Array(W * H).fill(null);
      prevK  = new Array(W * H).fill(null);
      lastFull = Date.now();
      out.write('\x1b[0m\x1b[2J\x1b[H');
    }

    // ── paint the logo + tagline into chars/colors ─────────────────────────
    function paintContent() {
      const fullLines = buildLines(title, tagline, hint, HINT_ON, W, H);
      const y0 = Math.max(0, Math.floor(H / 4 - fullLines.length / 2));
      const fullBig  = bigLogo(title);
      const fullLogoW = fullBig && fullBig[0] ? fullBig[0].length : title.length;
      const x0_logo  = Math.max(0, Math.floor((W - fullLogoW) / 2));

      const widest = Math.max(...fullLines.map(l => l.text.length));
      const cx0 = Math.max(0, Math.floor((W - widest) / 2) - 3);
      const cx1 = Math.min(W, Math.floor((W + widest) / 2) + 3);
      for (let y = Math.max(0, y0 - 1); y < streamH; y++) {
        for (let x = cx0; x < cx1; x++) {
          chars[y * W + x]  = ' ';
          colors[y * W + x] = '';
        }
      }

      const titleLetters = Math.min(title.length, Math.floor(frame / LETTER_FRAMES) + 1);
      const currentTitle  = title.slice(0, titleLetters);
      const currentBig    = bigLogo(currentTitle);

      if (currentBig) {
        currentBig.forEach((row, j) => {
          for (let k = 0; k < row.length; k++) {
            const c = row[k]!;
            if (c === ' ') continue;
            const idx = (y0 + j) * W + x0_logo + k;
            chars[idx]  = c;
            colors[idx] = c === '█' ? LOGO_BODY : LOGO_SHADING;
          }
        });
      }

      const tagRow = y0 + (currentBig ? currentBig.length + 1 : 2);
      if (tagline && frame >= tagStartFrame) {
        const tagChars   = Math.min(tagline.length, (frame - tagStartFrame) * TAG_SPEED);
        const currentTag = tagline.slice(0, tagChars);
        const x0_tag     = Math.max(0, Math.floor((W - tagline.length) / 2));

        const SWEEP_FRAMES = 24;
        const beamWidth    = 4.0;
        const span         = tagline.length + beamWidth;

        const isSweeping = frame >= tagDoneFrame;
        const animFrame  = isSweeping ? (frame - tagDoneFrame) % SWEEP_FRAMES : -1;
        const center     = isSweeping ? -beamWidth + (animFrame / SWEEP_FRAMES) * span : -999;

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
            colors[idx] = getShimmerColor(maxT);
          } else {
            colors[idx] = '#145c32';
          }
        }
      }

      const hasSpacing = H - 2 >= (currentBig ? currentBig.length : 1) + 1 + (tagline ? 1 : 0) + (hint ? 2 : 0);
      const hintRow    = tagRow + (tagline ? (hasSpacing ? 2 : 1) : 1);
      if (hint && frame >= hintStartFrame) {
        const x0_hint  = Math.max(0, Math.floor((W - hint.length) / 2));
        const hintColor = (frame >> 3) & 1 ? HINT_ON : HINT_OFF;

        for (let k = 0; k < hint.length; k++) {
          const c = hint[k]!;
          if (c === ' ') continue;
          const idx = hintRow * W + x0_hint + k;
          chars[idx]  = c;
          colors[idx] = hintColor;
        }
      }
    }

    // ── paint dashed border input bar & tool logs (under rain) ────────────
    function paintInputBar() {
      if (!inputVisible) return;

      const ruleWidth = Math.max(1, W - 2);
      const dashedRule = '╌'.repeat(ruleWidth);

      // helper: write a string into chars/colors at a given row
      const writeRow = (y: number, startX: number, text: string, color: string) => {
        if (y < 0 || y >= H) return;
        for (let k = 0; k < text.length && startX + k < W; k++) {
          chars[y * W + startX + k]  = text[k]!;
          colors[y * W + startX + k] = color;
        }
      };

      // 1) Top dashed border line
      const topY = streamH;
      writeRow(topY, 1, dashedRule, BAR_BORDER);

      // 2) Prompt row:  "> " then placeholder/text then cursor
      const promptY = streamH + 1;
      writeRow(promptY, 2, '> ', BAR_PROMPT);
      const contentX = 4;  // column after "> "

      if (inputBuffer.length === 0) {
        // placeholder + cursor at start
        const ph = BAR_PLACEHOLDER.slice(0, Math.max(0, W - contentX - 1));
        writeRow(promptY, contentX, ph, BAR_HOLDER);
        // cursor at start of placeholder
        const curX = contentX;
        if (curX < W) {
          chars[promptY * W + curX]  = cursorOn ? '█' : (ph[0] || ' ');
          colors[promptY * W + curX] = cursorOn ? BAR_CURSOR : BAR_HOLDER;
        }
      } else {
        // typed text + cursor navigation
        const maxVisible = Math.max(1, W - contentX - 1);
        let viewOffset = 0;
        if (cursorIdx >= maxVisible) {
          viewOffset = cursorIdx - maxVisible + 1;
        }
        const visible = inputBuffer.slice(viewOffset, viewOffset + maxVisible);
        writeRow(promptY, contentX, visible, BAR_TYPED);

        const curX = contentX + (cursorIdx - viewOffset);
        if (curX < W && curX >= contentX) {
          const charUnder = (cursorIdx - viewOffset < visible.length)
            ? visible[cursorIdx - viewOffset]!
            : ' ';
          chars[promptY * W + curX]  = (charUnder === ' ' && cursorOn) ? '█' : charUnder;
          colors[promptY * W + curX] = cursorOn ? BAR_CURSOR : BAR_TYPED;
        }
      }

      // 3) Bottom dashed rule
      const botY = streamH + 2;
      writeRow(botY, 1, dashedRule, BAR_BORDER);

      // 4) Tool logs / execution history scrolling down below the input bar
      const outputStartY = streamH + 3;
      const availableRows = Math.max(0, H - outputStartY);

      if (availableRows > 0 && logs.length > 0) {
        // Show the latest availableRows lines so output scrolls down as tool proceeds
        const visibleLogs = logs.slice(-availableRows);
        visibleLogs.forEach((logLine, idx) => {
          const rowY = outputStartY + idx;
          const isHistoryCmd = logLine.startsWith('> ');
          const logColor = isHistoryCmd ? '#1f9e47' : '#39FF88';
          writeRow(rowY, 2, logLine.slice(0, W - 3), logColor);
        });
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
            if (key !== last) { s += key ? sgr(key) : '\x1b[0m'; last = key; }
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
        composeStream(stream);
        for (let y = 0; y < stream.h; y++) {
          for (let x = 0; x < stream.w; x++) {
            const source = y * stream.w + x;
            const target = y * W + x;
            chars[target]  = stream.chars[source]!;
            colors[target] = stream.colors[source]!;
          }
        }
      }

      paintContent();
      paintInputBar();

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
      if (timer) clearTimeout(timer);
      if (cursorTimer) clearInterval(cursorTimer);
      out.off('resize', init);
      inp.off('data', onData);
      process.off('exit', cleanup);
      out.write('\x1b[0m\x1b[?25h\x1b[?1049l');
      if (inp.isTTY) inp.setRawMode(false);
      inp.pause();
    }

    // ── keyboard handler ───────────────────────────────────────────────────
    function onData(buf: Buffer) {
      const s = buf.toString();

      // Ctrl-C — always exits cleanly
      if (s === '\x03') {
        cleanup();
        process.exit(0);
      }

      // Input bar only accepts interaction once the rain animation has started
      if (!inputVisible) {
        return;
      }

      // ── Cursor navigation (never stops or pauses animation) ─────────────
      if (s === '\x1b[D' || s === '\x1bOD') {
        cursorIdx = Math.max(0, cursorIdx - 1);
        return;
      }
      if (s === '\x1b[C' || s === '\x1bOC') {
        cursorIdx = Math.min(inputBuffer.length, cursorIdx + 1);
        return;
      }
      if (s === '\x1b[H' || s === '\x1b[1~' || s === '\x1b[7~') {
        cursorIdx = 0;
        return;
      }
      if (s === '\x1b[F' || s === '\x1b[4~' || s === '\x1b[8~') {
        cursorIdx = inputBuffer.length;
        return;
      }
      if (s === '\x1b[3~') {
        // Delete key
        if (cursorIdx < inputBuffer.length) {
          inputBuffer = inputBuffer.slice(0, cursorIdx) + inputBuffer.slice(cursorIdx + 1);
        }
        return;
      }

      // Safely ignore all other escape / mouse / focus codes
      if (s.startsWith('\x1b')) return;

      // ── Enter: submit command (splash stays anchored & continuously animated)
      if (s === '\r' || s === '\n') {
        const trimmed = inputBuffer.trim();
        if (trimmed) {
          logs.push('> ' + trimmed);
          const cmd = trimmed;
          inputBuffer = '';
          cursorIdx = 0;
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
        return;
      }

      // ── Backspace (raw mode sends \x7f or \x08) ─────────────────────────
      if (s === '\x7f' || s === '\x08') {
        if (cursorIdx > 0) {
          inputBuffer = inputBuffer.slice(0, cursorIdx - 1) + inputBuffer.slice(cursorIdx);
          cursorIdx--;
        }
        return;
      }

      // ── Printable characters: insert at active cursor position ──────────
      // Typing never interrupts or pauses the animation at any cost!
      const printable = s.replace(/[\x00-\x1f\x7f]/g, '');
      if (printable) {
        inputBuffer = inputBuffer.slice(0, cursorIdx) + printable + inputBuffer.slice(cursorIdx);
        cursorIdx += printable.length;
      }
    }

    // ── boot ───────────────────────────────────────────────────────────────
    out.write('\x1b[?1049h\x1b[?25l');
    init();
    out.on('resize', init);
    process.on('exit', cleanup);
    if (inp.isTTY) inp.setRawMode(true);
    inp.resume();
    inp.on('data', onData);

    // cursor blink timer — independent of the render loop
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

        // Input bar appears only when the first rain column hits bottom / splashes
        if (stream.hasHitBottom) {
          inputVisible = true;
        }
      }

      draw();
      timer = setTimeout(loop, Math.max(0, 1000 / FPS - (Date.now() - t0)));
    })();
  });
}
