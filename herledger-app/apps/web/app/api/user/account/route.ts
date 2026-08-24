import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getDbClient } from "@herledger/db";

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
        },
      });
    } catch {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Process deletion via db repository
    const db = getDbClient();
    await db.users.deleteAccount(session.user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Account deletion failed:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
