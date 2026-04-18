"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const database_1 = require("@repo/database");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});
// In-memory locks map: { slug: { elementId: userId } }
const roomLocks = {};
io.on("connection", (socket) => {
    console.log("🚀 User connected:", socket.id);
    // 1. Join a specific whiteboard room
    // Added 'async' here so we can use 'await' inside
    socket.on("join-room", async (slug) => {
        socket.join(slug);
        console.log(`User ${socket.id} joined room: ${slug}`);
        try {
            // Fetch existing drawings from Neon
            const room = await database_1.prisma.room.findUnique({
                where: { slug },
                select: { elements: true }
            });
            // Send existing drawings only to the user who just joined
            if (room && room.elements) {
                const elements = typeof room.elements === 'string'
                    ? JSON.parse(room.elements)
                    : room.elements;
                socket.emit("init-state", elements);
            }
        }
        catch (error) {
            console.error("Error fetching room state:", error);
        }
    });
    socket.on("mouse-move", ({ slug, x, y }) => {
        socket.to(slug).volatile.emit("user-cursor", {
            userId: socket.id,
            x,
            y,
        });
    });
    // 2. Listen for real-time drawing data
    socket.on("draw", ({ slug, data }) => {
        // Broadcast to everyone ELSE in the same room
        socket.to(slug).emit("draw-client", data);
    });
    // element locking mechanics
    socket.on("lock-element", ({ slug, id }) => {
        if (!roomLocks[slug])
            roomLocks[slug] = {};
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
    // 3. Save the full canvas state to the database
    socket.on("save-canvas", async ({ slug, elements }) => {
        try {
            await database_1.prisma.room.update({
                where: { slug },
                data: {
                    // Storing as JSON string to ensure Neon saves it correctly
                    elements: JSON.stringify(elements)
                }
            });
            console.log(`💾 Saved ${elements.length} elements to Room: ${slug}`);
        }
        catch (e) {
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
    // 4. Handle clearing the canvas
    socket.on("clear-canvas", async (slug) => {
        await database_1.prisma.room.update({
            where: { slug },
            data: { elements: "[]" }
        });
        // Tell everyone else to wipe their screens
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
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`✅ Socket server running on http://localhost:${PORT}`);
});
