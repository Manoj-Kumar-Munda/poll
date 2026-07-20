import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";

import { config } from "@/config/index.js";
import { handleConnection } from "./handlers/connection.handler.js";
import { authMiddleware } from "./middleware/auth.middleware.js";

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

  io.use(authMiddleware);

  io.on("connection", (socket) => {
    handleConnection(io, socket);
  });

  console.log("[socket] Socket.IO server initialised (single instance on '/')");

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
