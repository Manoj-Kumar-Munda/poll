import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerHostHandlers } from "../socket/handlers/host.handler.js";
import { HOST_EVENTS, SERVER_EVENTS } from "../socket/events.js";
import { getSessionRoom } from "../socket/rooms.js";

vi.mock("../modules/game-flow/game-flow.service.js", () => ({
  gameFlowService: {
    endQuestion: vi.fn(),
  },
}));

vi.mock("../modules/sessions/session.repository.js", () => ({
  sessionRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("../modules/games/game.repository.js", () => ({
  gameRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("../realtime/game-runtime.manager.js", () => ({
  gameRuntimeManager: {
    get: vi.fn(),
  },
}));

vi.mock("../realtime/timer/question-timer.manager.js", () => ({
  questionTimerManager: {
    startQuestionTimer: vi.fn(),
    cancelQuestionTimer: vi.fn(),
  },
}));

const { sessionRepository } =
  await import("../modules/sessions/session.repository.js");
const { gameRepository } = await import("../modules/games/game.repository.js");
const { gameRuntimeManager } =
  await import("../realtime/game-runtime.manager.js");
const { questionTimerManager } =
  await import("../realtime/timer/question-timer.manager.js");
const { gameFlowService } =
  await import("../modules/game-flow/game-flow.service.js");

const HOST_ID = "507f1f77bcf86cd799439011";
const SESSION_ID = "507f1f77bcf86cd799439012";
const GAME_ID = "507f1f77bcf86cd799439013";
const QUESTION_ID = "q-123";

describe("Socket.IO host:launch_question Event Handler", () => {
  let mockSocket: any;
  let mockIO: any;
  let handlers: Record<string, Function>;
  let mockRuntime: any;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};

    mockRuntime = {
      sessionId: SESSION_ID,
      participants: new Map([
        [
          "p-1",
          {
            participantId: "p-1",
            name: "Alice",
            hasAnsweredCurrentQuestion: true,
          },
        ],
        [
          "p-2",
          {
            participantId: "p-2",
            name: "Bob",
            hasAnsweredCurrentQuestion: true,
          },
        ],
      ]),
      currentQuestion: null,
      submissions: new Map([["someOldSub", {} as any]]),
    };

    mockSocket = {
      id: "socket-123",
      join: vi.fn(),
      on: vi.fn((event: string, handler: Function) => {
        handlers[event] = handler;
      }),
      data: {
        host: {
          id: HOST_ID,
          email: "host@example.com",
          name: "Host User",
        },
        sessionId: SESSION_ID,
      },
    };

    mockIO = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn(),
      }),
    };

    registerHostHandlers(mockSocket, mockIO);
  });

  const triggerEvent = async (payload: any) => {
    const handler = handlers[HOST_EVENTS.LAUNCH_QUESTION];
    if (!handler) throw new Error("Handler not registered");

    return new Promise<any>((resolve) => {
      handler(payload, (response: any) => {
        resolve(response);
      });
    });
  };

  const triggerEndQuestion = async (payload: any) => {
    const handler = handlers[HOST_EVENTS.END_QUESTION];
    if (!handler) throw new Error("Handler not registered");

    return new Promise<any>((resolve) => {
      handler(payload, (response: any) => {
        resolve(response);
      });
    });
  };

  it("should return error if payload validation fails", async () => {
    const res = await triggerEvent({});
    expect(res).toEqual({ error: "Invalid payload" });
  });

  it("should return error if sessionId is missing from socket", async () => {
    delete mockSocket.data.sessionId;
    const res = await triggerEvent({ questionId: QUESTION_ID });
    expect(res).toEqual({ error: "No active session" });
  });

  it("should return error if runtime is not found", async () => {
    vi.mocked(gameRuntimeManager.get).mockReturnValue(null as any);
    const res = await triggerEvent({ questionId: QUESTION_ID });
    expect(res).toEqual({ error: "Runtime not found" });
  });

  it("should return error if another question is currently active", async () => {
    mockRuntime.currentQuestion = { questionId: "other-q" };
    vi.mocked(gameRuntimeManager.get).mockReturnValue(mockRuntime);

    const res = await triggerEvent({ questionId: QUESTION_ID });
    expect(res).toEqual({ error: "Another question is currently active" });
  });

  it("should return error if session is not found in database", async () => {
    vi.mocked(gameRuntimeManager.get).mockReturnValue(mockRuntime);
    vi.mocked(sessionRepository.findById).mockResolvedValue(null);

    const res = await triggerEvent({ questionId: QUESTION_ID });
    expect(res).toEqual({ error: "Session not found" });
  });

  it("should return error if session status is not LIVE", async () => {
    vi.mocked(gameRuntimeManager.get).mockReturnValue(mockRuntime);
    vi.mocked(sessionRepository.findById).mockResolvedValue({
      _id: SESSION_ID,
      status: "WAITING",
    } as any);

    const res = await triggerEvent({ questionId: QUESTION_ID });
    expect(res).toEqual({ error: "Session is not live" });
  });

  it("should return error if game is not found in database", async () => {
    vi.mocked(gameRuntimeManager.get).mockReturnValue(mockRuntime);
    vi.mocked(sessionRepository.findById).mockResolvedValue({
      _id: SESSION_ID,
      status: "LIVE",
      gameId: GAME_ID,
    } as any);
    vi.mocked(gameRepository.findById).mockResolvedValue(null);

    const res = await triggerEvent({ questionId: QUESTION_ID });
    expect(res).toEqual({ error: "Game not found" });
  });

  it("should return error if question is not found in the game", async () => {
    vi.mocked(gameRuntimeManager.get).mockReturnValue(mockRuntime);
    vi.mocked(sessionRepository.findById).mockResolvedValue({
      _id: SESSION_ID,
      status: "LIVE",
      gameId: GAME_ID,
    } as any);
    vi.mocked(gameRepository.findById).mockResolvedValue({
      _id: GAME_ID,
      questions: [],
    } as any);

    const res = await triggerEvent({ questionId: QUESTION_ID });
    expect(res).toEqual({ error: "Question not found" });
  });

  it("should launch question successfully, update runtime, start timer, broadcast, and acknowledge success", async () => {
    vi.mocked(gameRuntimeManager.get).mockReturnValue(mockRuntime);
    vi.mocked(sessionRepository.findById).mockResolvedValue({
      _id: SESSION_ID,
      status: "LIVE",
      gameId: GAME_ID,
    } as any);
    vi.mocked(gameRepository.findById).mockResolvedValue({
      _id: GAME_ID,
      timeLimitPerQuestion: 30,
      questions: [
        {
          id: QUESTION_ID,
          order: 1,
          question: "What is 2+2?",
          type: "MCQ",
          options: ["3", "4", "5"],
          correctAnswer: "4",
        },
      ],
    } as any);

    const emitSpy = vi.fn();
    vi.mocked(mockIO.to).mockReturnValue({ emit: emitSpy } as any);

    const res = await triggerEvent({ questionId: QUESTION_ID });

    // Assert callback acknowledgment
    expect(res).toEqual({ success: true });

    // Assert GameRuntime state changes
    expect(mockRuntime.currentQuestion).toBeDefined();
    expect(mockRuntime.currentQuestion.questionId).toBe(QUESTION_ID);
    expect(mockRuntime.currentQuestion.order).toBe(1);
    expect(mockRuntime.currentQuestion.startedAt).toBeInstanceOf(Date);
    expect(mockRuntime.currentQuestion.endsAt).toBeInstanceOf(Date);

    // Verify participants reset
    expect(mockRuntime.participants.get("p-1").hasAnsweredCurrentQuestion).toBe(
      false,
    );
    expect(mockRuntime.participants.get("p-2").hasAnsweredCurrentQuestion).toBe(
      false,
    );

    // Verify submissions reset
    expect(mockRuntime.submissions).toBeInstanceOf(Map);
    expect(mockRuntime.submissions.size).toBe(0);

    // Verify timer start
    expect(questionTimerManager.startQuestionTimer).toHaveBeenCalledWith(
      SESSION_ID,
      QUESTION_ID,
      expect.any(Date),
      expect.any(Function),
    );

    // Verify Socket broadcast
    expect(mockIO.to).toHaveBeenCalledWith(getSessionRoom(SESSION_ID));
    expect(emitSpy).toHaveBeenCalledWith(
      SERVER_EVENTS.QUESTION_STARTED,
      expect.objectContaining({
        questionId: QUESTION_ID,
        question: "What is 2+2?",
        type: "MCQ",
        options: ["3", "4", "5"],
        startedAt: expect.any(Date),
        endsAt: expect.any(Date),
      }),
    );

    // Check that correctAnswer is NOT sent in broadcast
    const broadcastPayload = emitSpy.mock.calls[0][1];
    expect(broadcastPayload.correctAnswer).toBeUndefined();
  });

  it("should finalize a question and broadcast all result events", async () => {
    mockRuntime.currentQuestion = {
      questionId: QUESTION_ID,
      startedAt: new Date(),
      endsAt: new Date(Date.now() + 1000),
      correctAnswer: "4",
    };
    vi.mocked(gameRuntimeManager.get).mockReturnValue(mockRuntime);
    vi.mocked(gameFlowService.endQuestion).mockResolvedValue({
      finalized: true,
      sessionId: SESSION_ID,
      questionId: QUESTION_ID,
      correctAnswer: "4",
      endedAt: new Date(),
      leaderboard: [{ participantId: "p-1", score: 10 }],
      statistics: {
        totalParticipants: 2,
        answeredCount: 1,
        correctCount: 1,
        unansweredCount: 1,
        averageResponseTimeMs: 500,
      },
      participantResults: [
        {
          participantId: "p-1",
          socketId: "participant-socket",
          isCorrect: true,
          responseTimeMs: 500,
          scoreAwarded: 10,
        },
      ],
    } as any);

    const emitSpy = vi.fn();
    vi.mocked(mockIO.to).mockReturnValue({ emit: emitSpy } as any);

    const result = await triggerEndQuestion({
      sessionId: SESSION_ID,
      questionId: QUESTION_ID,
    });

    expect(result).toEqual({
      success: true,
      finalized: true,
      sessionId: SESSION_ID,
      questionId: QUESTION_ID,
    });
    expect(gameFlowService.endQuestion).toHaveBeenCalledWith(
      SESSION_ID,
      QUESTION_ID,
    );
    expect(emitSpy).toHaveBeenCalledWith(
      SERVER_EVENTS.QUESTION_ENDED,
      expect.objectContaining({
        sessionId: SESSION_ID,
        questionId: QUESTION_ID,
        correctAnswer: "4",
      }),
    );
    expect(emitSpy).toHaveBeenCalledWith(
      SERVER_EVENTS.LEADERBOARD_UPDATED,
      expect.objectContaining({ sessionId: SESSION_ID }),
    );
    expect(emitSpy).toHaveBeenCalledWith(
      SERVER_EVENTS.STATISTICS_UPDATED,
      expect.objectContaining({ sessionId: SESSION_ID }),
    );
    expect(mockIO.to).toHaveBeenCalledWith("participant-socket");
    expect(emitSpy).toHaveBeenCalledWith(SERVER_EVENTS.ANSWER_RESULT, {
      questionId: QUESTION_ID,
      accepted: true,
      isCorrect: true,
      responseTimeMs: 500,
      scoreAwarded: 10,
    });
  });
});
