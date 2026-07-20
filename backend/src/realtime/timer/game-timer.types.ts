export type GameTimerCallback = (
  sessionId: string,
  questionId: string,
) => Promise<void> | void;
