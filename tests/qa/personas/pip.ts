import { launch } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';

export async function runPip(ctx: OracleContext, seed: number) {
  // Test running neoloop.tsx directly under NO_COLOR=1 (Ink NonTTY fallback)
  const session = launch({
    file: process.execPath,
    args: ['--import', 'tsx', 'neoloop.tsx', '--no-splash'],
    cols: 80,
    rows: 24,
    env: { NO_COLOR: '1' },
  });

  try {
    await session.settle(1500);
    // Submit a command via stdin
    session.send('test non-tty submission\r');
    await session.settle(500);

    // Exit cleanly with Ctrl-C
    session.send('\x03');
    await session.settle(300);

    const raw = session.rawOutput();
    // In non-splash mode, alternate screen buffer must never be entered
    if (raw.includes('\x1b[?1049h')) {
      ctx.reportBug({
        severity: 'S2',
        area: 'Non-TTY Fallback',
        title: 'Alternate screen buffer entered despite NO_COLOR / --no-splash',
        environment: 'NO_COLOR=1 / non-TTY',
        persona: 'pip',
        seed,
        steps: ['Run neoloop with --no-splash and NO_COLOR=1', 'Inspect escape sequences'],
        expected: 'Standard screen buffer used without alternate buffer sequence',
        actual: 'Alternate screen buffer escape code \\x1b[?1049h was emitted',
        evidence: raw.slice(0, 200),
        suspectedCause: 'neoloop.tsx SKIP_SPLASH condition bypassed',
        proposedFix: 'Ensure runSplash is not invoked when SKIP_SPLASH is true',
        risk: 'Low',
        regressionTest: 'test-nontty-fallback',
      });
    }
  } finally {
    await session.destroy();
  }
}
