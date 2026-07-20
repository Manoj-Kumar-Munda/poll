import { describe, it, expect, vi, beforeEach } from "vitest";
import { authMiddleware } from "../socket/middleware/auth.middleware.js";

vi.mock("../modules/auth/auth.js", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const { auth } = await import("../modules/auth/auth.js");

describe("Socket.IO Host Authentication Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockSocket = (query = {}, authPayload = {}, headers = {}) => {
    return {
      handshake: {
        query,
        auth: authPayload,
        headers,
      },
      data: {},
    } as any;
  };

  it("should bypass validation and allow connection when role is not host", async () => {
    const socket = createMockSocket({ role: "participant" });
    const next = vi.fn();

    await authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
    expect(auth.api.getSession).not.toHaveBeenCalled();
    expect(socket.data.user).toBeUndefined();
  });

  it("should reject connection with Unauthorized if role is host and session is missing", async () => {
    const socket = createMockSocket({ role: "host" }, {}, { cookie: "session=invalid" });
    const next = vi.fn();
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    await authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe("Unauthorized");
    expect(socket.data.user).toBeUndefined();
  });

  it("should succeed, populate socket.data.user, and call next() if role is host and session is valid", async () => {
    const socket = createMockSocket({}, { role: "host" }, { cookie: "session=valid" });
    const next = vi.fn();
    const mockSession = {
      user: {
        id: "host-123",
        email: "host@example.com",
        name: "Host Name",
        otherField: "unwanted-data",
      },
      session: {
        id: "sess-abc",
      },
    };
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

    await authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
    expect(socket.data.user).toEqual({
      id: "host-123",
      email: "host@example.com",
      name: "Host Name",
    });
  });

  it("should reject with Unauthorized if role is host and getSession throws an error", async () => {
    const socket = createMockSocket({ role: "host" });
    const next = vi.fn();
    vi.mocked(auth.api.getSession).mockRejectedValue(new Error("Db error"));

    await authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe("Unauthorized");
    expect(socket.data.user).toBeUndefined();
  });
});
