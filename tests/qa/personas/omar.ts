import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runOmar(session: TerminalSession, ctx: OracleContext, seed: number) {
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // 1. Resizes while idle
  const dimensions = [
    [100, 26],
    [70, 22],
    [140, 35],
    [50, 15],
    [120, 30],
  ];

  for (const [cols, rows] of dimensions) {
    session.resize(cols!, rows!);
    await session.settle(80);
  }

  // 2. Resizes while typing
  session.sendSlowly('testing input during window resizing...', 30);
  session.resize(80, 24);
  await session.settle(50);
  session.resize(110, 28);
  await session.settle(50);
  session.send('\x1b'); // clear line
  await session.settle(50);

  // 3. Resizes during streaming and scrolled-up reading
  session.send('stream 150 10\r');
  await session.settle(100);
  session.send('\x1b[5~'); // scroll up
  await session.settle(50);

  session.resize(90, 25);
  await session.settle(60);
  session.resize(120, 30);
  await session.settle(500);

  // 4. Extreme resize: tiny 20x8 fallback
  session.resize(20, 8);
  await session.settle(100);
  const tinyScreen = session.screen().join('\n');
  if (!tinyScreen.includes('Terminal too small') && !tinyScreen.includes('NEOLOOP')) {
    // Check fallback behavior
  }
  // Restore
  session.resize(120, 30);
  await session.settle(150);

  Oracles.assertAlive(session, ctx, 'omar', seed);
}
