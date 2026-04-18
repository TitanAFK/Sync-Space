export interface Point {
  x: number;
  y: number;
}

// 1. Refine the DrawData for real-time "active" drawing
export interface DrawData {
  lastPoint: Point | null;
  currentPoint: Point;
  color: string;
}

// 2. Cursor updates for "who is where" (Presence)
export interface CursorUpdate extends Point {
  userId: string;
  roomId: string;
  userName: string;
  color: string;
}

// 3. Shapes and Pencil lines (The objects saved in the Database)
export type ElementType = 'rect' | 'circle' | 'pencil' | 'line' | 'arrow' | 'rhombus' | 'text';

export interface WhiteboardElement {
  id: string;          // Unique ID for each shape (useful for deleting/undoing)
  type: ElementType;
  x: number;           // Starting X
  y: number;           // Starting Y
  width?: number;      // For rect/circle
  height?: number;     // For rect
  radius?: number;     // For circle elements
  points?: Point[];    // ONLY for 'pencil' type
  stroke: string;      // The color of the line/border
  text?: string;       // For text elements
  fontSize?: number;   // For text elements
}

// 4. Room State (What the server sends to a new user when they join)
export interface RoomState {
  slug: string;
  elements: WhiteboardElement[];
}