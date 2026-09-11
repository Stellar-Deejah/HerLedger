# Issue #1: [Smart Contracts & Cryptography] Implement Zero-Knowledge Selective Disclosure Range Proofs for Financial Reputation

**Labels**: `GrantFox OSS`, `smart-contracts`, `cryptography`, `privacy`, `soroban`

---

## 1. Technical Problem Statement
HerLedger anchors commercial financial history onto the Stellar blockchain through Soroban smart contracts (`BusinessRegistry`, `FinancialLedger`). While on-chain immutability guarantees data integrity, public transaction visibility creates a fundamental commercial confidentiality conflict:
- A business entity cannot provide raw transaction histories to lenders or evaluators without leaking proprietary operational intelligence: counterparty addresses, wholesale unit costs, gross margins, supplier dependency ratios, and granular cash flow velocities.
- To enable third-party auditability and underwriting without compromising enterprise privacy, the protocol requires a **Zero-Knowledge (ZK) Selective Disclosure Verification Primitive** running over Soroban.

---

## 2. Technical Specification & Architecture

### A. Cryptographic Circuit & Prover Constraints
The circuit must prove the following relations over private commitments without disclosing the witness:
1. **Cumulative Revenue Range Proof**:
   $$\sum_{i=1}^{N} v_i \ge T_{\text{revenue}} \quad \text{where } v_i \in \mathbb{F}_p \text{ is the settled volume of valid event } i$$
   Enforces that the aggregate settled value over block range $[L_{\text{start}}, L_{\text{end}}]$ exceeds threshold $T_{\text{revenue}}$ without revealing any individual $v_i$ or $N$.
2. **Dispute Rate Threshold Constraint**:
   $$\frac{\sum d_i}{N} < R_{\text{dispute\_max}} \quad \text{where } d_i \in \{0, 1\}$$
   Enforces that the ratio of disputed events to total events remains strictly below $R_{\text{dispute\_max}}$ without identifying which specific transactions were flagged.
3. **Commitment Binding to On-Chain Merkle Root**:
   The input events must be proven to be leaves of the Merkle tree committed by `FinancialLedger` on Stellar.

### B. Soroban Smart Contract Verification Module
- Implement a verification entrypoint `verify_reputation_proof(proof: Bytes, public_inputs: Vec<Bytes>) -> bool` within `herledger-contract/contracts/financial_ledger`.
- Utilize cryptographic curve operations supported in Soroban environment host functions (e.g. BN254 / BLS12-381 or Ed25519 bulletproof range checks) to evaluate the proof within Soroban CPU/memory budget limits.

### C. Client Prover Engine (`packages/sdk`)
- Implement a client-side prover module in `@herledger/sdk/zk` capable of synthesizing the witness from indexed local records, computing the proof in WebAssembly, and formatting the public inputs for contract submission.

---

## 3. Implementation Tasks & Deliverables
- [ ] **Circuit Definition**: Formalize circuit constraints using Noir (`.nr`) or Circom (`.circom`) with Groth16 / Plonk proving schemes.
- [ ] **Soroban Host Function Integration**: Implement the on-chain verifier contract in Rust using Soroban SDK host primitives, adhering to gas and execution limits.
- [ ] **TypeScript SDK Prover Pipeline**:
  - `generateReputationWitness(events: FinancialEvent[]): Witness`
  - `proveFinancialThresholds(witness: Witness, publicInputs: ProofParameters): Promise<ZKProofPayload>`
  - `verifyProofLocally(proof: ZKProofPayload): boolean`
- [ ] **Automated Test Suite**:
  - Positive tests: Valid proofs verify cleanly.
  - Negative tests: Proofs with fabricated revenue, tampered public inputs, or out-of-bounds timestamps revert.
  - Performance benchmarks: Proof size $< 1.5 \text{ KB}$, Soroban verification CPU cycles within standard transaction gas limits.
