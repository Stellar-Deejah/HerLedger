# Security

## Scope

HerLedger is an MVP application. It has **not been audited**. Do not use in
production for real financial data without a professional security review.

## Key security properties

- **No private key storage**: The application never requests, stores, or
  transmits Stellar private keys. All transaction signing is performed by
  the user's Freighter wallet extension.

- **No secret key logging**: Application logs never contain private keys,
  session secrets, authentication tokens, or full sensitive request bodies.

- **Server-side secrets**: `DATABASE_URL` and `BETTER_AUTH_SECRET` are
  never exposed to browser code. Only `NEXT_PUBLIC_*` values are client-accessible.

- **Input validation**: All API inputs are validated with Zod. No user-provided
  data bypasses validation.

- **Database integrity**: Blockchain-derived fields (transaction hash, amount,
  sender, recipient) are immutable after indexing. They cannot be modified
  through normal API requests.

- **Authentication separation**: Application authentication (Better Auth) is
  separate from wallet connection (Freighter). Wallet connection alone does not
  grant application access.

- **Wallet address trust**: Typed wallet addresses are not trusted as proof
  of ownership. On-chain authorization via Soroban contract calls enforces
  actual ownership.

- **Secure session cookies**: Application sessions use secure HTTP-only cookies.

- **No SQL injection**: All database access uses Prisma's parameterized queries.

## Stellar transaction visibility

Stellar transactions are publicly visible on the blockchain. HerLedger does
not claim otherwise. The application minimizes additional personal information
stored on-chain by committing only cryptographic hashes.

## Reporting vulnerabilities

If you discover a security vulnerability, please do not open a public issue.
Contact the maintainers privately at the email listed in the repository.

Provide:

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested remediation

We will acknowledge receipt within 48 hours and aim to address critical
vulnerabilities within 14 days.

## Known limitations

- No production security audit has been performed.
- No penetration testing has been conducted.
- Smart contract security relies on the `herledger-contract` audit status.
- This application handles financial history records — treat as financial
  infrastructure and conduct appropriate due diligence before real-value
  deployment.
