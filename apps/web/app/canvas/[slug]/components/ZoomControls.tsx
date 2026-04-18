import { Minus, Plus } from "lucide-react";

interface ZoomControlsProps {
  zoom: number;
  onZoom: (delta: number) => void;
}

export default function ZoomControls({ zoom, onZoom }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 z-50 flex items-center gap-1 bg-[#1E1E1E]/90 backdrop-blur-md rounded-lg border border-white/10 shadow-xl shadow-black/50 p-1">
      <button 
        onClick={() => onZoom(-0.1)}
        className="p-1.5 rounded text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
        title="Zoom Out"
      >
        <Minus size={16} />
      </button>
      <div className="text-xs font-semibold text-zinc-300 w-12 text-center select-none">
        {Math.round(zoom * 100)}%
      </div>
      <button 
        onClick={() => onZoom(0.1)}
        className="p-1.5 rounded text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
        title="Zoom In"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
