import assert from 'node:assert';

// Simulate visual row calculation logic identical to splash.ts
interface VisualRow {
  text: string;
  startIdx: number;
  endIdx: number;
}

function getVisualInputRows(inputBuffer: string, textCols: number, cursorIdx: number): {
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

// State machine simulating splash.ts input and history navigation
class TerminalInputState {
  inputBuffer = '';
  cursorIdx = 0;
  inputScrollTop = 0;
  commandHistory: string[] = [];
  historyIndex = -1;
  savedDraft = '';
  textCols = 40;

  submit(cmd: string) {
    const trimmed = cmd.trim();
    if (trimmed) {
      this.commandHistory.push(trimmed);
    }
    this.inputBuffer = '';
    this.cursorIdx = 0;
    this.inputScrollTop = 0;
    this.historyIndex = -1;
    this.savedDraft = '';
  }

  typeChar(ch: string) {
    this.historyIndex = -1;
    this.inputBuffer =
      this.inputBuffer.slice(0, this.cursorIdx) + ch + this.inputBuffer.slice(this.cursorIdx);
    this.cursorIdx += ch.length;
  }

  handleShiftEnter() {
    this.historyIndex = -1;
    this.inputBuffer =
      this.inputBuffer.slice(0, this.cursorIdx) + '\n' + this.inputBuffer.slice(this.cursorIdx);
    this.cursorIdx++;
  }

  handleUp() {
    const { rows: vRows, cursorRow, cursorCol } = getVisualInputRows(
      this.inputBuffer,
      this.textCols,
      this.cursorIdx
    );

    // If in multi-line prompt and not on the first visual row, navigate up
    if (vRows.length > 1 && cursorRow > 0) {
      const targetRow = vRows[cursorRow - 1]!;
      const targetCol = Math.min(cursorCol, targetRow.text.length);
      this.cursorIdx = targetRow.startIdx + targetCol;
      if (cursorRow - 1 < this.inputScrollTop) {
        this.inputScrollTop = cursorRow - 1;
      }
      return;
    }

    // When in user input bar on the top row, stay in current prompt instead of jumping to history
    if (this.inputBuffer.length > 0 && this.historyIndex === -1) {
      this.cursorIdx = 0;
      this.inputScrollTop = 0;
      return;
    }

    // Browse command history backwards only when input is empty or already browsing history
    if (this.commandHistory.length > 0) {
      if (this.historyIndex === -1 && this.inputBuffer.length === 0) {
        this.savedDraft = '';
        this.historyIndex = this.commandHistory.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      } else if (this.historyIndex === 0) {
        return;
      } else {
        return;
      }
      if (this.historyIndex >= 0 && this.historyIndex < this.commandHistory.length) {
        this.inputBuffer = this.commandHistory[this.historyIndex]!;
        this.cursorIdx = this.inputBuffer.length;
      }
    }
  }

  handleDown() {
    const { rows: vRows, cursorRow, cursorCol } = getVisualInputRows(
      this.inputBuffer,
      this.textCols,
      this.cursorIdx
    );

    // If in multi-line prompt and not on the last visual row, navigate down
    if (vRows.length > 1 && cursorRow < vRows.length - 1) {
      const targetRow = vRows[cursorRow + 1]!;
      const targetCol = Math.min(cursorCol, targetRow.text.length);
      this.cursorIdx = targetRow.startIdx + targetCol;
      return;
    }

    // When on the bottom row of current prompt, stay in current prompt (move to end)
    if (this.inputBuffer.length > 0 && this.historyIndex === -1) {
      this.cursorIdx = this.inputBuffer.length;
      return;
    }

    // Browse command history forwards
    if (this.historyIndex !== -1) {
      this.historyIndex++;
      if (this.historyIndex >= this.commandHistory.length) {
        this.historyIndex = -1;
        this.inputBuffer = this.savedDraft;
        this.cursorIdx = this.inputBuffer.length;
      } else {
        this.inputBuffer = this.commandHistory[this.historyIndex]!;
        this.cursorIdx = this.inputBuffer.length;
      }
    }
  }
}

// ── Test 1: User enters a previous prompt, then writes multi-line current prompt ──
const state = new TerminalInputState();
state.submit('earlier prompt from yesterday');
assert.strictEqual(state.commandHistory.length, 1);
assert.strictEqual(state.commandHistory[0], 'earlier prompt from yesterday');

// Now user writes multi-line current prompt
state.typeChar('Line 1 of current prompt');
state.handleShiftEnter(); // Shift+Enter changes line instead of sending
state.typeChar('Line 2 of current prompt');
state.handleShiftEnter();
state.typeChar('Line 3 of current prompt');

const expectedPrompt = 'Line 1 of current prompt\nLine 2 of current prompt\nLine 3 of current prompt';
assert.strictEqual(state.inputBuffer, expectedPrompt);

// User is on Line 3. Presses Up -> moves to Line 2
state.handleUp();
let rowsInfo = getVisualInputRows(state.inputBuffer, state.textCols, state.cursorIdx);
assert.strictEqual(rowsInfo.cursorRow, 1, 'Cursor should be on row 1 (Line 2)');
assert.strictEqual(state.inputBuffer, expectedPrompt, 'Prompt must remain unchanged');

// User presses Up -> moves to Line 1 (reaches top)
state.handleUp();
rowsInfo = getVisualInputRows(state.inputBuffer, state.textCols, state.cursorIdx);
assert.strictEqual(rowsInfo.cursorRow, 0, 'Cursor should be on row 0 (Line 1)');
assert.strictEqual(state.inputBuffer, expectedPrompt, 'Prompt must remain unchanged');

// CRITICAL BUG TEST: User is at the top row (cursorRow === 0) and presses Up again!
// Previously, it got back to the last prompt ("earlier prompt from yesterday")!
// Now: it MUST NOT go to the last prompt that user gave earlier to current prompt!
state.handleUp();
assert.strictEqual(
  state.inputBuffer,
  expectedPrompt,
  'CRITICAL: Reaching top with Up key must NOT clobber current prompt with last prompt!'
);
assert.strictEqual(state.cursorIdx, 0, 'Cursor should stay at 0 (top of prompt)');

// Press Up once more while already at 0:
state.handleUp();
assert.strictEqual(state.inputBuffer, expectedPrompt);
assert.strictEqual(state.cursorIdx, 0);

// Navigate back down to Line 2 and Line 3
state.handleDown();
rowsInfo = getVisualInputRows(state.inputBuffer, state.textCols, state.cursorIdx);
assert.strictEqual(rowsInfo.cursorRow, 1);
state.handleDown();
rowsInfo = getVisualInputRows(state.inputBuffer, state.textCols, state.cursorIdx);
assert.strictEqual(rowsInfo.cursorRow, 2);

// Reaching bottom with Down: stays at end of prompt, never jumps to history
state.handleDown();
assert.strictEqual(state.inputBuffer, expectedPrompt);
assert.strictEqual(state.cursorIdx, expectedPrompt.length);

// ── Test 2: Single-line current prompt: Up key moves to 0 and does not load history ──
const state2 = new TerminalInputState();
state2.submit('first command');
state2.typeChar('current single-line prompt');
assert.strictEqual(state2.inputBuffer, 'current single-line prompt');

state2.handleUp();
assert.strictEqual(
  state2.inputBuffer,
  'current single-line prompt',
  'Up key in single line prompt must not load history'
);
assert.strictEqual(state2.cursorIdx, 0);

// Press Up again: stays at 0
state2.handleUp();
assert.strictEqual(state2.inputBuffer, 'current single-line prompt');
assert.strictEqual(state2.cursorIdx, 0);

// ── Test 3: When input buffer IS empty, Up key browses history ──
const state3 = new TerminalInputState();
state3.submit('prompt 1');
state3.submit('prompt 2');
assert.strictEqual(state3.inputBuffer, '');

// Empty prompt: Up key loads last prompt ("prompt 2")
state3.handleUp();
assert.strictEqual(state3.inputBuffer, 'prompt 2');
assert.strictEqual(state3.historyIndex, 1);

// Press Up again: loads "prompt 1"
state3.handleUp();
assert.strictEqual(state3.inputBuffer, 'prompt 1');
assert.strictEqual(state3.historyIndex, 0);

// Press Down: goes forward to "prompt 2"
state3.handleDown();
assert.strictEqual(state3.inputBuffer, 'prompt 2');
assert.strictEqual(state3.historyIndex, 1);

// Press Down: returns to empty draft
state3.handleDown();
assert.strictEqual(state3.inputBuffer, '');
assert.strictEqual(state3.historyIndex, -1);

console.log('PASS: All input navigation and history tests passed!');
