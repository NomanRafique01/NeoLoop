/**
 * NeoLoop QA - ConPTY Headless Terminal Test Harness
 *
 * Drives NeoLoop through real pseudo-terminals (ConPTY on Windows)
 * and emulates display using @xterm/headless for deterministic assertions.
 */

import { createRequire } from 'node:module';
import type * as ptyType from 'node-pty';
import type { Terminal as TerminalType } from '@xterm/headless';

const require = createRequire(import.meta.url);
const pty = require('node-pty') as typeof ptyType;
const { Terminal } = require('@xterm/headless') as { Terminal: typeof TerminalType };

export interface LaunchOptions {
  file: string;
  args: string[];
  cols: number;
  rows: number;
  env?: Record<string, string>;
  cwd?: string;
}

export interface CellColor {
  fg: number;
  bg: number;
}

export interface LatencySample {
  action: string;
  durationMs: number;
}

export interface TerminalSession {
  proc: ptyType.IPty;
  term: TerminalType;
  screen: () => string[];
  rawOutput: () => string;
  bytes: () => number;
  writes: number[];
  send: (s: string) => void;
  sendSlowly: (s: string, delayMs?: number) => Promise<void>;
  sendBurst: (keys: string[], delayMs?: number) => Promise<void>;
  resize: (cols: number, rows: number) => void;
  waitForText: (needle: string, timeoutMs?: number) => Promise<boolean>;
  settle: (ms?: number) => Promise<void>;
  cellColor: (x: number, y: number) => CellColor | null;
  measureLatency: (action: () => void, textToAppear: string, timeoutMs?: number) => Promise<number>;
  getFps: (windowMs?: number) => number;
  destroy: () => Promise<void>;
}

export function launch(options: LaunchOptions): TerminalSession {
  const term = new Terminal({
    cols: options.cols,
    rows: options.rows,
    allowProposedApi: true,
  });

  const mergedEnv: Record<string, string> = {
    ...process.env as Record<string, string>,
    ...(options.env || {}),
  };

  const proc = pty.spawn(options.file, options.args, {
    name: 'xterm-256color',
    cols: options.cols,
    rows: options.rows,
    cwd: options.cwd || process.cwd(),
    env: mergedEnv,
    useConpty: false,
  });

  let bytesCount = 0;
  let rawAccumulator = '';
  const writes: number[] = [];
  let pendingWrites = 0;

  proc.onData(data => {
    bytesCount += data.length;
    rawAccumulator += data;
    writes.push(Date.now());
    pendingWrites++;
    try {
      term.write(data, () => {
        pendingWrites = Math.max(0, pendingWrites - 1);
      });
    } catch {
      pendingWrites = Math.max(0, pendingWrites - 1);
    }
  });

  const screen = (): string[] => {
    const lines: string[] = [];
    const buf = term.buffer.active;
    for (let y = 0; y < term.rows; y++) {
      const line = buf.getLine(y);
      lines.push(line ? line.translateToString(true) : '');
    }
    return lines;
  };

  const settle = async (ms: number = 80): Promise<void> => {
    await new Promise(r => setTimeout(r, ms));
    const start = Date.now();
    while (pendingWrites > 0 && Date.now() - start < 1500) {
      await new Promise(r => setTimeout(r, 15));
    }
  };

  const waitForText = async (needle: string, timeoutMs: number = 5000): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const currentScreen = screen().join('\n');
      if (currentScreen.includes(needle)) {
        return true;
      }
      await new Promise(r => setTimeout(r, 40));
    }
    return false;
  };

  const send = (s: string) => {
    proc.write(s);
  };

  const sendSlowly = async (s: string, delayMs: number = 30): Promise<void> => {
    for (const ch of s) {
      proc.write(ch);
      await new Promise(r => setTimeout(r, delayMs));
    }
  };

  const sendBurst = async (keys: string[], delayMs: number = 10): Promise<void> => {
    for (const k of keys) {
      proc.write(k);
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  };

  const resize = (cols: number, rows: number) => {
    proc.resize(cols, rows);
    term.resize(cols, rows);
  };

  const cellColor = (x: number, y: number): CellColor | null => {
    const line = term.buffer.active.getLine(y);
    if (!line) return null;
    const cell = line.getCell(x);
    if (!cell) return null;
    return {
      fg: cell.getFgColor(),
      bg: cell.getBgColor(),
    };
  };

  const measureLatency = async (
    action: () => void,
    textToAppear: string,
    timeoutMs: number = 3000
  ): Promise<number> => {
    const start = performance.now();
    action();
    const found = await waitForText(textToAppear, timeoutMs);
    const duration = performance.now() - start;
    return found ? duration : -1;
  };

  const getFps = (windowMs: number = 1000): number => {
    const now = Date.now();
    const recentWrites = writes.filter(t => now - t <= windowMs);
    return Math.round((recentWrites.length / windowMs) * 1000);
  };

  const destroy = async (): Promise<void> => {
    try {
      proc.kill();
    } catch {
      /* ignore */
    }
    term.dispose();
    await settle(50);
  };

  return {
    proc,
    term,
    screen,
    rawOutput: () => rawAccumulator,
    bytes: () => bytesCount,
    writes,
    send,
    sendSlowly,
    sendBurst,
    resize,
    waitForText,
    settle,
    cellColor,
    measureLatency,
    getFps,
    destroy,
  };
}
