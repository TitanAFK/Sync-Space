import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { Sidebar } from "../../components/Sidebar";
import slugify from "slugify";
import Link from "next/link";
import RoomActions from "./RoomActions";
import { Plus, Clock, Crown, Users, Box } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth");
  }

  // Fetch rooms where user is admin
  const createdRooms = await prisma.room.findMany({
    where: { adminId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // Fetch rooms the user participated in but didn't create
  const joinedRooms = await prisma.room.findMany({
    where: {
      participants: { some: { id: session.user.id } },
      adminId: { not: session.user.id },
    },
    include: { admin: true },
    orderBy: { createdAt: "desc" },
  });

  async function createRoom(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return;

    const name = formData.get("name") as string;
    const baseSlug = slugify(name, { lower: true, strict: true });
    
    // Add random suffix to ensure uniqueness
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    try {
      await prisma.room.create({
        data: {
          slug: slug,
          adminId: session.user.id,
          participants: {
            connect: { id: session.user.id }
          }
        },
      });
      revalidatePath("/dashboard");
    } catch (error) {
      console.error("Room creation failed:", error);
    }
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-white overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <header>
            <h1 className="text-3xl font-bold mb-2">Welcome Back, {session.user.name?.split(" ")[0]}</h1>
            <p className="text-neutral-400">Manage your workspaces and hop back into collaboration.</p>
          </header>

          {/* Quick Create Section */}
          <section>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Start a New Session
              </h2>
              <form action={createRoom} className="flex gap-4">
                <input
                  name="name"
                  placeholder="E.g., Team Brainstorm, Q3 Planning..."
                  required
                  className="flex-1 px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition active:scale-95"
                >
                  Create Room
                </button>
              </form>
            </div>
          </section>

          {/* User's Created Rooms */}
          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              Rooms You Manage
            </h2>
            
            {createdRooms.length === 0 ? (
              <div className="text-center py-12 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
                <p className="text-neutral-500">You haven't created any rooms yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {createdRooms.map((room) => (
                  <Link 
                    href={`/canvas/${room.slug}`} 
                    key={room.id}
                    className="group bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-blue-500/50 hover:bg-neutral-800/80 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Box className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <RoomActions slug={room.slug} roomId={room.id} isOwner={true} />
                        <span className="text-xs font-medium text-neutral-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(room.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-1 truncate">{room.slug.split("-").slice(0, -1).join(" ") || room.slug}</h3>
                    <p className="text-sm text-neutral-400 truncate text-ellipsis">/{room.slug}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recently Joined Rooms */}
          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-400" />
              Recently Joined Rooms
            </h2>
            
            {joinedRooms.length === 0 ? (
              <div className="text-center py-12 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
                <p className="text-neutral-500">You haven't joined any external rooms recently.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedRooms.map((room) => (
                  <Link 
                    href={`/canvas/${room.slug}`} 
                    key={room.id}
                    className="group bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-green-500/50 hover:bg-neutral-800/80 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Box className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                         <RoomActions slug={room.slug} roomId={room.id} isOwner={false} />
                         <span className="text-xs font-medium text-neutral-500">
                           by {room.admin.name || "Unknown"}
                         </span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-1 truncate">{room.slug.split("-").slice(0, -1).join(" ") || room.slug}</h3>
                    <p className="text-sm text-neutral-400 truncate text-ellipsis">/{room.slug}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
