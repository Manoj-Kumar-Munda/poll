import { Types } from "mongoose";
import { ApiError } from "@/utils/ApiError.js";
import { gameRepository } from "@/modules/games/game.repository.js";
import { sessionRepository } from "./session.repository.js";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const MAX_ROOM_CODE_RETRIES = 10;

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ROOM_CODE_RETRIES; attempt++) {
    const code = generateRoomCode();
    const existing = await sessionRepository.findByRoomCode(code);
    if (!existing) return code;
  }
  throw new ApiError(500, "Failed to generate a unique room code");
}

export const sessionService = {
  async create(gameId: string, ownerId: string) {
    const game = await gameRepository.findById(gameId);
    if (!game) throw new ApiError(404, "Game not found");

    if (game.ownerId !== ownerId) {
      throw new ApiError(403, "You do not own this game");
    }

    if (game.status === "ARCHIVED") {
      throw new ApiError(400, "Cannot create a session for an archived game");
    }

    const roomCode = await generateUniqueRoomCode();

    return sessionRepository.create({
      ownerId,
      gameId: new Types.ObjectId(gameId),
      roomCode,
    });
  },

  async list(
    ownerId: string,
    options: {
      status?: string;
      gameId?: string;
      sort?: string;
    },
  ) {
    return sessionRepository.findByOwner(ownerId, options);
  },

  async getById(sessionId: string, ownerId: string) {
    const session = await sessionRepository.findById(sessionId);
    if (!session) throw new ApiError(404, "Session not found");
    if (session.ownerId !== ownerId) throw new ApiError(403, "Forbidden");

    return session.populate("gameId", "title description");
  },

  async delete(sessionId: string, ownerId: string) {
    const session = await sessionRepository.findById(sessionId);
    if (!session) throw new ApiError(404, "Session not found");
    if (session.ownerId !== ownerId) throw new ApiError(403, "Forbidden");
    if (session.status !== "WAITING") {
      throw new ApiError(
        400,
        "Cannot delete a session that is not in WAITING status",
      );
    }

    return sessionRepository.findByIdAndDelete(sessionId);
  },
};
