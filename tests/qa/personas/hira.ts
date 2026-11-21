import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runHira(session: TerminalSession, ctx: OracleContext, seed: number) {
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // Rapidly submit 25,000 lines via firehose to trigger buffer cap eviction (cap = 20,000)
  session.send('firehose 25000\r');
  await session.settle(2000);

  // Assert process survived cap eviction
  Oracles.assertAlive(session, ctx, 'hira', seed);

  // Test scrolling after cap eviction
  session.send('\x1b[5~'); // PgUp
  await session.settle(100);
  session.send('\x1b[1;5H'); // Ctrl+Home (jump to top of retained buffer)
  await session.settle(150);

  session.send('\x1b[1;5F'); // Ctrl+End (jump back to tail)
  await session.settle(150);

  Oracles.assertAlive(session, ctx, 'hira', seed);
}
