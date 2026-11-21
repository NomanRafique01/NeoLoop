import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runMina(session: TerminalSession, ctx: OracleContext, seed: number) {
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // 1. Open theme picker
  session.send('/theme\r');
  await session.settle(100);

  // 2. Hop between themes in picker 20 times with Up/Down
  for (let i = 0; i < 20; i++) {
    session.send(i % 2 === 0 ? '\x1b[B' : '\x1b[A'); // Down / Up
    await session.settle(30);
  }

  // Enter to confirm selected theme
  session.send('\r');
  await session.settle(100);

  // 3. Switch themes quickly while streaming
  session.send('stream 200 10\r');
  await session.settle(100);

  const themeCommands = [
    '/theme cyberpunk\r',
    '/theme dusk-circuit\r',
    '/theme neon-tokyo\r',
    '/theme arctic-gold\r',
    '/theme red-eclipse\r',
  ];

  for (const cmd of themeCommands) {
    session.send(cmd);
    await session.settle(100);
  }

  await session.settle(500);
  Oracles.assertAlive(session, ctx, 'mina', seed);
}
