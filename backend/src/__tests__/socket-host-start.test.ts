import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerHostHandlers } from "../socket/handlers/host.handler.js";
import { HOST_EVENTS, SERVER_EVENTS } from "../socket/events.js";
import { getSessionRoom } from "../socket/rooms.js";

vi.mock("../modules/game-flow/game-flow.service.js", () => ({
  gameFlowService: {
    startSession: vi.fn(),
  },
}));

vi.mock("../modules/sessions/session.repository.js", () => ({
  sessionRepository: {
    findById: vi.fn(),
  },
}));

const { gameFlowService } = await import(
  "../modules/game-flow/game-flow.service.js"
);

const HOST_ID = "507f1f77bcf86cd799439011";
const SESSION_ID = "507f1f77bcf86cd799439012";

describe("Socket.IO host:start-session Event Handler", () => {
  let mockSocket: any;
  let mockIO: any;
  let handlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};

    mockSocket = {
      id: "socket-123",
      join: vi.fn().mockResolvedValue(undefined),
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

  const triggerEvent = async (payload: any = {}) => {
    const handler = handlers[HOST_EVENTS.START_SESSION];
    if (!handler) throw new Error("Handler not registered");

    return new Promise<any>((resolve) => {
      handler(payload, (response: any) => {
        resolve(response);
      });
    });
  };

  it("should return error if sessionId is missing on socket data", async () => {
    delete mockSocket.data.sessionId;
    const res = await triggerEvent();
    expect(res).toEqual({ error: "No active session" });
    expect(gameFlowService.startSession).not.toHaveBeenCalled();
  });

  it("should return error if host details are missing on socket data", async () => {
    delete mockSocket.data.host;
    const res = await triggerEvent();
    expect(res).toEqual({ error: "Unauthorized" });
    expect(gameFlowService.startSession).not.toHaveBeenCalled();
  });

  it("should return error if gameFlowService throws an error", async () => {
    vi.mocked(gameFlowService.startSession).mockRejectedValue(
      new Error("Associated game not found")
    );

    const res = await triggerEvent();
    expect(res).toEqual({ error: "Associated game not found" });
    expect(gameFlowService.startSession).toHaveBeenCalledWith(SESSION_ID);
  });

  it("should start session, broadcast to room, and acknowledge success", async () => {
    const mockStartedAt = new Date();
    vi.mocked(gameFlowService.startSession).mockResolvedValue({
      _id: SESSION_ID,
      status: "LIVE",
      startedAt: mockStartedAt,
    } as any);

    const emitSpy = vi.fn();
    vi.mocked(mockIO.to).mockReturnValue({ emit: emitSpy } as any);

    const res = await triggerEvent();

    expect(res).toEqual({
      success: true,
      sessionId: SESSION_ID,
      status: "LIVE",
    });

    expect(gameFlowService.startSession).toHaveBeenCalledWith(SESSION_ID);
    expect(mockIO.to).toHaveBeenCalledWith(getSessionRoom(SESSION_ID));
    expect(emitSpy).toHaveBeenCalledWith(SERVER_EVENTS.SESSION_STARTED, {
      sessionId: SESSION_ID,
      status: "LIVE",
      startedAt: mockStartedAt,
    });
  });
});
