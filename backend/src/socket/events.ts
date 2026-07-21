/**
 * Events emitted by the host client to the server.
 */
export const HOST_EVENTS = {
  JOIN: "host:join",
  JOIN_SESSION: "host:join-session",
  START_SESSION: "host:start_session",
  END_SESSION: "host:end_session",
  LAUNCH_QUESTION: "host:launch_question",
  END_QUESTION: "host:end_question",
} as const;

/**
 * Events emitted by the participant client to the server.
 */
export const PARTICIPANT_EVENTS = {
  JOIN_SESSION: "participant:join-session",
  ANSWER: "participant:answer",
} as const;

/**
 * Events emitted by the server to clients.
 */
export const SERVER_EVENTS = {
  SESSION_STARTED: "session:started",
  SESSION_ENDED: "session:ended",
  QUESTION_STARTED: "question:started",
  QUESTION_ENDED: "question:ended",
  LEADERBOARD_UPDATED: "leaderboard:updated",
  STATISTICS_UPDATED: "statistics:updated",
  PARTICIPANT_JOINED: "participant:joined",
  PARTICIPANT_CONNECTED: "participant:connected",
  PARTICIPANT_DISCONNECTED: "participant:disconnected",
  PARTICIPANT_ANSWERED: "participant:answered",
  ANSWER_RESULT: "answer:result",
} as const;
