import type { Socket, Server } from "socket.io";
import { registerHostHandlers } from "./host.handler.js";
import { registerParticipantHandlers } from "./participant.handler.js";
import { SYSTEM_EVENTS } from "../events.js";

/**
 * Handles new Socket.IO connections.
 * Identifies the client's role immediately via handshake query/auth,
 * or dynamically via the 'identify' system event.
 */
export const handleConnection = (io: Server, socket: Socket): void => {
  // Check handshake query or auth for role
  const queryRole = socket.handshake.query.role;
  const authRole = socket.handshake.auth?.role;
  const role = (queryRole || authRole) as string | undefined;

  console.log(`[socket] Client connected: ${socket.id} (handshake role: ${role ?? "none"})`);

  let registeredRole: string | null = null;

  const registerRoleHandlers = (roleName: string) => {
    if (registeredRole) {
      console.warn(`[socket] Role handlers already registered for socket ${socket.id} (role: ${registeredRole})`);
      return;
    }

    if (roleName === "host") {
      registeredRole = "host";
      registerHostHandlers(socket, io);
      console.log(`[socket] Registered host handlers for socket ${socket.id}`);
    } else if (roleName === "participant") {
      registeredRole = "participant";
      registerParticipantHandlers(socket, io);
      console.log(`[socket] Registered participant handlers for socket ${socket.id}`);
    } else {
      console.warn(`[socket] Unknown role "${roleName}" requested for socket ${socket.id}`);
    }
  };

  // If role is provided in handshake, register immediately
  if (role) {
    registerRoleHandlers(role);
  }

  // Also support dynamic identification via the identify event
  socket.on(SYSTEM_EVENTS.IDENTIFY, (data: { role: string }) => {
    if (!data || !data.role) {
      console.warn(`[socket] Identify event payload is invalid from socket ${socket.id}`);
      return;
    }
    console.log(`[socket] Received identify event: socket ${socket.id} identifies as ${data.role}`);
    registerRoleHandlers(data.role);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] Client disconnected: ${socket.id} (role: ${registeredRole ?? "none"}) — reason: ${reason}`);
  });
};
