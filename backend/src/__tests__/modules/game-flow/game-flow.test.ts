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
    updateResultsMany: vi.fn(),
    updateResults: vi.fn(),
  },
}));

vi.mock("../../../modules/submissions/submission.repository.js", () => ({
  submissionRepository: {
    upsertMany: vi.fn(),
  },
}));

const { sessionRepository } =
  await import("../../../modules/sessions/session.repository.js");
const { gameRepository } =
  await import("../../../modules/games/game.repository.js");
const { participantRepository } =
  await import("../../../modules/participants/participant.repository.js");
const { submissionRepository } =
  await import("../../../modules/submissions/submission.repository.js");
const { gameFlowService } =
  await import("../../../modules/game-flow/game-flow.service.js");

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
    {
      type: "MCQ",
      question: "Is this a test?",
      options: ["Yes", "No"],
      order: 0,
    },
  ],
  ...overrides,
});

describe("GameFlowService (Session Lifecycle)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(participantRepository.findBySessionId).mockResolvedValue([]);
    vi.mocked(participantRepository.updateResults).mockResolvedValue(
      null as any,
    );
    vi.mocked(submissionRepository.upsertMany).mockResolvedValue([] as any);
    // Clean up runtimes
    for (const runtime of gameRuntimeManager.getAll()) {
      gameRuntimeManager.remove(runtime.sessionId);
    }
  });

  describe("startSession", () => {
    it("should start a session successfully when conditions are valid", async () => {
      const session = makeSession();
      const updatedSession = makeSession({
        status: "LIVE",
        startedAt: new Date(),
      });

      vi.mocked(sessionRepository.findById).mockResolvedValue(session as any);
      vi.mocked(gameRepository.findById).mockResolvedValue(makeGame() as any);
      vi.mocked(sessionRepository.findOneAndUpdate).mockResolvedValue(
        updatedSession as any,
      );

      const result = await gameFlowService.startSession(SESSION_ID);

      expect(result.status).toBe("LIVE");
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(gameRuntimeManager.has(SESSION_ID)).toBe(true);

      expect(sessionRepository.findById).toHaveBeenCalledWith(SESSION_ID);
      expect(gameRepository.findById).toHaveBeenCalledWith(GAME_ID);
      expect(participantRepository.findBySessionId).toHaveBeenCalledWith(
        SESSION_ID,
      );
      expect(sessionRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: session._id },
        expect.objectContaining({ status: "LIVE" }),
      );
    });

    it("should start a session and initialize game runtime with participants", async () => {
      const session = makeSession();
      const updatedSession = makeSession({
        status: "LIVE",
        startedAt: new Date(),
      });
      const mockParticipants = [
        {
          _id: "part-1",
          name: "Alice",
          email: "alice@test.com",
          joinedAt: new Date(),
        },
        { _id: "part-2", name: "Bob", email: undefined, joinedAt: new Date() },
      ];

      vi.mocked(sessionRepository.findById).mockResolvedValue(session as any);
      vi.mocked(gameRepository.findById).mockResolvedValue(makeGame() as any);
      vi.mocked(participantRepository.findBySessionId).mockResolvedValue(
        mockParticipants as any,
      );
      vi.mocked(sessionRepository.findOneAndUpdate).mockResolvedValue(
        updatedSession as any,
      );

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

      await expect(gameFlowService.startSession(SESSION_ID)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          message: "Session not found",
        }),
      );
    });

    it("should throw a 400 error if session status is already LIVE", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(
        makeSession({ status: "LIVE", startedAt: new Date() }) as any,
      );

      await expect(
        gameFlowService.startSession(SESSION_ID),
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/Session must be in WAITING status/),
        }),
      );
    });

    it("should throw a 404 error if associated game is not found", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(
        makeSession() as any,
      );
      vi.mocked(gameRepository.findById).mockResolvedValue(null);

      await expect(gameFlowService.startSession(SESSION_ID)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          message: "Game not found",
        }),
      );
    });

    it("should throw a 400 error if game status is DRAFT", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(
        makeSession() as any,
      );
      vi.mocked(gameRepository.findById).mockResolvedValue(
        makeGame({ status: "DRAFT" }) as any,
      );

      await expect(gameFlowService.startSession(SESSION_ID)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: "Cannot start session. The associated game is not published",
        }),
      );
    });

    it("should throw a 400 error if game has no questions", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(
        makeSession() as any,
      );
      vi.mocked(gameRepository.findById).mockResolvedValue(
        makeGame({ questions: [] }) as any,
      );

      await expect(gameFlowService.startSession(SESSION_ID)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message:
            "Cannot start session. The associated game contains no questions",
        }),
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
      vi.mocked(sessionRepository.findOneAndUpdate).mockResolvedValue(
        updatedSession as any,
      );

      // Pre-create a runtime so we can verify removal
      gameRuntimeManager.create(SESSION_ID);
      expect(gameRuntimeManager.has(SESSION_ID)).toBe(true);

      const result = await gameFlowService.endSession(SESSION_ID);

      expect(result.status).toBe("FINISHED");
      expect(result.endedAt).toBeInstanceOf(Date);
      expect(gameRuntimeManager.has(SESSION_ID)).toBe(false);

      expect(sessionRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: session._id },
        expect.objectContaining({ status: "FINISHED" }),
      );
    });

    it("should throw a 404 error if session is not found", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(null);

      await expect(gameFlowService.endSession(SESSION_ID)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 404,
          message: "Session not found",
        }),
      );
    });

    it("should throw a 400 error if session is already FINISHED", async () => {
      vi.mocked(sessionRepository.findById).mockResolvedValue(
        makeSession({ status: "FINISHED", endedAt: new Date() }) as any,
      );

      await expect(gameFlowService.endSession(SESSION_ID)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/Only LIVE sessions can be ended/),
        }),
      );
    });
  });

  describe("endQuestion", () => {
    it("finalizes submissions, updates stats, ranks participants, and persists results", async () => {
      const session = makeSession({ status: "LIVE" });
      const startedAt = new Date("2026-01-01T00:00:00.000Z");
      const endsAt = new Date("2026-01-01T00:00:10.000Z");
      const runtime = gameRuntimeManager.create(SESSION_ID);

      runtime.participants.set("507f1f77bcf86cd799439021", {
        participantId: "507f1f77bcf86cd799439021",
        name: "Alice",
        connected: true,
        socketId: "socket-alice",
        hasAnsweredCurrentQuestion: true,
        stats: {
          score: 0,
          correctAnswers: 0,
          answeredQuestions: 0,
          totalResponseTimeMs: 0,
          streak: 0,
          rank: 0,
        },
      });
      runtime.participants.set("507f1f77bcf86cd799439022", {
        participantId: "507f1f77bcf86cd799439022",
        name: "Bob",
        connected: true,
        socketId: "socket-bob",
        hasAnsweredCurrentQuestion: true,
        stats: {
          score: 0,
          correctAnswers: 0,
          answeredQuestions: 0,
          totalResponseTimeMs: 0,
          streak: 0,
          rank: 0,
        },
      });
      runtime.currentQuestion = {
        questionId: "question-1",
        order: 1,
        startedAt,
        endsAt,
        correctAnswer: "yes",
      };
      runtime.submissions.set("507f1f77bcf86cd799439021", {
        questionId: "question-1",
        participantId: "507f1f77bcf86cd799439021",
        answer: "yes",
        isCorrect: true,
        submittedAt: new Date("2026-01-01T00:00:02.000Z"),
        responseTimeMs: 2000,
        scoreAwarded: 0,
      });
      runtime.submissions.set("507f1f77bcf86cd799439022", {
        questionId: "question-1",
        participantId: "507f1f77bcf86cd799439022",
        answer: "no",
        isCorrect: false,
        submittedAt: new Date("2026-01-01T00:00:01.000Z"),
        responseTimeMs: 1000,
        scoreAwarded: 0,
      });

      vi.mocked(sessionRepository.findById).mockResolvedValue(session as any);
      vi.mocked(gameRepository.findById).mockResolvedValue(
        makeGame({ pointsPerQuestion: 100 }) as any,
      );

      const result = await gameFlowService.endQuestion(
        SESSION_ID,
        "question-1",
      );

      expect(result.finalized).toBe(true);
      expect(result.statistics).toEqual({
        totalParticipants: 2,
        answeredCount: 2,
        correctCount: 1,
        unansweredCount: 0,
        averageResponseTimeMs: 1500,
      });
      expect(runtime.currentQuestion).toBeNull();
      expect(
        runtime.participants.get("507f1f77bcf86cd799439021")?.stats,
      ).toEqual({
        score: 80,
        correctAnswers: 1,
        answeredQuestions: 1,
        totalResponseTimeMs: 2000,
        streak: 1,
        rank: 1,
      });
      expect(
        runtime.participants.get("507f1f77bcf86cd799439022")?.stats.rank,
      ).toBe(2);
      expect(submissionRepository.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sessionId: SESSION_ID,
            participantId: "507f1f77bcf86cd799439021",
            questionId: "question-1",
            scoreAwarded: 80,
            responseTimeMs: 2000,
          }),
        ]),
      );
      expect(participantRepository.updateResultsMany).toHaveBeenCalledTimes(1);
    });

    it("is idempotent when the question has already ended", async () => {
      const runtime = gameRuntimeManager.create(SESSION_ID);
      runtime.currentQuestion = {
        questionId: "question-1",
        order: 1,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 1000),
        correctAnswer: "yes",
      };

      vi.mocked(sessionRepository.findById).mockResolvedValue(
        makeSession({ status: "LIVE" }) as any,
      );
      vi.mocked(gameRepository.findById).mockResolvedValue(makeGame() as any);

      const first = await gameFlowService.endQuestion(SESSION_ID, "question-1");
      const second = await gameFlowService.endQuestion(
        SESSION_ID,
        "question-1",
      );

      expect(first.finalized).toBe(true);
      expect(second.finalized).toBe(false);
      expect(submissionRepository.upsertMany).toHaveBeenCalledTimes(1);
    });
  });
});
