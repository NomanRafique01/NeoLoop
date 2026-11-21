import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runZain(session: TerminalSession, ctx: OracleContext, seed: number) {
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // 1. Firehose 5,000 lines
  session.send('firehose 5000\r');

  // Concurrently scroll up and down
  for (let k = 0; k < 10; k++) {
    session.send('\x1b[5~'); // PgUp
    await session.settle(40);
  }

  for (let k = 0; k < 10; k++) {
    session.send('\x1b[6~'); // PgDn
    await session.settle(40);
  }

  // Settle until firehose is absorbed
  await session.settle(800);

  // 2. Huge chunk (512 KB)
  session.send('huge 512\r');
  await session.settle(800);

  Oracles.assertAlive(session, ctx, 'zain', seed);
}
