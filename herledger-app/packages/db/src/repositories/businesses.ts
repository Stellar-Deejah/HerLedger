import type { BusinessProfile, PrismaClient } from "@prisma/client";

import {
  type ActiveBusinessWalletsPage,
  type BusinessesRepository,
  type CreateBusinessProfileInput,
  type UpdateBusinessProfileInput,
  DatabaseError,
} from "../types.js";

export const DEFAULT_PAGE_SIZE = 100;

export async function findAllActiveBusinessWallets(
  prisma: PrismaClient,
  options?: { cursor?: string; pageSize?: number }
): Promise<ActiveBusinessWalletsPage> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

  try {
    const rows = await prisma.businessProfile.findMany({
      where: { active: true },
      select: { id: true, businessId: true, walletAddress: true },
      orderBy: { id: "asc" },
      take: pageSize + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > pageSize;
    const wallets = hasMore ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasMore ? wallets[wallets.length - 1]!.id : null;

    return { wallets, nextCursor };
  } catch (cause) {
    throw new DatabaseError("Failed to query active business wallets", cause);
  }
}

export async function findBusinessByWallet(
  prisma: PrismaClient,
  walletAddress: string
): Promise<BusinessProfile | null> {
  try {
    return await prisma.businessProfile.findUnique({
      where: { walletAddress },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find business by wallet ${walletAddress}`, cause);
  }
}

export async function findBusinessById(
  prisma: PrismaClient,
  businessId: string
): Promise<BusinessProfile | null> {
  try {
    return await prisma.businessProfile.findUnique({
      where: { businessId },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find business by id ${businessId}`, cause);
  }
}

export async function findBusinessByUserId(
  prisma: PrismaClient,
  userId: string
): Promise<BusinessProfile | null> {
  try {
    return await prisma.businessProfile.findFirst({
      where: { userId },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find business by userId ${userId}`, cause);
  }
}

export async function createBusinessProfile(
  prisma: PrismaClient,
  data: CreateBusinessProfileInput
): Promise<BusinessProfile> {
  try {
    return await prisma.businessProfile.create({
      data: {
        userId: data.userId,
        businessId: data.businessId,
        walletAddress: data.walletAddress,
        displayName: data.displayName,
        metadataHash: data.metadataHash,
        active: data.active ?? true,
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to create business profile ${data.businessId}`, cause);
  }
}

export async function updateBusinessProfile(
  prisma: PrismaClient,
  id: string,
  data: UpdateBusinessProfileInput
): Promise<BusinessProfile> {
  try {
    return await prisma.businessProfile.update({
      where: { id },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.metadataHash !== undefined && { metadataHash: data.metadataHash }),
        ...(data.walletAddress !== undefined && { walletAddress: data.walletAddress }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to update business profile ${id}`, cause);
  }
}

export async function deactivateBusinessProfile(
  prisma: PrismaClient,
  id: string
): Promise<BusinessProfile> {
  try {
    return await prisma.businessProfile.update({
      where: { id },
      data: { active: false },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to deactivate business profile ${id}`, cause);
  }
}

export function createBusinessesRepository(prisma: PrismaClient): BusinessesRepository {
  return {
    findAllActiveWallets: (options) => findAllActiveBusinessWallets(prisma, options),
    findByWallet: (walletAddress) => findBusinessByWallet(prisma, walletAddress),
    findById: (businessId) => findBusinessById(prisma, businessId),
    findByUserId: (userId) => findBusinessByUserId(prisma, userId),
    create: (data) => createBusinessProfile(prisma, data),
    update: (id, data) => updateBusinessProfile(prisma, id, data),
    deactivate: (id) => deactivateBusinessProfile(prisma, id),
  };
}
