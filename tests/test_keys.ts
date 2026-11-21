import { parseKeyActions } from '../src/core/keys.js';
import assert from 'node:assert';

// 1. Enter vs Shift+Enter / Newline
assert.deepStrictEqual(parseKeyActions('\r'), [{ type: 'enter' }]);
assert.deepStrictEqual(parseKeyActions('\r\n'), [{ type: 'enter' }]);
assert.deepStrictEqual(parseKeyActions('\n'), [{ type: 'newline' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[13u'), [{ type: 'enter' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[13;2u'), [{ type: 'newline' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[13;2;1u'), [{ type: 'newline' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[13;1u'), [{ type: 'enter' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[27;2;13~'), [{ type: 'newline' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[13;2~'), [{ type: 'newline' }]);
assert.deepStrictEqual(parseKeyActions('\x1b\r'), [{ type: 'newline' }]);
assert.deepStrictEqual(parseKeyActions('\x1b\n'), [{ type: 'newline' }]);
assert.deepStrictEqual(parseKeyActions('\x1bOM'), [{ type: 'newline' }]);
assert.deepStrictEqual(parseKeyActions('\x1bO2M'), [{ type: 'newline' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[1;2M'), [{ type: 'newline' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[13;2F'), [{ type: 'newline' }]);

// Win32 input mode (Windows Terminal / ConPTY)
assert.deepStrictEqual(parseKeyActions('\x1b[13;28;13;1;16;1_'), [{ type: 'newline' }]); // Shift+Enter down
assert.deepStrictEqual(parseKeyActions('\x1b[13;28;13;1;0;1_'), [{ type: 'enter' }]);     // Enter down
assert.deepStrictEqual(parseKeyActions('\x1b[13;28;13;0;16;1_'), []);                      // Shift+Enter up (ignored)

// 2. Mouse Clicks
assert.deepStrictEqual(parseKeyActions('\x1b[<0;15;20M'), [{ type: 'left-click', x: 14, y: 19 }]);
assert.deepStrictEqual(parseKeyActions('\x1b[<2;15;20M'), [{ type: 'right-click', x: 14, y: 19 }]);
assert.deepStrictEqual(parseKeyActions('\x1b[<1;15;20M'), [{ type: 'left-click', x: 14, y: 19 }]);

// 3. Ctrl+A
assert.deepStrictEqual(parseKeyActions('\x01'), [{ type: 'ctrl-a' }]);

console.log('PASS: All key and mouse action tests passed!');
