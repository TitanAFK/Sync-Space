"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Point, DrawData, WhiteboardElement } from "@repo/types";
import { v4 as uuidv4 } from "uuid";
import Toolbar, { Tool } from "./components/Toolbar";
import ZoomControls from "./components/ZoomControls";
import { getElementBounds, isPointInBounds, getArrowHeadPoints, getRhombusPoints, getResizeHandleHit, ResizeHandle } from "./utils/geometry";
import { Share2, User } from "lucide-react";

export default function CanvasClient({ initialDisplayName = "Guest" }: { initialDisplayName?: string }) {
  const { slug } = useParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>("pencil");
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [remotePreviews, setRemotePreviews] = useState<Record<string, WhiteboardElement | null>>({});
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; name?: string }>>({});
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  const [action, setAction] = useState<"none" | "drawing" | "panning" | "moving" | "writing" | "resizing">("none");
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; text: string; id?: string } | null>(null);
  const [lockedElements, setLockedElements] = useState<Record<string, string>>({}); // elementId -> userId

  const [myDisplayName, setMyDisplayName] = useState(initialDisplayName);
  const [isEditingName, setIsEditingName] = useState(false);
  const lastMousePosRef = useRef<Point | null>(null); 
  const startPointRef = useRef<Point | null>(null);   
  const currentPointsRef = useRef<Point[]>([]);       
  const isSpacePressedRef = useRef(false);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        redrawCanvas();
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") return;
      if (e.code === "Space") isSpacePressedRef.current = true;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElementId && action !== "writing") {
          setElements(prev => prev.filter(el => el.id !== selectedElementId));
          socketRef.current?.emit("delete-element", { slug, id: selectedElementId });
          socketRef.current?.emit("save-canvas", { slug, elements: elements.filter(el => el.id !== selectedElementId) });
          socketRef.current?.emit("unlock-element", { slug, id: selectedElementId });
          setSelectedElementId(null);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") isSpacePressedRef.current = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedElementId, elements, action, slug]);
  useEffect(() => {
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join-room", slug));

    socket.on("init-state", (savedElements: WhiteboardElement[]) => {
      setElements(savedElements);
      setRemotePreviews({});
    });

    socket.on("draw-client", (data: DrawData) => {
      const currentCamera = cameraRef.current; 
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.setTransform(currentCamera.zoom, 0, 0, currentCamera.zoom, currentCamera.x, currentCamera.y);
        ctx.strokeStyle = data.color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        if (data.lastPoint) ctx.moveTo(data.lastPoint.x, data.lastPoint.y);
        ctx.lineTo(data.currentPoint.x, data.currentPoint.y);
        ctx.stroke();
        ctx.restore();
      }
    });

    socket.on("user-cursor", ({ userId, x, y, name }) => {
      setCursors((prev) => ({ ...prev, [userId]: { x, y, name } }));
    });

    socket.on("user-info-updated", ({ userId, name }) => {
       setCursors(prev => {
          if (!prev[userId]) return prev;
          return { ...prev, [userId]: { ...prev[userId], name } };
       });
    });

    socket.on("shape-preview", (data: { userId: string; shape: WhiteboardElement | null }) => {
      if (!data || !data.userId) return;
      setRemotePreviews((prev) => {
        const next = { ...prev };
        if (!data.shape) delete next[data.userId];
        else next[data.userId] = data.shape;
        return next;
      });
    });

    socket.on("new-element", (element: WhiteboardElement) => {
      setElements((prev) => [...prev.filter(e => e.id !== element.id), element]);
      setRemotePreviews({}); 
    });

    socket.on("element-updated", (updatedElement: WhiteboardElement) => {
      setElements((prev) => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
    });

    socket.on("element-deleted", (id: string) => {
      setElements((prev) => prev.filter(el => el.id !== id));
      if (selectedElementId === id) setSelectedElementId(null);
    });

    socket.on("canvas-cleared", () => {
      setElements([]);
      setRemotePreviews({});
      setSelectedElementId(null);
    });

    socket.on("user-offline", (userId) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setLockedElements(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(elId => {
           if (next[elId] === userId) delete next[elId];
        });
        return next;
      });
    });

    socket.on("element-locked", ({ elementId, userId }) => {
       setLockedElements(prev => ({ ...prev, [elementId]: userId }));
    });

    socket.on("element-unlocked", ({ elementId }) => {
       setLockedElements(prev => {
         const next = { ...prev };
         delete next[elementId];
         return next;
       });
    });

    socket.emit("request-locks", slug);

    return () => { socket.disconnect(); };
  }, [slug]); 
  const drawElement = (ctx: CanvasRenderingContext2D, el: WhiteboardElement, isSelected: boolean) => {
    // If we're editing this text, don't render it on the canvas so it doesn't double-render
    if (el.type === "text" && textInput && textInput.id === el.id) return;

    ctx.strokeStyle = el.stroke;
    ctx.fillStyle = el.stroke;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();

    if (el.type === "pencil" && el.points && el.points.length > 0) {
      ctx.moveTo(el.points[0].x, el.points[0].y);
      el.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else if (el.type === "rect") {
      ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
    } else if (el.type === "circle") {
      ctx.arc(el.x, el.y, el.radius || 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (el.type === "line") {
      ctx.moveTo(el.x, el.y);
      ctx.lineTo(el.x + (el.width || 0), el.y + (el.height || 0));
      ctx.stroke();
    } else if (el.type === "arrow") {
        ctx.moveTo(el.x, el.y);
        const endX = el.x + (el.width || 0);
        const endY = el.y + (el.height || 0);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        ctx.beginPath();
        const heads = getArrowHeadPoints({x: el.x, y: el.y}, {x: endX, y: endY});
        ctx.moveTo(heads.p1.x, heads.p1.y);
        ctx.lineTo(endX, endY);
        ctx.lineTo(heads.p2.x, heads.p2.y);
        ctx.stroke();
    } else if (el.type === "rhombus") {
        const pts = getRhombusPoints(el.x, el.y, el.width || 0, el.height || 0);
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.lineTo(pts[3].x, pts[3].y);
        ctx.closePath();
        ctx.stroke();
    } else if (el.type === "text") {
      ctx.font = `${el.fontSize || 24}px Inter, sans-serif`;
      ctx.textBaseline = "top";
      const lines = (el.text || "").split("\n");
      lines.forEach((line, i) => {
          ctx.fillText(line, el.x, el.y + i * (el.fontSize || 24) * 1.2);
      });
    }

    if (lockedElements[el.id] && lockedElements[el.id] !== socketRef.current?.id) {
       const bounds = getElementBounds(el);
       ctx.strokeStyle = "#ef4444"; 
       ctx.lineWidth = 1;
       ctx.setLineDash([5, 5]);
       ctx.strokeRect(bounds.minX - 5, bounds.minY - 5, bounds.maxX - bounds.minX + 10, bounds.maxY - bounds.minY + 10);
       ctx.setLineDash([]);
       
       ctx.fillStyle = "#ef4444";
       ctx.font = "12px sans-serif";
       ctx.fillText("🔒", bounds.maxX + 8, bounds.minY - 5);
    }

    if (isSelected) {
      const bounds = getElementBounds(el);
      ctx.strokeStyle = "#4f46e5"; 
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(bounds.minX - 5, bounds.minY - 5, bounds.maxX - bounds.minX + 10, bounds.maxY - bounds.minY + 10);
      ctx.setLineDash([]);
      
      // Draw 4 resize handles
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      const hSize = 8;
      const drawHandle = (hx: number, hy: number) => {
          ctx.fillRect(hx - hSize/2, hy - hSize/2, hSize, hSize);
          ctx.strokeRect(hx - hSize/2, hy - hSize/2, hSize, hSize);
      };
      drawHandle(bounds.minX, bounds.minY);
      drawHandle(bounds.maxX, bounds.minY);
      drawHandle(bounds.minX, bounds.maxY);
      drawHandle(bounds.maxX, bounds.maxY);
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    const gridSize = 40 * camera.zoom;
    const gStartX = camera.x % gridSize;
    const gStartY = camera.y % gridSize;
    for (let x = gStartX; x < canvas.width; x += gridSize) {
        for (let y = gStartY; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    ctx.save();
    ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);

    elements.forEach((el) => drawElement(ctx, el, el.id === selectedElementId));
    Object.values(remotePreviews).forEach((ghost) => {
      if (ghost) drawElement(ctx, ghost, false);
    });

    ctx.restore();
  };

  useEffect(() => {
    redrawCanvas();
  }, [elements, remotePreviews, camera, selectedElementId, lockedElements, textInput]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent | React.WheelEvent): Point => {
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return {
      x: (clientX - camera.x) / camera.zoom,
      y: (clientY - camera.y) / camera.zoom
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).closest(".dashboard-ui-element")) return;
    
    if (action === "writing") {
      commitText();
      return;
    }

    const canvasPos = getCanvasCoords(e);
    
    if (e.button === 1 || isSpacePressedRef.current || selectedTool === "hand") {
        setAction("panning");
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
    }

    if (selectedTool === "eraser") {
        const clickedEl = [...elements].reverse().find(el => 
            isPointInBounds(canvasPos, getElementBounds(el))
        );
        if (clickedEl) {
            setElements(prev => prev.filter(el => el.id !== clickedEl.id));
            socketRef.current?.emit("delete-element", { slug, id: clickedEl.id });
            socketRef.current?.emit("save-canvas", { slug, elements: elements.filter(el => el.id !== clickedEl.id) });
            if (selectedElementId === clickedEl.id) {
               socketRef.current?.emit("unlock-element", { slug, id: selectedElementId });
               setSelectedElementId(null);
            }
        }
        return;
    }

    if (selectedTool === "select") {
        if (selectedElementId) {
            const selectedEl = elements.find(e => e.id === selectedElementId);
            if (selectedEl) {
                const bounds = getElementBounds(selectedEl);
                const handle = getResizeHandleHit(canvasPos, bounds);
                if (handle) {
                    setAction("resizing");
                    setResizeHandle(handle);
                    lastMousePosRef.current = canvasPos;
                    startPointRef.current = { x: selectedEl.x, y: selectedEl.y }; 
                    return;
                }
            }
        }

        const clickedEl = [...elements].reverse().find(el => 
            isPointInBounds(canvasPos, getElementBounds(el))
        );

        if (clickedEl && clickedEl.type === "text" && e.detail === 2) {
             setAction("writing");
             setTextInput({ x: clickedEl.x, y: clickedEl.y, text: clickedEl.text || "", id: clickedEl.id });
             socketRef.current?.emit("lock-element", { slug, id: clickedEl.id });
             setSelectedElementId(null);
             return;
        }

        if (clickedEl) {
            if (lockedElements[clickedEl.id] && lockedElements[clickedEl.id] !== socketRef.current?.id) {
                return;
            }
            if (selectedElementId && selectedElementId !== clickedEl.id) {
                socketRef.current?.emit("unlock-element", { slug, id: selectedElementId });
            }
            setSelectedElementId(clickedEl.id);
            socketRef.current?.emit("lock-element", { slug, id: clickedEl.id });
            setAction("moving");
            lastMousePosRef.current = canvasPos;
        } else {
            if (selectedElementId) {
                socketRef.current?.emit("unlock-element", { slug, id: selectedElementId });
            }
            setSelectedElementId(null);
            setAction("none"); 
        }
    } else if (selectedTool === "text") {
      e.preventDefault(); 
      setAction("writing");
      setTextInput({ x: canvasPos.x, y: canvasPos.y, text: "" });
      setSelectedElementId(null);
      return;
    } else {
        setAction("drawing");
        startPointRef.current = canvasPos;
        lastMousePosRef.current = canvasPos;
        currentPointsRef.current = [canvasPos];
        setSelectedElementId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasPos = getCanvasCoords(e);
    
    socketRef.current?.emit("mouse-move", { slug, x: canvasPos.x, y: canvasPos.y, name: myDisplayName });

    if (action === "panning") {
      const dx = e.clientX - (lastMousePosRef.current?.x || e.clientX);
      const dy = e.clientY - (lastMousePosRef.current?.y || e.clientY);
      setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (action === "resizing" && selectedElementId && lastMousePosRef.current) {
        const dx = canvasPos.x - lastMousePosRef.current.x;
        const dy = canvasPos.y - lastMousePosRef.current.y;
        
        const newElements = elements.map(el => {
            if (el.id === selectedElementId) {
                const updated = { ...el };
                if (updated.type === "rect" || updated.type === "rhombus" || updated.type === 'line' || updated.type === 'arrow') {
                    if (resizeHandle === 'nw') {
                        updated.x += dx; updated.y += dy;
                        updated.width = (updated.width || 0) - dx;
                        updated.height = (updated.height || 0) - dy;
                    } else if (resizeHandle === 'ne') {
                        updated.y += dy;
                        updated.width = (updated.width || 0) + dx;
                        updated.height = (updated.height || 0) - dy;
                    } else if (resizeHandle === 'sw') {
                        updated.x += dx;
                        updated.width = (updated.width || 0) - dx;
                        updated.height = (updated.height || 0) + dy;
                    } else if (resizeHandle === 'se') {
                        updated.width = (updated.width || 0) + dx;
                        updated.height = (updated.height || 0) + dy;
                    }
                } else if (updated.type === "circle") {
                     // Approximate radius change
                     const dist = dx > dy ? dx : dy;
                     const sign = (resizeHandle === 'se' || resizeHandle === 'ne') ? 1 : -1;
                     updated.radius = Math.max(5, (updated.radius || 0) + (dist * sign));
                } else if (updated.type === "pencil" && updated.points) {
                    const bounds = getElementBounds(el);
                    const oldMinX = bounds.minX;
                    const oldMinY = bounds.minY;
                    const oldWidth = bounds.maxX - oldMinX;
                    const oldHeight = bounds.maxY - oldMinY;

                    let newMinX = oldMinX;
                    let newMinY = oldMinY;
                    let newMaxX = bounds.maxX;
                    let newMaxY = bounds.maxY;

                    if (resizeHandle === 'nw') {
                        newMinX += dx; newMinY += dy;
                    } else if (resizeHandle === 'ne') {
                        newMaxX += dx; newMinY += dy;
                    } else if (resizeHandle === 'sw') {
                        newMinX += dx; newMaxY += dy;
                    } else if (resizeHandle === 'se') {
                        newMaxX += dx; newMaxY += dy;
                    }

                    if (newMaxX - newMinX < 2) {
                        if (resizeHandle === 'nw' || resizeHandle === 'sw') newMinX = newMaxX - 2;
                        else newMaxX = newMinX + 2;
                    }
                    if (newMaxY - newMinY < 2) {
                        if (resizeHandle === 'nw' || resizeHandle === 'ne') newMinY = newMaxY - 2;
                        else newMaxY = newMinY + 2;
                    }

                    const newWidth = newMaxX - newMinX;
                    const newHeight = newMaxY - newMinY;

                    const scaleX = oldWidth > 0 ? newWidth / oldWidth : 1;
                    const scaleY = oldHeight > 0 ? newHeight / oldHeight : 1;

                    updated.points = updated.points.map(p => ({
                        x: newMinX + (p.x - oldMinX) * scaleX,
                        y: newMinY + (p.y - oldMinY) * scaleY
                    }));
                    if (updated.points.length > 0) {
                        updated.x = updated.points[0].x;
                        updated.y = updated.points[0].y;
                    }
                }
                return updated;
            }
            return el;
        });
        setElements(newElements);
        lastMousePosRef.current = canvasPos;
        const updatedEl = newElements.find(el => el.id === selectedElementId);
        if (updatedEl) {
           socketRef.current?.emit("update-element", { slug, element: updatedEl });
        }
        return;
    }

    if (action === "moving" && selectedElementId && lastMousePosRef.current) {
      const dx = canvasPos.x - lastMousePosRef.current.x;
      const dy = canvasPos.y - lastMousePosRef.current.y;
      
      const newElements = elements.map(el => {
         if (el.id === selectedElementId) {
            const updated = { ...el, x: el.x + dx, y: el.y + dy };
            if (updated.type === "pencil" && updated.points) {
               updated.points = updated.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
            }
            return updated;
         }
         return el;
      });
      setElements(newElements);
      lastMousePosRef.current = canvasPos;
      
      const updatedEl = newElements.find(el => el.id === selectedElementId);
      if (updatedEl) {
         socketRef.current?.emit("update-element", { slug, element: updatedEl });
      }
      return;
    }

    const startPoint = startPointRef.current;
    if (action === "drawing" && startPoint) {
      if (selectedTool === "pencil") {
        currentPointsRef.current.push(canvasPos);
        
        socketRef.current?.emit("draw", {
          slug,
          data: { lastPoint: lastMousePosRef.current, currentPoint: canvasPos, color: "white" },
        });
        lastMousePosRef.current = canvasPos;
        
        const preview: WhiteboardElement = {
           id: "local", type: "pencil", points: [...currentPointsRef.current], stroke: "white", x: startPoint.x, y: startPoint.y
        };
        setRemotePreviews(prev => ({ ...prev, "local": preview }));
      } else {
        const width = canvasPos.x - startPoint.x;
        const height = canvasPos.y - startPoint.y;
        const radius = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));

        const preview: WhiteboardElement = {
          id: "local",
          type: selectedTool as any,
          x: startPoint.x,
          y: startPoint.y,
          width,
          height,
          radius,
          stroke: "rgba(255,255,255,0.5)"
        };

        setRemotePreviews(prev => ({ ...prev, "local": preview }));
        socketRef.current?.emit("draw-shape", { slug, data: { shape: preview } });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (selectedTool === "text" || action === "writing") return;
    if (action === "panning") {
      setAction("none");
      return;
    }

    if (action === "moving" || action === "resizing") {
       setAction("none");
       setResizeHandle(null);
       socketRef.current?.emit("save-canvas", { slug, elements });
       return;
    }

    const startPoint = startPointRef.current;
    if (action === "drawing" && startPoint) {
      setAction("none");
      const canvasPos = getCanvasCoords(e);
      const id = uuidv4();
      let newElement: WhiteboardElement;

      if (selectedTool === "pencil") {
        newElement = { id, type: "pencil", points: currentPointsRef.current, stroke: "white", x: startPoint.x, y: startPoint.y };
      } else if (selectedTool === "rect" || selectedTool === "line" || selectedTool === "arrow" || selectedTool === "rhombus") {
        newElement = { 
          id, type: selectedTool as any, x: startPoint.x, y: startPoint.y, 
          width: canvasPos.x - startPoint.x, height: canvasPos.y - startPoint.y, 
          stroke: "white" 
        };
      } else {
        const radius = Math.sqrt(Math.pow(canvasPos.x - startPoint.x, 2) + Math.pow(canvasPos.y - startPoint.y, 2));
        newElement = { id, type: "circle", x: startPoint.x, y: startPoint.y, radius, stroke: "white" };
      }

      const nextElements = [...elements, newElement];
      setElements(nextElements);
      
      setRemotePreviews((prev) => {
          const next = { ...prev };
          delete next["local"];
          return next;
      });

      socketRef.current?.emit("save-canvas", { slug, elements: nextElements });
      socketRef.current?.emit("broadcast-element", { slug, element: newElement });
      socketRef.current?.emit("draw-shape", { slug, data: { shape: null } });

      startPointRef.current = null;
      currentPointsRef.current = [];
    }
  };

  const commitText = () => {
    if (textInput && textInput.text.trim()) {
      const id = textInput.id || uuidv4();
      const newElement: WhiteboardElement = {
        id, type: "text", x: textInput.x, y: textInput.y,
        text: textInput.text, fontSize: 24, stroke: "white"
      };
      
      const newElements = textInput.id 
          ? elements.map(e => e.id === textInput.id ? newElement : e) 
          : [...elements, newElement];
          
      setElements(newElements);
      socketRef.current?.emit("save-canvas", { slug, elements: newElements });
      
      if (textInput.id) {
          socketRef.current?.emit("update-element", { slug, element: newElement });
          socketRef.current?.emit("unlock-element", { slug, id });
      } else {
          socketRef.current?.emit("broadcast-element", { slug, element: newElement });
      }
    } else if (textInput?.id) {
      // If we cleared the text, delete it
       setElements(prev => prev.filter(el => el.id !== textInput.id));
       socketRef.current?.emit("delete-element", { slug, id: textInput.id });
       socketRef.current?.emit("save-canvas", { slug, elements: elements.filter(el => el.id !== textInput.id) });
       socketRef.current?.emit("unlock-element", { slug, id: textInput.id });
    }

    setTextInput(null);
    setAction("none");
  };

  const handleWheel = (e: React.WheelEvent | WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
        const delta = -(e as WheelEvent).deltaY * 0.003;
        handleZoom(delta, { x: (e as WheelEvent).clientX, y: (e as WheelEvent).clientY });
    } else {
        setCamera(prev => ({
            ...prev,
            x: prev.x - (e as WheelEvent).deltaX,
            y: prev.y - (e as WheelEvent).deltaY
        }));
    }
  };

  useEffect(() => {
     const canvasContainer = document.getElementById("canvas-container");
     if (canvasContainer) {
         canvasContainer.addEventListener("wheel", handleWheel as EventListener, { passive: false });
         return () => canvasContainer.removeEventListener("wheel", handleWheel as EventListener);
     }
  }, [camera]); 

  const handleZoom = (delta: number, mousePos?: { x: number; y: number }) => {
     setCamera(prev => {
        const newZoom = Math.min(Math.max(0.1, prev.zoom + delta), 5); 
        const center = mousePos || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const scaleChange = newZoom / prev.zoom;
        const newX = center.x - (center.x - prev.x) * scaleChange;
        const newY = center.y - (center.y - prev.y) * scaleChange;

        return { x: newX, y: newY, zoom: newZoom };
     });
  };

  const handleClear = () => {
    if (!window.confirm("Clear entire whiteboard for everyone?")) return;
    setElements([]);
    setRemotePreviews({});
    setSelectedElementId(null);
    socketRef.current?.emit("clear-canvas", slug);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Room link copied to clipboard!");
  };

  const saveDisplayName = async () => {
    setIsEditingName(false);
    socketRef.current?.emit("update-my-info", { slug, name: myDisplayName });
    try {
       await fetch("/api/user/name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: myDisplayName })
       });
    } catch (e) {
       console.error("Failed to save display name to backend.", e);
    }
  };

  return (
    <div id="canvas-container" className="relative w-full h-screen overflow-hidden bg-[#121212] text-white select-none">
      <Toolbar selectedTool={selectedTool} setSelectedTool={setSelectedTool} onClear={handleClear} />
      <ZoomControls zoom={camera.zoom} onZoom={handleZoom} />
      
      <div className="dashboard-ui-element absolute top-4 right-4 z-50 flex items-center gap-3">
        <div className="px-4 py-2 bg-[#1E1E1E]/90 backdrop-blur-md rounded-xl border border-white/10 shadow-lg flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <span className="text-sm font-semibold text-zinc-100">{Object.keys(cursors).length + 1} Online</span>
        </div>
        
        <button 
          onClick={handleShare}
          className="p-2.5 bg-[#1E1E1E]/90 backdrop-blur-md rounded-xl border border-white/10 shadow-lg hover:bg-neutral-800 transition-colors text-zinc-300"
          title="Share Room Link"
        >
          <Share2 size={18} />
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsEditingName(!isEditingName)}
            className="px-3 py-2 h-full bg-[#1E1E1E]/90 backdrop-blur-md rounded-xl border border-white/10 shadow-lg hover:bg-neutral-800 transition-colors text-zinc-300 flex items-center gap-2"
          >
            <User size={18} />
            <span className="text-sm font-medium pr-1">{myDisplayName}</span>
          </button>
          
          {isEditingName && (
            <div className="absolute top-full right-0 mt-3 p-4 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl w-64 z-[999] flex flex-col gap-3">
              <label className="text-sm font-semibold text-neutral-300">Set Display Name</label>
              <div className="flex gap-2">
                 <input 
                   autoFocus
                   type="text" 
                   value={myDisplayName} 
                   onChange={e => setMyDisplayName(e.target.value)} 
                   onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
                   className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                 />
                 <button 
                   onClick={saveDisplayName}
                   className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                 >
                   Save
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className={`fixed top-0 left-0 touch-none ${
           action === "panning" ? "cursor-grab active:cursor-grabbing" : 
           action === "resizing" ? (resizeHandle === 'nw' || resizeHandle === 'se' ? "cursor-nwse-resize" : "cursor-nesw-resize") :
           selectedTool === "select" ? "cursor-default" : 
           selectedTool === "hand" ? "cursor-grab" :
           selectedTool === "text" ? "cursor-text" : 
           selectedTool === "eraser" ? "cursor-crosshair" : "cursor-crosshair"
        }`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
            if (action === "drawing" || action === "moving" || action === "resizing") {
                handleMouseUp({ clientX: lastMousePosRef.current?.x ?? 0, clientY: lastMousePosRef.current?.y ?? 0 } as any);
            }
        }}
      />

      {Object.entries(cursors).map(([id, pos]) => {
         if (id === socketRef.current?.id) return null;
         
         const screenX = pos.x * camera.zoom + camera.x;
         const screenY = pos.y * camera.zoom + camera.y;

         return (
          <div 
            key={id} 
            className="absolute pointer-events-none transition-all duration-75 ease-out z-40" 
            style={{ left: `${screenX}px`, top: `${screenY}px` }}
          >
            <svg width="20" height="28" viewBox="0 0 20 28" fill="none" stroke="white" strokeWidth="2" className="drop-shadow-md text-indigo-500 fill-current">
                <path d="M0 0 L15.5 15 L8.5 15 L5.5 25 L0 0Z" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
            <div className="ml-3 mt-1 px-1.5 py-0.5 bg-indigo-500/90 backdrop-blur-md text-white text-[11px] font-bold rounded shadow-sm inline-block whitespace-nowrap">
              {pos.name || `User ${id.slice(0, 4)}`}
            </div>
          </div>
         );
      })}

      {action === "writing" && textInput && (
        <textarea
          autoFocus
          value={textInput.text}
          onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
          onBlur={() => {
            commitText();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitText();
            }
            if (e.key === "Escape") {
              commitText();
            }
          }}
          className="absolute z-[10000] pointer-events-auto bg-transparent border-none outline-none resize-none overflow-hidden font-sans text-white p-0 m-0"
          style={{
            left: `${textInput.x * camera.zoom + camera.x}px`,
            top: `${textInput.y * camera.zoom + camera.y}px`,
            fontSize: `${24 * camera.zoom}px`,
            lineHeight: "1.2",
            width: `${Math.max(160, (textInput.text.split('\n').reduce((max, line) => Math.max(max, line.length * 15), 0) * camera.zoom) + 24)}px`,
            height: `${Math.max(50, (textInput.text.split('\n').length * 24 * 1.2 * camera.zoom) + 16)}px`,
          }}
        />
      )}
    </div>
  );
}