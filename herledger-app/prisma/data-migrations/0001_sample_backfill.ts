import { PrismaClient } from "@prisma/client";

/**
 * Sample reference data migration.
 * Backfills a default name for any users that do not have one.
 */
export async function up(prisma: PrismaClient): Promise<void> {
  console.log("Starting reference data migration (0001_sample_backfill)...");

  // Harmless database backfill example: find users with missing names
  const usersToUpdate = await prisma.user.findMany({
    where: {
      name: null,
    },
  });

  console.log(`Found ${usersToUpdate.length} users without a display name.`);

  let updatedCount = 0;
  for (const user of usersToUpdate) {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: `User_${user.id.substring(0, 8)}` },
    });
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} user name(s).`);
}
