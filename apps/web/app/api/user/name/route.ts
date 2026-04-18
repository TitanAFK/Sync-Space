import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "@repo/database";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    // Since session.user.id is often mapped differently in NextAuth depending on callbacks,
    // let's securely update by email which is guaranteed to be unique and on the session
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { displayName: name.slice(0, 32) }, // Limit length for safety
    });

    return NextResponse.json({ success: true, displayName: updatedUser.displayName });
  } catch (error) {
    console.error("Error updating display name:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
