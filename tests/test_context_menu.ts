import assert from 'node:assert';

const MENU_INNER_WIDTH = 10;
const BOX_WIDTH = MENU_INNER_WIDTH + 2;
const MENU_HEIGHT = 3 + 2;

const topBorder = '┌' + '─'.repeat(MENU_INNER_WIDTH) + '┐';
const bottomBorder = '└' + '─'.repeat(MENU_INNER_WIDTH) + '┘';

assert.strictEqual(BOX_WIDTH, 12);
assert.strictEqual(topBorder.length, 12, `topBorder length expected 12 but got ${topBorder.length}`);
assert.strictEqual(bottomBorder.length, 12, `bottomBorder length expected 12 but got ${bottomBorder.length}`);

console.log(topBorder);

const items = [
  { label: 'Copy'  },
  { label: 'Paste' },
  { label: 'Cut'   },
];

for (let i = 0; i < items.length; i++) {
  const item = items[i]!;
  const isSelected = i === 0;
  const ptr = isSelected ? '>' : ' ';
  const innerContent = ptr + ' ' + item.label;
  const padCount = MENU_INNER_WIDTH - innerContent.length;
  const inner = innerContent + ' '.repeat(Math.max(1, padCount));

  assert.strictEqual(inner.length, MENU_INNER_WIDTH, `Row ${i} inner length is ${inner.length}`);

  const row = '│' + inner + '│';
  assert.strictEqual(row.length, 12, `Row ${i} length is ${row.length}`);
  console.log(row);
}

console.log(bottomBorder);
console.log('PASS: All 5 rows are exactly 12 characters wide!');
