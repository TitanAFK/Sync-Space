import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { prisma } from "@repo/database";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { DrawData } from "@repo/types";

const app = express();
app.use(cors());

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory locks map: { slug: { elementId: userId } }
const roomLocks: Record<string, Record<string, string>> = {};

io.on("connection", (socket) => {
  console.log("🚀 User connected:", socket.id);

  socket.on("join-room", async (slug: string) => {
    socket.join(slug);
    console.log(`User ${socket.id} joined room: ${slug}`);

    try {
      const room = await prisma.room.findUnique({
        where: { slug },
        select: { elements: true }
      });

      if (room && room.elements) {
        const elements = typeof room.elements === 'string' 
          ? JSON.parse(room.elements) 
          : room.elements;
        
        socket.emit("init-state", elements);
      }
    } catch (error) {
      console.error("Error fetching room state:", error);
    }
  });

  socket.on("mouse-move", ({ slug, x, y, name }) => {
    socket.to(slug).volatile.emit("user-cursor", {
      userId: socket.id,
      x,
      y,
      name,
    });
  });

  socket.on("update-my-info", ({ slug, name }) => {
    socket.to(slug).emit("user-info-updated", { userId: socket.id, name });
  });

  socket.on("draw", ({ slug, data }: { slug: string; data: DrawData }) => {
    socket.to(slug).emit("draw-client", data);
  });

  socket.on("lock-element", ({ slug, id }) => {
     if (!roomLocks[slug]) roomLocks[slug] = {};
     roomLocks[slug][id] = socket.id;
     socket.to(slug).volatile.emit("element-locked", { elementId: id, userId: socket.id });
  });

  socket.on("unlock-element", ({ slug, id }) => {
     if (roomLocks[slug] && roomLocks[slug][id] === socket.id) {
         delete roomLocks[slug][id];
         socket.to(slug).volatile.emit("element-unlocked", { elementId: id });
     }
  });

  socket.on("request-locks", (slug) => {
     if (roomLocks[slug]) {
         Object.entries(roomLocks[slug]).forEach(([elementId, userId]) => {
             socket.emit("element-locked", { elementId, userId });
         });
     }
  });

  socket.on("save-canvas", async ({ slug, elements }) => {
    try {
      await prisma.room.update({
        where: { slug },
        data: { 
          elements: JSON.stringify(elements) 
        }
      });
      console.log(`💾 Saved ${elements.length} elements to Room: ${slug}`);
    } catch (e: any) {
      if (e.code !== 'P2025') {
         console.error("Failed to save room:", e);
      }
    }
  });

  socket.on("broadcast-element", ({ slug, element }) => {
    socket.to(slug).emit("new-element", element);
  });

  socket.on("update-element", ({ slug, element }) => {
    socket.to(slug).emit("element-updated", element);
  });

  socket.on("delete-element", ({ slug, id }) => {
    socket.to(slug).emit("element-deleted", id);
  });

  socket.on("draw-shape", ({ slug, data }) => {
    // We use .volatile for high-frequency mouse movements
    socket.to(slug).volatile.emit("shape-preview", {
      userId: socket.id,
      shape: data.shape // This will be null when mouse is released
    });
  });

  socket.on("clear-canvas", async (slug: string) => {
    await prisma.room.update({
      where: { slug },
      data: { elements: "[]" }
    });
    io.to(slug).emit("canvas-cleared");
  });

  socket.on("disconnect", () => {
    io.emit("user-offline", socket.id);
    
    // Clean up locks when user drops
    for (const slug in roomLocks) {
       for (const elId in roomLocks[slug]) {
          if (roomLocks[slug][elId] === socket.id) {
             delete roomLocks[slug][elId];
             io.to(slug).emit("element-unlocked", { elementId: elId });
          }
       }
    }
    
    console.log("❌ User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Socket server running on http://localhost:${PORT}`);
});