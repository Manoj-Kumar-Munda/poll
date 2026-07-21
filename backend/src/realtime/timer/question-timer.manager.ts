import type { QuestionTimerCallback } from "./question-timer.types.js";

export class QuestionTimerManager {
  private readonly timers = new Map<string, NodeJS.Timeout>();

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

  cancelQuestionTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (!timer) return;

    clearTimeout(timer);
    this.timers.delete(sessionId);
  }

  hasQuestionTimer(sessionId: string): boolean {
    return this.timers.has(sessionId);
  }

  removeQuestionTimer(sessionId: string): void {
    this.cancelQuestionTimer(sessionId);
  }
}

export const questionTimerManager = new QuestionTimerManager();
