import { z } from "zod";
import type { Socket, Server } from "socket.io";
import { HOST_EVENTS, SERVER_EVENTS } from "../events.js";
import { getSessionRoom, getHostRoom } from "../rooms.js";
import { sessionRepository } from "@/modules/sessions/session.repository.js";
import { gameRepository } from "@/modules/games/game.repository.js";
import { gameFlowService } from "@/modules/game-flow/game-flow.service.js";
import { gameRuntimeManager } from "@/realtime/game-runtime.manager.js";
import { questionTimerManager } from "@/realtime/timer/question-timer.manager.js";
import { objectIdRegex } from "@/utils/helpers.js";
import type { QuestionFinalizationResult } from "@/modules/game-flow/game-flow.types.js";

const joinSessionPayloadSchema = z.object({
  sessionId: z.string().regex(objectIdRegex, "Invalid session ID"),
});

const launchQuestionPayloadSchema = z.object({
  questionId: z.string({ error: "Invalid question ID" }).min(1),
});

const endQuestionPayloadSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
});

const endSessionPayloadSchema = z.object({
  sessionId: z.string().regex(objectIdRegex, "Invalid session ID"),
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
    },
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
    },
  );

  // Handle session end
  socket.on(
    HOST_EVENTS.END_SESSION,
    async (data: unknown, callback?: (response: any) => void) => {
      const parsed = endSessionPayloadSchema.safeParse(data);
      if (!parsed.success) {
        return callback?.({ error: "Invalid payload" });
      }

      const { sessionId } = parsed.data;
      const hostSessionId = socket.data.sessionId;
      if (!hostSessionId || sessionId !== hostSessionId) {
        return callback?.({ error: "Invalid session" });
      }

      if (!socket.data.host?.id) {
        return callback?.({ error: "Unauthorized" });
      }

      try {
        /* Close the active question first so clients do not remain in a
        question state after the session has ended. */
        const activeQuestionId =
          gameRuntimeManager.get(sessionId)?.currentQuestion?.questionId;
        if (activeQuestionId) {
          await finalizeQuestion(sessionId, activeQuestionId);
        }

        const endedSession = await gameFlowService.endSession(sessionId);

        io.to(getSessionRoom(sessionId)).emit(SERVER_EVENTS.SESSION_ENDED, {
          sessionId,
          status: endedSession.status,
          endedAt: endedSession.endedAt,
        });

        callback?.({
          success: true,
          sessionId,
          status: endedSession.status,
        });
      } catch (error: any) {
        console.error("[socket] Error ending session:", error);
        callback?.({ error: error.message || "Internal error" });
      }
    },
  );

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

        const questionObj = game.questions.find(
          (q: any) => q.id === questionId,
        );
        if (!questionObj) {
          return callback?.({ error: "Question not found" });
        }

        const startedAt = new Date();
        const endsAt = new Date(
          startedAt.getTime() + game.timeLimitPerQuestion * 1000,
        );

        runtime.currentQuestion = {
          questionId,
          order: questionObj.order,
          startedAt,
          endsAt,
          correctAnswer: questionObj.correctAnswer ?? undefined,
        };

        for (const p of runtime.participants.values()) {
          p.hasAnsweredCurrentQuestion = false;
        }

        runtime.submissions = new Map();

        questionTimerManager.startQuestionTimer(
          sessionId,
          questionId,
          endsAt,
          async (sId, qId) => {
            try {
              await finalizeQuestion(sId, qId);
            } catch (err) {
              console.error("[timer] Error in endQuestion callback:", err);
            }
          },
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
    },
  );

  // Handle question end
  socket.on(
    HOST_EVENTS.END_QUESTION,
    (data: unknown, callback?: (response: any) => void) => {
      const parsed = endQuestionPayloadSchema.safeParse(data);
      if (!parsed.success) {
        console.warn(
          `[socket] Question end failed: invalid payload from socket ${socket.id}`,
        );
        callback?.({ error: "Invalid payload" });
        return;
      }

      const { sessionId, questionId } = parsed.data;
      const hostSessionId = socket.data.sessionId;
      if (!sessionId || !questionId || sessionId !== hostSessionId) {
        console.warn(
          `[socket] Question end failed: invalid session or questionId from socket ${socket.id}`,
        );
        callback?.({ error: "Invalid session" });
        return;
      }

      console.log(
        `[socket] Host ${socket.id} ending question ${questionId} in session ${sessionId}`,
      );

      void finalizeQuestion(sessionId, questionId)
        .then((result) => {
          callback?.({
            success: true,
            finalized: result.finalized,
            sessionId,
            questionId,
          });
        })
        .catch((error) => {
          console.error("[socket] Error ending question:", error);
          callback?.({ error: error.message || "Internal error" });
        });
    },
  );

  /**
   * Finalizes an active question by persisting scores/submissions and broadcasting final results,
   * updated leaderboards, and answer evaluations to connected clients.
   *
   * @param sessionId - The ID of the current game session.
   * @param questionId - The ID of the question being finalized.
   * @returns The question finalization result containing statistics, leaderboards, and participant results.
   */
  /** Finalizes a question and broadcasts its results to the session. */
  async function finalizeQuestion(
    sessionId: string,
    questionId: string,
  ): Promise<QuestionFinalizationResult> {
    const result = await gameFlowService.endQuestion(sessionId, questionId);
    if (!result.finalized) return result;

    io.to(getSessionRoom(sessionId)).emit(SERVER_EVENTS.QUESTION_ENDED, {
      sessionId,
      questionId: result.questionId,
      endedAt: result.endedAt,
      correctAnswer: result.correctAnswer,
    });

    io.to(getSessionRoom(sessionId)).emit(SERVER_EVENTS.LEADERBOARD_UPDATED, {
      sessionId,
      questionId: result.questionId,
      leaderboard: result.leaderboard,
    });

    io.to(getSessionRoom(sessionId)).emit(SERVER_EVENTS.STATISTICS_UPDATED, {
      sessionId,
      questionId: result.questionId,
      statistics: result.statistics,
    });

    for (const participantResult of result.participantResults) {
      if (!participantResult.socketId) continue;

      io.to(participantResult.socketId).emit(SERVER_EVENTS.ANSWER_RESULT, {
        questionId: result.questionId,
        accepted: true,
        isCorrect: participantResult.isCorrect,
        responseTimeMs: participantResult.responseTimeMs,
        scoreAwarded: participantResult.scoreAwarded,
      });
    }

    return result;
  }
};
