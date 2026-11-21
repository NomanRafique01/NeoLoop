import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';
import { createFakeData } from '../fakeData.js';

export async function runNoor(session: TerminalSession, ctx: OracleContext, seed: number) {
  const fake = createFakeData(seed);
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // Rapid mash of printable, arrows, Home/End, Delete, Esc, Tab, Ctrl combos
  const keyTokens = [
    'a', 'Z', '9', ' ', '#', '@',
    '\x1b[A', '\x1b[B', '\x1b[C', '\x1b[D', // Arrows
    '\x1b[H', '\x1b[F',                     // Home, End
    '\x1b[3~', '\x7f',                      // Delete, Backspace
    '\x09',                                 // Tab
    '\x1b',                                 // Esc
    '\x01',                                 // Ctrl+A
    '\x16',                                 // Ctrl+V
    '\x1b[1;5A', '\x1b[1;5B',               // Ctrl+Up, Ctrl+Down
    '\x1bOP', '\x1bOQ',                     // F1, F2
  ];

  for (let round = 0; round < 6; round++) {
    const burst: string[] = [];
    for (let k = 0; k < 40; k++) {
      burst.push(fake.rng.pick(keyTokens));
    }
    await session.sendBurst(burst, 5);
    await session.settle(50);
  }

  // Clear any leftover input with Esc
  session.send('\x1b');
  await session.settle(50);

  Oracles.assertAlive(session, ctx, 'noor', seed);
}
