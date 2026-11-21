import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runSara(session: TerminalSession, ctx: OracleContext, seed: number) {
  // Wait for initial boot and input readiness
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // Slow typing with typos
  await session.sendSlowly('helo', 50);
  await session.settle(50);
  await session.sendBurst(['\x7f', '\x7f', 'l', 'l', 'o', ' '], 40);
  await session.sendSlowly('wrold', 50);
  await session.sendBurst(['\x7f', '\x7f', '\x7f', '\x7f', 'o', 'r', 'l', 'd', '\r'], 50);
  await session.settle(150);

  // Empty Enter spams
  await session.sendBurst(['\r', '\r', '\r'], 60);
  await session.settle(100);

  // Unknown command
  await session.sendSlowly('not_a_real_command\r', 40);
  await session.settle(150);

  // Slash menu experiments
  await session.send('/');
  await session.settle(100);
  await session.waitForText('/theme', 2000); // Check slash menu
  await session.sendBurst(['\x1b[B', '\x1b[B', '\x1b[A'], 50); // Down, Down, Up
  await session.send('\x1b'); // Esc to cancel
  await session.settle(100);

  Oracles.assertAlive(session, ctx, 'sara', seed);
}
