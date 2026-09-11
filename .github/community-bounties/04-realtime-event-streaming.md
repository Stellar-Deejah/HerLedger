# Issue #4: [Distributed Systems & Indexing] Real-Time WebSocket/SSE Event Pipeline with Automated Ledger Gap Backfilling & Reorg Resilience

**Labels**: `GrantFox OSS`, `distributed-systems`, `indexing`, `fastify`, `performance`

---

## 1. Technical Problem Statement
The current HerLedger indexer operates via periodic polling intervals over Horizon and Soroban RPC. While functional under baseline network conditions, polling introduces latency (up to 15 seconds), creates redundant HTTP query pressure on Stellar RPC endpoints, and lacks real-time push streaming to connected frontend clients.
- If the indexer daemon disconnects, crashes, or encounters Stellar RPC rate limits, sequence gap detection is coarse, leading to out-of-order event ingestion.
- The system requires a **Reactive Event Pipeline** with real-time push delivery (Server-Sent Events / WebSocket), deterministic ledger gap backfilling, and automated blockchain reorganization (fork) resolution.

---

## 2. Technical Specification & Architecture

### A. Reactive Streaming Layer (`herledger-app/indexer`)
- Implement a Server-Sent Events (SSE) and WebSocket gateway inside Fastify:
  - Route: `GET /api/v1/events/stream` with channel subscription parameters (`businessId`, `asset`, `status`).
  - Supports `Last-Event-ID` header resume protocol for transient network drops without data loss.
  - Heartbeat ping/pong intervals (15s) with automated backpressure handling for slow clients.

### B. Deterministic Gap Detection & Auto-Backfill Engine
- Maintain a monotonic ledger sequence tracker:
  $$\text{Expected Next Ledger} = L_{\text{checkpoint}} + 1$$
- If an incoming RPC stream or polling cycle reports ledger $L_{\text{incoming}} > L_{\text{checkpoint}} + 1$:
  - The engine immediately pauses the consumer cursor.
  - Spawns an asynchronous parallel range worker pool to fetch missing ledgers $[L_{\text{checkpoint}} + 1, L_{\text{incoming}} - 1]$.
  - Processes and persists the missing range in strict sequence within a single PostgreSQL transactional boundary (`prisma.$transaction`).
  - Resumes the live ingestion stream once the sequence gap is closed.

### C. Ledger Reorg & Fork Resolution Protocol
- While Stellar consensus provides deterministic finality, RPC nodes and Horizon endpoints occasionally experience local cache rollbacks or short-lived state re-anchors during node failover.
- Maintain an on-chain ledger hash chain in PostgreSQL (`ledger_checkpoints` table containing `ledger_sequence` and `ledger_hash`).
- If a fetched ledger hash does not match the parent hash of the subsequent ledger, trigger an automated rollback routine:
  - Mark affected unconfirmed records as `REORG_PENDING`.
  - Re-query consensus state from three independent Soroban RPC nodes (`STELLAR_RPC_URLS` round-robin).
  - Re-insert confirmed state and emit an SSE state invalidation message to connected web clients.

---

## 3. Implementation Tasks & Deliverables
- [ ] **Fastify SSE Gateway**: Implement event broker in `indexer/src/api/stream.ts` with connection pooling and broadcast channels.
- [ ] **Gap Detector Service**: Implement `SequenceGapDetector` in `indexer/src/index/gap-detector.ts`.
- [ ] **Parallel Range Fetcher**: Worker pool utilizing `Promise.all` with concurrency throttles (max 5 concurrent RPC fetches).
- [ ] **Frontend Reactive Hook**: Update `apps/web/hooks/use-event-stream.ts` to seamlessly subscribe to the SSE stream and optimistically update React state.
- [ ] **Prometheus Observability**:
  - `sse_active_clients_gauge`: Live connected streaming clients.
  - `ledger_gap_events_total`: Total detected sequence gaps.
  - `ledger_backfill_duration_seconds`: Histogram of backfill execution latency.
- [ ] **Resilience Test Suite**: Chaos integration tests simulating dropped connections, artificial sequence gaps, and invalid parent ledger hashes.
