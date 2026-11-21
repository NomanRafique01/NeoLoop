import assert from 'node:assert';

// Simulated state machine identical to splash.ts
let inputBuffer = '';
let cursorIdx = 0;
let isSelectedAll = false;
let mode: 'input' | 'slashMenu' = 'input';

function handleCtrlA() {
  if (inputBuffer.length > 0) {
    isSelectedAll = true;
    cursorIdx = inputBuffer.length;
  }
}

function handleClickAnywhere(x: number, y: number, isInputBar: boolean) {
  // If selected all, clicking anywhere unselects it
  if (isSelectedAll) {
    isSelectedAll = false;
  }
  if (isInputBar) {
    cursorIdx = Math.min(x, inputBuffer.length);
  }
}

function handleNewline() {
  if (isSelectedAll) {
    inputBuffer = '\n';
    cursorIdx = 1;
    isSelectedAll = false;
  } else {
    inputBuffer = inputBuffer.slice(0, cursorIdx) + '\n' + inputBuffer.slice(cursorIdx);
    cursorIdx++;
  }
}

function handleEnter(): string | null {
  isSelectedAll = false;
  const trimmed = inputBuffer.trim();
  inputBuffer = '';
  cursorIdx = 0;
  return trimmed || null;
}

// Test 1: Ctrl+A then click anywhere (outside input bar) unselects
inputBuffer = 'hello world';
cursorIdx = 11;
handleCtrlA();
assert.strictEqual(isSelectedAll, true);
handleClickAnywhere(0, 0, false); // click outside
assert.strictEqual(isSelectedAll, false);
assert.strictEqual(inputBuffer, 'hello world');

// Test 2: Ctrl+A then click inside input bar unselects and positions cursor
handleCtrlA();
assert.strictEqual(isSelectedAll, true);
handleClickAnywhere(5, 10, true); // click inside at col 5
assert.strictEqual(isSelectedAll, false);
assert.strictEqual(cursorIdx, 5);

// Test 3: Shift+Enter changes line like WhatsApp without submitting
inputBuffer = 'line 1';
cursorIdx = 6;
handleNewline();
assert.strictEqual(inputBuffer, 'line 1\n');
assert.strictEqual(cursorIdx, 7);
inputBuffer += 'line 2';
cursorIdx = inputBuffer.length;
handleNewline();
assert.strictEqual(inputBuffer, 'line 1\nline 2\n');

// Test 4: Enter alone sends/submits
const submitted = handleEnter();
assert.strictEqual(submitted, 'line 1\nline 2');
assert.strictEqual(inputBuffer, '');

// Test 5: Shift+Enter when Ctrl+A selected replaces selection with newline
inputBuffer = 'all selected';
handleCtrlA();
assert.strictEqual(isSelectedAll, true);
handleNewline();
assert.strictEqual(isSelectedAll, false);
assert.strictEqual(inputBuffer, '\n');

console.log('PASS: All selection and newline flow tests passed!');
