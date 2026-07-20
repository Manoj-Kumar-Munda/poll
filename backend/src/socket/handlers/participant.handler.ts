import type { Socket, Server } from "socket.io";
import { PARTICIPANT_EVENTS, SERVER_EVENTS } from "../events.js";
import { getSessionRoom, getParticipantRoom, getHostRoom } from "../rooms.js";

/**
 * Registers event handlers for a connected participant socket.
 */
export const registerParticipantHandlers = (socket: Socket, io: Server): void => {
  // Handle participant join
  socket.on(
    PARTICIPANT_EVENTS.JOIN,
    (data: { sessionId: string; participantId: string }) => {
      const { sessionId, participantId } = data;
      if (!sessionId || !participantId) {
        console.warn(
          `[socket] Participant join failed: sessionId or participantId is missing from socket ${socket.id}`
        );
        return;
      }

      console.log(
        `[socket] Participant ${socket.id} (ID: ${participantId}) joining session: ${sessionId}`
      );

      // Join session-wide room and participant-specific room
      socket.join(getSessionRoom(sessionId));
      socket.join(getParticipantRoom(sessionId));

      // Notify the host room that a participant has joined
      io.to(getHostRoom(sessionId)).emit(SERVER_EVENTS.PARTICIPANT_JOINED, {
        participantId,
        socketId: socket.id,
      });
    }
  );

  // Handle participant answer submission
  socket.on(
    PARTICIPANT_EVENTS.ANSWER,
    (data: { sessionId: string; questionId: string; answer: any }) => {
      const { sessionId, questionId, answer } = data;
      if (!sessionId) {
        console.warn(
          `[socket] Answer submission failed: sessionId is missing from socket ${socket.id}`
        );
        return;
      }

      console.log(
        `[socket] Participant ${socket.id} submitted answer for question ${questionId} in session ${sessionId}`
      );

      // Forward the live submission to the host room
      io.to(getHostRoom(sessionId)).emit(SERVER_EVENTS.PARTICIPANT_ANSWERED, {
        socketId: socket.id,
        questionId,
        answer,
      });
    }
  );
};
