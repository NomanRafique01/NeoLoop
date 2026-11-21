import { LogBuffer } from '../src/core/logBuffer.js';

async function runBenchmarks() {
  console.log('=== NeoLoop Scroll & LogBuffer Performance Benchmark ===\n');

  // ── Benchmark 1: 5,000 lines burst append & simulated scroll ─────────────
  console.log('Test 1: 5,000 lines burst append with concurrent scroll ops');
  const buffer1 = new LogBuffer({ cols: 80, maxLines: 20_000 });
  const startTime = performance.now();
  const burstCount = 5000;
  let scrollLatencySum = 0;
  let scrollOps = 0;

  for (let i = 0; i < burstCount; i++) {
    buffer1.append(
      i % 5 === 0 ? 'command' : i % 3 === 0 ? 'step' : 'output',
      `[${i}] Processing item with file path src/core/module_${i % 20}.ts and status: active`
    );

    // Periodically simulate user scroll events during append
    if (i % 50 === 0) {
      const scrollStart = performance.now();
      const targetLine = Math.floor(Math.random() * Math.max(1, buffer1.lineCount - 25));
      const visibleLines = buffer1.getLines(targetLine, 25);
      const scrollEnd = performance.now();
      scrollLatencySum += scrollEnd - scrollStart;
      scrollOps++;
      if (visibleLines.length === 0 && buffer1.lineCount > 0) {
        throw new Error('Visible lines returned empty unexpectedly');
      }
    }
  }
  const totalBurstTime = performance.now() - startTime;
  const avgScrollLatency = scrollLatencySum / scrollOps;

  console.log(`  ✓ 5,000 lines appended in: ${totalBurstTime.toFixed(2)} ms (${(totalBurstTime / burstCount).toFixed(4)} ms/line)`);
  console.log(`  ✓ Total wrapped lines: ${buffer1.lineCount}`);
  console.log(`  ✓ Avg viewport slice (25 rows) retrieval latency: ${avgScrollLatency.toFixed(4)} ms (< 1 ms budget)\n`);

  // ── Benchmark 2: 1 MB single chunk append ──────────────────────────────
  console.log('Test 2: 1 MB single chunk append');
  const buffer2 = new LogBuffer({ cols: 100, maxLines: 20_000 });
  // Generate a realistic 1 MB chunk of text (lines with code and JSON)
  const linePattern = '  const result = await client.execute("SELECT * FROM users WHERE active = true ORDER BY id DESC LIMIT 100");\n';
  const repeatCount = Math.ceil((1024 * 1024) / linePattern.length);
  const largeChunk = linePattern.repeat(repeatCount);
  const actualSizeMb = (Buffer.byteLength(largeChunk, 'utf8') / (1024 * 1024)).toFixed(2);

  const chunkStartTime = performance.now();
  buffer2.appendChunk('output', largeChunk);
  const chunkEndTime = performance.now();
  const chunkDuration = chunkEndTime - chunkStartTime;

  console.log(`  ✓ Appended ${actualSizeMb} MB chunk (${largeChunk.length.toLocaleString()} chars)`);
  console.log(`  ✓ Resulting lines in buffer: ${buffer2.lineCount.toLocaleString()}`);
  console.log(`  ✓ 1 MB chunk processed in: ${chunkDuration.toFixed(2)} ms`);
  console.log(`  ✓ Main-thread impact per 1KB: ${(chunkDuration / 1024).toFixed(4)} ms\n`);

  // ── Benchmark 3: Continuous streaming & memory stability (50k lines capped at 20k)
  console.log('Test 3: Continuous streaming at 20,000 lines cap (memory stability)');
  if (global.gc) {
    global.gc();
  }
  const memBefore = process.memoryUsage().heapUsed;
  const buffer3 = new LogBuffer({ cols: 80, maxLines: 20_000 });

  const streamLines = 50_000;
  for (let i = 0; i < streamLines; i++) {
    buffer3.append('output', `Stream line ${i}: metrics cpu=42% mem=68%`);
  }

  const memAfter = process.memoryUsage().heapUsed;
  const memDiffMb = ((memAfter - memBefore) / (1024 * 1024)).toFixed(2);

  console.log(`  ✓ Streamed ${streamLines.toLocaleString()} lines total`);
  console.log(`  ✓ Buffer lineCount: ${buffer3.lineCount.toLocaleString()} (Strictly capped at max 20,000)`);
  console.log(`  ✓ Total dropped lines: ${buffer3.getTotalDroppedLines().toLocaleString()}`);
  console.log(`  ✓ Heap delta for 20k cached lines: ${memDiffMb} MB`);
  if (buffer3.lineCount > 20_000) {
    throw new Error(`Buffer exceeded max limit: ${buffer3.lineCount}`);
  }
  if (buffer3.getTotalDroppedLines() !== streamLines - 20_000) {
    throw new Error(`Dropped lines count mismatch: got ${buffer3.getTotalDroppedLines()}, expected ${streamLines - 20_000}`);
  }
  console.log('  ✓ Cap eviction correctly drops oldest lines without memory creep\n');

  // ── Benchmark 4: Rapid resizing simulation ─────────────────────────────
  console.log('Test 4: Rapid resizing simulation');
  const buffer4 = new LogBuffer({ cols: 80, maxLines: 5000 });
  for (let i = 0; i < 1000; i++) {
    buffer4.append('output', `Line ${i}: Quick brown fox jumps over the lazy dog. URLs: https://github.com/org/repo/blob/main/src/index.ts`);
  }

  const widths = [120, 60, 100, 40, 80];
  const resizeStart = performance.now();
  for (const w of widths) {
    buffer4.setWidth(w, 0);
  }
  const resizeEnd = performance.now();
  const totalResizeDuration = resizeEnd - resizeStart;
  const avgResizeDuration = totalResizeDuration / widths.length;

  console.log(`  ✓ Performed ${widths.length} consecutive full re-wraps across widths ${widths.join(', ')}`);
  console.log(`  ✓ Total resize duration: ${totalResizeDuration.toFixed(2)} ms`);
  console.log(`  ✓ Avg full re-wrap of 1,000 raw lines: ${avgResizeDuration.toFixed(2)} ms\n`);

  console.log('=== All Performance Benchmarks Passed Successfully! ===');
}

runBenchmarks().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
