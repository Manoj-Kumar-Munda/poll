import type { QuestionTimerCallback } from "./question-timer.types.js";

/** Manages one expiration timer for each active session question. */
export class QuestionTimerManager {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  /** Starts or replaces the timer for a session question. */
  startQuestionTimer(
    sessionId: string,
    questionId: string,
    endsAt: Date,
    onExpire: QuestionTimerCallback,
  ): void {
    this.cancelQuestionTimer(sessionId);

    const delay = endsAt.getTime() - Date.now();
    if (delay <= 0) {
      void onExpire(sessionId, questionId);
      return;
    }

    const timer = setTimeout(() => {
      this.timers.delete(sessionId);
      void onExpire(sessionId, questionId);
    }, delay);

    this.timers.set(sessionId, timer);
  }

  /** Cancels the active question timer for a session. */
  cancelQuestionTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (!timer) return;

    clearTimeout(timer);
    this.timers.delete(sessionId);
  }

  /** Returns whether a session currently has a question timer. */
  hasQuestionTimer(sessionId: string): boolean {
    return this.timers.has(sessionId);
  }

  /** Removes the active question timer for a session. */
  removeQuestionTimer(sessionId: string): void {
    this.cancelQuestionTimer(sessionId);
  }
}

export const questionTimerManager = new QuestionTimerManager();
