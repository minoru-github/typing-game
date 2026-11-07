import type { Question } from './questions';

export type InputResult = 'correct' | 'miss' | 'wordDone' | 'finished' | 'ignored';

/** タイピングの進み具合を管理する（画面には依存しない） */
export class TypingSession {
  qIndex = 0;
  pos = 0;
  correct = 0;
  misses = 0;
  readonly missMap = new Map<string, number>();
  startedAt = 0;
  finishedAt = 0;

  constructor(readonly questions: readonly Question[]) {}

  get finished(): boolean {
    return this.qIndex >= this.questions.length;
  }
  get current(): Question | undefined {
    return this.questions[this.qIndex];
  }
  get expected(): string | undefined {
    return this.current?.text[this.pos];
  }

  start(now: number): void {
    this.startedAt = now;
  }

  input(ch: string, now: number): InputResult {
    const q = this.current;
    if (!q) return 'ignored';
    const exp = q.text[this.pos];
    if (ch !== exp) {
      this.misses++;
      this.missMap.set(exp, (this.missMap.get(exp) ?? 0) + 1);
      return 'miss';
    }
    this.correct++;
    this.pos++;
    if (this.pos < q.text.length) return 'correct';
    this.qIndex++;
    this.pos = 0;
    if (this.finished) {
      this.finishedAt = now;
      return 'finished';
    }
    return 'wordDone';
  }
}
