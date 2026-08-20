import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { PrismaClient } from "@prisma/client";
import { getServerEnv } from "@herledger/config/server";
import { createHash } from "crypto";

const prisma = new PrismaClient({
  datasourceUrl: getServerEnv().DATABASE_URL,
});

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    // Verify password via Better Auth API
    try {
      await auth.api.signInEmail({
        body: {
          email: session.user.email,
          password: password,
        }
      });
    } catch (error) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Process deletion
    await prisma.$transaction(async (tx) => {
      // 1. Revoke all active sessions
      await tx.session.deleteMany({
        where: { userId: session.user.id },
      });

      // 2. Soft-delete user
      await tx.user.update({
        where: { id: session.user.id },
        data: { deletedAt: new Date() },
      });

      // 3. Anonymize BusinessProfile.walletAddress
      const profile = await tx.businessProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (profile) {
        const hash = createHash("sha256").update(profile.walletAddress).digest("hex");
        await tx.businessProfile.update({
          where: { id: profile.id },
          data: { walletAddress: hash },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
