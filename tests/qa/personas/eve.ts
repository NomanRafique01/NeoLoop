import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runEve(session: TerminalSession, ctx: OracleContext, seed: number) {
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // 1. Lone ESC
  session.send('\x1b');
  await session.settle(50);

  // 2. Split escape sequences across chunks
  session.send('\x1b[');
  await session.settle(30);
  session.send('1;5');
  await session.settle(30);
  session.send('A'); // Ctrl+Up completed
  await session.settle(50);

  // 3. Focus reporting events \x1b[I (focus in), \x1b[O (focus out)
  session.send('\x1b[I');
  await session.sendBurst(['\x1b', '[', 'O'], 10);
  await session.settle(50);

  // 4. Injected mouse drag events and garbage
  session.send('\x1b[<32;10;5M\x1b[<32;12;5M');
  await session.settle(50);

  // 5. Injected null bytes and control chars
  session.send('\x00\x07\x08\x0b\x0c');
  await session.settle(50);

  // 6. Unknown CSI sequences
  session.send('\x1b[999;888z');
  await session.settle(50);

  // Clear line and verify screen
  session.send('\x1b');
  await session.settle(100);

  const screen = session.screen();
  Oracles.assertNoAnsiLeakage(screen, ctx, 'eve', seed);
  Oracles.assertAlive(session, ctx, 'eve', seed);
}
