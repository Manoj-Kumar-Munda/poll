export type QuestionTimerCallback = (
  sessionId: string,
  questionId: string,
) => Promise<void> | void;
