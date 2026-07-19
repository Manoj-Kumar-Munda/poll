/**
 * Returns the Socket.IO room name for a given session.
 *
 * Room strategy: every live session maps to a single room.
 * Both the host and participants joined to the same session
 * are placed in this room.
 *
 * Example: toSessionRoom("abc123") => "session:abc123"
 */
export const toSessionRoom = (sessionId: string): string =>
  `session:${sessionId}`;
