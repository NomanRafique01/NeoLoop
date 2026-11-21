import test from 'node:test';
import assert from 'node:assert';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';
import { LogBuffer, parseAnsiSegments } from '../src/core/logBuffer.js';

test('LogBuffer - basic append and lineCount', () => {
  const buf = new LogBuffer({ cols: 80 });
  assert.strictEqual(buf.lineCount, 0);

  buf.append('output', 'Hello world');
  assert.strictEqual(buf.lineCount, 1);

  const lines = buf.getLines(0, 10);
  assert.strictEqual(lines.length, 1);
  assert.strictEqual(lines[0]!.text, 'Hello world');
  assert.strictEqual(lines[0]!.type, 'output');
});

test('LogBuffer - multi-line append with \n and \r\n', () => {
  const buf = new LogBuffer({ cols: 80 });
  buf.append('step', 'Step 1\nStep 2\r\nStep 3');
  assert.strictEqual(buf.lineCount, 3);

  const lines = buf.getLines(0, 5);
  assert.strictEqual(lines.length, 3);
  assert.strictEqual(lines[0]!.text, 'Step 1');
  assert.strictEqual(lines[1]!.text, 'Step 2');
  assert.strictEqual(lines[2]!.text, 'Step 3');
  assert.strictEqual(lines[1]!.type, 'step');
});

test('LogBuffer - partial streaming lines via appendChunk', () => {
  const buf = new LogBuffer({ cols: 80 });

  // 1. Partial chunk without newline
  buf.appendChunk('output', 'Downloading');
  assert.strictEqual(buf.lineCount, 1);
  let lines = buf.getLines(0, 5);
  assert.strictEqual(lines[0]!.text, 'Downloading');

  // 2. Extend partial chunk
  buf.appendChunk('output', ' package...');
  assert.strictEqual(buf.lineCount, 1);
  lines = buf.getLines(0, 5);
  assert.strictEqual(lines[0]!.text, 'Downloading package...');

  // 3. Complete chunk with newline and start new chunk
  buf.appendChunk('output', ' done!\nStarting install');
  assert.strictEqual(buf.lineCount, 2);
  lines = buf.getLines(0, 5);
  assert.strictEqual(lines[0]!.text, 'Downloading package... done!');
  assert.strictEqual(lines[1]!.text, 'Starting install');

  // 4. Final newline
  buf.appendChunk('output', ' completed.\n');
  assert.strictEqual(buf.lineCount, 2);
  lines = buf.getLines(0, 5);
  assert.strictEqual(lines[1]!.text, 'Starting install completed.');
});

test('LogBuffer - wide characters and emoji wrap correctly', () => {
  // Width 6: 'ab' (2) + '😀' (2) = 4, 'cd' (2) = 6
  const buf = new LogBuffer({ cols: 6 });
  buf.append('output', 'ab😀cd');
  assert.strictEqual(buf.lineCount, 1);
  assert.strictEqual(stringWidth(buf.getLines(0, 1)[0]!.text), 6);

  // 'abc' (3) + '😀' (2) = 5. In cols = 6, 'd' (1) fits (total 6), and 'ef' wraps to line 2.
  const buf2 = new LogBuffer({ cols: 6 });
  buf2.append('output', 'abc😀def');
  assert.strictEqual(buf2.lineCount, 2);
  const lines2 = buf2.getLines(0, 2);
  assert.strictEqual(lines2[0]!.text, 'abc😀d');
  assert.strictEqual(lines2[1]!.text, 'ef');
  assert.strictEqual(stringWidth(lines2[0]!.text), 6);
  assert.strictEqual(stringWidth(lines2[1]!.text), 2);

  // CJK characters (2 columns each)
  const bufCJK = new LogBuffer({ cols: 5 });
  bufCJK.append('output', '中文测试'); // 4 characters * 2 = 8 cols
  assert.strictEqual(bufCJK.lineCount, 2);
  const cjkLines = bufCJK.getLines(0, 2);
  assert.strictEqual(cjkLines[0]!.text, '中文');
  assert.strictEqual(cjkLines[1]!.text, '测试');
  assert.strictEqual(stringWidth(cjkLines[0]!.text), 4);
  assert.strictEqual(stringWidth(cjkLines[1]!.text), 4);
});

test('LogBuffer - ANSI color codes in tool output do not count toward width', () => {
  // 4 visible characters: 'P' 'A' 'S' 'S' with 9-byte ANSI wrapper
  const ansiText = '\x1b[32mPASS\x1b[0m';
  assert.strictEqual(stringWidth(ansiText), 4);

  // In cols = 5, '\x1b[32mPASS\x1b[0m!' is 5 visible columns, fits on 1 line
  const buf = new LogBuffer({ cols: 5 });
  buf.append('output', ansiText + '!');
  assert.strictEqual(buf.lineCount, 1);
  const line = buf.getLines(0, 1)[0]!;
  assert.strictEqual(stripAnsi(line.text), 'PASS!');

  // Segment parser retains ANSI code
  assert.ok(line.segments.length >= 2);
  const passSeg = line.segments.find(s => s.text === 'PASS');
  assert.ok(passSeg);
  assert.strictEqual(passSeg!.style, '\x1b[32m');
});

test('LogBuffer - long unbroken tokens hard-wrap without dropping characters', () => {
  const buf = new LogBuffer({ cols: 15 });
  const longUrl = 'https://github.com/org/repo/blob/main/packages/core/src/index.ts';
  buf.append('output', longUrl);

  assert.ok(buf.lineCount > 1);
  const lines = buf.getLines(0, buf.lineCount);
  let reconstituted = '';
  for (const l of lines) {
    assert.ok(stringWidth(l.text) <= 15, `Line length ${stringWidth(l.text)} should be <= 15`);
    reconstituted += l.text;
  }
  assert.strictEqual(reconstituted, longUrl);
});

test('LogBuffer - cap eviction drops oldest lines from top and adjusts dropped count', () => {
  let droppedCallbackCount = 0;
  const buf = new LogBuffer({
    cols: 80,
    maxLines: 50,
    onDropLines: count => {
      droppedCallbackCount += count;
    },
  });

  // Append 80 single-line entries into a buffer capped at 50
  for (let i = 0; i < 80; i++) {
    buf.append('output', `Line ${i}`);
  }

  assert.strictEqual(buf.lineCount, 50);
  assert.strictEqual(buf.getTotalDroppedLines(), 30);
  assert.strictEqual(droppedCallbackCount, 30);
  assert.strictEqual(buf.consumeDroppedCount(), 30);
  assert.strictEqual(buf.consumeDroppedCount(), 0);

  // The first available line in the buffer must now be Line 30
  const firstLine = buf.getLines(0, 1)[0]!;
  assert.strictEqual(firstLine.text, 'Line 30');

  // The last line must be Line 79
  const lastLine = buf.getLines(49, 1)[0]!;
  assert.strictEqual(lastLine.text, 'Line 79');
});

test('LogBuffer - resize re-wrap updates lines appropriately', async () => {
  const buf = new LogBuffer({ cols: 40 });
  buf.append('output', 'This is a long sentence that comfortably fits within forty columns.');
  assert.strictEqual(buf.lineCount, 2);

  // Immediate re-wrap to width 100 -> fits on 1 line
  buf.setWidth(100, 0);
  assert.strictEqual(buf.lineCount, 1);
  assert.strictEqual(buf.getCols(), 100);

  // Immediate re-wrap to width 20 -> wraps across multiple lines
  buf.setWidth(20, 0);
  assert.ok(buf.lineCount >= 4);

  // Debounced re-wrap
  buf.setWidth(100, 50);
  // Before debounce completes, lines are still at old wrap
  assert.ok(buf.lineCount >= 4);

  await new Promise(r => setTimeout(r, 70));
  // After debounce completes, lines are re-wrapped
  assert.strictEqual(buf.lineCount, 1);
  buf.destroy();
});

test('LogBuffer - clear and reset', () => {
  const buf = new LogBuffer({ cols: 80 });
  buf.append('output', 'Line 1');
  buf.appendChunk('step', 'Step partial');
  assert.ok(buf.lineCount > 0);

  buf.clear();
  assert.strictEqual(buf.lineCount, 0);
  assert.strictEqual(buf.getLines(0, 10).length, 0);
  assert.strictEqual(buf.getTotalDroppedLines(), 0);
});

test('LogBuffer - compatibility log() auto-detection', () => {
  const buf = new LogBuffer({ cols: 80 });
  buf.log('> ls -la');
  buf.log('error: file not found');
  buf.log('step: compiling');
  buf.log('info: running 1 test');
  buf.log('normal output text');

  const lines = buf.getLines(0, 5);
  assert.strictEqual(lines[0]!.type, 'command');
  assert.strictEqual(lines[1]!.type, 'error');
  assert.strictEqual(lines[2]!.type, 'step');
  assert.strictEqual(lines[3]!.type, 'info');
  assert.strictEqual(lines[4]!.type, 'output');
});
