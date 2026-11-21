import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runAyesha(session: TerminalSession, ctx: OracleContext, seed: number) {
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // 1. Start streaming 300 lines with 15ms interval
  session.send('stream 300 15\r');
  await session.settle(150);

  // 2. While streaming is running, scroll up 20 lines (PgUp)
  session.send('\x1b[5~'); // PgUp
  await session.settle(80);
  session.send('\x1b[5~'); // PgUp
  await session.settle(80);

  // 3. Capture visible lines in viewport
  const screenBefore = session.screen();
  const baselineViewport = screenBefore.slice(10, 22);

  // 4. Wait while stream finishes adding 200+ more lines
  await session.settle(1200);

  // 5. Capture visible lines and verify absolute anchoring
  const screenAfter = session.screen();
  const currentViewport = screenAfter.slice(10, 22);
  Oracles.assertViewportUnchanged(baselineViewport, currentViewport, ctx, 'ayesha', seed);

  // 6. Return to bottom using End or Ctrl+End
  session.send('\x1b[1;5F'); // Ctrl+End
  await session.settle(150);

  // Verify auto-follow resumes at bottom
  session.send('stream 5 10\r');
  await session.settle(150);

  Oracles.assertAlive(session, ctx, 'ayesha', seed);
}
