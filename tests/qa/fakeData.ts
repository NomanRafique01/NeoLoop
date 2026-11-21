/**
 * NeoLoop QA - Seeded Fake Data Generator
 *
 * Deterministic generation of realistic and abusive terminal payloads.
 */

export class PRNG {
  private s: number;

  constructor(seed: number = 42) {
    this.s = seed >>> 0;
  }

  /**
   * Mulberry32 32-bit generator
   */
  public next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  public pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)]!;
  }

  public string(length: number, chars: string = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars[this.int(0, chars.length - 1)]!;
    }
    return res;
  }
}

export function createFakeData(seed: number = 42) {
  const rng = new PRNG(seed);

  const FIRST_NAMES = ['Sara', 'Hamza', 'Ali', 'Noor', 'Ayesha', 'Bilal', 'Zain', 'Mina', 'Omar', 'Yuki', 'Dev', 'Hira'];
  const LAST_NAMES = ['Khan', 'Ahmed', 'Tanaka', 'Patel', 'Siddiqui', 'Malik', 'Rehman', 'Sato', 'Chen', 'Devi'];
  const EXTENSIONS = ['ts', 'tsx', 'js', 'json', 'py', 'go', 'rs', 'md', 'yaml'];
  const SHELL_COMMANDS = [
    'npm run build',
    'git status',
    'git diff --stat HEAD~1',
    'docker ps -a',
    'cargo check',
    'pytest tests/test_core.py',
    'grep -rn "TODO" src/',
    'kubectl get pods -n production',
    'curl -i https://api.neoloop.dev/health',
  ];

  return {
    rng,
    name: () => `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    email: () => `${rng.string(6)}@example.com`,
    filePath: () => `src/${rng.pick(['core', 'ui', 'theme', 'agent', 'utils'])}/${rng.string(8)}.${rng.pick(EXTENSIONS)}`,
    shellCommand: () => rng.pick(SHELL_COMMANDS),
    
    codeSnippet: () => {
      const fn = rng.string(6);
      return [
        `export async function ${fn}(id: string, opts: Record<string, unknown>) {`,
        `  const start = performance.now();`,
        `  const record = await db.find({ id, active: true });`,
        `  if (!record) throw new Error(\`Record \${id} not found\`);`,
        `  return { data: record, latency: performance.now() - start };`,
        `}`,
      ].join('\n');
    },

    stackTrace: () => [
      `Error: ConnectionRefusedError: connect ECONNREFUSED 127.0.0.1:${rng.int(3000, 9999)}`,
      `    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1607:16)`,
      `    at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)`,
      `    at Object.runSplash (C:\\projects\\neoloop\\src\\core\\splash.ts:${rng.int(100, 2000)}:24)`,
      `    at processTicksAndRejections (node:internal/process/task_queues:95:5)`,
    ].join('\n'),

    json: () => JSON.stringify({
      id: rng.string(12),
      status: rng.pick(['success', 'pending', 'failed']),
      records: Array.from({ length: rng.int(2, 5) }, () => ({
        key: rng.string(5),
        value: rng.int(10, 1000),
      })),
      timestamp: Date.now(),
    }, null, 2),

    multilingual: () => {
      const cjk = 'NeoLoop 中文测试 日本語のテスト 한국어 시험 ';
      const rtl = 'العربية اختبار اردو ٹیسٹ ';
      const emoji = '🚀 ✨ 💻 🔥 ⚡ 🎯 🛡️ 🎨 🤖 ';
      const combining = 'e\u0301 a\u0300 c\u0327 n\u0303 ';
      return `${cjk}${rtl}${emoji}${combining}`;
    },

    ansiString: () => {
      const colors = ['\x1b[31m', '\x1b[32m', '\x1b[33m', '\x1b[34m', '\x1b[35m', '\x1b[36m'];
      return `${rng.pick(colors)}[PASS]\x1b[0m \x1b[1mBold Step\x1b[0m: ${rng.pick(colors)}result_${rng.string(4)}\x1b[0m`;
    },

    longLine: (length: number, withSpaces = true) => {
      if (!withSpaces) {
        return 'https://git.example.com/' + rng.string(length - 24);
      }
      let out = '';
      while (out.length < length) {
        out += rng.string(rng.int(4, 10)) + ' ';
      }
      return out.slice(0, length);
    },

    hugeChunk: (sizeKb: number = 1024) => {
      const linePattern = 'const dataChunk = { id: 42, event: "stream_log_metric", active: true, payload: "XYZ-1234567890" };\n';
      const repeatCount = Math.ceil((sizeKb * 1024) / linePattern.length);
      return linePattern.repeat(repeatCount);
    },

    binaryGarbage: (len: number = 100) => {
      const bytes: number[] = [];
      for (let i = 0; i < len; i++) {
        bytes.push(rng.int(0, 255));
      }
      return Buffer.from(bytes).toString('utf-8');
    },
  };
}
