import type { Socket, Server } from "socket.io";
import { z } from "zod";
import { PARTICIPANT_EVENTS, SERVER_EVENTS } from "../events.js";
import { getHostRoom, getSessionRoom } from "../rooms.js";
import { participantRepository } from "@/modules/participants/participant.repository.js";
import { sessionRepository } from "@/modules/sessions/session.repository.js";
import { gameRuntimeManager } from "@/realtime/game-runtime.manager.js";

const joinSessionPayloadSchema = z.object({
  participantId: z.string().min(1),
});

type JoinSessionAcknowledgement =
  | { error: string }
  | { participantId: string; sessionId: string; connected: true };

/**
 * Registers event handlers for a connected participant socket.
 */
export const registerParticipantHandlers = (socket: Socket, io: Server): void => {
  socket.on(
    PARTICIPANT_EVENTS.JOIN_SESSION,
    async (
      payload: unknown,
      callback?: (response: JoinSessionAcknowledgement) => void,
    ) => {
      const parsed = joinSessionPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return callback?.({ error: "Invalid payload" });
      }

      const { participantId } = parsed.data;

      try {
        const participant = await participantRepository.findById(participantId);
        if (!participant) {
          return callback?.({ error: "Participant not found" });
        }

        const sessionId = participant.sessionId.toString();
        const session = await sessionRepository.findById(sessionId);
        if (!session) {
          return callback?.({ error: "Session not found" });
        }

        await socket.join(getSessionRoom(sessionId));

        socket.data.participantId = participantId;
        socket.data.sessionId = sessionId;

        const runtime = gameRuntimeManager.get(sessionId);
        const runtimeParticipant = runtime?.participants.get(participantId);
        if (runtimeParticipant) {
          runtimeParticipant.connected = true;
          runtimeParticipant.socketId = socket.id;

          io.to(getHostRoom(sessionId)).emit(
            SERVER_EVENTS.PARTICIPANT_CONNECTED,
            {
              participantId,
              name: runtimeParticipant.name,
            },
          );
        }

        return callback?.({ participantId, sessionId, connected: true });
      } catch (error) {
        console.error("[socket] Error in participant:join-session:", error);
        return callback?.({ error: "Internal error" });
      }
    },
  );

  socket.on("disconnect", () => {
    const participantId = socket.data.participantId as string | undefined;
    const sessionId = socket.data.sessionId as string | undefined;
    if (!participantId || !sessionId) return;

    const runtime = gameRuntimeManager.get(sessionId);
    const runtimeParticipant = runtime?.participants.get(participantId);
    if (!runtimeParticipant) return;

    runtimeParticipant.connected = false;
    runtimeParticipant.socketId = null;

    io.to(getHostRoom(sessionId)).emit(
      SERVER_EVENTS.PARTICIPANT_DISCONNECTED,
      {
        participantId,
        name: runtimeParticipant.name,
      },
    );
  });

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
