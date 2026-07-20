import { ApiError } from "@/utils/ApiError.js";
import { sessionRepository } from "@/modules/sessions/session.repository.js";
import { gameRepository } from "@/modules/games/game.repository.js";
import { participantRepository } from "@/modules/participants/participant.repository.js";
import { gameRuntimeManager } from "@/realtime/game-runtime.manager.js";

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
          email: p.email || undefined,
          connected: false,
          socketId: null,
          joinedAt: p.joinedAt,
          score: 0,
          rank: 0,
          streak: 0,
          hasAnsweredCurrentQuestion: false,
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
    // 1. Fetch Session
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    // 2. Validate State
    if (session.status !== "LIVE") {
      throw new ApiError(
        400,
        `Cannot end session. Only LIVE sessions can be ended (current: ${session.status})`,
      );
    }

    // 3. Update Session
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

    // 4. Remove Runtime
    gameRuntimeManager.remove(sessionId);

    // 5. Return Result
    return updatedSession;
  },

  /**
   * Ends a question runtime. Placeholder integration point.
   */
  async endQuestion(sessionId: string, questionId: string) {
    console.log(
      `[gameFlowService] endQuestion integration point called for session: ${sessionId}, question: ${questionId}`
    );
  },
};
