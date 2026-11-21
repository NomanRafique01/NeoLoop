import { TerminalSession } from '../harness.js';
import { OracleContext, Oracles } from '../oracles.js';
import { createFakeData } from '../fakeData.js';

export async function runAli(session: TerminalSession, ctx: OracleContext, seed: number) {
  const fake = createFakeData(seed);
  await session.waitForText('> ', 6000);
  await session.settle(100);

  // 1. Single line bracketed paste
  session.send('\x1b[200~const singleLinePaste = true;\x1b[201~');
  await session.settle(100);
  session.send('\r');
  await session.settle(100);

  // 2. 50 lines paste with CRLF
  const lines50 = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}: ${fake.shellCommand()}`).join('\r\n');
  session.send(`\x1b[200~${lines50}\x1b[201~`);
  await session.settle(200);
  session.send('\r');
  await session.settle(150);

  // 3. 10,000 characters payload
  const hugeText = fake.longLine(10000, true);
  session.send(`\x1b[200~${hugeText}\x1b[201~`);
  await session.settle(300);
  session.send('\x1b'); // Esc to clear input line
  await session.settle(100);

  // 4. Raw unbracketed paste with newlines and tabs
  const unbracketed = 'git status\r\necho "Hello from tab\tindented"\r\n';
  session.send(unbracketed);
  await session.settle(150);

  Oracles.assertAlive(session, ctx, 'ali', seed);
}
