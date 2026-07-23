import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerParticipantHandlers } from "../socket/handlers/participant.handler.js";
import { PARTICIPANT_EVENTS, SERVER_EVENTS } from "../socket/events.js";

vi.mock("../modules/participants/participant.repository.js", () => ({
  participantRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("../modules/sessions/session.repository.js", () => ({
  sessionRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("../realtime/game-runtime.manager.js", () => ({
  gameRuntimeManager: {
    get: vi.fn(),
  },
}));

const { gameRuntimeManager } =
  await import("../realtime/game-runtime.manager.js");

const SESSION_ID = "507f1f77bcf86cd799439012";
const PARTICIPANT_ID = "507f1f77bcf86cd799439013";
const QUESTION_ID = "question-1";

describe("Socket.IO participant:answer event", () => {
  let mockSocket: any;
  let mockIO: any;
  let handlers: Record<string, Function>;
  let hostEmit: ReturnType<typeof vi.fn>;
  let runtime: any;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    hostEmit = vi.fn();

    runtime = {
      currentQuestion: {
        questionId: QUESTION_ID,
        startedAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 9000),
        correctAnswer: "yes",
      },
      participants: new Map([
        [
          PARTICIPANT_ID,
          {
            participantId: PARTICIPANT_ID,
            name: "Alice",
            socketId: "participant-socket",
            connected: true,
            hasAnsweredCurrentQuestion: false,
            stats: {
              score: 0,
              correctAnswers: 0,
              answeredQuestions: 0,
              totalResponseTimeMs: 0,
              streak: 0,
              rank: 0,
            },
          },
        ],
      ]),
      submissions: new Map(),
    };

    mockSocket = {
      id: "participant-socket",
      emit: vi.fn(),
      join: vi.fn().mockResolvedValue(undefined),
      on: vi.fn((event: string, handler: Function) => {
        handlers[event] = handler;
      }),
      data: {
        participantId: PARTICIPANT_ID,
        sessionId: SESSION_ID,
      },
    };

    mockIO = {
      to: vi.fn().mockReturnValue({ emit: hostEmit }),
    };

    vi.mocked(gameRuntimeManager.get).mockReturnValue(runtime);
    registerParticipantHandlers(mockSocket, mockIO);
  });

  it("accepts an answer without revealing correctness immediately", () => {
    handlers[PARTICIPANT_EVENTS.ANSWER]({
      sessionId: SESSION_ID,
      questionId: QUESTION_ID,
      answer: " YES ",
    });

    const submission = runtime.submissions.get(PARTICIPANT_ID);
    expect(submission).toEqual(
      expect.objectContaining({
        questionId: QUESTION_ID,
        participantId: PARTICIPANT_ID,
        isCorrect: true,
        scoreAwarded: 0,
      }),
    );
    expect(submission.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(mockSocket.emit).toHaveBeenCalledWith(SERVER_EVENTS.ANSWER_RESULT, {
      questionId: QUESTION_ID,
      accepted: true,
    });
    expect(hostEmit).toHaveBeenCalledWith(
      SERVER_EVENTS.PARTICIPANT_ANSWERED,
      expect.not.objectContaining({ isCorrect: expect.anything() }),
    );
  });

  it("rejects answers after the deadline", () => {
    runtime.currentQuestion.endsAt = new Date(Date.now() - 1);

    handlers[PARTICIPANT_EVENTS.ANSWER]({
      sessionId: SESSION_ID,
      questionId: QUESTION_ID,
      answer: "yes",
    });

    expect(runtime.submissions.size).toBe(0);
    expect(mockSocket.emit).toHaveBeenCalledWith(SERVER_EVENTS.ANSWER_RESULT, {
      questionId: QUESTION_ID,
      accepted: false,
      message: "The answer deadline has passed.",
    });
  });

  it("rejects duplicate answers", () => {
    runtime.participants.get(PARTICIPANT_ID).hasAnsweredCurrentQuestion = true;

    handlers[PARTICIPANT_EVENTS.ANSWER]({
      sessionId: SESSION_ID,
      questionId: QUESTION_ID,
      answer: "yes",
    });

    expect(runtime.submissions.size).toBe(0);
    expect(mockSocket.emit).toHaveBeenCalledWith(SERVER_EVENTS.ANSWER_RESULT, {
      questionId: QUESTION_ID,
      answer: "yes",
      isCorrect: false,
      accepted: false,
      message: "You have already answered this question.",
    });
  });
});
