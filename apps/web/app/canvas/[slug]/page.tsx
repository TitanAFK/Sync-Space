import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "@repo/database";
import CanvasClient from "./CanvasClient";

export default async function CanvasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  if (session?.user) {
    try {
      // Connect the current user as a participant to this room
      await prisma.room.update({
        where: { slug },
        data: {
          participants: {
            connect: { id: session.user.id }
          }
        }
      });
    } catch (e: any) {
      // If the user doesn't have a linked DB record or the room doesn't exist, ignore the connection attempt
      // This prevents console errors for guest users while permitting collaboration via socket.io
      if (e.code !== 'P2025') {
        console.error("Failed to add user to participants:", e);
      }
    }
  }

  let initialDisplayName = "Guest";
  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { displayName: true, name: true },
    });
    if (dbUser) {
      initialDisplayName = dbUser.displayName || dbUser.name || "Anonymous";
    } else {
      initialDisplayName = session.user.name || "Anonymous";
    }
  }

  return <CanvasClient initialDisplayName={initialDisplayName} />;
}