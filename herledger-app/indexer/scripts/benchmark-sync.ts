// ---------------------------------------------------------------------------
// Sync throughput benchmark: sequential vs bounded-concurrency wallet
// processing.
//
// Self-contained — no database or Horizon required. Each wallet simulates a
// fixed RPC round-trip latency (100ms, a realistic Horizon/RPC lower bound),
// and the benchmark measures the time to "process" 50 wallets sequentially
// versus with `SYNC_CONCURRENCY` (default 5) in parallel.
//
// Run: pnpm --filter indexer benchmark
// ---------------------------------------------------------------------------

import pLimit from "p-limit";

const WALLET_COUNT = 50;
const SIMULATED_RPC_LATENCY_MS = 100;
const CONCURRENCY = Number(process.env["SYNC_CONCURRENCY"] ?? 5);

async function processWallet(_wallet: string): Promise<void> {
  // Simulate a Horizon fetch + DB upsert round-trip.
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_RPC_LATENCY_MS));
}

async function measure(label: string, fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await fn();
  const elapsed = performance.now() - start;
  console.log(`${label}: ${elapsed.toFixed(0)}ms`);
  return elapsed;
}

async function main(): Promise<void> {
  const wallets = Array.from({ length: WALLET_COUNT }, (_, i) => `GWALLET${i + 1}`);

  // Sequential baseline.
  const sequential = await measure("sequential (concurrency=1)", async () => {
    for (const wallet of wallets) {
      await processWallet(wallet);
    }
  });

  // Bounded concurrency.
  const concurrent = await measure(`concurrent (concurrency=${CONCURRENCY})`, async () => {
    const limit = pLimit(CONCURRENCY);
    await Promise.all(wallets.map((wallet) => limit(() => processWallet(wallet))));
  });

  const speedup = sequential / concurrent;
  console.log(`speedup: ${speedup.toFixed(1)}x`);
}

void main();
