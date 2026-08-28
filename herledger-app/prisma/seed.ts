import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, EventType, EventStatus, AttestationStatus } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Development seed data — populates a fresh local database with enough
// representative rows to exercise every dashboard view without needing a
// real Stellar transaction history. Not run as part of CI or against
// production; see CONTRIBUTING.md#database-seeding.
//
// Every row is upserted on its natural unique key (email / businessId /
// eventId / attestationId), all keyed off deterministic, index-derived
// identifiers rather than randomly generated ones. That makes `pnpm db:seed`
// safe to re-run against the same database (no duplicate-key failures) and
// keeps the diff between two seed runs empty, which matters for reviewing
// this script itself and for reproducing a bug report against the exact
// same fixture data.
//
// Out of scope: no Better Auth `Account`/`Session` rows are created, so
// seeded users cannot sign in through the UI — Better Auth's credential
// hash format is a separate concern from the display data this script
// exists to provide, and login is not needed to browse a dashboard seeded
// this way (see e2e/helpers/seed.ts on the issue #11 branch for an example
// of the additional Session-row work real sign-in requires).
// ---------------------------------------------------------------------------

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in first.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

function hex(n: number, length = 64): string {
  return n.toString(16).padStart(length, "0");
}

function stellarAddress(label: string): string {
  return `G${label}`.padEnd(56, "A").slice(0, 56);
}

function contractAddress(label: string): string {
  return `C${label}`.padEnd(56, "A").slice(0, 56);
}

const XLM_ASSET = contractAddress("NATIVEXLMASSET");

interface SeedUser {
  email: string;
  name: string;
  business: {
    displayName: string;
    businessId: string;
    walletAddress: string;
  };
}

const USERS: SeedUser[] = [
  {
    email: "amina.founder@herledger.dev",
    name: "Amina Yusuf",
    business: {
      displayName: "Yusuf Textiles",
      businessId: hex(1),
      walletAddress: stellarAddress("YUSUFTEXTILES1"),
    },
  },
  {
    email: "bianca.founder@herledger.dev",
    name: "Bianca Okoro",
    business: {
      displayName: "Okoro Fresh Produce",
      businessId: hex(2),
      walletAddress: stellarAddress("OKOROFRESHPRODUCE2"),
    },
  },
  {
    email: "chidinma.founder@herledger.dev",
    name: "Chidinma Eze",
    business: {
      displayName: "Eze Logistics Co-op",
      businessId: hex(3),
      walletAddress: stellarAddress("EZELOGISTICSCOOP3"),
    },
  },
];

// All 4 EventType x all 4 EventStatus combinations (16), plus 4 extra
// weighted toward Verified -- realistic for a ledger where most events
// eventually settle, while still guaranteeing every enum variant appears
// at least once per the issue's acceptance criteria.
const EVENT_TYPES = Object.values(EventType);
const EVENT_STATUSES = Object.values(EventStatus);

const EVENT_PLAN: Array<{ type: EventType; status: EventStatus }> = [
  ...EVENT_TYPES.flatMap((type) => EVENT_STATUSES.map((status) => ({ type, status }))),
  { type: EventType.PaymentReceived, status: EventStatus.Verified },
  { type: EventType.PaymentSent, status: EventStatus.Verified },
  { type: EventType.InvoiceSettled, status: EventStatus.Verified },
  { type: EventType.CommitmentFulfilled, status: EventStatus.Verified },
];

// Amounts in stroops (7 decimals) -- a spread of realistic small-business
// payment sizes, from ~12 XLM to ~4,800 XLM.
function amountFor(index: number): string {
  const whole = 120 + index * 217;
  return `${whole}0000000`;
}

async function main(): Promise<void> {
  const businessIds: string[] = [];

  for (const seedUser of USERS) {
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: { name: seedUser.name },
      create: {
        email: seedUser.email,
        name: seedUser.name,
        emailVerified: true,
      },
    });

    await prisma.businessProfile.upsert({
      where: { businessId: seedUser.business.businessId },
      update: {
        displayName: seedUser.business.displayName,
        walletAddress: seedUser.business.walletAddress,
      },
      create: {
        userId: user.id,
        businessId: seedUser.business.businessId,
        walletAddress: seedUser.business.walletAddress,
        displayName: seedUser.business.displayName,
        metadataHash: hex(1000 + businessIds.length),
        active: true,
      },
    });

    businessIds.push(seedUser.business.businessId);
  }

  const eventIds: string[] = [];

  for (const [index, plan] of EVENT_PLAN.entries()) {
    const eventId = hex(100 + index);
    const businessId = businessIds[index % businessIds.length]!;

    await prisma.financialEvent.upsert({
      where: { eventId },
      update: { status: plan.status },
      create: {
        businessId,
        eventId,
        eventType: plan.type,
        assetAddress: XLM_ASSET,
        amount: amountFor(index),
        stellarReference: hex(200 + index),
        metadataHash: hex(300 + index),
        status: plan.status,
        ledgerSequence: 1_000_000 + index,
      },
    });

    eventIds.push(eventId);
  }

  const ATTESTER_ADDRESSES = [stellarAddress("SEEDATTESTERONE"), stellarAddress("SEEDATTESTERTWO")];

  for (let index = 0; index < 10; index++) {
    const attestationId = hex(400 + index);
    const eventId = eventIds[index]!;
    const hasDescription = index % 2 === 0;

    await prisma.attestation.upsert({
      where: { attestationId },
      update: {
        status: index % 3 === 0 ? AttestationStatus.Revoked : AttestationStatus.Active,
      },
      create: {
        attestationId,
        eventId,
        attesterAddress: ATTESTER_ADDRESSES[index % ATTESTER_ADDRESSES.length]!,
        claimHash: hex(500 + index),
        claimDescription: hasDescription ? `Verified against bank statement #${index + 1}` : null,
        status: index % 3 === 0 ? AttestationStatus.Revoked : AttestationStatus.Active,
        ledgerSequence: 1_000_100 + index,
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  users:              ${USERS.length}`);
  console.log(`  business profiles:  ${businessIds.length}`);
  console.log(`  financial events:   ${eventIds.length}`);
  console.log(`  attestations:       10`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
