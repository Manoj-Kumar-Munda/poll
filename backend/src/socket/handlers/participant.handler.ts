import type { Socket, Server } from "socket.io";
import { z } from "zod";
import { PARTICIPANT_EVENTS, SERVER_EVENTS } from "../events.js";
import { getHostRoom, getSessionRoom } from "../rooms.js";
import { participantRepository } from "@/modules/participants/participant.repository.js";
import { sessionRepository } from "@/modules/sessions/session.repository.js";
import { gameRuntimeManager } from "@/realtime/game-runtime.manager.js";
import { answersMatch } from "@/modules/game-flow/scoring.service.js";

const joinSessionPayloadSchema = z.object({
  participantId: z.string().min(1),
});

const answerPayloadSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  answer: z.unknown(),
});

type JoinSessionAcknowledgement =
  | { error: string }
  | { participantId: string; sessionId: string; connected: true };

/**
 * Registers event handlers for a connected participant socket.
 */
export const registerParticipantHandlers = (
  socket: Socket,
  io: Server,
): void => {
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

    io.to(getHostRoom(sessionId)).emit(SERVER_EVENTS.PARTICIPANT_DISCONNECTED, {
      participantId,
      name: runtimeParticipant.name,
    });
  });

  socket.on(PARTICIPANT_EVENTS.ANSWER, (data: unknown) => {
    const parsed = answerPayloadSchema.safeParse(data);
    if (!parsed.success) {
      return socket.emit(SERVER_EVENTS.ANSWER_RESULT, {
        isCorrect: false,
        accepted: false,
        message: "Invalid answer submission.",
      });
    }

    const { sessionId, questionId, answer } = parsed.data;
    const socketSessionId = socket.data.sessionId as string | undefined;
    const participantId = socket.data.participantId as string | undefined;
    const runtime = sessionId ? gameRuntimeManager.get(sessionId) : undefined;
    const activeQuestion = runtime?.currentQuestion;

    if (!sessionId || sessionId !== socketSessionId || !participantId) {
      console.warn(
        `[socket] Answer submission failed: invalid session for socket ${socket.id}`,
      );
      return;
    }

    if (
      !questionId ||
      !activeQuestion ||
      activeQuestion.questionId !== questionId
    ) {
      return socket.emit(SERVER_EVENTS.ANSWER_RESULT, {
        questionId,
        answer,
        isCorrect: false,
        accepted: false,
        message: "This question is no longer active.",
      });
    }

      if (runtime.finalizingQuestionId === questionId) {
        return socket.emit(SERVER_EVENTS.ANSWER_RESULT, {
          questionId,
          accepted: false,
          message: "This question is being finalized.",
        });
      }

      const submittedAt = new Date();
    if (submittedAt.getTime() > activeQuestion.endsAt.getTime()) {
      return socket.emit(SERVER_EVENTS.ANSWER_RESULT, {
        questionId,
        accepted: false,
        message: "The answer deadline has passed.",
      });
    }

    const participant = runtime.participants.get(participantId);
    if (!participant || participant.hasAnsweredCurrentQuestion) {
      return socket.emit(SERVER_EVENTS.ANSWER_RESULT, {
        questionId,
        answer,
        isCorrect: false,
        accepted: false,
        message: "You have already answered this question.",
      });
    }

    const isCorrect = answersMatch(answer, activeQuestion.correctAnswer);
    const responseTimeMs = Math.max(
      0,
      submittedAt.getTime() - activeQuestion.startedAt.getTime(),
    );

    participant.hasAnsweredCurrentQuestion = true;
    runtime.submissions.set(participantId, {
      questionId,
      participantId,
      answer,
      isCorrect,
      submittedAt,
      responseTimeMs,
      scoreAwarded: 0,
    });

    console.log(
      `[socket] Participant ${socket.id} submitted answer for question ${questionId} in session ${sessionId}`,
    );

    // Forward the live submission to the host room
    io.to(getHostRoom(sessionId)).emit(SERVER_EVENTS.PARTICIPANT_ANSWERED, {
      socketId: socket.id,
      participantId,
      questionId,
      answer,
    });

    socket.emit(SERVER_EVENTS.ANSWER_RESULT, {
      questionId,
      accepted: true,
    });
  });
};
