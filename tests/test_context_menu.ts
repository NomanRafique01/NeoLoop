import assert from 'node:assert';

const MENU_INNER_WIDTH = 24;
const BOX_WIDTH = MENU_INNER_WIDTH + 2;
const MENU_HEIGHT = 5 + 2;

const title = ' Clipboard ';
const topDashes = Math.max(1, BOX_WIDTH - 2 - title.length - 1);
const topBorder = '┌─' + title + '─'.repeat(topDashes) + '┐';

const hintText = ' enter·esc ';
const leftDashes = Math.max(1, Math.floor((MENU_INNER_WIDTH - hintText.length) / 2));
const rightDashes = Math.max(1, MENU_INNER_WIDTH - hintText.length - leftDashes);
const bottomBorder = '└' + '─'.repeat(leftDashes) + hintText + '─'.repeat(rightDashes) + '┘';

assert.strictEqual(BOX_WIDTH, 26);
assert.strictEqual(topBorder.length, 26, `topBorder length expected 26 but got ${topBorder.length}`);
assert.strictEqual(bottomBorder.length, 26, `bottomBorder length expected 26 but got ${bottomBorder.length}`);

console.log(topBorder);

const items = [
  { label: 'Copy',       shortcut: 'Ctrl+C' },
  { label: 'Paste',      shortcut: 'Ctrl+V' },
  { label: 'Cut',        shortcut: 'Ctrl+X' },
  { label: 'Select All', shortcut: 'Ctrl+A' },
  { label: 'Clear',      shortcut: 'Esc' },
];

for (let i = 0; i < items.length; i++) {
  const item = items[i]!;
  const isSelected = i === 0;
  const ptr = isSelected ? '>' : ' ';
  const shortcut = item.shortcut || '';
  const rightMargin = ' ';
  const spaceCount = Math.max(
    1,
    MENU_INNER_WIDTH - 2 - item.label.length - shortcut.length - rightMargin.length
  );

  let inner = ptr + ' ' + item.label + ' '.repeat(spaceCount) + shortcut + rightMargin;
  assert.strictEqual(inner.length, MENU_INNER_WIDTH, `Row ${i} inner length is ${inner.length}`);

  const row = '│' + inner + '│';
  assert.strictEqual(row.length, 26, `Row ${i} length is ${row.length}`);
  console.log(row);
}

console.log(bottomBorder);
console.log('PASS: All 7 rows are exactly 26 characters wide!');
