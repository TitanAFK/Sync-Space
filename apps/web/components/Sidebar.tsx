"use client";

import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, LogOut, Settings, PanelLeftClose, PanelLeft, Box } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function Sidebar() {
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={`bg-neutral-900 border-r border-neutral-800 transition-all duration-300 flex flex-col ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            Sync-Space
          </Link>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={`p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors ${collapsed ? "mx-auto" : ""}`}
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-2 px-3">
        <Link 
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neutral-800 text-white font-medium"
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </Link>
        {/* Additional links can go here */}
      </div>

      <div className="p-4 border-t border-neutral-800">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} mb-4`}>
          {session?.user?.image ? (
            <Image 
              src={session.user.image} 
              alt={session.user.name || "User"} 
              width={40} 
              height={40} 
              className="rounded-full border border-neutral-700 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          )}
          
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
              <p className="text-xs text-neutral-400 truncate">{session?.user?.email}</p>
            </div>
          )}
        </div>

        <button 
          onClick={() => signOut({ callbackUrl: "/" })}
          className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} w-full px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-medium`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
