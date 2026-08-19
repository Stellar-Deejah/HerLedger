<<<<<<< HEAD

# HerLedger ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Application Layer

HerLedger is a financial-history platform for women-owned businesses built on
the Stellar blockchain. It records recognized Stellar transactions and verified
attestations so a business can build a portable, auditable financial history ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
without storing unnecessary private information on-chain.

> **HerLedger does not** issue loans, calculate credit scores, make lending
> decisions, or claim that Stellar transactions are private.

---

## Table of Contents

1. [What HerLedger Does](#what-herledger-does)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [Tech Stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Local Setup](#local-setup)
7. [Environment Variables](#environment-variables)
8. [Database](#database)
9. [Running Locally](#running-locally)
10. [Building](#building)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Contract Integration](#contract-integration)
14. [SDK Reference](#sdk-reference)
15. [Indexer Reference](#indexer-reference)
16. [API Reference](#api-reference)
17. [Onboarding Flow](#onboarding-flow)
18. [Financial Event Classification](#financial-event-classification)
19. [Dispute Flow](#dispute-flow)
20. [Privacy Model](#privacy-model)
21. [Security](#security)
22. [Contributing](#contributing)

---

## What HerLedger Does

| Feature               | Description                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Business registration | Register a woman-owned business on-chain via the BusinessRegistry Soroban contract                            |
| Wallet association    | Link a Stellar wallet address to a business identity                                                          |
| Financial activity    | Detect and index supported Stellar payment transactions                                                       |
| Event verification    | Track Pending ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Verified ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Disputed ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Revoked lifecycle |
| Attestations          | Display third-party claims linked to financial events                                                         |
| Dispute flow          | Allow a business owner to challenge an incorrect record on-chain                                              |
| Privacy               | Keep private metadata off-chain; commit only cryptographic hashes                                             |

**Not supported:** loans, credit scores, lending decisions, unsupported asset classification, private Stellar transactions.

---

## Architecture

```
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€™ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡                        User                              ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‹Å“
           ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡                          ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
           ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â¼                          ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â¼
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€™ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€™ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  Next.js 16 Web  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   Freighter Wallet   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  (App Router)    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   (browser ext.)     ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡                  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‹Å“
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  Better Auth     ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡                  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡ signs txns
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  (app sessions)  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡                  ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â¼
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡                  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€™ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  Server Actions  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  Stellar Network     ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  API Routes      ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  Soroban Contracts   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‹Å“       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‹Å“
       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡ reads                        ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â²
       ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â¼                              ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡ observes
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€™ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€™ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  Indexer API     ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡ÃƒÂ¢Ã¢â‚¬â€Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  Indexer Process     ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  (Fastify)       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  (ledger sync job)   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‹Å“       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‹Å“
       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
       ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â¼
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€™ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   PostgreSQL     ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   (derived       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡    index only)   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‹Å“
```

### Key principles

- **User wallets sign everything.** The app never holds or uses private keys.
- **The indexer observes.** It does not initiate contract writes.
- **The database is an index.** Stellar is the source of truth.
- **Blockchain-derived records are immutable** after indexing (no silent rewrites).
- **Application auth is separate from wallet auth.** Signing in ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â  wallet connected.

---

## Repository Structure

```
HerLedger/
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ herledger-contract/          Soroban smart contracts (Rust)
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ contracts/
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ business_registry/
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ financial_ledger/
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ attestation_registry/
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ target/wasm32v1-none/release/   Built WASM artifacts
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ herledger-app/               Application layer (this directory)
    ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ apps/
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ web/                 Next.js 16 frontend
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ app/
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ (marketing)/ Public landing page
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ dashboard/   Authenticated dashboard
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ auth/        Sign in / sign up
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ api/         API route handlers
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ components/      React components
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ ui/          Design system primitives
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ wallet/      Freighter integration
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ business/    Business profile & registration
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ activity/    Financial activity display
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ attestations/Attestation display
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ disputes/    Dispute submission
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ navigation/  App shell navigation
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ settings/    Account & privacy settings
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ lib/
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ auth/        Better Auth client & server
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ stellar/     Network configuration helpers
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ utils/       Formatting utilities
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ middleware.ts     Route protection
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ next.config.ts
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
    ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ packages/
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ config/              Typed environment validation (Zod)
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ sdk/                 Stellar/Soroban TypeScript SDK
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ src/
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡           ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ contracts/   Contract clients + XDR encoding
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡           ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ rpc/         Soroban RPC client factory
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡           ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ wallet/      Freighter adapter
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡           ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ types/       Shared TypeScript types
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡           ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ errors/      Typed error classes
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
    ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ indexer/                 Transaction indexer + HTTP API
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ src/
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ api/             Fastify routes
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ config/          Env config
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ db/              Prisma client + repositories
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ index/           Indexing business logic
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ jobs/            Sync job (ledger polling)
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ stellar/         Horizon + RPC helpers
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡       ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ types/           Indexer-specific types
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
    ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ prisma/
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ schema.prisma        Database schema
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ migrations/          Applied migrations
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
    ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ scripts/
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ dev.sh               Start all services
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ test.sh              Run test suite
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ generate-client.sh   Regenerate Prisma client
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡
    ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ .env.example             Required environment variables
    ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ pnpm-workspace.yaml      Monorepo workspace config
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ README.md                This file
```

---

## Tech Stack

| Layer              | Technology             | Version               |
| ------------------ | ---------------------- | --------------------- |
| Runtime            | Node.js                | ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥20.9.0 |
| Package manager    | pnpm                   | 9+                    |
| Frontend framework | Next.js                | 16.3.1                |
| UI library         | React                  | 19.2.8                |
| Language           | TypeScript             | 7.0.2                 |
| Stellar SDK        | @stellar/stellar-sdk   | 16.2.0                |
| Wallet             | @stellar/freighter-api | 6.0.1                 |
| Validation         | Zod                    | 4.4.3                 |
| Authentication     | Better Auth            | 1.6.28                |
| Database           | PostgreSQL             | 16+                   |
| ORM                | Prisma                 | 7.9.1                 |
| API server         | Fastify                | 5.12.0                |
| Testing            | Vitest                 | 4.1.10                |
| E2E testing        | Playwright             | 1.51.1                |

---

## Prerequisites

### Node.js

```sh
# Check version
node --version   # requires >=20.9.0
```

Install via [nvm](https://github.com/nvm-sh/nvm) or the [official installer](https://nodejs.org).

### pnpm

```sh
npm install -g pnpm@9
```

### PostgreSQL 16+

```sh
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16
```

### Stellar CLI (for contract deployment only)

```sh
cargo install --locked stellar-cli@26.1.0
```

> The Stellar CLI is only needed when deploying contracts. It is **not** required for running the application layer.

### Rust + wasm32v1-none (for contract development only)

```sh
rustup target add wasm32v1-none
```

---

## Local Setup

### 1. Clone and enter the repo

```sh
git clone https://github.com/Stellar-Deejah/HerLedger.git
cd HerLedger/herledger-app
```

### 2. Install dependencies

```sh
pnpm install
```

### 3. Configure environment

```sh
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` and fill in all values. See [Environment Variables](#environment-variables) for details.

### 4. Create the database

```sh
createdb herledger_dev
```

### 5. Generate Prisma client and run migrations

```sh
pnpm db:generate
pnpm db:migrate:dev
```

### 6. Start development

```sh
bash scripts/dev.sh
```

Or run each service separately:

```sh
# Terminal 1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â web app
pnpm --filter web dev

# Terminal 2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â indexer
pnpm --filter indexer dev
```

- Web: http://localhost:3000
- Indexer API: http://localhost:4000

---

## Environment Variables

All required variables are documented in `.env.example`.

```env
# ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Application ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
NODE_ENV=development
APP_URL=http://localhost:3000

# ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Database ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
DATABASE_URL=postgresql://user:password@localhost:5432/herledger_dev

# ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Authentication ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
# Generate with: openssl rand -hex 32
BETTER_AUTH_SECRET=

# ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Stellar (server-side) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Contract IDs (populate after deployment) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
BUSINESS_REGISTRY_CONTRACT_ID=
FINANCIAL_LEDGER_CONTRACT_ID=
ATTESTATION_REGISTRY_CONTRACT_ID=

# ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Indexer ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
INDEXER_API_URL=http://localhost:4000

# ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Browser-safe (NEXT_PUBLIC_*) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID=
NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID=
NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID=
```

### Variable rules

- `DATABASE_URL` and `BETTER_AUTH_SECRET` are **server-only**. Never prefix them with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_*` variables are safe for browser exposure.
- The application fails at startup with a descriptive error if required variables are missing.
- Contract IDs are populated after deploying `herledger-contract`. **Never invent values.**

---

## Database

### Schema overview

| Model                | Purpose                                 |
| -------------------- | --------------------------------------- |
| `User`               | Application user account (Better Auth)  |
| `Session`            | Auth session (Better Auth)              |
| `Account`            | OAuth/password account (Better Auth)    |
| `Verification`       | Email verification tokens (Better Auth) |
| `BusinessProfile`    | Registered business linked to a user    |
| `FinancialEvent`     | Indexed on-chain financial events       |
| `Attestation`        | Third-party attestations on events      |
| `StellarTransaction` | Raw Stellar transaction records         |
| `IndexerCheckpoint`  | Ledger sync progress per stream         |

### Key database rules

- `amount` is stored as `String` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â never cast to `Number`.
- Blockchain-derived fields (`stellarReference`, `amount`, `assetAddress`) are **immutable** after first insert.
- Only `status` is updated by the indexer after initial indexing.
- UUIDs / cuid for application IDs; hex strings for on-chain IDs.

### Commands

```sh
# Generate Prisma client after schema changes
pnpm db:generate

# Create a new migration (dev only)
pnpm db:migrate:dev

# Apply migrations (production / CI)
pnpm db:migrate
```

---

## Running Locally

```sh
# All services
bash scripts/dev.sh

# Web only
pnpm --filter web dev

# Indexer only
pnpm --filter indexer dev

# Type check everything
pnpm typecheck

# Format check
pnpm format

# Format write
pnpm format:write
```

---

## Building

```sh
# Full monorepo build (packages first, then web)
pnpm build

# Web app only
pnpm --filter web build

# Indexer only
pnpm --filter indexer build
```

---

## Testing

```sh
# All unit/integration tests
pnpm test

# SDK tests only
pnpm --filter @herledger/sdk test

# Indexer tests only
pnpm --filter indexer test

# Web tests only
pnpm --filter web test

# E2E tests (requires running app)
pnpm test:e2e
```

Tests use **Vitest** for unit/integration and **Playwright** for E2E.
E2E tests must not depend on Mainnet ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â use Testnet or mocks.

---

## Deployment

> **Indexer data quality:** the indexer runs a nightly reconciliation job (RECONCILIATION_CRON_SCHEDULE, default   2 \* \* \*) that samples indexed events (RECONCILIATION_SAMPLE_SIZE, default 50) and cross-checks them against on-chain state, logging any discrepancies. Events that fail to index are written to a dead-letter table instead of being lost, and can be retried via `POST /v1/admin/replay/:errorId` (requires the `x-admin-token` header to match `ADMIN_API_TOKEN` -- set this to a strong secret in production, since the endpoint is admin-only and fails closed if the token is unset). Per-cycle sync counts (indexed/failed/skipped/deadLettered) are available at `GET /indexer/status`.

> **Statement timeout:** the indexer connects to Postgres with a statement_timeout (default 10s) appended to DATABASE_URL at runtime, configurable via DB_STATEMENT_TIMEOUT_MS. This kills a slow or locked query instead of holding its connection (and pool slot) indefinitely. Timed-out queries are logged as errors -- see indexer/src/db/client.ts.

### Frontend ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Vercel (or equivalent)

| Setting        | Value                     |
| -------------- | ------------------------- |
| Root directory | `herledger-app/apps/web`  |
| Build command  | `pnpm --filter web build` |
| Start command  | `pnpm --filter web start` |
| Node version   | 20.x or 22.x              |

Set all environment variables in the Vercel dashboard.

- Never expose `DATABASE_URL` or `BETTER_AUTH_SECRET` as `NEXT_PUBLIC_*`.
- All NEXT*PUBLIC*`*` variables must also be set.

> **Network/passphrase consistency:** `STELLAR_NETWORK`, `STELLAR_RPC_URL`, and `STELLAR_NETWORK_PASSPHRASE` (and their `NEXT_PUBLIC_*` equivalents) must all agree. A `mainnet` network with a `testnet` passphrase, or an RPC URL pointing at the wrong network, will fail startup validation (`validateNetworkConsistency` in `@herledger/config`) with a descriptive error. Double-check all three values together whenever switching networks -- a mismatch here is a real-money risk on mainnet.

Run Prisma migrations before deploying:

```sh
pnpm db:migrate
```

### Indexer ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Render (or equivalent long-running service)

| Setting        | Value                         |
| -------------- | ----------------------------- |
| Root directory | `herledger-app/indexer`       |
| Build command  | `pnpm --filter indexer build` |
| Start command  | `pnpm --filter indexer start` |

The indexer requires access to `DATABASE_URL` and all Stellar environment variables.
It does **not** need `BETTER_AUTH_SECRET` or any `NEXT_PUBLIC_*` variables.

### Database ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â PostgreSQL

- Provision PostgreSQL 16 in the same region as the indexer.
- Use an internal/private connection string between indexer and database.
- Do not expose PostgreSQL directly to the public internet.
- Always run `pnpm db:migrate` before starting a new deployment.

---

## Contract Integration

The application layer communicates with three Soroban contracts deployed on Stellar:

| Contract              | Responsibility                                                |
| --------------------- | ------------------------------------------------------------- |
| `BusinessRegistry`    | Business registration, ownership, wallet association          |
| `FinancialLedger`     | Financial event recording, verification, disputes, revocation |
| `AttestationRegistry` | Attester management and attestation lifecycle                 |

### After deploying contracts

1. Copy the deployed contract IDs from the Stellar CLI output.
2. Set in `apps/web/.env.local` (and production environment):
   ```
   BUSINESS_REGISTRY_CONTRACT_ID=C...
   FINANCIAL_LEDGER_CONTRACT_ID=C...
   ATTESTATION_REGISTRY_CONTRACT_ID=C...
   NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID=C...
   NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID=C...
   NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID=C...
   ```
3. Restart the indexer and web app.

The application will throw a descriptive startup error if contract IDs are missing.

> **Do not invent contract IDs.** The application cannot be considered fully
> integrated until all three contracts are deployed and real IDs are configured.

---

## Contract ABI Management

HerLedger's SDK (`packages/sdk`) hand-writes TypeScript clients
(`contracts/business-registry.ts`, `financial-ledger.ts`,
`attestation-registry.ts`) that construct XDR-encoded calls against the
deployed Soroban contracts. Nothing prevents those hand-written clients from
drifting out of sync with what a contract actually expects Ã¢â‚¬â€ a redeployed
contract with a renamed field or reordered parameter would previously fail
silently or with an inscrutable RPC error, discovered only at runtime. Two
mechanisms close that gap:

### 1. `ContractAddress` Ã¢â‚¬â€ compile-time contract-address safety

Contract addresses are no longer plain `string`. `ContractConfig` requires
the branded `ContractAddress` type (`packages/sdk/src/types/branded.ts`),
which can only be produced by validating a raw address against the
`CONTRACT_ADDRESSES` registry (`packages/sdk/src/contracts/registry.ts`):

```typescript
import { registerCurrentNetworkAddresses, buildContractConfig } from "@herledger/sdk";
import { getServerEnv } from "@herledger/config";

const env = getServerEnv();

const network = env.STELLAR_NETWORK; // "testnet" | "mainnet"

const registry = registerCurrentNetworkAddresses(network, {
  businessRegistryId: env.BUSINESS_REGISTRY_CONTRACT_ID,
  financialLedgerId: env.FINANCIAL_LEDGER_CONTRACT_ID,
  attestationRegistryId: env.ATTESTATION_REGISTRY_CONTRACT_ID,
});

const contracts = buildContractConfig(registry, network, {
  businessRegistryId: env.BUSINESS_REGISTRY_CONTRACT_ID,
  financialLedgerId: env.FINANCIAL_LEDGER_CONTRACT_ID,
  attestationRegistryId: env.ATTESTATION_REGISTRY_CONTRACT_ID,
});

// contracts is now a validated ContractConfig Ã¢â‚¬â€ safe to pass to any SDK function.
```

`buildContractConfig` throws `ValidationError` immediately if an address is
malformed or doesn't match the registry Ã¢â‚¬â€ e.g. the `FinancialLedger` address
accidentally passed where `AttestationRegistry` was expected. Do this once at
your app's composition root (e.g. `apps/web/lib/stellar/network.ts`) and pass
the resulting `ContractConfig` through; don't construct one from raw strings
inline Ã¢â‚¬â€ the type system will refuse it.

### 2. Generated ABI types Ã¢â‚¬â€ catching upgrades at build time

`packages/sdk/src/contracts/__generated__/` contains TypeScript interfaces
generated directly from each contract's on-chain interface (via
`stellar contract inspect`), not from the hand-written clients. They're the
independent source of truth the hand-written clients are checked against.

```sh
# Regenerate after rebuilding contracts (requires herledger-contract WASM built):
cd herledger-app
pnpm --filter @herledger/sdk generate:abi

# CI-style check Ã¢â‚¬â€ fails if committed types are stale, doesn't write:
pnpm --filter @herledger/sdk generate:abi:check
```

CI runs `generate:abi:check` on every PR (job: `abi-check` in
`.github/workflows/ci.yml`). If a contract's interface changed Ã¢â‚¬â€ a renamed
method, a reordered parameter, a new required argument Ã¢â‚¬â€ the generated
output will differ from what's committed and the build fails with an
explicit diff, rather than the mismatch surfacing later as a runtime
encoding error.

**Handling a contract upgrade:**

1. Rebuild the contract (`herledger-contract/scripts/build.sh`).
2. Run `pnpm --filter @herledger/sdk generate:abi` and review the diff in
   `__generated__/`.
3. Cross-check the diff against the corresponding hand-written client in
   `contracts/`. Update the `.call()` arguments, types, and any encode/decode
   logic in `encoding.ts` to match.
4. Update `CONTRACT_ADDRESSES` (via your env/config) if the deployment
   address changed.
5. Commit both the regenerated `__generated__/` files and the hand-written
   client changes together Ã¢â‚¬â€ a PR that updates one without the other is
   exactly the drift this workflow exists to prevent.

This process itself surfaced two pre-existing bugs during development of
this feature: `FinancialLedger.dispute_event` and
`AttestationRegistry.create_attestation` were each missing a required
`Address` argument in the hand-written client. Both are fixed as part of
this same change.

### 3. Testnet smoke tests

`packages/sdk/src/contracts/__tests__/smoke.testnet.test.ts` calls one read
method per contract against the real deployed testnet contracts, guarded by
`TEST_AGAINST_TESTNET=true` so it never runs in normal `pnpm test`:

```sh
# Requires BUSINESS_REGISTRY_CONTRACT_ID, FINANCIAL_LEDGER_CONTRACT_ID,
# ATTESTATION_REGISTRY_CONTRACT_ID set to real testnet contract IDs.
pnpm --filter @herledger/sdk test:smoke
```

CI runs this nightly and on manual dispatch (job: `testnet-smoke`), using
`TESTNET_BUSINESS_REGISTRY_CONTRACT_ID` / `TESTNET_FINANCIAL_LEDGER_CONTRACT_ID`
/ `TESTNET_ATTESTATION_REGISTRY_CONTRACT_ID` repo secrets Ã¢â‚¬â€ configure these
under **Settings Ã¢â€ â€™ Secrets and variables Ã¢â€ â€™ Actions**. These are read-only
calls; no funded account or signing key is required.

===

## SDK Reference

`packages/sdk` is the single source of truth for all Stellar/Soroban client interactions.
React components must not construct contract calls directly.

### Constructing a ContractConfig

Every SDK contract function takes a `ContractConfig`, whose fields are the
branded `ContractAddress` type rather than raw `string` Ã¢â‚¬â€ see
[Contract ABI Management](#contract-abi-management) for why. Build one once
at startup:

```typescript
import { registerCurrentNetworkAddresses, buildContractConfig } from "@herledger/sdk";

const network = env.STELLAR_NETWORK; // "testnet" | "mainnet"

const registry = registerCurrentNetworkAddresses(network, {
  businessRegistryId: env.BUSINESS_REGISTRY_CONTRACT_ID,
  financialLedgerId: env.FINANCIAL_LEDGER_CONTRACT_ID,
  attestationRegistryId: env.ATTESTATION_REGISTRY_CONTRACT_ID,
});

const contracts = buildContractConfig(registry, network, {
  businessRegistryId: env.BUSINESS_REGISTRY_CONTRACT_ID,
  financialLedgerId: env.FINANCIAL_LEDGER_CONTRACT_ID,
  attestationRegistryId: env.ATTESTATION_REGISTRY_CONTRACT_ID,
});
```

In practice, don't call this inline at every use site Ã¢â‚¬â€ both `apps/web/lib/stellar/network.ts` (`getContractConfig()`, browser-safe) and `indexer/src/config/index.ts` (`getContractConfig()`, server-side) already do this once and export the result. Import from there rather than duplicating the registry construction in a component or route handler.

### BusinessRegistry

```typescript
import {
  getBusiness,
  getBusinessByWallet,
  registerBusiness,
  updateBusinessMetadata,
  deactivateBusiness,
} from "@herledger/sdk";

// Read a business by on-chain ID (hex)
const business = await getBusiness(businessId, stellarConfig, contractConfig);
// Returns: Business | null

// Read by wallet address
const business = await getBusinessByWallet(walletAddress, stellarConfig, contractConfig);

// Register ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â requires Freighter to be connected, returns tx hash
const result = await registerBusiness(
  { businessId, owner, wallet, metadataHash, sourceAccount },
  stellarConfig,
  contractConfig
);
// Returns: { hash: string, success: boolean, ledger?: number }
```

### FinancialLedger

```typescript
import {
  getFinancialEvent,
  getBusinessEvents,
  isSupportedAsset,
  recordFinancialEvent,
  disputeFinancialEvent,
  verifyFinancialEvent,
  resolveFinancialEvent,
  revokeFinancialEvent,
} from "@herledger/sdk";
```

### AttestationRegistry

```typescript
import {
  getAttestation,
  isValidAttestation,
  registerAttester,
  deactivateAttester,
  createAttestation,
  revokeAttestation,
} from "@herledger/sdk";
```

### Amount handling

```typescript
// Amounts are always bigint ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â never Number
const event: FinancialEvent = await getFinancialEvent(eventId, config, contracts);
console.log(event.amount); // bigint, e.g. 100_000_000n (= 10 XLM in stroops)

// Format at the display boundary only
import { formatAmount } from "@/lib/utils/format";
const display = formatAmount(event.amount); // "10.0000000"
```

### Error types

```typescript
import { WalletError, RpcError, ContractError, ValidationError } from "@herledger/sdk";

try {
  await registerBusiness(params, config, contracts);
} catch (err) {
  if (err instanceof WalletError) {
    // User rejected, extension unavailable, etc.
  } else if (err instanceof ContractError) {
    // Contract returned an error code
  } else if (err instanceof RpcError) {
    // Network/RPC issue
  }
}
```

---

## Indexer Reference

The indexer is a long-running Node.js process that:

1. Reads all registered HerLedger business wallets from the database.
2. Polls Horizon for new transactions on those wallets.
3. Classifies supported asset transfers as `PaymentReceived` or `PaymentSent`.
4. Inserts records idempotently (same transaction processed twice = no duplicate).
5. Persists a ledger checkpoint after each successful sync cycle.
6. Recovers from interruption by reading the checkpoint on restart.

### Ledger checkpoint

The indexer stores an `IndexerCheckpoint` record per `(stream, walletAddress)`.
The stream-global checkpoint is keyed by the `"global"` sentinel; each business
wallet additionally tracks its own last-processed ledger. On restart the
indexer resumes each wallet from its own checkpoint, and a wallet whose
checkpoint is already at the latest ledger is skipped without any Horizon call.

### Concurrency and multi-replica deployment

Wallets are processed with bounded in-process concurrency (`SYNC_CONCURRENCY`,
default 5). We use a small async pool (`p-limit`) rather than worker threads:
the sync bottleneck is the Horizon/RPC rate limit, not CPU, so worker threads
would add coordination cost without raising throughput.

To scale horizontally, run multiple indexer replicas against the same Postgres.
Each replica claims a wallet before processing it by atomically writing
`lockedBy` + `lockedUntil` to the wallet's `sync_jobs` row (a conditional
UPDATE guarded by the lease). A replica that loses the claim skips the wallet,
so two replicas never process the same wallet in the same sync window.

| Env var              | Default        | Purpose                                      |
| -------------------- | -------------- | -------------------------------------------- |
| `SYNC_CONCURRENCY`   | `5`            | Wallets processed concurrently per replica   |
| `SYNC_LEASE_MS`      | `60000`        | Wallet claim lease duration (ms)             |
| `INDEXER_INSTANCE_ID`| `indexer-<pid>`| Unique replica identifier                    |

### Idempotency

All database writes use `upsert` with the on-chain event ID as the unique key.
Processing the same transaction twice is safe ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the second pass is a no-op for
blockchain-derived fields, and only updates mutable status fields.

### Payment classification rules

| Rule                         | PaymentReceived           | PaymentSent               |
| ---------------------------- | ------------------------- | ------------------------- |
| Transaction succeeded        | ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ required | ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ required |
| Business wallet is recipient | ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“          | ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â         |
| Business wallet is sender    | ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â         | ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“          |
| Asset is supported           | ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ required | ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ required |

Failed transactions are **never** classified.
Unsupported assets are **never** classified.

---

## API Reference

The indexer exposes a read-only HTTP API on port 4000.

All responses follow:

```json
{ "data": { ... }, "error": null }
// or on failure:
{ "data": null, "error": { "code": "ERROR_CODE", "message": "Human message" } }
```

### Endpoints

| Method | Path                                   | Description                          |
| ------ | -------------------------------------- | ------------------------------------ |
| `GET`  | `/health`                              | Health check with DB connectivity    |
| `GET`  | `/businesses/:businessId`              | Get indexed business by on-chain ID  |
| `GET`  | `/businesses/:businessId/events`       | Paginated financial events (max 100) |
| `GET`  | `/businesses/:businessId/attestations` | All attestations for a business      |
| `GET`  | `/transactions/:hash`                  | Get a Stellar transaction by hash    |
| `GET`  | `/supported-assets`                    | Supported asset info                 |
| `GET`  | `/indexer/status`                      | Current sync checkpoint              |

### Pagination

```
GET /businesses/:id/events?offset=0&limit=20
```

- `offset`: integer ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥ 0, default 0
- `limit`: integer 1ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“100, default 20
- Response includes `pagination.count` for next-page detection

---

## Onboarding Flow

```
1. Sign up / sign in (Better Auth ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â email + password)
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
2. Connect Stellar wallet (Freighter browser extension)
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
3. Freighter confirms wallet ownership (no secret key transmitted)
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
4. Enter business name
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
5. App derives deterministic business ID from wallet + name + timestamp
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
6. App hashes private metadata (name committed as hash only)
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
7. App builds BusinessRegistry.register_business() transaction
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
8. Freighter prompts user to sign
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
9. App submits signed transaction to Stellar
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
10. App polls for confirmation (up to 60 seconds)
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
11. On-chain success ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ app saves BusinessProfile to database
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
12. Redirect to dashboard
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
13. Indexer begins detecting activity for the registered wallet
```

The business is **not** marked registered in the database until the on-chain
transaction is confirmed. If the transaction fails, the flow returns to step 7.

---

## Financial Event Classification

HerLedger only classifies events from **supported assets** in **successful transactions**.

### PaymentReceived

A Stellar payment operation where:

- the transaction succeeded
- the destination address matches a registered HerLedger business wallet
- the asset is in the supported asset list

### PaymentSent

A Stellar payment operation where:

- the transaction succeeded
- the source address matches a registered HerLedger business wallet
- the asset is in the supported asset list

### What is NOT classified

- Failed transactions (regardless of amount)
- Unsupported tokens
- Non-payment operations
- Transactions where neither sender nor recipient is a registered business

HerLedger does **not** claim that every incoming payment is revenue.

---

## Dispute Flow

A business owner can challenge an incorrect HerLedger record:

```
Dashboard ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Activity ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Select event ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Challenge record
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
Enter reason for dispute (kept off-chain; only hash committed)
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
App hashes the reason text
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
App builds FinancialLedger.dispute_event() transaction
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
Freighter prompts owner to sign
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
Transaction submitted and confirmed
        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Å“
Event status changes to Disputed on-chain and in the index
```

**The owner cannot:**

- Delete the financial event
- Edit the Stellar transaction reference
- Change the amount, sender, or recipient
- Directly mark the event Verified or Revoked

Dispute changes HerLedger application state, **not** Stellar history.
Revoked and disputed events remain visible in the UI ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â they are never hidden.

---

## Privacy Model

| Data                      | Storage                   | Visibility                                |
| ------------------------- | ------------------------- | ----------------------------------------- |
| Stellar transactions      | Stellar blockchain        | Public ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â anyone can query |
| Business ID               | On-chain (hash)           | Public                                    |
| Metadata hash             | On-chain (hash only)      | Public hash, private content              |
| Business name             | Off-chain database        | Private to the application                |
| Dispute reason            | Off-chain; hash on-chain  | Reason text is private                    |
| Claim/attestation content | Off-chain; hash on-chain  | Content is private                        |
| Auth session              | Server-side secure cookie | Private                                   |
| Stellar private key       | **Never stored anywhere** | N/A                                       |

The application does not claim Stellar wallet balances or transactions are private.
Blockchain data is public. HerLedger minimizes additional personal information
stored on-chain by committing only cryptographic hashes.

---

## Security

See [SECURITY.md](SECURITY.md) for the full security policy.

Key properties:

- **No private key storage.** The app never requests, stores, or logs Stellar private keys.
- **Freighter signs everything.** All contract writes are user-authorized via Freighter.
- **Server secrets never reach the browser.** `DATABASE_URL` and `BETTER_AUTH_SECRET` are never in `NEXT_PUBLIC_*`.
- **Input validation.** All API inputs validated with Zod. No `as any` bypasses.
- **Immutable blockchain records.** Stellar-derived fields cannot be changed by API requests.
- **Auth ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â  wallet.** Signing into HerLedger and connecting a Stellar wallet are independent steps.

> ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â **These contracts have not been audited.** Do not deploy with real financial data without a professional security review.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

```sh
# Before committing
pnpm typecheck
pnpm format
pnpm test

# Commit format (Conventional Commits)
feat(sdk): add business registry reads
fix(web): correct wallet disconnect state
chore(repo): update dependencies
test(indexer): cover payment classification
```

---

## License

# See [LICENSE](../herledger-contract/LICENSE).

# HerLedger Ã¢â‚¬â€ Application Layer

HerLedger is a financial-history platform for women-owned businesses built on
the Stellar blockchain. It records recognized Stellar transactions and verified
attestations so a business can build a portable, auditable financial history Ã¢â‚¬â€
without storing unnecessary private information on-chain.

> **HerLedger does not** issue loans, calculate credit scores, make lending
> decisions, or claim that Stellar transactions are private.

---

## Table of Contents

1. [What HerLedger Does](#what-herledger-does)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [Tech Stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Local Setup](#local-setup)
7. [Environment Variables](#environment-variables)
8. [Database](#database)
9. [Running Locally](#running-locally)
10. [Building](#building)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Contract Integration](#contract-integration)
14. [SDK Reference](#sdk-reference)
15. [Indexer Reference](#indexer-reference)
16. [API Reference](#api-reference)
17. [Onboarding Flow](#onboarding-flow)
18. [Financial Event Classification](#financial-event-classification)
19. [Dispute Flow](#dispute-flow)
20. [Privacy Model](#privacy-model)
21. [Security](#security)
22. [Contributing](#contributing)

---

## What HerLedger Does

| Feature               | Description                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| Business registration | Register a woman-owned business on-chain via the BusinessRegistry Soroban contract |
| Wallet association    | Link a Stellar wallet address to a business identity                               |
| Financial activity    | Detect and index supported Stellar payment transactions                            |
| Event verification    | Track Pending Ã¢â€ â€™ Verified Ã¢â€ â€™ Disputed Ã¢â€ â€™ Revoked lifecycle    |
| Attestations          | Display third-party claims linked to financial events                              |
| Dispute flow          | Allow a business owner to challenge an incorrect record on-chain                   |
| Privacy               | Keep private metadata off-chain; commit only cryptographic hashes                  |

**Not supported:** loans, credit scores, lending decisions, unsupported asset classification, private Stellar transactions.

---

## Architecture

```
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š                        User                              Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
           Ã¢â€â€š                          Ã¢â€â€š
           Ã¢â€“Â¼                          Ã¢â€“Â¼
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â       Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š  Next.js 16 Web  Ã¢â€â€š       Ã¢â€â€š   Freighter Wallet   Ã¢â€â€š
Ã¢â€â€š  (App Router)    Ã¢â€â€š       Ã¢â€â€š   (browser ext.)     Ã¢â€â€š
Ã¢â€â€š                  Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
Ã¢â€â€š  Better Auth     Ã¢â€â€š                  Ã¢â€â€š signs txns
Ã¢â€â€š  (app sessions)  Ã¢â€â€š                  Ã¢â€“Â¼
Ã¢â€â€š                  Ã¢â€â€š       Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š  Server Actions  Ã¢â€â€š       Ã¢â€â€š  Stellar Network     Ã¢â€â€š
Ã¢â€â€š  API Routes      Ã¢â€â€š       Ã¢â€â€š  Soroban Contracts   Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
       Ã¢â€â€š reads                        Ã¢â€“Â²
       Ã¢â€“Â¼                              Ã¢â€â€š observes
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â       Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š  Indexer API     Ã¢â€â€šÃ¢â€”â€žÃ¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â€š  Indexer Process     Ã¢â€â€š
Ã¢â€â€š  (Fastify)       Ã¢â€â€š       Ã¢â€â€š  (ledger sync job)   Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
       Ã¢â€â€š
       Ã¢â€“Â¼
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š   PostgreSQL     Ã¢â€â€š
Ã¢â€â€š   (derived       Ã¢â€â€š
Ã¢â€â€š    index only)   Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
```

### Key principles

- **User wallets sign everything.** The app never holds or uses private keys.
- **The indexer observes.** It does not initiate contract writes.
- **The database is an index.** Stellar is the source of truth.
- **Blockchain-derived records are immutable** after indexing (no silent rewrites).
- **Application auth is separate from wallet auth.** Signing in Ã¢â€°Â  wallet connected.

---

## Repository Structure

```
HerLedger/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ herledger-contract/          Soroban smart contracts (Rust)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ contracts/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ business_registry/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ financial_ledger/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ attestation_registry/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ target/wasm32v1-none/release/   Built WASM artifacts
Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ herledger-app/               Application layer (this directory)
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ apps/
    Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ web/                 Next.js 16 frontend
    Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ app/
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ (marketing)/ Public landing page
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ dashboard/   Authenticated dashboard
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ auth/        Sign in / sign up
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ api/         API route handlers
    Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ components/      React components
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ ui/          Design system primitives
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ wallet/      Freighter integration
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ business/    Business profile & registration
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ activity/    Financial activity display
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ attestations/Attestation display
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ disputes/    Dispute submission
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ navigation/  App shell navigation
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ settings/    Account & privacy settings
    Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ lib/
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ auth/        Better Auth client & server
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ stellar/     Network configuration helpers
    Ã¢â€â€š       Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ utils/       Formatting utilities
    Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ middleware.ts     Route protection
    Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ next.config.ts
    Ã¢â€â€š
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ packages/
    Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ config/              Typed environment validation (Zod)
    Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ sdk/                 Stellar/Soroban TypeScript SDK
    Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ src/
    Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ contracts/   Contract clients + XDR encoding
    Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ rpc/         Soroban RPC client factory
    Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ wallet/      Freighter adapter
    Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ types/       Shared TypeScript types
    Ã¢â€â€š           Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ errors/      Typed error classes
    Ã¢â€â€š
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ indexer/                 Transaction indexer + HTTP API
    Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ src/
    Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ api/             Fastify routes
    Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ config/          Env config
    Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ db/              Prisma client + repositories
    Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ index/           Indexing business logic
    Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ jobs/            Sync job (ledger polling)
    Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ stellar/         Horizon + RPC helpers
    Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ types/           Indexer-specific types
    Ã¢â€â€š
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ prisma/
    Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ schema.prisma        Database schema
    Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ migrations/          Applied migrations
    Ã¢â€â€š
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ scripts/
    Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ dev.sh               Start all services
    Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ test.sh              Run test suite
    Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ generate-client.sh   Regenerate Prisma client
    Ã¢â€â€š
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ .env.example             Required environment variables
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ pnpm-workspace.yaml      Monorepo workspace config
    Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ README.md                This file
```

---

## Tech Stack

| Layer              | Technology             | Version       |
| ------------------ | ---------------------- | ------------- |
| Runtime            | Node.js                | Ã¢â€°Â¥20.9.0 |
| Package manager    | pnpm                   | 9+            |
| Frontend framework | Next.js                | 16.3.1        |
| UI library         | React                  | 19.2.8        |
| Language           | TypeScript             | 7.0.2         |
| Stellar SDK        | @stellar/stellar-sdk   | 16.2.0        |
| Wallet             | @stellar/freighter-api | 6.0.1         |
| Validation         | Zod                    | 4.4.3         |
| Authentication     | Better Auth            | 1.6.28        |
| Database           | PostgreSQL             | 16+           |
| ORM                | Prisma                 | 7.9.1         |
| API server         | Fastify                | 5.12.0        |
| Testing            | Vitest                 | 4.1.10        |
| E2E testing        | Playwright             | 1.51.1        |

---

## Prerequisites

### Node.js

```sh
# Check version
node --version   # requires >=20.9.0
```

Install via [nvm](https://github.com/nvm-sh/nvm) or the [official installer](https://nodejs.org).

### pnpm

```sh
npm install -g pnpm@9
```

### PostgreSQL 16+

```sh
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16
```

### Stellar CLI (for contract deployment only)

```sh
cargo install --locked stellar-cli@26.1.0
```

> The Stellar CLI is only needed when deploying contracts. It is **not** required for running the application layer.

### Rust + wasm32v1-none (for contract development only)

```sh
rustup target add wasm32v1-none
```

---

## Local Setup

### 1. Clone and enter the repo

```sh
git clone https://github.com/Stellar-Deejah/HerLedger.git
cd HerLedger/herledger-app
```

### 2. Install dependencies

```sh
pnpm install
```

### 3. Configure environment

```sh
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` and fill in all values. See [Environment Variables](#environment-variables) for details.

### 4. Create the database

```sh
createdb herledger_dev
```

### 5. Generate Prisma client and run migrations

```sh
pnpm db:generate
pnpm db:migrate:dev
```

### 6. Start development

```sh
bash scripts/dev.sh
```

Or run each service separately:

```sh
# Terminal 1 Ã¢â‚¬â€ web app
pnpm --filter web dev

# Terminal 2 Ã¢â‚¬â€ indexer
pnpm --filter indexer dev
```

- Web: http://localhost:3000
- Indexer API: http://localhost:4000

---

## Environment Variables

All required variables are documented in `.env.example`.

```env
# Ã¢â€â‚¬Ã¢â€â‚¬ Application Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
NODE_ENV=development
APP_URL=http://localhost:3000

# Ã¢â€â‚¬Ã¢â€â‚¬ Database Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
DATABASE_URL=postgresql://user:password@localhost:5432/herledger_dev

# Ã¢â€â‚¬Ã¢â€â‚¬ Authentication Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
# Generate with: openssl rand -hex 32
BETTER_AUTH_SECRET=

# Ã¢â€â‚¬Ã¢â€â‚¬ Stellar (server-side) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Ã¢â€â‚¬Ã¢â€â‚¬ Contract IDs (populate after deployment) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
BUSINESS_REGISTRY_CONTRACT_ID=
FINANCIAL_LEDGER_CONTRACT_ID=
ATTESTATION_REGISTRY_CONTRACT_ID=

# Ã¢â€â‚¬Ã¢â€â‚¬ Indexer Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
INDEXER_API_URL=http://localhost:4000

# Ã¢â€â‚¬Ã¢â€â‚¬ Browser-safe (NEXT_PUBLIC_*) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID=
NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID=
NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID=
```

### Variable rules

- `DATABASE_URL` and `BETTER_AUTH_SECRET` are **server-only**. Never prefix them with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_*` variables are safe for browser exposure.
- The application fails at startup with a descriptive error if required variables are missing.
- Contract IDs are populated after deploying `herledger-contract`. **Never invent values.**

---

## Database

### Schema overview

| Model                | Purpose                                 |
| -------------------- | --------------------------------------- |
| `User`               | Application user account (Better Auth)  |
| `Session`            | Auth session (Better Auth)              |
| `Account`            | OAuth/password account (Better Auth)    |
| `Verification`       | Email verification tokens (Better Auth) |
| `BusinessProfile`    | Registered business linked to a user    |
| `FinancialEvent`     | Indexed on-chain financial events       |
| `Attestation`        | Third-party attestations on events      |
| `StellarTransaction` | Raw Stellar transaction records         |
| `IndexerCheckpoint`  | Ledger sync progress per stream         |

### Key database rules

- `amount` is stored as `String` Ã¢â‚¬â€ never cast to `Number`.
- Blockchain-derived fields (`stellarReference`, `amount`, `assetAddress`) are **immutable** after first insert.
- Only `status` is updated by the indexer after initial indexing.
- UUIDs / cuid for application IDs; hex strings for on-chain IDs.

### Commands

```sh
# Generate Prisma client after schema changes
pnpm db:generate

# Create a new migration (dev only)
pnpm db:migrate:dev

# Apply migrations (production / CI)
pnpm db:migrate
```

---

## Running Locally

```sh
# All services
bash scripts/dev.sh

# Web only
pnpm --filter web dev

# Indexer only
pnpm --filter indexer dev

# Type check everything
pnpm typecheck

# Format check
pnpm format

# Format write
pnpm format:write
```

---

## Building

```sh
# Full monorepo build (packages first, then web)
pnpm build

# Web app only
pnpm --filter web build

# Indexer only
pnpm --filter indexer build
```

---

## Testing

```sh
# All unit/integration tests
pnpm test

# SDK tests only
pnpm --filter @herledger/sdk test

# Indexer tests only
pnpm --filter indexer test

# Web tests only
pnpm --filter web test

# E2E tests (requires running app)
pnpm test:e2e
```

Tests use **Vitest** for unit/integration and **Playwright** for E2E.
E2E tests must not depend on Mainnet Ã¢â‚¬â€ use Testnet or mocks.

---

## Deployment

> **Statement timeout:** the indexer connects to Postgres with a statement_timeout (default 10s) appended to DATABASE_URL at runtime, configurable via DB_STATEMENT_TIMEOUT_MS. This kills a slow or locked query instead of holding its connection (and pool slot) indefinitely. Timed-out queries are logged as errors -- see indexer/src/db/client.ts.

### Frontend Ã¢â‚¬â€ Vercel (or equivalent)

| Setting        | Value                     |
| -------------- | ------------------------- |
| Root directory | `herledger-app/apps/web`  |
| Build command  | `pnpm --filter web build` |
| Start command  | `pnpm --filter web start` |
| Node version   | 20.x or 22.x              |

Set all environment variables in the Vercel dashboard.

- Never expose `DATABASE_URL` or `BETTER_AUTH_SECRET` as `NEXT_PUBLIC_*`.
- All NEXT*PUBLIC*`*` variables must also be set.

> **Network/passphrase consistency:** `STELLAR_NETWORK`, `STELLAR_RPC_URL`, and `STELLAR_NETWORK_PASSPHRASE` (and their `NEXT_PUBLIC_*` equivalents) must all agree. A `mainnet` network with a `testnet` passphrase, or an RPC URL pointing at the wrong network, will fail startup validation (`validateNetworkConsistency` in `@herledger/config`) with a descriptive error. Double-check all three values together whenever switching networks -- a mismatch here is a real-money risk on mainnet.

Run Prisma migrations before deploying:

```sh
pnpm db:migrate
```

### Indexer Ã¢â‚¬â€ Render (or equivalent long-running service)

| Setting        | Value                         |
| -------------- | ----------------------------- |
| Root directory | `herledger-app/indexer`       |
| Build command  | `pnpm --filter indexer build` |
| Start command  | `pnpm --filter indexer start` |

The indexer requires access to `DATABASE_URL` and all Stellar environment variables.
It does **not** need `BETTER_AUTH_SECRET` or any `NEXT_PUBLIC_*` variables.

### Database Ã¢â‚¬â€ PostgreSQL

- Provision PostgreSQL 16 in the same region as the indexer.
- Use an internal/private connection string between indexer and database.
- Do not expose PostgreSQL directly to the public internet.
- Always run `pnpm db:migrate` before starting a new deployment.

---

## Contract Integration

The application layer communicates with three Soroban contracts deployed on Stellar:

| Contract              | Responsibility                                                |
| --------------------- | ------------------------------------------------------------- |
| `BusinessRegistry`    | Business registration, ownership, wallet association          |
| `FinancialLedger`     | Financial event recording, verification, disputes, revocation |
| `AttestationRegistry` | Attester management and attestation lifecycle                 |

### After deploying contracts

1. Copy the deployed contract IDs from the Stellar CLI output.
2. Set in `apps/web/.env.local` (and production environment):
   ```
   BUSINESS_REGISTRY_CONTRACT_ID=C...
   FINANCIAL_LEDGER_CONTRACT_ID=C...
   ATTESTATION_REGISTRY_CONTRACT_ID=C...
   NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID=C...
   NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID=C...
   NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID=C...
   ```
3. Restart the indexer and web app.

The application will throw a descriptive startup error if contract IDs are missing.

> **Do not invent contract IDs.** The application cannot be considered fully
> integrated until all three contracts are deployed and real IDs are configured.

---

## Contract ABI Management

HerLedger's SDK (`packages/sdk`) hand-writes TypeScript clients
(`contracts/business-registry.ts`, `financial-ledger.ts`,
`attestation-registry.ts`) that construct XDR-encoded calls against the
deployed Soroban contracts. Nothing prevents those hand-written clients from
drifting out of sync with what a contract actually expects â€” a redeployed
contract with a renamed field or reordered parameter would previously fail
silently or with an inscrutable RPC error, discovered only at runtime. Two
mechanisms close that gap:

### 1. `ContractAddress` â€” compile-time contract-address safety

Contract addresses are no longer plain `string`. `ContractConfig` requires
the branded `ContractAddress` type (`packages/sdk/src/types/branded.ts`),
which can only be produced by validating a raw address against the
`CONTRACT_ADDRESSES` registry (`packages/sdk/src/contracts/registry.ts`):

```typescript
import { registerCurrentNetworkAddresses, buildContractConfig } from "@herledger/sdk";
import { getServerEnv } from "@herledger/config";

const env = getServerEnv();

const network = env.STELLAR_NETWORK; // "testnet" | "mainnet"

const registry = registerCurrentNetworkAddresses(network, {
  businessRegistryId: env.BUSINESS_REGISTRY_CONTRACT_ID,
  financialLedgerId: env.FINANCIAL_LEDGER_CONTRACT_ID,
  attestationRegistryId: env.ATTESTATION_REGISTRY_CONTRACT_ID,
});

const contracts = buildContractConfig(registry, network, {
  businessRegistryId: env.BUSINESS_REGISTRY_CONTRACT_ID,
  financialLedgerId: env.FINANCIAL_LEDGER_CONTRACT_ID,
  attestationRegistryId: env.ATTESTATION_REGISTRY_CONTRACT_ID,
});

// contracts is now a validated ContractConfig â€” safe to pass to any SDK function.
```

`buildContractConfig` throws `ValidationError` immediately if an address is
malformed or doesn't match the registry â€” e.g. the `FinancialLedger` address
accidentally passed where `AttestationRegistry` was expected. Do this once at
your app's composition root (e.g. `apps/web/lib/stellar/network.ts`) and pass
the resulting `ContractConfig` through; don't construct one from raw strings
inline â€” the type system will refuse it.

### 2. Generated ABI types â€” catching upgrades at build time

`packages/sdk/src/contracts/__generated__/` contains TypeScript interfaces
generated directly from each contract's on-chain interface (via
`stellar contract inspect`), not from the hand-written clients. They're the
independent source of truth the hand-written clients are checked against.

```sh
# Regenerate after rebuilding contracts (requires herledger-contract WASM built):
cd herledger-app
pnpm --filter @herledger/sdk generate:abi

# CI-style check â€” fails if committed types are stale, doesn't write:
pnpm --filter @herledger/sdk generate:abi:check
```

CI runs `generate:abi:check` on every PR (job: `abi-check` in
`.github/workflows/ci.yml`). If a contract's interface changed â€” a renamed
method, a reordered parameter, a new required argument â€” the generated
output will differ from what's committed and the build fails with an
explicit diff, rather than the mismatch surfacing later as a runtime
encoding error.

**Handling a contract upgrade:**

1. Rebuild the contract (`herledger-contract/scripts/build.sh`).
2. Run `pnpm --filter @herledger/sdk generate:abi` and review the diff in
   `__generated__/`.
3. Cross-check the diff against the corresponding hand-written client in
   `contracts/`. Update the `.call()` arguments, types, and any encode/decode
   logic in `encoding.ts` to match.
4. Update `CONTRACT_ADDRESSES` (via your env/config) if the deployment
   address changed.
5. Commit both the regenerated `__generated__/` files and the hand-written
   client changes together â€” a PR that updates one without the other is
   exactly the drift this workflow exists to prevent.

This process itself surfaced two pre-existing bugs during development of
this feature: `FinancialLedger.dispute_event` and
`AttestationRegistry.create_attestation` were each missing a required
`Address` argument in the hand-written client. Both are fixed as part of
this same change.

### 3. Testnet smoke tests

`packages/sdk/src/contracts/__tests__/smoke.testnet.test.ts` calls one read
method per contract against the real deployed testnet contracts, guarded by
`TEST_AGAINST_TESTNET=true` so it never runs in normal `pnpm test`:

```sh
# Requires BUSINESS_REGISTRY_CONTRACT_ID, FINANCIAL_LEDGER_CONTRACT_ID,
# ATTESTATION_REGISTRY_CONTRACT_ID set to real testnet contract IDs.
pnpm --filter @herledger/sdk test:smoke
```

CI runs this nightly and on manual dispatch (job: `testnet-smoke`), using
`TESTNET_BUSINESS_REGISTRY_CONTRACT_ID` / `TESTNET_FINANCIAL_LEDGER_CONTRACT_ID`
/ `TESTNET_ATTESTATION_REGISTRY_CONTRACT_ID` repo secrets â€” configure these
under **Settings â†’ Secrets and variables â†’ Actions**. These are read-only
calls; no funded account or signing key is required.

===

## SDK Reference

`packages/sdk` is the single source of truth for all Stellar/Soroban client interactions.
React components must not construct contract calls directly.

### Constructing a ContractConfig

Every SDK contract function takes a `ContractConfig`, whose fields are the
branded `ContractAddress` type rather than raw `string` â€” see
[Contract ABI Management](#contract-abi-management) for why. Build one once
at startup:

```typescript
import { registerCurrentNetworkAddresses, buildContractConfig } from "@herledger/sdk";

const network = env.STELLAR_NETWORK; // "testnet" | "mainnet"

const registry = registerCurrentNetworkAddresses(network, {
  businessRegistryId: env.BUSINESS_REGISTRY_CONTRACT_ID,
  financialLedgerId: env.FINANCIAL_LEDGER_CONTRACT_ID,
  attestationRegistryId: env.ATTESTATION_REGISTRY_CONTRACT_ID,
});

const contracts = buildContractConfig(registry, network, {
  businessRegistryId: env.BUSINESS_REGISTRY_CONTRACT_ID,
  financialLedgerId: env.FINANCIAL_LEDGER_CONTRACT_ID,
  attestationRegistryId: env.ATTESTATION_REGISTRY_CONTRACT_ID,
});
```

In practice, don't call this inline at every use site â€” both `apps/web/lib/stellar/network.ts` (`getContractConfig()`, browser-safe) and `indexer/src/config/index.ts` (`getContractConfig()`, server-side) already do this once and export the result. Import from there rather than duplicating the registry construction in a component or route handler.

### BusinessRegistry

```typescript
import {
  getBusiness,
  getBusinessByWallet,
  registerBusiness,
  updateBusinessMetadata,
  deactivateBusiness,
} from "@herledger/sdk";

// Read a business by on-chain ID (hex)
const business = await getBusiness(businessId, stellarConfig, contractConfig);
// Returns: Business | null

// Read by wallet address
const business = await getBusinessByWallet(walletAddress, stellarConfig, contractConfig);

// Register Ã¢â‚¬â€ requires Freighter to be connected, returns tx hash
const result = await registerBusiness(
  { businessId, owner, wallet, metadataHash, sourceAccount },
  stellarConfig,
  contractConfig
);
// Returns: { hash: string, success: boolean, ledger?: number }
```

### FinancialLedger

```typescript
import {
  getFinancialEvent,
  getBusinessEvents,
  isSupportedAsset,
  recordFinancialEvent,
  disputeFinancialEvent,
  verifyFinancialEvent,
  resolveFinancialEvent,
  revokeFinancialEvent,
} from "@herledger/sdk";
```

### AttestationRegistry

```typescript
import {
  getAttestation,
  isValidAttestation,
  registerAttester,
  deactivateAttester,
  createAttestation,
  revokeAttestation,
} from "@herledger/sdk";
```

### Amount handling

```typescript
// Amounts are always bigint Ã¢â‚¬â€ never Number
const event: FinancialEvent = await getFinancialEvent(eventId, config, contracts);
console.log(event.amount); // bigint, e.g. 100_000_000n (= 10 XLM in stroops)

// Format at the display boundary only
import { formatAmount } from "@/lib/utils/format";
const display = formatAmount(event.amount); // "10.0000000"
```

### Error types

```typescript
import { WalletError, RpcError, ContractError, ValidationError } from "@herledger/sdk";

try {
  await registerBusiness(params, config, contracts);
} catch (err) {
  if (err instanceof WalletError) {
    // User rejected, extension unavailable, etc.
  } else if (err instanceof ContractError) {
    // Contract returned an error code
  } else if (err instanceof RpcError) {
    // Network/RPC issue
  }
}
```

---

## Indexer Reference

The indexer is a long-running Node.js process that:

1. Reads all registered HerLedger business wallets from the database.
2. Polls Horizon for new transactions on those wallets.
3. Classifies supported asset transfers as `PaymentReceived` or `PaymentSent`.
4. Inserts records idempotently (same transaction processed twice = no duplicate).
5. Persists a ledger checkpoint after each successful sync cycle.
6. Recovers from interruption by reading the checkpoint on restart.

### Ledger checkpoint

The indexer stores an `IndexerCheckpoint` record per `(stream, walletAddress)`.
The stream-global checkpoint is keyed by the `"global"` sentinel; each business
wallet additionally tracks its own last-processed ledger. On restart the
indexer resumes each wallet from its own checkpoint, and a wallet whose
checkpoint is already at the latest ledger is skipped without any Horizon call.

### Concurrency and multi-replica deployment

Wallets are processed with bounded in-process concurrency (`SYNC_CONCURRENCY`,
default 5). We use a small async pool (`p-limit`) rather than worker threads:
the sync bottleneck is the Horizon/RPC rate limit, not CPU, so worker threads
would add coordination cost without raising throughput.

To scale horizontally, run multiple indexer replicas against the same Postgres.
Each replica claims a wallet before processing it by atomically writing
`lockedBy` + `lockedUntil` to the wallet's `sync_jobs` row (a conditional
UPDATE guarded by the lease). A replica that loses the claim skips the wallet,
so two replicas never process the same wallet in the same sync window.

| Env var              | Default        | Purpose                                      |
| -------------------- | -------------- | -------------------------------------------- |
| `SYNC_CONCURRENCY`   | `5`            | Wallets processed concurrently per replica   |
| `SYNC_LEASE_MS`      | `60000`        | Wallet claim lease duration (ms)             |
| `INDEXER_INSTANCE_ID`| `indexer-<pid>`| Unique replica identifier                    |

### Idempotency

All database writes use `upsert` with the on-chain event ID as the unique key.
Processing the same transaction twice is safe Ã¢â‚¬â€ the second pass is a no-op for
blockchain-derived fields, and only updates mutable status fields.

### Payment classification rules

| Rule                         | PaymentReceived  | PaymentSent      |
| ---------------------------- | ---------------- | ---------------- |
| Transaction succeeded        | Ã¢Å“â€œ required | Ã¢Å“â€œ required |
| Business wallet is recipient | Ã¢Å“â€œ          | Ã¢â‚¬â€          |
| Business wallet is sender    | Ã¢â‚¬â€          | Ã¢Å“â€œ          |
| Asset is supported           | Ã¢Å“â€œ required | Ã¢Å“â€œ required |

Failed transactions are **never** classified.
Unsupported assets are **never** classified.

---

## API Reference

The indexer exposes a read-only HTTP API on port 4000.

All responses follow:

```json
{ "data": { ... }, "error": null }
// or on failure:
{ "data": null, "error": { "code": "ERROR_CODE", "message": "Human message" } }
```

### Endpoints

| Method | Path                                   | Description                          |
| ------ | -------------------------------------- | ------------------------------------ |
| `GET`  | `/health`                              | Health check with DB connectivity    |
| `GET`  | `/businesses/:businessId`              | Get indexed business by on-chain ID  |
| `GET`  | `/businesses/:businessId/events`       | Paginated financial events (max 100) |
| `GET`  | `/businesses/:businessId/attestations` | All attestations for a business      |
| `GET`  | `/transactions/:hash`                  | Get a Stellar transaction by hash    |
| `GET`  | `/supported-assets`                    | Supported asset info                 |
| `GET`  | `/indexer/status`                      | Current sync checkpoint              |

### Pagination

```
GET /businesses/:id/events?offset=0&limit=20
```

- `offset`: integer Ã¢â€°Â¥ 0, default 0
- `limit`: integer 1Ã¢â‚¬â€œ100, default 20
- Response includes `pagination.count` for next-page detection

---

## Onboarding Flow

```
1. Sign up / sign in (Better Auth Ã¢â‚¬â€ email + password)
        Ã¢â€ â€œ
2. Connect Stellar wallet (Freighter browser extension)
        Ã¢â€ â€œ
3. Freighter confirms wallet ownership (no secret key transmitted)
        Ã¢â€ â€œ
4. Enter business name
        Ã¢â€ â€œ
5. App derives deterministic business ID from wallet + name + timestamp
        Ã¢â€ â€œ
6. App hashes private metadata (name committed as hash only)
        Ã¢â€ â€œ
7. App builds BusinessRegistry.register_business() transaction
        Ã¢â€ â€œ
8. Freighter prompts user to sign
        Ã¢â€ â€œ
9. App submits signed transaction to Stellar
        Ã¢â€ â€œ
10. App polls for confirmation (up to 60 seconds)
        Ã¢â€ â€œ
11. On-chain success Ã¢â€ â€™ app saves BusinessProfile to database
        Ã¢â€ â€œ
12. Redirect to dashboard
        Ã¢â€ â€œ
13. Indexer begins detecting activity for the registered wallet
```

The business is **not** marked registered in the database until the on-chain
transaction is confirmed. If the transaction fails, the flow returns to step 7.

---

## Financial Event Classification

HerLedger only classifies events from **supported assets** in **successful transactions**.

### PaymentReceived

A Stellar payment operation where:

- the transaction succeeded
- the destination address matches a registered HerLedger business wallet
- the asset is in the supported asset list

### PaymentSent

A Stellar payment operation where:

- the transaction succeeded
- the source address matches a registered HerLedger business wallet
- the asset is in the supported asset list

### What is NOT classified

- Failed transactions (regardless of amount)
- Unsupported tokens
- Non-payment operations
- Transactions where neither sender nor recipient is a registered business

HerLedger does **not** claim that every incoming payment is revenue.

---

## Dispute Flow

A business owner can challenge an incorrect HerLedger record:

```
Dashboard Ã¢â€ â€™ Activity Ã¢â€ â€™ Select event Ã¢â€ â€™ Challenge record
        Ã¢â€ â€œ
Enter reason for dispute (kept off-chain; only hash committed)
        Ã¢â€ â€œ
App hashes the reason text
        Ã¢â€ â€œ
App builds FinancialLedger.dispute_event() transaction
        Ã¢â€ â€œ
Freighter prompts owner to sign
        Ã¢â€ â€œ
Transaction submitted and confirmed
        Ã¢â€ â€œ
Event status changes to Disputed on-chain and in the index
```

**The owner cannot:**

- Delete the financial event
- Edit the Stellar transaction reference
- Change the amount, sender, or recipient
- Directly mark the event Verified or Revoked

Dispute changes HerLedger application state, **not** Stellar history.
Revoked and disputed events remain visible in the UI Ã¢â‚¬â€ they are never hidden.

---

## Privacy Model

| Data                      | Storage                   | Visibility                      |
| ------------------------- | ------------------------- | ------------------------------- |
| Stellar transactions      | Stellar blockchain        | Public Ã¢â‚¬â€ anyone can query |
| Business ID               | On-chain (hash)           | Public                          |
| Metadata hash             | On-chain (hash only)      | Public hash, private content    |
| Business name             | Off-chain database        | Private to the application      |
| Dispute reason            | Off-chain; hash on-chain  | Reason text is private          |
| Claim/attestation content | Off-chain; hash on-chain  | Content is private              |
| Auth session              | Server-side secure cookie | Private                         |
| Stellar private key       | **Never stored anywhere** | N/A                             |

The application does not claim Stellar wallet balances or transactions are private.
Blockchain data is public. HerLedger minimizes additional personal information
stored on-chain by committing only cryptographic hashes.

---

## Security

See [SECURITY.md](SECURITY.md) for the full security policy.

Key properties:

- **No private key storage.** The app never requests, stores, or logs Stellar private keys.
- **Freighter signs everything.** All contract writes are user-authorized via Freighter.
- **Server secrets never reach the browser.** `DATABASE_URL` and `BETTER_AUTH_SECRET` are never in `NEXT_PUBLIC_*`.
- **Input validation.** All API inputs validated with Zod. No `as any` bypasses.
- **Immutable blockchain records.** Stellar-derived fields cannot be changed by API requests.
- **Auth Ã¢â€°Â  wallet.** Signing into HerLedger and connecting a Stellar wallet are independent steps.

> Ã¢Å¡Â Ã¯Â¸Â **These contracts have not been audited.** Do not deploy with real financial data without a professional security review.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

```sh
# Before committing
pnpm typecheck
pnpm format
pnpm test

# Commit format (Conventional Commits)
feat(sdk): add business registry reads
fix(web): correct wallet disconnect state
chore(repo): update dependencies
test(indexer): cover payment classification
```

---

## License

See [LICENSE](../herledger-contract/LICENSE).

> > > > > > > 2208f65 (chore(repo): static analysis hardening with ESLint rules, exactOptionalPropertyTypes, and pre-commit hooks)
