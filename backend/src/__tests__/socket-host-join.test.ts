import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerHostHandlers } from "../socket/handlers/host.handler.js";
import { HOST_EVENTS } from "../socket/events.js";
import { getSessionRoom } from "../socket/rooms.js";

vi.mock("../modules/sessions/session.repository.js", () => ({
  sessionRepository: {
    findById: vi.fn(),
  },
}));

const { sessionRepository } = await import(
  "../modules/sessions/session.repository.js"
);

const HOST_ID = "507f1f77bcf86cd799439011";
const SESSION_ID = "507f1f77bcf86cd799439012";

describe("Socket.IO host:join-session Event Handler", () => {
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
      },
    };

    mockIO = {};

    registerHostHandlers(mockSocket, mockIO);
  });

  const triggerEvent = async (payload: any) => {
    const handler = handlers[HOST_EVENTS.JOIN_SESSION];
    if (!handler) throw new Error("Handler not registered");

    return new Promise<any>((resolve) => {
      handler(payload, (response: any) => {
        resolve(response);
      });
    });
  };

  it("should return Invalid payload if payload is missing or invalid", async () => {
    const res1 = await triggerEvent({});
    expect(res1).toEqual({ error: "Invalid payload" });

    const res2 = await triggerEvent({ sessionId: "invalid-id" });
    expect(res2).toEqual({ error: "Invalid payload" });
  });

  it("should return Unauthorized if host information is missing on socket", async () => {
    delete mockSocket.data.host;
    const res = await triggerEvent({ sessionId: SESSION_ID });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("should return Session not found if session is missing in database", async () => {
    vi.mocked(sessionRepository.findById).mockResolvedValue(null);

    const res = await triggerEvent({ sessionId: SESSION_ID });
    expect(res).toEqual({ error: "Session not found" });
    expect(sessionRepository.findById).toHaveBeenCalledWith(SESSION_ID);
  });

  it("should return Unauthorized if session is owned by another host", async () => {
    const mockSession = {
      _id: SESSION_ID,
      ownerId: "other-host-id",
      roomCode: "ABCDEF",
      status: "WAITING",
    };
    vi.mocked(sessionRepository.findById).mockResolvedValue(mockSession as any);

    const res = await triggerEvent({ sessionId: SESSION_ID });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("should join session/host rooms, store sessionId on socket, and acknowledge success", async () => {
    const mockSession = {
      _id: { toString: () => SESSION_ID },
      ownerId: HOST_ID,
      roomCode: "ABCDEF",
      status: "WAITING",
    };
    vi.mocked(sessionRepository.findById).mockResolvedValue(mockSession as any);

    const res = await triggerEvent({ sessionId: SESSION_ID });

    expect(res).toEqual({
      sessionId: SESSION_ID,
      roomCode: "ABCDEF",
      status: "WAITING",
    });

    expect(mockSocket.join).toHaveBeenCalledWith(getSessionRoom(SESSION_ID));
    expect(mockSocket.join).toHaveBeenCalledWith(`host:${HOST_ID}`);
    expect(mockSocket.data.sessionId).toBe(SESSION_ID);
  });
});
