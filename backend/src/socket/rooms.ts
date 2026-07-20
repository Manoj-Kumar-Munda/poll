/**
 * Returns the Socket.IO room name for a given session.
 *
 * Example: getSessionRoom("abc123") => "session:abc123"
 */
export const getSessionRoom = (sessionId: string): string =>
  `session:${sessionId}`;

/**
 * Returns the Socket.IO room name for the host of a given session.
 *
 * Example: getHostRoom("abc123") => "session:abc123:host"
 */
export const getHostRoom = (sessionId: string): string =>
  `session:${sessionId}:host`;

/**
 * Returns the Socket.IO room name for the participants of a given session.
 *
 * Example: getParticipantRoom("abc123") => "session:abc123:participants"
 */
export const getParticipantRoom = (sessionId: string): string =>
  `session:${sessionId}:participants`;

/**
 * Alias for getSessionRoom, preserved for backward compatibility.
 */
export const toSessionRoom = getSessionRoom;

