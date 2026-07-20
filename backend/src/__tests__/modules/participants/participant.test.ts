import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

vi.mock("../../../modules/sessions/session.repository.js", () => ({
  sessionRepository: {
    findByRoomCode: vi.fn(),
  },
}));

vi.mock("../../../modules/games/game.repository.js", () => ({
  gameRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("../../../modules/participants/participant.repository.js", () => ({
  participantRepository: {
    create: vi.fn(),
    findById: vi.fn(),
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

const { app } = await import("../../../app.js");

const SESSION_ID = "507f1f77bcf86cd799439011";
const GAME_ID = "507f1f77bcf86cd799439012";
const PARTICIPANT_ID = "507f1f77bcf86cd799439013";

const makeSession = (overrides = {}) => ({
  _id: { toString: () => SESSION_ID },
  ownerId: "owner-123",
  gameId: { toString: () => GAME_ID },
  roomCode: "ABCDEF",
  status: "WAITING",
  ...overrides,
});

const makeGame = (overrides = {}) => ({
  _id: { toString: () => GAME_ID },
  ownerId: "owner-123",
  title: "Test Game Title",
  description: "Test description",
  ...overrides,
});

const makeParticipant = (overrides = {}) => ({
  _id: { toString: () => PARTICIPANT_ID },
  sessionId: { toString: () => SESSION_ID },
  name: "John Doe",
  email: "john@example.com",
  ...overrides,
});

describe("Participant Join API (POST /api/v1/participants/join)", () => {
  const request = supertest(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully join a session and return the participant payload", async () => {
    vi.mocked(sessionRepository.findByRoomCode).mockResolvedValue(makeSession() as any);
    vi.mocked(gameRepository.findById).mockResolvedValue(makeGame() as any);
    vi.mocked(participantRepository.create).mockResolvedValue(makeParticipant() as any);

    const response = await request.post("/api/v1/participants/join").send({
      roomCode: "abcdef",
      name: "John Doe",
      email: "john@example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      participantId: PARTICIPANT_ID,
      sessionId: SESSION_ID,
      roomCode: "ABCDEF",
      sessionStatus: "WAITING",
      gameId: GAME_ID,
      participantName: "John Doe",
      gameTitle: "Test Game Title",
    });

    expect(sessionRepository.findByRoomCode).toHaveBeenCalledWith("ABCDEF");
    expect(gameRepository.findById).toHaveBeenCalledWith(GAME_ID);
    expect(participantRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "John Doe",
        email: "john@example.com",
      })
    );
  });

  it("should successfully rejoin a session if participantId is valid and exists", async () => {
    vi.mocked(sessionRepository.findByRoomCode).mockResolvedValue(makeSession() as any);
    vi.mocked(gameRepository.findById).mockResolvedValue(makeGame() as any);
    vi.mocked(participantRepository.findById).mockResolvedValue(
      makeParticipant() as any
    );

    const response = await request.post("/api/v1/participants/join").send({
      roomCode: "abcdef",
      participantId: PARTICIPANT_ID,
      name: "John Doe",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.participantId).toBe(PARTICIPANT_ID);

    expect(participantRepository.findById).toHaveBeenCalledWith(PARTICIPANT_ID);
    expect(participantRepository.create).not.toHaveBeenCalled();
  });

  it("should fall back to creating a new participant if provided participantId does not exist", async () => {
    vi.mocked(sessionRepository.findByRoomCode).mockResolvedValue(makeSession() as any);
    vi.mocked(gameRepository.findById).mockResolvedValue(makeGame() as any);
    vi.mocked(participantRepository.findById).mockResolvedValue(null);
    vi.mocked(participantRepository.create).mockResolvedValue(makeParticipant() as any);

    const response = await request.post("/api/v1/participants/join").send({
      roomCode: "abcdef",
      participantId: PARTICIPANT_ID,
      name: "John Doe",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(participantRepository.create).toHaveBeenCalled();
  });

  it("should throw a 404 error if session is not found", async () => {
    vi.mocked(sessionRepository.findByRoomCode).mockResolvedValue(null);

    const response = await request.post("/api/v1/participants/join").send({
      roomCode: "NO_SESS",
      name: "John Doe",
    });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Session not found");
  });

  it("should throw a 400 error if session is not in WAITING status", async () => {
    vi.mocked(sessionRepository.findByRoomCode).mockResolvedValue(
      makeSession({ status: "LIVE" }) as any
    );

    const response = await request.post("/api/v1/participants/join").send({
      roomCode: "LIVESS",
      name: "John Doe",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Only sessions in WAITING status accept new participants");
  });

  it("should throw a 404 error if associated game is not found", async () => {
    vi.mocked(sessionRepository.findByRoomCode).mockResolvedValue(makeSession() as any);
    vi.mocked(gameRepository.findById).mockResolvedValue(null);

    const response = await request.post("/api/v1/participants/join").send({
      roomCode: "ABCDEF",
      name: "John Doe",
    });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Associated game not found");
  });

  it("should fail validation if roomCode is missing or empty", async () => {
    const response = await request.post("/api/v1/participants/join").send({
      name: "John Doe",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation failed");
  });

  it("should fail validation if name is missing or empty", async () => {
    const response = await request.post("/api/v1/participants/join").send({
      roomCode: "ABCDEF",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation failed");
  });

  it("should fail validation if email format is invalid", async () => {
    const response = await request.post("/api/v1/participants/join").send({
      roomCode: "ABCDEF",
      name: "John Doe",
      email: "invalid-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation failed");
  });
});
