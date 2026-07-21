import { describe, it, expect, vi, beforeEach } from "vitest";
import { gameRuntimeManager } from "@/realtime/game-runtime.manager.js";

vi.mock("../../../modules/sessions/session.repository.js", () => ({
  sessionRepository: {
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("../../../modules/games/game.repository.js", () => ({
  gameRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("../../../modules/participants/participant.repository.js", () => ({
  participantRepository: {
    findBySessionId: vi.fn(),
  },
}));

const { sessionRepository } = await import(
  "../../../modules/sessions/session.repository.js"
);
const { gameRepository } = await import(
  "../../../modules/games/game.repository.js"
);
const { participantRepository } = await import(
  "../../../modules/participants/participant.repository.js"
);
const { gameFlowService } = await import(
  "../../../modules/game-flow/game-flow.service.js"
);

const SESSION_ID = "session-abc-123";
const GAME_ID = "game-xyz-456";

const makeSession = (overrides = {}) => ({
  _id: { toString: () => SESSION_ID },
  ownerId: "owner-123",
  gameId: { toString: () => GAME_ID },
  roomCode: "ABCDEF",
  status: "WAITING",
  startedAt: null,
  endedAt: null,
  ...overrides,
});

const makeGame = (overrides = {}) => ({
  _id: { toString: () => GAME_ID },
  ownerId: "owner-123",
  title: "Test Game",
  description: "Test description",
  status: "PUBLISHED",
  pointsPerQuestion: 10,
  questions: [
    { type: "MCQ", question: "Is this a test?", options: ["Yes", "No"], order: 0 },
  ],
  ...overrides,
});

describe("GameFlowService (Session Lifecycle)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(participantRepository.findBySessionId).mockResolvedValue([]);
    // Clean up runtimes
    for (const runtime of gameRuntimeManager.getAll()) {
      gameRuntimeManager.remove(runtime.sessionId);
    }
  });

  describe("startSession", () => {
    it("should start a session successfully when conditions are valid", async () => {
      const session = makeSession();
      const updatedSession = makeSession({ status: "LIVE", startedAt: new Date() });

      vi.mocked(sessionRepository.findById).mockResolvedValue(session as any);
      vi.mocked(gameRepository.findById).mockResolvedValue(makeGame() as any);
      vi.mocked(sessionRepository.findOneAndUpdate).mockResolvedValue(updatedSession as any);

      const result = await gameFlowService.startSession(SESSION_ID);

      expect(result.status).toBe("LIVE");
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(gameRuntimeManager.has(SESSION_ID)).toBe(true);

      expect(sessionRepository.findById).toHaveBeenCalledWith(SESSION_ID);
      expect(gameRepository.findById).toHaveBeenCalledWith(GAME_ID);
      expect(participantRepository.findBySessionId).toHaveBeenCalledWith(SESSION_ID);
      expect(sessionRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: session._id },
        expect.objectContaining({ status: "LIVE" })
      );
    });

    it("should start a session and initialize game runtime with participants", async () => {
      const session = makeSession();
      const updatedSession = makeSession({ status: "LIVE", startedAt: new Date() });
      const mockParticipants = [
        { _id: "part-1", name: "Alice", email: "alice@test.com", joinedAt: new Date() },
        { _id: "part-2", name: "Bob", email: undefined, joinedAt: new Date() },
      ];

      vi.mocked(sessionRepository.findById).mockResolvedValue(session as any);
      vi.mocked(gameRepository.findById).mockResolvedValue(makeGame() as any);
      vi.mocked(participantRepository.findBySessionId).mockResolvedValue(mockParticipants as any);
      vi.mocked(sessionRepository.findOneAndUpdate).mockResolvedValue(updatedSession as any);

      const result = await gameFlowService.startSession(SESSION_ID);

      expect(result.status).toBe("LIVE");
      expect(gameRuntimeManager.has(SESSION_ID)).toBe(true);

      const runtime = gameRuntimeManager.get(SESSION_ID);
      expect(runtime).toBeDefined();
      expect(runtime?.participants.size).toBe(2);

      const p1 = runtime?.participants.get("part-1");
      expect(p1).toBeDefined();
      expect(p1?.name).toBe("Alice");
      expect(p1?.connected).toBe(false);
      expect(p1?.socketId).toBeNull();
      expect(p1?.stats).toEqual({
        score: 0,
        correctAnswers: 0,
        answeredQuestions: 0,
        totalResponseTimeMs: 0,
        streak: 0,
        rank: 0,
      });

      const p2 = runtime?.participants.get("part-2");
      expect(p2).toBeDefined();
      expect(p2?.name).toBe("Bob");
      expect(p2?.connected).toBe(false);
      expect(p2?.socketId).toBeNull();
      expect(p2?.stats).toEqual({
        score: 0,
        correctAnswers: 0,
        answeredQuestions: 0,
        totalResponseTimeMs: 0,
        streak: 0,
        rank: 0,
      });
    });

    it("should throw a 404 error if session is not found", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(null);

      await expect(
        gameFlowService.startSession(SESSION_ID)
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          message: "Session not found",
        })
      );
    });

    it("should throw a 400 error if session status is already LIVE", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(
        makeSession({ status: "LIVE", startedAt: new Date() }) as any
      );

      await expect(
        gameFlowService.startSession(SESSION_ID)
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/Session must be in WAITING status/),
        })
      );
    });

    it("should throw a 404 error if associated game is not found", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(makeSession() as any);
      vi.mocked(gameRepository.findById).mockResolvedValue(null);

      await expect(
        gameFlowService.startSession(SESSION_ID)
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          message: "Game not found",
        })
      );
    });

    it("should throw a 400 error if game status is DRAFT", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(makeSession() as any);
      vi.mocked(gameRepository.findById).mockResolvedValue(
        makeGame({ status: "DRAFT" }) as any
      );

      await expect(
        gameFlowService.startSession(SESSION_ID)
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: "Cannot start session. The associated game is not published",
        })
      );
    });

    it("should throw a 400 error if game has no questions", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(makeSession() as any);
      vi.mocked(gameRepository.findById).mockResolvedValue(
        makeGame({ questions: [] }) as any
      );

      await expect(
        gameFlowService.startSession(SESSION_ID)
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: "Cannot start session. The associated game contains no questions",
        })
      );
    });
  });

  describe("endSession", () => {
    it("should end a live session successfully", async () => {
      const session = makeSession({ status: "LIVE", startedAt: new Date() });
      const updatedSession = makeSession({
        status: "FINISHED",
        startedAt: new Date(),
        endedAt: new Date(),
      });

      vi.mocked(sessionRepository.findById).mockResolvedValue(session as any);
      vi.mocked(sessionRepository.findOneAndUpdate).mockResolvedValue(updatedSession as any);

      // Pre-create a runtime so we can verify removal
      gameRuntimeManager.create(SESSION_ID);
      expect(gameRuntimeManager.has(SESSION_ID)).toBe(true);

      const result = await gameFlowService.endSession(SESSION_ID);

      expect(result.status).toBe("FINISHED");
      expect(result.endedAt).toBeInstanceOf(Date);
      expect(gameRuntimeManager.has(SESSION_ID)).toBe(false);

      expect(sessionRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: session._id },
        expect.objectContaining({ status: "FINISHED" })
      );
    });

    it("should throw a 404 error if session is not found", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(null);

      await expect(
        gameFlowService.endSession(SESSION_ID)
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 404,
          message: "Session not found",
        })
      );
    });

    it("should throw a 400 error if session is already FINISHED", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(
        makeSession({ status: "FINISHED", endedAt: new Date() }) as any
      );

      await expect(
        gameFlowService.endSession(SESSION_ID)
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/Only LIVE sessions can be ended/),
        })
      );
    });
  });
});
