import { z } from "zod";
import type { Socket, Server } from "socket.io";
import { HOST_EVENTS, SERVER_EVENTS } from "../events.js";
import { getSessionRoom, getHostRoom } from "../rooms.js";
import { sessionRepository } from "@/modules/sessions/session.repository.js";
import { gameRepository } from "@/modules/games/game.repository.js";
import { gameFlowService } from "@/modules/game-flow/game-flow.service.js";
import { gameRuntimeManager } from "@/realtime/game-runtime.manager.js";
import { gameTimerManager } from "@/realtime/timer/game-timer.manager.js";
import { objectIdRegex } from "@/utils/helpers.js";

const joinSessionPayloadSchema = z.object({
  sessionId: z.string().regex(objectIdRegex, "Invalid session ID"),
});

const launchQuestionPayloadSchema = z.object({
  questionId: z.string({ error: "Invalid question ID" }).min(1),
});

/**
 * Registers event handlers for a connected host socket.
 */
export const registerHostHandlers = (socket: Socket, io: Server): void => {
  // Handle host join session
  socket.on(
    HOST_EVENTS.JOIN_SESSION,
    async (payload: unknown, callback?: (response: any) => void) => {
      const parsed = joinSessionPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return callback?.({ error: "Invalid payload" });
      }

      const { sessionId } = parsed.data;

      if (!socket.data.host || !socket.data.host.id) {
        return callback?.({ error: "Unauthorized" });
      }

      try {
        const session = await sessionRepository.findById(sessionId);
        if (!session) {
          return callback?.({ error: "Session not found" });
        }

        if (session.ownerId !== socket.data.host.id) {
          return callback?.({ error: "Unauthorized" });
        }

        await socket.join(getSessionRoom(sessionId));
        await socket.join(getHostRoom(sessionId));
        await socket.join(`host:${socket.data.host.id}`);

        socket.data.sessionId = sessionId;

        callback?.({
          sessionId: session._id.toString(),
          roomCode: session.roomCode,
          status: session.status,
        });
      } catch (error) {
        console.error("[socket] Error in host:join-session:", error);
        callback?.({ error: "Internal error" });
      }
    }
  );
  // Handle session start
  socket.on(
    HOST_EVENTS.START_SESSION,
    async (_payload: unknown, callback?: (response: any) => void) => {
      const sessionId = socket.data.sessionId;
      if (!sessionId) {
        return callback?.({ error: "No active session" });
      }

      if (!socket.data.host || !socket.data.host.id) {
        return callback?.({ error: "Unauthorized" });
      }

      try {
        const startedSession = await gameFlowService.startSession(sessionId);

        // Broadcast to the entire session room
        io.to(getSessionRoom(sessionId)).emit(SERVER_EVENTS.SESSION_STARTED, {
          sessionId,
          status: "LIVE",
          startedAt: startedSession.startedAt,
        });

        // Acknowledge success to host
        callback?.({
          success: true,
          sessionId,
          status: "LIVE",
        });
      } catch (error: any) {
        console.error("[socket] Error starting session:", error);
        callback?.({ error: error.message || "Internal error" });
      }
    }
  );

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
    HOST_EVENTS.LAUNCH_QUESTION,
    async (payload: unknown, callback?: (response: any) => void) => {
      const parsed = launchQuestionPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return callback?.({ error: "Invalid payload" });
      }

      const { questionId } = parsed.data;
      const sessionId = socket.data.sessionId;
      if (!sessionId) {
        return callback?.({ error: "No active session" });
      }

      const runtime = gameRuntimeManager.get(sessionId);
      if (!runtime) {
        return callback?.({ error: "Runtime not found" });
      }

      if (runtime.currentQuestion !== null) {
        return callback?.({ error: "Another question is currently active" });
      }

      try {
        const session = await sessionRepository.findById(sessionId);
        if (!session) {
          return callback?.({ error: "Session not found" });
        }
        if (session.status !== "LIVE") {
          return callback?.({ error: "Session is not live" });
        }

        const game = await gameRepository.findById(session.gameId.toString());
        if (!game) {
          return callback?.({ error: "Game not found" });
        }

        const questionObj = game.questions.find((q: any) => q.id === questionId);
        if (!questionObj) {
          return callback?.({ error: "Question not found" });
        }

        const startedAt = new Date();
        const endsAt = new Date(startedAt.getTime() + game.timeLimitPerQuestion * 1000);

        runtime.currentQuestion = {
          questionId,
          order: questionObj.order,
          startedAt,
          endsAt,
        };

        for (const p of runtime.participants.values()) {
          p.hasAnsweredCurrentQuestion = false;
        }

        runtime.submissions = {};
        runtime.statistics = {};

        gameTimerManager.startQuestionTimer(
          sessionId,
          questionId,
          endsAt,
          async (sId, qId) => {
            try {
              await gameFlowService.endQuestion(sId, qId);
            } catch (err) {
              console.error("[timer] Error in endQuestion callback:", err);
            }
          }
        );

        io.to(getSessionRoom(sessionId)).emit(SERVER_EVENTS.QUESTION_STARTED, {
          questionId,
          question: questionObj.question,
          type: questionObj.type,
          options: questionObj.options,
          startedAt,
          endsAt,
        });

        callback?.({ success: true });
      } catch (error) {
        console.error("[socket] Error launching question:", error);
        callback?.({ error: "Internal error" });
      }
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
