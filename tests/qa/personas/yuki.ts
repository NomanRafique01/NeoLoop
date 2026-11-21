import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runYuki(session: TerminalSession, ctx: OracleContext, seed: number) {
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // 1. Send wide command
  session.send('wide\r');
  await session.settle(300);

  // 2. Typing wide characters in input bar
  const wideInput = 'こんにちは世界 🤖 🚀 测试 العربية\r';
  await session.sendSlowly(wideInput, 40);
  await session.settle(200);

  // 3. Check for raw unparsed escapes or broken screen
  const screen = session.screen();
  Oracles.assertNoAnsiLeakage(screen, ctx, 'yuki', seed);

  Oracles.assertAlive(session, ctx, 'yuki', seed);
}
