import type { Socket, Server } from "socket.io";
import { HOST_EVENTS, SERVER_EVENTS } from "../events.js";
import { getSessionRoom, getHostRoom } from "../rooms.js";

/**
 * Registers event handlers for a connected host socket.
 */
export const registerHostHandlers = (socket: Socket, io: Server): void => {
  // Handle session start
  socket.on(HOST_EVENTS.START_SESSION, (data: { sessionId: string }) => {
    const { sessionId } = data;
    if (!sessionId) {
      console.warn(`[socket] Session start failed: sessionId is missing from socket ${socket.id}`);
      return;
    }

    console.log(`[socket] Host ${socket.id} starting session: ${sessionId}`);

    // Join session-wide room and host-specific room
    socket.join(getSessionRoom(sessionId));
    socket.join(getHostRoom(sessionId));

    // Broadcast session started to all clients in the session room
    io.to(getSessionRoom(sessionId)).emit(SERVER_EVENTS.SESSION_STARTED, { sessionId });
  });

  // Handle session end
  socket.on(HOST_EVENTS.END_SESSION, (data: { sessionId: string }) => {
    const { sessionId } = data;
    if (!sessionId) {
      console.warn(`[socket] Session end failed: sessionId is missing from socket ${socket.id}`);
      return;
    }

    console.log(`[socket] Host ${socket.id} ending session: ${sessionId}`);

    // Broadcast session ended to all clients in the session room
    io.to(getSessionRoom(sessionId)).emit(SERVER_EVENTS.SESSION_ENDED, { sessionId });
  });

  // Handle question start
  socket.on(
    HOST_EVENTS.START_QUESTION,
    (data: { sessionId: string; questionId: string }) => {
      const { sessionId, questionId } = data;
      if (!sessionId || !questionId) {
        console.warn(
          `[socket] Question start failed: sessionId or questionId is missing from socket ${socket.id}`
        );
        return;
      }

      console.log(
        `[socket] Host ${socket.id} starting question ${questionId} in session ${sessionId}`
      );

      // Broadcast question started to all clients in the session room
      io.to(getSessionRoom(sessionId)).emit(SERVER_EVENTS.QUESTION_STARTED, {
        sessionId,
        questionId,
      });
    }
  );

  // Handle question end
  socket.on(
    HOST_EVENTS.END_QUESTION,
    (data: { sessionId: string; questionId: string }) => {
      const { sessionId, questionId } = data;
      if (!sessionId || !questionId) {
        console.warn(
          `[socket] Question end failed: sessionId or questionId is missing from socket ${socket.id}`
        );
        return;
      }

      console.log(
        `[socket] Host ${socket.id} ending question ${questionId} in session ${sessionId}`
      );

      // Broadcast question ended to all clients in the session room
      io.to(getSessionRoom(sessionId)).emit(SERVER_EVENTS.QUESTION_ENDED, {
        sessionId,
        questionId,
      });
    }
  );
};
