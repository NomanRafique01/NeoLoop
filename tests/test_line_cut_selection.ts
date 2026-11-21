import assert from 'node:assert';

// Simulating line selection and cut logic
function simulateLineCut(buffer: string, lineToCutIndex: number, lines: string[]): { remaining: string; cutText: string } {
  let currentIdx = 0;
  const rows: { startIdx: number; endIdx: number; text: string }[] = [];
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l]!;
    rows.push({
      text: line,
      startIdx: currentIdx,
      endIdx: currentIdx + line.length,
    });
    currentIdx += line.length + (l < lines.length - 1 ? 1 : 0);
  }

  const vRow = rows[lineToCutIndex]!;
  let selStart = vRow.startIdx;
  let selEnd = vRow.endIdx;

  if (selEnd < buffer.length && buffer[selEnd] === '\n') {
    selEnd++;
  } else if (selEnd === buffer.length && selStart > 0 && buffer[selStart - 1] === '\n') {
    selStart--;
  }

  const cutText = buffer.slice(selStart, selEnd);
  const remaining = buffer.slice(0, selStart) + buffer.slice(selEnd);

  return { remaining, cutText };
}

// Test 1: Multiline text with 3 lines, cut middle line
const buffer1 = 'first line\nsecond line\nthird line';
const res1 = simulateLineCut(buffer1, 1, ['first line', 'second line', 'third line']);
assert.strictEqual(res1.cutText, 'second line\n');
assert.strictEqual(res1.remaining, 'first line\nthird line');
console.log('PASS Test 1: Middle line cut cleanly without affecting other lines');

// Test 2: Cut last line
const res2 = simulateLineCut(buffer1, 2, ['first line', 'second line', 'third line']);
assert.strictEqual(res2.cutText, '\nthird line');
assert.strictEqual(res2.remaining, 'first line\nsecond line');
console.log('PASS Test 2: Last line cut cleanly without leaving trailing blank line');

// Test 3: Cut first line
const res3 = simulateLineCut(buffer1, 0, ['first line', 'second line', 'third line']);
assert.strictEqual(res3.cutText, 'first line\n');
assert.strictEqual(res3.remaining, 'second line\nthird line');
console.log('PASS Test 3: First line cut cleanly');

console.log('ALL LINE SELECTION AND CUT TESTS PASSED!');
