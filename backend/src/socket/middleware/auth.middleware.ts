import type { Socket } from "socket.io";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/modules/auth/auth.js";

/**
 * Socket.IO authentication middleware.
 * Authenticates hosts via Better Auth session cookie during handshake.
 * Bypasses authentication for participants.
 */
export const authMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> => {
  const queryRole = socket.handshake.query.role;
  const authRole = socket.handshake.auth?.role;
  const role = queryRole || authRole;

  if (role === "host") {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(socket.handshake.headers),
      });

      if (!session) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      };

      return next();
    } catch (error) {
      console.error("[socket] Authentication middleware error:", error);
      return next(new Error("Unauthorized"));
    }
  }
  next();
};
