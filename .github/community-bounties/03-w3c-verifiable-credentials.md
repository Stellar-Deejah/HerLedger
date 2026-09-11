# Issue #3: [Decentralized Identity & Interoperability] Implement W3C Verifiable Credentials (VC v2.0) Engine and did:stellar Resolver

**Labels**: `GrantFox OSS`, `identity`, `standards`, `interoperability`, `sdk`

---

## 1. Technical Problem Statement
HerLedger currently models third-party attestations (`AttestationRegistry`) using internal Soroban contract structures and SHA-256 metadata digests. While cryptographically sound on-chain, external banking infrastructure, decentralized identity wallets (e.g. SpruceID, Trinsic, Polygon ID), and institutional micro-lenders cannot interpret proprietary Soroban event logs directly.
- The protocol needs to standardize business identities and attestations into the global **W3C Decentralized Identifiers (DIDs) v1.0** and **W3C Verifiable Credentials Data Model v2.0**.
- This enables HerLedger financial reputations to be recognized, parsed, and verified across sovereign identity registries and enterprise credit systems.

---

## 2. Technical Specification & Architecture

### A. DID Method Specification (`did:stellar`)
- Establish canonical DID identifier format:
  ```text
  did:stellar:<network_id>:<account_or_contract_address>
  ```
  Example: `did:stellar:testnet:GBZX4...` or `did:stellar:mainnet:CAAA...`
- Implement an autonomous DID Resolver complying with DIF (Decentralized Identity Foundation) resolver specifications:
  - Fetches on-chain state from `BusinessRegistry` and Stellar account master keys.
  - Constructs compliant W3C DID Document:
    ```json
    {
      "@context": ["https://www.w3.org/ns/did/v1"],
      "id": "did:stellar:testnet:GBZX4...",
      "verificationMethod": [{
        "id": "did:stellar:testnet:GBZX4...#keys-1",
        "type": "Ed25519VerificationKey2020",
        "controller": "did:stellar:testnet:GBZX4...",
        "publicKeyMultibase": "z6Mkm..."
      }],
      "authentication": ["did:stellar:testnet:GBZX4...#keys-1"]
    }
    ```

### B. W3C Verifiable Credential Schemas
Define canonical JSON-LD Contexts and JSON Schema definitions:
1. `HerLedgerBusinessRegistrationCredential`:
   - Attributes: `businessId`, `registrationLedger`, `status`, `metadataHash`.
2. `HerLedgerInvoiceSettlementCredential`:
   - Attributes: `stellarTxHash`, `settledAsset`, `settledAmount`, `counterpartyRole`, `settlementTimestamp`.
3. `HerLedgerTradeAttestationCredential`:
   - Issued by accredited attester DID; anchored to on-chain `AttestationRegistry` claim hash.

### C. Cryptographic Proof & Verification Layer
- Implement Linked Data Proof generation (`Ed25519Signature2020` and `JsonWebSignature2020`).
- Implement Verifiable Presentation (VP) synthesis:
  - Enables business owners to bundle multiple VCs into a single verifiable proof envelope.
  - Verifier validates cryptographic signatures against the issuer DID Document resolved directly from the Stellar ledger without trusting an intermediary API.

---

## 3. Implementation Tasks & Deliverables
- [ ] **DID Resolver Module**: Implement `did:stellar` resolver package in `packages/sdk/src/identity/did-resolver.ts`.
- [ ] **JSON-LD Schema Contexts**: Formalize JSON-LD schemas hosted in `packages/sdk/src/identity/schemas/`.
- [ ] **Credential Signer & Verifier**:
  - `issueVerifiableCredential(params: IssueCredentialParams): Promise<VerifiableCredential>`
  - `verifyCredential(vc: VerifiableCredential): Promise<VerificationResult>`
  - `createVerifiablePresentation(credentials: VerifiableCredential[], holderKey: Signer): Promise<VerifiablePresentation>`
- [ ] **REST Verification Endpoint**: Implement `POST /api/v1/credentials/verify` in `apps/web/app/api/` providing verification for non-Web3 institutions.
- [ ] **Automated Conformance Testing**: Run official W3C VC 2.0 test suites against generated credentials to ensure 100% standards compliance.
