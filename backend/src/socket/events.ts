/**
 * Events emitted by the host client to the server.
 */
export const HOST_EVENTS = {
  SESSION_START: "session:start",
  SESSION_END: "session:end",
  QUESTION_START: "question:start",
  QUESTION_END: "question:end",
} as const;

/**
 * Events emitted by the participant client to the server.
 */
export const PARTICIPANT_EVENTS = {
  JOIN: "participant:join",
  ANSWER: "participant:answer",
} as const;

/**
 * Events emitted by the server to clients.
 */
export const SERVER_EVENTS = {
  SESSION_STARTED: "session:started",
  QUESTION_STARTED: "question:started",
  LEADERBOARD_UPDATED: "leaderboard:updated",
  STATISTICS_UPDATED: "statistics:updated",
} as const;
