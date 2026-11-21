import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runBilal(session: TerminalSession, ctx: OracleContext, seed: number) {
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // Populate output buffer with 100 lines
  session.send('stream 100 2\r');
  await session.settle(300);

  // Bilal mashes PgUp, PgDn, Ctrl+Up, Ctrl+Down, End, Wheel
  const scrollKeys = [
    '\x1b[5~',                  // PgUp
    '\x1b[5~',
    '\x1b[6~',                  // PgDn
    '\x1b[1;5A', '\x1b[1;5A',   // Ctrl+Up (acceleration)
    '\x1b[1;5A', '\x1b[1;5A',
    '\x1b[1;5B', '\x1b[1;5B',   // Ctrl+Down
    '\x1b[<64;40;15M',          // SGR Wheel Up
    '\x1b[<64;40;15M',
    '\x1b[<65;40;15M',          // SGR Wheel Down
    '\x1b[F',                   // End
  ];

  for (let cycle = 0; cycle < 5; cycle++) {
    await session.sendBurst(scrollKeys, 15);
    await session.settle(50);
  }

  // Mash during live firehose
  session.send('firehose 200\r');
  await session.sendBurst(scrollKeys, 10);
  await session.settle(300);

  Oracles.assertAlive(session, ctx, 'bilal', seed);
}
