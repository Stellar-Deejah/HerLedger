// ---------------------------------------------------------------------------
// In-memory per-cycle sync metrics. Reset at the start of each sync cycle;
// read by the /indexer/status route to report the latest cycle's counts.
// ---------------------------------------------------------------------------

export interface SyncCycleMetrics {
  indexed: number;
  failed: number;
  skipped: number;
  deadLettered: number;
  cycleStartedAt: string | null;
  cycleFinishedAt: string | null;
}

let current: SyncCycleMetrics = {
  indexed: 0,
  failed: 0,
  skipped: 0,
  deadLettered: 0,
  cycleStartedAt: null,
  cycleFinishedAt: null,
};

export function resetCycleMetrics(): void {
  current = {
    indexed: 0,
    failed: 0,
    skipped: 0,
    deadLettered: 0,
    cycleStartedAt: new Date().toISOString(),
    cycleFinishedAt: null,
  };
}

export function recordIndexed(): void {
  current.indexed += 1;
}

export function recordFailed(): void {
  current.failed += 1;
}

export function recordSkipped(): void {
  current.skipped += 1;
}

export function recordDeadLettered(): void {
  current.deadLettered += 1;
}

export function finishCycleMetrics(): void {
  current.cycleFinishedAt = new Date().toISOString();
}

export function getCycleMetrics(): SyncCycleMetrics {
  return { ...current };
}
