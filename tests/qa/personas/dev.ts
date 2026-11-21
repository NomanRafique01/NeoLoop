import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runDev(session: TerminalSession, ctx: OracleContext, seed: number) {
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // 1. Spams Enter on empty input
  for (let i = 0; i < 20; i++) {
    session.send('\r');
  }
  await session.settle(100);

  // 2. Submits commands while previous command is streaming
  session.send('stream 200 20\r');
  await session.settle(50);
  session.send('second command while busy\r');
  session.send('third command while busy\r');
  await session.settle(300);

  // 3. Ctrl-C with content in input (should copy/clear, not kill process)
  session.send('draft message before ctrl-c');
  await session.settle(50);
  session.send('\x03'); // Ctrl-C
  await session.settle(100);
  Oracles.assertAlive(session, ctx, 'dev', seed);

  // 4. Ctrl-C in theme picker
  session.send('/theme\r');
  await session.settle(100);
  session.send('\x03'); // Ctrl-C
  await session.settle(100);
  // Ctrl-C on empty input exits the app!
}
