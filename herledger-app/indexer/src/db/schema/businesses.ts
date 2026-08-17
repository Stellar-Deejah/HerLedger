import type { PrismaClient } from "@prisma/client";
import { DatabaseError } from "../../types/index.js";

// ---------------------------------------------------------------------------
// Business profile repository (indexer-facing)
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 100;

export interface ActiveBusinessWalletsPage {
  wallets: { id: string; businessId: string; walletAddress: string }[];
  nextCursor: string | null;
}

/**
 * Cursor-paginated over active business wallets, ordered by `id`.
 * Pass the previous page's `nextCursor` back in as `cursor` to fetch the
 * next page. `nextCursor` is `null` once there are no more pages.
 * Never loads the full wallet set into memory at once -- callers should
 * loop, processing one page at a time.
 */
export async function findAllActiveBusinessWallets(
  prisma: PrismaClient,
  options?: { cursor?: string; pageSize?: number }
): Promise<ActiveBusinessWalletsPage> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

  try {
    const rows: Array<{ id: string; businessId: string; walletAddress: string | null }> =
      await prisma.businessProfile.findMany({
        // A business with an unlinked wallet (see settings panel wallet
        // unlink/re-link flow) has nothing for the sync job to watch on
        // Stellar until it re-links, so it's excluded here rather than
        // surfaced with a null walletAddress.
        where: { active: true, walletAddress: { not: null } },
        select: { id: true, businessId: true, walletAddress: true },
        orderBy: { id: "asc" },
        take: pageSize + 1,
        ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      });

    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    // walletAddress is guaranteed non-null by the `not: null` filter above.
    const wallets = page.map((row) => ({ ...row, walletAddress: row.walletAddress! }));
    const nextCursor = hasMore ? wallets[wallets.length - 1]!.id : null;

    return { wallets, nextCursor };
  } catch (cause) {
    throw new DatabaseError("Failed to query active business wallets", cause);
  }
}

export async function findBusinessByWallet(prisma: PrismaClient, walletAddress: string) {
  try {
    return await prisma.businessProfile.findUnique({
      where: { walletAddress },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find business by wallet ${walletAddress}`, cause);
  }
}

export async function findBusinessById(prisma: PrismaClient, businessId: string) {
  try {
    return await prisma.businessProfile.findUnique({
      where: { businessId },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find business by id ${businessId}`, cause);
  }
}
