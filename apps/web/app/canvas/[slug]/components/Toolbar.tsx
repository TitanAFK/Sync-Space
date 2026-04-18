import { ElementType } from "@repo/types";
import { 
  Square, Circle, Diamond, Minus, ArrowRight,
  Type, Pencil, MousePointer2, Eraser, Trash2, Hand
} from "lucide-react";

export type Tool = ElementType | "select" | "eraser" | "hand";

interface ToolbarProps {
  selectedTool: Tool;
  setSelectedTool: (tool: Tool) => void;
  onClear: () => void;
}

const TOOLS = [
  { id: "hand", icon: Hand, label: "Pan (Hand)" },
  { id: "select", icon: MousePointer2, label: "Select (Move)" },
  { id: "pencil", icon: Pencil, label: "Pencil" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "rhombus", icon: Diamond, label: "Rhombus" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "text", icon: Type, label: "Text" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
] as const;

export default function Toolbar({ selectedTool, setSelectedTool, onClear }: ToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-[#1E1E1E]/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl shadow-black/50 overflow-x-auto max-w-full">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id as Tool)}
            title={tool.label}
            className={`p-2.5 rounded-lg transition-all ${
              selectedTool === tool.id
                ? "bg-indigo-500 text-white shadow-inner"
                : "text-zinc-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={20} />
          </button>
        );
      })}
      
      <div className="w-[1px] bg-white/10 mx-1" />
      
      <button 
        onClick={onClear} 
        title="Clear Board"
        className="p-2.5 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 hover:text-rose-300 transition-all border border-rose-500/30"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
}
