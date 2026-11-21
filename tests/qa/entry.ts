/**
 * NeoLoop QA - Fake Agent Dispatcher Entrypoint
 *
 * Runs NeoLoop through the public runSplash API with a custom onCommand
 * handler that responds to pressure-test commands.
 */

import { runSplash } from '../../src/core/splash.js';
import { createFakeData } from './fakeData.js';

const seedArg = process.argv.find(a => a.startsWith('--seed='));
const seed = seedArg ? parseInt(seedArg.slice(7), 10) : 42;
const fake = createFakeData(seed);

async function handleTestCommand(cmd: string, log: (text: string) => void): Promise<void> {
  const parts = cmd.trim().split(/\s+/);
  const action = parts[0]?.toLowerCase();

  switch (action) {
    case 'stream': {
      // stream N [ms]
      const count = parseInt(parts[1] || '50', 10);
      const delayMs = parseInt(parts[2] || '10', 10);
      for (let i = 1; i <= count; i++) {
        log(`[stream ${i}/${count}] ${fake.filePath()} -> status 200 OK`);
        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
      break;
    }

    case 'firehose': {
      // firehose N: as fast as possible
      const count = parseInt(parts[1] || '1000', 10);
      for (let i = 1; i <= count; i++) {
        log(`[firehose ${i}/${count}] metric cpu=${fake.rng.int(10, 99)}% mem=${fake.rng.int(20, 80)}% item=${fake.rng.string(8)}`);
      }
      break;
    }

    case 'chunks': {
      // chunks N: split at random points
      const count = parseInt(parts[1] || '20', 10);
      for (let i = 1; i <= count; i++) {
        const full = `Chunk payload line ${i}: ${fake.shellCommand()} executed successfully.`;
        const splitIdx = fake.rng.int(1, full.length - 1);
        log(full.slice(0, splitIdx));
        log(full.slice(splitIdx));
      }
      break;
    }

    case 'wide': {
      // emoji, CJK, right-to-left, combining marks
      log('=== WIDE CHARACTER TEST ===');
      log(fake.multilingual());
      log('CJK: 快速的棕色狐狸跳过了懒惰的狗。');
      log('Arabic: النص العربي للاختبار والتأكد من الاتجاه');
      log('Emoji: 👩‍💻 👨‍👩‍👧‍👦 🚀 🔥 💎 🟢 🔴 ⚡');
      log('Combining: n\u0303 e\u0301 a\u0300 c\u0327');
      break;
    }

    case 'ansi': {
      // colored and styled output, cursor codes, carriage returns
      log('\x1b[32m✔ SUCCESS\x1b[0m: Test runner completed 42 tests in 12ms');
      log('\x1b[31m✖ FAILURE\x1b[0m: Connection refused on port 8080');
      log('\x1b[33m▲ WARNING\x1b[0m: Deprecated API usage in auth module');
      log('\x1b[36mℹ INFO\x1b[0m: \x1b[1mBold step\x1b[0m with \x1b[4mUnderline\x1b[0m');
      log('Progress: 100% completed\rProgress: 100% verified.');
      break;
    }

    case 'longline': {
      // longline N
      const len = parseInt(parts[1] || '500', 10);
      log(fake.longLine(len, true));
      log(fake.longLine(len, false)); // unbroken token
      break;
    }

    case 'huge': {
      // 1 MB single chunk
      const sizeKb = parseInt(parts[1] || '1024', 10);
      log(fake.hugeChunk(sizeKb));
      break;
    }

    case 'steps': {
      // simulated agent steps
      log('> Step 1/3: Reading configuration file');
      await new Promise(r => setTimeout(r, 40));
      log(fake.codeSnippet());
      log('> Step 2/3: Applying code transformation');
      await new Promise(r => setTimeout(r, 40));
      log(fake.ansiString());
      log('> Step 3/3: Running unit tests');
      await new Promise(r => setTimeout(r, 40));
      log('✔ All 12 unit tests passed.');
      break;
    }

    case 'burst': {
      // burst of multi-line logs
      for (let i = 0; i < 50; i++) {
        log(`Burst line ${i}: ${fake.email()} generated event ${fake.rng.string(10)}`);
      }
      break;
    }

    case 'error': {
      log('Simulating agent runtime error:');
      log(fake.stackTrace());
      throw new Error('Simulated internal agent exception inside onCommand');
    }

    default: {
      log(`[fake-agent] Echo: "${cmd}"`);
      break;
    }
  }
}

async function main() {
  await runSplash({
    title: 'NEOLOOP',
    tagline: 'THINK. CODE. EXECUTE.',
    hint: 'Type /help or any command',
    onCommand: handleTestCommand,
    initialLogs: [
      'NeoLoop QA Test Agent Initialized.',
      `Deterministic seed: ${seed}`,
    ],
  });
}

main().catch(err => {
  console.error('Fatal in QA entry:', err);
  process.exit(1);
});
