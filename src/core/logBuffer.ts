/**
 * NeoLoop CLI — Log Buffer Engine
 *
 * Terminal-independent ring buffer for log and agent output lines.
 * Handles width-aware line wrapping once at append time, partial streaming chunks,
 * bounded memory cap eviction with drop tracking, and debounced re-wrapping on resize.
 */

import wrapAnsi from 'wrap-ansi';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';

export type LogType = 'command' | 'step' | 'output' | 'error' | 'info';

export interface DisplaySegment {
  text: string;
  style?: string; // ANSI SGR escape sequence or token identifier
}

export interface DisplayLine {
  text: string;
  type: LogType;
  segments: DisplaySegment[];
  isContinuation?: boolean;
}

export interface LogBufferOptions {
  cols?: number;
  maxLines?: number;
  onDropLines?: (count: number) => void;
}

interface RawLineEntry {
  type: LogType;
  text: string;
  wrappedCount: number;
}

interface PendingChunk {
  type: LogType;
  text: string;
}

export const DEFAULT_MAX_LINES = 20000;
export const DEFAULT_COLS = 80;

/**
 * Tokenize a line containing ANSI SGR escapes into styled segments.
 * Fast O(N) single-pass regex tokenizer.
 */
export function parseAnsiSegments(text: string, defaultStyle?: string): DisplaySegment[] {
  if (!text.includes('\x1b[')) {
    return [{ text, style: defaultStyle }];
  }

  const segments: DisplaySegment[] = [];
  const ansiRegex = /\x1b\[[0-9;]*m/g;
  let lastIndex = 0;
  let currentStyle = defaultStyle;
  let match: RegExpExecArray | null;

  while ((match = ansiRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segText = text.slice(lastIndex, match.index);
      if (segText.length > 0) {
        segments.push({ text: segText, style: currentStyle });
      }
    }
    const sgr = match[0];
    if (sgr === '\x1b[0m' || sgr === '\x1b[m' || sgr === '\x1b[39m') {
      currentStyle = defaultStyle;
    } else {
      currentStyle = sgr;
    }
    lastIndex = ansiRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const segText = text.slice(lastIndex);
    if (segText.length > 0) {
      segments.push({ text: segText, style: currentStyle });
    }
  }

  return segments;
}

export class LogBuffer {
  private cols: number;
  private maxLines: number;
  private onDropLines?: (count: number) => void;

  private rawLines: RawLineEntry[] = [];
  private wrappedLines: DisplayLine[] = [];
  private pendingChunk: PendingChunk | null = null;
  private pendingWrappedLines: DisplayLine[] = [];

  private totalDroppedLines = 0;
  private unconsumedDropped = 0;
  private resizeTimer: NodeJS.Timeout | null = null;

  constructor(optionsOrCols?: LogBufferOptions | number, maybeMaxLines?: number) {
    if (typeof optionsOrCols === 'number') {
      this.cols = Math.max(1, optionsOrCols);
      this.maxLines = Math.max(10, maybeMaxLines ?? DEFAULT_MAX_LINES);
    } else {
      const options = optionsOrCols ?? {};
      this.cols = Math.max(1, options.cols ?? DEFAULT_COLS);
      this.maxLines = Math.max(10, options.maxLines ?? DEFAULT_MAX_LINES);
      this.onDropLines = options.onDropLines;
    }
  }

  public getCols(): number {
    return this.cols;
  }

  public getMaxLines(): number {
    return this.maxLines;
  }

  public getTotalDroppedLines(): number {
    return this.totalDroppedLines;
  }

  public consumeDroppedCount(): number {
    const dropped = this.unconsumedDropped;
    this.unconsumedDropped = 0;
    return dropped;
  }

  public get lineCount(): number {
    return this.wrappedLines.length + this.pendingWrappedLines.length;
  }

  /**
   * Append one or more complete lines of a given log type.
   */
  public append(type: LogType, text: string): void {
    if (this.pendingChunk) {
      this.flushPendingChunk();
    }

    const lines = text.replaceAll('\r\n', '\n').split('\n');
    for (const rawLine of lines) {
      this.appendSingleLineNoCap(type, rawLine);
    }
    this.enforceCap();
  }

  /**
   * Append streaming text that may end mid-line.
   * Last line remains open until a newline arrives.
   */
  public appendChunk(type: LogType, chunk: string): void {
    if (!chunk) return;

    if (this.pendingChunk && this.pendingChunk.type !== type) {
      this.flushPendingChunk();
    }

    if (!this.pendingChunk) {
      this.pendingChunk = { type, text: chunk };
    } else {
      this.pendingChunk.text += chunk;
    }

    const normalized = this.pendingChunk.text.replaceAll('\r\n', '\n');
    const lastNewlineIdx = normalized.lastIndexOf('\n');

    if (lastNewlineIdx !== -1) {
      const completePart = normalized.slice(0, lastNewlineIdx);
      const remainingPart = normalized.slice(lastNewlineIdx + 1);

      const lines = completePart.split('\n');
      for (const line of lines) {
        this.appendSingleLineNoCap(type, line);
      }
      this.enforceCap();

      if (remainingPart.length > 0) {
        this.pendingChunk.text = remainingPart;
        this.updatePendingWrapped();
      } else {
        this.pendingChunk = null;
        this.pendingWrappedLines = [];
      }
    } else {
      this.pendingChunk.text = normalized;
      this.updatePendingWrapped();
    }
  }

  /**
   * Compatibility logger matching the existing `log(text: string)` callback signature.
   */
  public log(text: string): void {
    let type: LogType = 'output';
    let content = text;

    if (content.startsWith('> ')) {
      type = 'command';
    } else if (content.startsWith('[error') || content.startsWith('error:')) {
      type = 'error';
    } else if (content.startsWith('step:') || content.startsWith('[step')) {
      type = 'step';
    } else if (content.startsWith('info:') || content.startsWith('Commands:') || content.startsWith('Shortcuts:') || content.startsWith('Theme set to ')) {
      type = 'info';
    }

    this.append(type, content);
  }

  /**
   * Retrieve a range of visible wrapped display lines.
   */
  public getLines(top: number, count: number): DisplayLine[] {
    if (count <= 0 || top < 0) return [];

    const total = this.lineCount;
    if (top >= total) return [];

    const end = Math.min(top + count, total);
    const completedCount = this.wrappedLines.length;

    if (end <= completedCount) {
      return this.wrappedLines.slice(top, end);
    }

    if (top >= completedCount) {
      const pendingTop = top - completedCount;
      const pendingEnd = end - completedCount;
      return this.pendingWrappedLines.slice(pendingTop, pendingEnd);
    }

    const part1 = this.wrappedLines.slice(top, completedCount);
    const part2 = this.pendingWrappedLines.slice(0, end - completedCount);
    return part1.concat(part2);
  }

  /**
   * Change viewport column width and re-wrap lines.
   * Debounces by default to keep resize fluid.
   */
  public setWidth(cols: number, debounceMs = 100): void {
    const validCols = Math.max(1, cols);
    if (validCols === this.cols) return;

    this.cols = validCols;

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    if (debounceMs <= 0) {
      this.reWrapNow();
    } else {
      this.resizeTimer = setTimeout(() => {
        this.reWrapNow();
        this.resizeTimer = null;
      }, debounceMs);
    }
  }

  /**
   * Immediately execute re-wrapping of all stored lines.
   */
  public reWrapNow(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    const newWrappedLines: DisplayLine[] = [];
    for (const raw of this.rawLines) {
      const wrapped = this.wrapText(raw.type, raw.text);
      raw.wrappedCount = wrapped.length;
      newWrappedLines.push(...wrapped);
    }

    this.wrappedLines = newWrappedLines;
    this.updatePendingWrapped();
    this.enforceCap();
  }

  /**
   * Clear all contents from the buffer.
   */
  public clear(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    this.rawLines = [];
    this.wrappedLines = [];
    this.pendingChunk = null;
    this.pendingWrappedLines = [];
    this.totalDroppedLines = 0;
    this.unconsumedDropped = 0;
  }

  /**
   * Clean up background timers.
   */
  public destroy(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
  }

  private appendSingleLineNoCap(type: LogType, rawLine: string): void {
    const wrapped = this.wrapText(type, rawLine);
    this.rawLines.push({
      type,
      text: rawLine,
      wrappedCount: wrapped.length,
    });
    for (let i = 0; i < wrapped.length; i++) {
      this.wrappedLines.push(wrapped[i]!);
    }
  }

  private appendSingleLine(type: LogType, rawLine: string): void {
    this.appendSingleLineNoCap(type, rawLine);
    this.enforceCap();
  }

  private flushPendingChunk(): void {
    if (!this.pendingChunk) return;
    const { type, text } = this.pendingChunk;
    this.pendingChunk = null;
    this.pendingWrappedLines = [];
    this.append(type, text);
  }

  private updatePendingWrapped(): void {
    if (!this.pendingChunk || !this.pendingChunk.text) {
      this.pendingWrappedLines = [];
      return;
    }
    this.pendingWrappedLines = this.wrapText(this.pendingChunk.type, this.pendingChunk.text);
  }

  private wrapText(type: LogType, text: string): DisplayLine[] {
    if (text.length === 0) {
      return [{
        text: '',
        type,
        segments: [{ text: '', style: undefined }],
        isContinuation: false,
      }];
    }

    // Fast-path: check if text has ANSI escapes or wide unicode (> 127)
    let hasAnsiOrWide = false;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code === 27 || code > 127) {
        hasAnsiOrWide = true;
        break;
      }
    }

    if (!hasAnsiOrWide) {
      if (text.length <= this.cols) {
        return [{
          text,
          type,
          segments: [{ text, style: undefined }],
          isContinuation: false,
        }];
      }

      // Fast pure-ASCII word wrapping
      const lines: string[] = [];
      let start = 0;
      while (start < text.length) {
        if (text.length - start <= this.cols) {
          lines.push(text.slice(start));
          break;
        }
        let breakIdx = -1;
        const maxEnd = start + this.cols;
        for (let j = maxEnd; j > start; j--) {
          if (text.charCodeAt(j) === 32) {
            breakIdx = j;
            break;
          }
        }
        if (breakIdx === -1) {
          lines.push(text.slice(start, maxEnd));
          start = maxEnd;
        } else {
          lines.push(text.slice(start, breakIdx));
          start = breakIdx + 1;
        }
      }
      return lines.map((lineText, idx) => ({
        text: lineText,
        type,
        segments: [{ text: lineText, style: undefined }],
        isContinuation: idx > 0,
      }));
    }

    const wrappedString = wrapAnsi(text, this.cols, {
      hard: true,
      wordWrap: true,
      trim: false,
    });

    const lines = wrappedString.split('\n');
    return lines.map((lineText, idx) => ({
      text: lineText,
      type,
      segments: parseAnsiSegments(lineText),
      isContinuation: idx > 0,
    }));
  }

  private enforceCap(): void {
    if (this.wrappedLines.length <= this.maxLines) return;

    const excess = this.wrappedLines.length - this.maxLines;
    this.wrappedLines.splice(0, excess);
    this.totalDroppedLines += excess;
    this.unconsumedDropped += excess;

    let linesToRemove = excess;
    let rawIndex = 0;
    while (rawIndex < this.rawLines.length && linesToRemove > 0) {
      const entry = this.rawLines[rawIndex]!;
      if (entry.wrappedCount <= linesToRemove) {
        linesToRemove -= entry.wrappedCount;
        rawIndex++;
      } else {
        entry.wrappedCount -= linesToRemove;
        linesToRemove = 0;
        break;
      }
    }
    if (rawIndex > 0) {
      this.rawLines.splice(0, rawIndex);
    }

    if (this.onDropLines) {
      this.onDropLines(excess);
    }
  }
}
