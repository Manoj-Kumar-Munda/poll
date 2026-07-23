import { ApiError } from "@/utils/ApiError.js";
import { sessionRepository } from "@/modules/sessions/session.repository.js";
import { gameRepository } from "@/modules/games/game.repository.js";
import { participantRepository } from "@/modules/participants/participant.repository.js";
import { submissionRepository } from "@/modules/submissions/submission.repository.js";
import { gameRuntimeManager } from "@/realtime/game-runtime.manager.js";
import { questionTimerManager } from "@/realtime/timer/question-timer.manager.js";
import { rankParticipants, scoreSubmission } from "./scoring.service.js";
import type {
  QuestionFinalizationResult,
  QuestionLeaderboardEntry,
  QuestionParticipantResult,
} from "./game-flow.types.js";

const questionFinalizations = new Map<
  string,
  Promise<QuestionFinalizationResult>
>();

/** Coordinates session lifecycle and question finalization. */
export const gameFlowService = {
  /**
   * Starts a game session.
   *
   * @param sessionId The ID of the session to start.
   * @throws ApiError if the session or game is not found, or is in an invalid state.
   */
  async startSession(sessionId: string) {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.status !== "WAITING") {
      throw new ApiError(
        400,
        `Cannot start session. Session must be in WAITING status (current: ${session.status})`,
      );
    }

    const game = await gameRepository.findById(session.gameId.toString());
    if (!game) {
      throw new ApiError(404, "Game not found");
    }

    if (game.status !== "PUBLISHED") {
      throw new ApiError(
        400,
        "Cannot start session. The associated game is not published",
      );
    }
    if (!game.questions || game.questions.length === 0) {
      throw new ApiError(
        400,
        "Cannot start session. The associated game contains no questions",
      );
    }

    const runtimeSessionId = session._id.toString();
    const participants =
      await participantRepository.findBySessionId(runtimeSessionId);

    const runtime = gameRuntimeManager.create(runtimeSessionId);

    if (participants && participants.length > 0) {
      for (const p of participants) {
        runtime.participants.set(p._id.toString(), {
          participantId: p._id.toString(),
          name: p.name,
          connected: false,
          socketId: null,
          hasAnsweredCurrentQuestion: false,
          stats: {
            score: 0,
            correctAnswers: 0,
            answeredQuestions: 0,
            totalResponseTimeMs: 0,
            streak: 0,
            rank: 0,
          },
        });
      }
    }

    const updatedSession = await sessionRepository.findOneAndUpdate(
      { _id: session._id },
      {
        status: "LIVE",
        startedAt: new Date(),
      },
    );

    if (!updatedSession) {
      throw new ApiError(500, "Failed to update session status");
    }
    return updatedSession;
  },

  /**
   * Ends a game session.
   *
   * @param sessionId The ID of the session to end.
   * @throws ApiError if the session is not found or is not currently LIVE.
   */
  async endSession(sessionId: string) {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.status !== "LIVE") {
      throw new ApiError(
        400,
        `Cannot end session. Only LIVE sessions can be ended (current: ${session.status})`,
      );
    }

    const updatedSession = await sessionRepository.findOneAndUpdate(
      { _id: session._id },
      {
        status: "FINISHED",
        endedAt: new Date(),
      },
    );

    if (!updatedSession) {
      throw new ApiError(500, "Failed to update session status");
    }

    questionTimerManager.cancelQuestionTimer(sessionId);
    gameRuntimeManager.remove(sessionId);

    return updatedSession;
  },

  /**
   * Ends the currently active question, calculates results and statistics, updates scores, and persists submissions.
   *
   * @param sessionId - The ID of the game session.
   * @param questionId - The ID of the question to finalize.
   * @returns An object containing finalized statistics, leaderboards, and participant results.
   */
  /** Finalizes a question, persists submissions, and calculates results. */
  async endQuestion(
    sessionId: string,
    questionId: string,
  ): Promise<QuestionFinalizationResult> {
    const key = `${sessionId}:${questionId}`;
    const existingFinalization = questionFinalizations.get(key);
    if (existingFinalization) return existingFinalization;

    const finalization = finalizeQuestion(sessionId, questionId);
    questionFinalizations.set(key, finalization);

    return finalization.finally(() => {
      if (questionFinalizations.get(key) === finalization) {
        questionFinalizations.delete(key);
      }
      const runtime = gameRuntimeManager.get(sessionId);
      if (runtime?.finalizingQuestionId === questionId) {
        runtime.finalizingQuestionId = undefined;
      }
    });
  },
};

/**
 * Internal helper function to finalize a question, persists submissions, and calculates results.
 */
async function finalizeQuestion(
  sessionId: string,
  questionId: string,
): Promise<QuestionFinalizationResult> {
  const runtime = gameRuntimeManager.get(sessionId);
  const activeQuestion = runtime?.currentQuestion;

  if (!runtime || !activeQuestion || activeQuestion.questionId !== questionId) {
    return {
      finalized: false,
      sessionId,
      questionId,
      leaderboard: [],
      participantResults: [],
      statistics: {
        totalParticipants: runtime?.participants.size ?? 0,
        answeredCount: 0,
        correctCount: 0,
        unansweredCount: runtime?.participants.size ?? 0,
        averageResponseTimeMs: 0,
      },
    };
  }

  if (runtime.finalizingQuestionId === questionId) {
    return {
      finalized: false,
      sessionId,
      questionId,
      leaderboard: [],
      participantResults: [],
      statistics: {
        totalParticipants: runtime.participants.size,
        answeredCount: 0,
        correctCount: 0,
        unansweredCount: runtime.participants.size,
        averageResponseTimeMs: 0,
      },
    };
  }

  const submissions = Array.from(runtime.submissions.values());
  const endedAt = new Date();

  questionTimerManager.cancelQuestionTimer(sessionId);
  runtime.finalizingQuestionId = questionId;

  const session = await sessionRepository.findById(sessionId);
  if (!session) throw new ApiError(404, "Session not found");

  const game = await gameRepository.findById(session.gameId.toString());
  if (!game) throw new ApiError(404, "Game not found");

  const nextStats = new Map(
    Array.from(runtime.participants.values()).map((participant) => [
      participant.participantId,
      { ...participant.stats },
    ]),
  );
  const participantResults: QuestionParticipantResult[] = [];
  const persistedSubmissions = submissions
    .map((submission) => {
      const participant = runtime.participants.get(submission.participantId);
      if (!participant) return null;

      const score = scoreSubmission({
        submission,
        startedAt: activeQuestion.startedAt,
        endsAt: activeQuestion.endsAt,
        pointsPerQuestion: game.pointsPerQuestion,
      });

      submission.responseTimeMs = score.responseTimeMs;
      submission.scoreAwarded = score.scoreAwarded;

      const stats = nextStats.get(participant.participantId);
      if (!stats) return null;

      stats.answeredQuestions += 1;
      stats.totalResponseTimeMs += score.responseTimeMs;
      stats.score += score.scoreAwarded;
      stats.streak = submission.isCorrect ? stats.streak + 1 : 0;

      if (submission.isCorrect) stats.correctAnswers += 1;

      participantResults.push({
        participantId: participant.participantId,
        socketId: participant.socketId,
        isCorrect: submission.isCorrect,
        responseTimeMs: score.responseTimeMs,
        scoreAwarded: score.scoreAwarded,
      });

      return {
        sessionId,
        participantId: submission.participantId,
        questionId: submission.questionId,
        answer: String(submission.answer ?? ""),
        isCorrect: submission.isCorrect,
        responseTimeMs: score.responseTimeMs,
        scoreAwarded: score.scoreAwarded,
        submittedAt: submission.submittedAt,
      };
    })
    .filter(
      (submission): submission is NonNullable<typeof submission> =>
        submission !== null,
    );

  const submittedParticipantIds = new Set(
    participantResults.map((result) => result.participantId),
  );
  for (const participant of runtime.participants.values()) {
    if (!submittedParticipantIds.has(participant.participantId)) {
      const stats = nextStats.get(participant.participantId);
      if (stats) stats.streak = 0;
    }
  }

  const rankedParticipants = rankParticipants(
    Array.from(runtime.participants.values()).map((participant) => ({
      ...participant,
      stats: nextStats.get(participant.participantId) ?? {
        ...participant.stats,
      },
    })),
  );
  const leaderboard: QuestionLeaderboardEntry[] = rankedParticipants.map(
    (participant) => ({
      participantId: participant.participantId,
      name: participant.name,
      ...participant.stats,
    }),
  );

  await submissionRepository.upsertMany(persistedSubmissions);
  await participantRepository.updateResultsMany(
    rankedParticipants.map((participant) => ({
      participantId: participant.participantId,
      finalScore: participant.stats.score,
      finalRank: participant.stats.rank,
      correctAnswers: participant.stats.correctAnswers,
      averageResponseTime:
        participant.stats.answeredQuestions === 0
          ? 0
          : participant.stats.totalResponseTimeMs /
            participant.stats.answeredQuestions,
    })),
  );

  const answeredCount = participantResults.length;
  const correctCount = participantResults.filter(
    (result) => result.isCorrect,
  ).length;

  for (const participant of runtime.participants.values()) {
    const stats = nextStats.get(participant.participantId);
    if (stats) participant.stats = stats;
  }
  runtime.currentQuestion = null;
  runtime.finalizingQuestionId = undefined;

  return {
    finalized: true,
    sessionId,
    questionId,
    correctAnswer: activeQuestion.correctAnswer,
    endedAt,
    leaderboard,
    participantResults,
    statistics: {
      totalParticipants: runtime.participants.size,
      answeredCount,
      correctCount,
      unansweredCount: Math.max(0, runtime.participants.size - answeredCount),
      averageResponseTimeMs:
        answeredCount === 0
          ? 0
          : participantResults.reduce(
              (total, result) => total + result.responseTimeMs,
              0,
            ) / answeredCount,
    },
  };
}
