import { ApiError } from "@/utils/ApiError.js";
import { sessionRepository } from "@/modules/sessions/session.repository.js";
import { gameRepository } from "@/modules/games/game.repository.js";
import { participantRepository } from "./participant.repository.js";

export const participantService = {
  /**
   * Joins a participant to a waiting session.
   * Reuses existing participant if a valid participantId is provided.
   */
  async joinSession(data: {
    roomCode: string;
    participantId?: string;
    name: string;
    email?: string;
  }) {
    const { roomCode, participantId, name, email } = data;

    // 1. Find Session
    const session = await sessionRepository.findByRoomCode(roomCode);
    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    // 2. Validate Session status (only WAITING can accept new participants)
    if (session.status !== "WAITING") {
      throw new ApiError(
        400,
        `Cannot join session. Only sessions in WAITING status accept new participants (current status: ${session.status})`
      );
    }

    // Fetch the game to retrieve gameTitle
    const game = await gameRepository.findById(session.gameId.toString());
    if (!game) {
      throw new ApiError(404, "Associated game not found");
    }

    let participant;

    // 3. Handle Rejoin
    if (participantId) {
      const existingParticipant = await participantRepository.findById(participantId);
      if (
        existingParticipant &&
        existingParticipant.sessionId.toString() === session._id.toString()
      ) {
        participant = existingParticipant;
      }
    }

    // 4. Create Participant if not rejoining
    if (!participant) {
      participant = await participantRepository.create({
        sessionId: session._id,
        name,
        email: email || undefined,
        joinedAt: new Date(),
      });
    }

    // 5. Return join payload
    return {
      participantId: participant._id.toString(),
      sessionId: session._id.toString(),
      roomCode: session.roomCode,
      sessionStatus: session.status,
      gameId: session.gameId.toString(),
      participantName: participant.name,
      gameTitle: game.title,
    };
  },
};
