import { createHash } from "node:crypto";
import type { PrismaClient, User } from "@prisma/client";

import { type UsersRepository, DatabaseError } from "../types.js";

export async function findUserById(prisma: PrismaClient, id: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({ where: { id } });
  } catch (cause) {
    throw new DatabaseError(`Failed to find user ${id}`, cause);
  }
}

export async function deleteUserAccount(prisma: PrismaClient, userId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Revoke all active sessions
      await tx.session.deleteMany({
        where: { userId },
      });

      // 2. Soft-delete user
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });

      // 3. Anonymize BusinessProfile.walletAddress
      const profile = await tx.businessProfile.findUnique({
        where: { userId },
      });

      if (profile) {
        // An unlinked business (see the settings panel's wallet unlink
        // flow) already has no walletAddress to anonymize.
        const anonymizedWallet = profile.walletAddress
          ? `deleted_${createHash("sha256").update(profile.walletAddress).digest("hex").slice(0, 16)}`
          : null;
        await tx.businessProfile.update({
          where: { id: profile.id },
          data: {
            walletAddress: anonymizedWallet,
            active: false,
          },
        });
      }
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to delete user account ${userId}`, cause);
  }
}

export function createUsersRepository(prisma: PrismaClient): UsersRepository {
  return {
    findById: (id) => findUserById(prisma, id),
    deleteAccount: (userId) => deleteUserAccount(prisma, userId),
  };
}
