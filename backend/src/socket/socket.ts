import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";

import { config } from "@/config/index.js";

let io: Server;

/**
 * Initialises the Socket.IO server and attaches it to the provided HTTP server.
 * Must be called once during application startup.
 */
export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin ?? config.clientUrl,
      credentials: true,
    },
  });

  const hostNamespace = io.of("/host");
  const participantNamespace = io.of("/participant");

  hostNamespace.on("connection", (socket) => {
    console.log(`[socket] host connected: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.log(`[socket] host disconnected: ${socket.id} — reason: ${reason}`);
    });
  });

  participantNamespace.on("connection", (socket) => {
    console.log(`[socket] participant connected: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.log(`[socket] participant disconnected: ${socket.id} — reason: ${reason}`);
    });
  });

  console.log("[socket] Socket.IO server initialised (/host, /participant)");

  return io;
};

/**
 * Returns the singleton Socket.IO server instance.
 * Throws if called before initSocket().
 */
export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO has not been initialised. Call initSocket() first.");
  }
  return io;
};
