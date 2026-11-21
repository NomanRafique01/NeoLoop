import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  THEMES,
  DEFAULT_THEME_ID,
  getTheme,
  loadSavedThemeId,
  saveThemeId,
  getThemeDisplayNameColor,
  parseHex,
  rgbToHex,
  lerpColor,
} from '../src/core/themes.js';
import { COMMAND_REGISTRY } from '../src/core/commands.js';
import { parseKeyActions } from '../src/core/keys.js';

console.log('Testing Themes system with original tokens...');

// 1. Theme registry verification
assert.strictEqual(DEFAULT_THEME_ID, 'red-eclipse');
assert.strictEqual(THEMES.length, 10);

const expectedThemes = [
  'red-eclipse',
  'dusk-circuit',
  'cyberpunk',
  'neon-tokyo',
  'arctic-gold',
  'aurora-mint',
  'royal-sunset',
  'ghost-protocol',
  'rose-signature',
  'deep-space',
];

for (const id of expectedThemes) {
  const t = getTheme(id);
  assert.ok(t, `Theme ${id} should exist`);
  assert.strictEqual(t.id, id);
  assert.ok(t.name, `Theme ${id} has a name`);
  assert.ok(t.logo, `Theme ${id} has logo`);
  assert.ok(t.logoGlow, `Theme ${id} has logoGlow`);
  assert.ok(t.tagline, `Theme ${id} has tagline`);
  assert.ok(t.rainColors && t.rainColors.length > 0, `Theme ${id} has original multi-color rainColors`);
}

// Check Deep Space tokens specifically
const ds = getTheme('deep-space');
assert.strictEqual(ds.name, 'Deep Space');
assert.strictEqual(ds.logo.toLowerCase(), '#7c9cff');
assert.strictEqual(ds.logoShadow?.toLowerCase(), '#2a2f6b');
assert.strictEqual(ds.tagline.toLowerCase(), '#ffcf5c');
assert.strictEqual(ds.logoGlow.toLowerCase(), '#f4f6ff');
assert.deepStrictEqual(
  ds.rainColors?.map(c => c.toLowerCase()),
  ['#7c9cff', '#2a2f6b', '#ffcf5c']
);

// Check Red Eclipse tokens specifically
const re = getTheme('red-eclipse');
assert.strictEqual(re.name, 'Red Eclipse');
assert.strictEqual(re.logo.toLowerCase(), '#f2f2f2');
assert.strictEqual(re.logoShadow?.toLowerCase(), '#c1121f');
assert.strictEqual(re.tagline.toLowerCase(), '#ff3b47');
assert.strictEqual(re.logoGlow.toLowerCase(), '#ffffff');
assert.strictEqual(re.cursor.toLowerCase(), '#ffffff');
assert.deepStrictEqual(
  re.rainColors?.map(c => c.toLowerCase()),
  ['#f2f2f2', '#c1121f', '#ff3b47']
);

// Check Ghost Protocol tokens specifically
const gp = getTheme('ghost-protocol');
assert.strictEqual(gp.name, 'Ghost Protocol');
assert.strictEqual(gp.logo.toLowerCase(), '#8fa3b8');
assert.strictEqual(gp.logoGlow.toLowerCase(), '#e8f1fa');
assert.strictEqual(gp.logoShadow?.toLowerCase(), '#2f3d4f');
assert.strictEqual(gp.logoDeep?.toLowerCase(), '#1b2531');
assert.strictEqual(gp.tagline.toLowerCase(), '#5eead4');
assert.strictEqual(gp.cursor.toLowerCase(), '#e8f1fa');
assert.deepStrictEqual(
  gp.rainColors?.map(c => c.toLowerCase()),
  ['#8fa3b8', '#2f3d4f', '#5eead4']
);

// Check Cyberpunk original colors specifically
const cp = getTheme('cyberpunk');
assert.strictEqual(cp.logo.toUpperCase(), '#FFE600');
assert.strictEqual(cp.logoGlow.toUpperCase(), '#FF007F');
assert.strictEqual(cp.logoShadow?.toUpperCase(), '#0066FF');
assert.strictEqual(cp.tagline.toUpperCase(), '#0066FF');
assert.deepStrictEqual(
  cp.rainColors?.map(c => c.toUpperCase()),
  ['#FFE600', '#FF007F', '#0066FF']
);

// 2. getTheme lookup and fallback
assert.strictEqual(getTheme('NEON-TOKYO').id, 'neon-tokyo');
assert.strictEqual(getTheme('Neon Tokyo').id, 'neon-tokyo');
assert.strictEqual(getTheme('unknown-theme-xyz').id, 'red-eclipse');

// 3. getThemeDisplayNameColor
const normalTheme = getTheme('neon-tokyo');
assert.strictEqual(getThemeDisplayNameColor(normalTheme), normalTheme.logo);

// 4. Persistence
const testThemeId = 'neon-tokyo';
saveThemeId(testThemeId);
assert.strictEqual(loadSavedThemeId(), testThemeId);

// Corrupt config fallback test
const configPath = path.join(os.homedir(), '.neoloop', 'config.json');
fs.writeFileSync(configPath, '{ not json }');
assert.strictEqual(loadSavedThemeId(), DEFAULT_THEME_ID);

// Restore valid theme
saveThemeId('red-eclipse');
assert.strictEqual(loadSavedThemeId(), 'red-eclipse');

console.log('Testing Slash Commands Registry...');
assert.strictEqual(COMMAND_REGISTRY.length, 4);
const cmdNames = COMMAND_REGISTRY.map(c => c.name);
assert.deepStrictEqual(cmdNames, ['/theme', '/help', '/clear', '/exit']);

console.log('Testing Key Sequence Tokenizer...');

// Bare Esc
assert.deepStrictEqual(parseKeyActions(Buffer.from('\x1b')), [{ type: 'esc' }]);

// Arrows
assert.deepStrictEqual(parseKeyActions('\x1b[A'), [{ type: 'up' }]);
assert.deepStrictEqual(parseKeyActions('\x1bOA'), [{ type: 'up' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[B'), [{ type: 'down' }]);
assert.deepStrictEqual(parseKeyActions('\x1bOB'), [{ type: 'down' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[C'), [{ type: 'right' }]);
assert.deepStrictEqual(parseKeyActions('\x1bOC'), [{ type: 'right' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[D'), [{ type: 'left' }]);
assert.deepStrictEqual(parseKeyActions('\x1bOD'), [{ type: 'left' }]);

// Home / End
assert.deepStrictEqual(parseKeyActions('\x1b[H'), [{ type: 'home' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[1~'), [{ type: 'home' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[F'), [{ type: 'end' }]);
assert.deepStrictEqual(parseKeyActions('\x1b[4~'), [{ type: 'end' }]);

// Delete, Backspace, Tab, Enter, Ctrl-C
assert.deepStrictEqual(parseKeyActions('\x1b[3~'), [{ type: 'delete' }]);
assert.deepStrictEqual(parseKeyActions('\x7f'), [{ type: 'backspace' }]);
assert.deepStrictEqual(parseKeyActions('\x08'), [{ type: 'backspace' }]);
assert.deepStrictEqual(parseKeyActions('\t'), [{ type: 'tab' }]);
assert.deepStrictEqual(parseKeyActions('\r'), [{ type: 'enter' }]);
assert.deepStrictEqual(parseKeyActions('\n'), [{ type: 'enter' }]);
assert.deepStrictEqual(parseKeyActions('\r\n'), [{ type: 'enter' }]);
assert.deepStrictEqual(parseKeyActions('\x03'), [{ type: 'ctrl-c' }]);

// Multiple keys in single buffer
const multiKeys = parseKeyActions('\x1b[A\x1b[B\x1b\r');
assert.deepStrictEqual(multiKeys, [
  { type: 'up' },
  { type: 'down' },
  { type: 'esc' },
  { type: 'enter' },
]);

// Character typing
const chars = parseKeyActions('hello');
assert.deepStrictEqual(chars, [
  { type: 'char', char: 'h' },
  { type: 'char', char: 'e' },
  { type: 'char', char: 'l' },
  { type: 'char', char: 'l' },
  { type: 'char', char: 'o' },
]);

// Bracketed paste
const bp = parseKeyActions('\x1b[200~function foo() {\n  return 1;\n}\x1b[201~');
assert.deepStrictEqual(bp, [
  { type: 'paste', text: 'function foo() {   return 1; }' },
]);

// Unbracketed multi-line paste (should not trigger enter!)
const rawPaste = parseKeyActions('first line\r\nsecond line\nthird line');
assert.deepStrictEqual(rawPaste, [
  { type: 'paste', text: 'first line second line third line' },
]);

console.log('All tests passed successfully with original theme colors!');
