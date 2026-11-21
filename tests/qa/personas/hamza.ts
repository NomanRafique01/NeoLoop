import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runHamza(session: TerminalSession, ctx: OracleContext, seed: number) {
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // 15+ chars per second bursts
  const sentences = [
    'refactor src/core/splash.ts to optimize memory footprint\r',
    'git commit -am "chore: polish theme token transitions"\r',
    'grep -E "function\\s+[a-zA-Z0-9_]+" src/**/*.ts\r',
  ];

  for (const sentence of sentences) {
    const lat = await session.measureLatency(() => {
      session.send(sentence);
    }, 'processing', 2000);
    if (lat > 0) {
      Oracles.assertPerformance(lat, session.getFps(), ctx, 'hamza', seed);
    }
    await session.settle(80);
  }

  Oracles.assertAlive(session, ctx, 'hamza', seed);
}
