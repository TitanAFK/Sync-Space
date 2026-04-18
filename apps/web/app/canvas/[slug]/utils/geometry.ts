import { Point, WhiteboardElement } from "@repo/types";

export const getDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const getElementBounds = (element: WhiteboardElement) => {
  let minX = element.x;
  let maxX = element.x;
  let minY = element.y;
  let maxY = element.y;

  if (element.type === 'rect') {
    maxX = element.x + (element.width || 0);
    maxY = element.y + (element.height || 0);
  } else if (element.type === 'circle') {
    const r = element.radius || 0;
    minX = element.x - r;
    maxX = element.x + r;
    minY = element.y - r;
    maxY = element.y + r;
  } else if (element.type === 'line' || element.type === 'arrow' || element.type === 'rhombus') {
    maxX = element.x + (element.width || 0);
    maxY = element.y + (element.height || 0);
  } else if (element.type === 'pencil' && element.points) {
    element.points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
  } else if (element.type === 'text') {
    // estimate text bounds based on arbitrary reasonable defaults, until real measure bounds
    maxX = element.x + (element.text?.length || 10) * 10;
    maxY = element.y + (element.fontSize || 24);
  }

  return {
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minY: Math.min(minY, maxY),
    maxY: Math.max(minY, maxY),
  };
};

export const isPointInBounds = (point: Point, bounds: { minX: number; maxX: number; minY: number; maxY: number }) => {
  // Add a small buffer for easier selecting
  const buffer = 10;
  return point.x >= bounds.minX - buffer && 
         point.x <= bounds.maxX + buffer && 
         point.y >= bounds.minY - buffer && 
         point.y <= bounds.maxY + buffer;
};

export const getArrowHeadPoints = (start: Point, end: Point, headlen = 15) => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  return {
    p1: {
      x: end.x - headlen * Math.cos(angle - Math.PI / 6),
      y: end.y - headlen * Math.sin(angle - Math.PI / 6),
    },
    p2: {
      x: end.x - headlen * Math.cos(angle + Math.PI / 6),
      y: end.y - headlen * Math.sin(angle + Math.PI / 6),
    }
  };
};

export const getRhombusPoints = (x: number, y: number, width: number, height: number) => {
  return [
    { x: x + width / 2, y: y },
    { x: x + width, y: y + height / 2 },
    { x: x + width / 2, y: y + height },
    { x: x, y: y + height / 2 }
  ];
};

export type ResizeHandle = "nw" | "ne" | "sw" | "se" | null;

export const getResizeHandleHit = (point: Point, bounds: { minX: number; maxX: number; minY: number; maxY: number }): ResizeHandle => {
  const HANDLE_SIZE = 8;
  const isHit = (hx: number, hy: number) => {
    return point.x >= hx - HANDLE_SIZE && point.x <= hx + HANDLE_SIZE &&
           point.y >= hy - HANDLE_SIZE && point.y <= hy + HANDLE_SIZE;
  };

  if (isHit(bounds.minX, bounds.minY)) return "nw";
  if (isHit(bounds.maxX, bounds.minY)) return "ne";
  if (isHit(bounds.minX, bounds.maxY)) return "sw";
  if (isHit(bounds.maxX, bounds.maxY)) return "se";

  return null;
};
