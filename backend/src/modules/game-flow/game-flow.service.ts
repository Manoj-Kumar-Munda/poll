import { ApiError } from "@/utils/ApiError.js";
import { sessionRepository } from "@/modules/sessions/session.repository.js";
import { gameRepository } from "@/modules/games/game.repository.js";
import { gameRuntimeManager } from "@/realtime/game-runtime.manager.js";

export const gameFlowService = {
  /**
   * Starts a game session.
   *
   * @param sessionId The ID of the session to start.
   * @throws ApiError if the session or game is not found, or is in an invalid state.
   */
  async startSession(sessionId: string) {
    // 1. Fetch Session
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    // 2. Validate Session State
    if (session.status !== "WAITING") {
      throw new ApiError(
        400,
        `Cannot start session. Session must be in WAITING status (current: ${session.status})`
      );
    }

    // 3. Fetch Game
    const game = await gameRepository.findById(session.gameId.toString());
    if (!game) {
      throw new ApiError(404, "Game not found");
    }

    // 4. Validate Game
    if (game.status !== "PUBLISHED") {
      throw new ApiError(
        400,
        "Cannot start session. The associated game is not published"
      );
    }
    if (!game.questions || game.questions.length === 0) {
      throw new ApiError(
        400,
        "Cannot start session. The associated game contains no questions"
      );
    }

    // 5. Create Runtime
    const runtimeSessionId = session._id.toString();
    if (!gameRuntimeManager.has(runtimeSessionId)) {
      gameRuntimeManager.create(runtimeSessionId);
    }

    // 6. Update Session
    const updatedSession = await sessionRepository.findOneAndUpdate(
      { _id: session._id },
      {
        status: "LIVE",
        startedAt: new Date(),
      }
    );

    if (!updatedSession) {
      throw new ApiError(500, "Failed to update session status");
    }

    // 7. Return Result
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
        `Cannot end session. Only LIVE sessions can be ended (current: ${session.status})`
      );
    }

    // 3. Update Session
    const updatedSession = await sessionRepository.findOneAndUpdate(
      { _id: session._id },
      {
        status: "FINISHED",
        endedAt: new Date(),
      }
    );

    if (!updatedSession) {
      throw new ApiError(500, "Failed to update session status");
    }

    // 4. Remove Runtime
    gameRuntimeManager.remove(sessionId);

    // 5. Return Result
    return updatedSession;
  },
};
