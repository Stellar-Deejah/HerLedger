# Issue #5: [DeFi Smart Contracts & Credit Infrastructure] Decentralized Microfinance (MFI) Loan Origination Protocol Adapter & Liquidity Bridge

**Labels**: `GrantFox OSS`, `smart-contracts`, `defi`, `soroban`, `financial-inclusion`

---

## 1. Technical Problem Statement
HerLedger enables unbanked and underserved women-owned businesses to accumulate an auditable financial track record on Stellar. However, reputation data alone does not disburse capital. There is currently no programmatic bridge between HerLedger's verified on-chain history and decentralized micro-lending liquidity.
- Microfinance institutions (MFIs) and community liquidity providers must manually review off-chain dashboards to evaluate underwriting risk, adding substantial operational overhead and delay.
- The protocol requires an on-chain **Loan Origination & Liquidity Escrow Contract** on Soroban that algorithmically evaluates HerLedger reputation metrics to authorize, disburse, and collect working-capital micro-loans autonomously.

---

## 2. Technical Specification & Architecture

### A. Soroban Credit Assessment & Liquidity Contract (`LoanPool`)
Deploy a dedicated Soroban contract `contracts/loan_pool` with the following core interface:
```rust
pub trait LoanPoolTrait {
    /// Deposits liquidity (e.g. USDC) into the lending pool.
    fn deposit_liquidity(env: Env, lender: Address, asset: Address, amount: i128) -> Result<(), Error>;

    /// Evaluates borrowing capacity and requests a working-capital loan.
    fn request_loan(env: Env, business_id: Symbol, requested_amount: i128, term_ledgers: u32) -> Result<u64, Error>;

    /// Repays active loan tranche in supported stablecoin asset.
    fn repay_loan(env: Env, loan_id: u64, amount: i128) -> Result<(), Error>;

    /// Liquidates or defaults an expired loan past grace period.
    fn process_default(env: Env, loan_id: u64) -> Result<(), Error>;
}
```

### B. On-Chain Underwriting Criteria (Risk Engine)
The contract directly queries `FinancialLedger` and `BusinessRegistry` cross-contract host calls to verify borrower eligibility:
1. **Active Registration Status**: The borrower’s address must map to an active, verified business in `BusinessRegistry`.
2. **Minimum Verified Volume**: The business must possess at least $M$ verified settlement events in the preceding $K$ ledgers.
3. **Dispute Invariant**: The borrower must have zero unresolved disputes in `FinancialLedger`. If an open dispute is raised while a loan is active, borrowing capacity is instantly frozen.
4. **Loan-to-Volume Constraint**:
   $$\text{Maximum Borrowing Cap} \le \alpha \times \text{Average 90-Day Settled Volume} \quad (\text{where } \alpha \in [0.15, 0.35])$$

### C. Repayment Lifecycle & Closed-Loop Credit Scoring
- Repayments are executed through the Stellar token client (`token::Client`).
- Upon successful full repayment, the contract automatically invokes `FinancialLedger::record_event` with event type `CommitmentFulfilled`.
- This creates an automated, immutable credit-building feedback loop directly on the Stellar blockchain.

---

## 3. Implementation Tasks & Deliverables
- [ ] **Soroban Lending Contract**: Implement `contracts/loan_pool/` in Rust with reentrancy guards, integer overflow checks, and cross-contract calls.
- [ ] **SDK Underwriting Client**: Add `@herledger/sdk` lending methods:
  - `calculateBorrowingCapacity(businessId: string): Promise<bigint>`
  - `requestWorkingCapitalLoan(amount: bigint, term: number): Promise<TransactionResult>`
  - `repayLoanTranche(loanId: number, amount: bigint): Promise<TransactionResult>`
- [ ] **Web DApp Portal**: Implement an interactive "Working Capital & Credit" dashboard tab in `apps/web/app/dashboard/credit/`.
- [ ] **Formal Verification & Test Suite**:
  - Test cross-contract authorization checks.
  - Verify borrowing limits strictly respect historical transaction constraints.
  - Validate state progression: `Requested → Disbursed → InRepayment → Fulfilled`.
  - Simulate delinquent loans and grace period expiration.
