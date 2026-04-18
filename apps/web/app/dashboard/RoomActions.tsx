"use client";

import { Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RoomActions({ slug, roomId, isOwner }: { slug: string; roomId: string; isOwner: boolean }) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the room
    e.stopPropagation();
    
    const url = `${window.location.origin}/canvas/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    
    setDeleting(true);
    try {
      // Implement the delete API call
      const res = await fetch(`/api/room/${roomId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete room");
        setDeleting(false);
      }
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleShare}
        className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-blue-400 transition-colors"
        title="Share Link"
      >
        <Share2 className="w-4 h-4" />
        {copied && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-800 text-xs text-white px-2 py-1 rounded">Copied!</span>}
      </button>
      
      {isOwner && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 rounded-md hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors"
          title="Delete Room"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
