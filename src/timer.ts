/** Phases the cat cycles through. */
export type Phase = "work" | "shortBreak" | "longBreak";

export interface Durations {
  work: number;
  shortBreak: number;
  longBreak: number;
  sessionsBeforeLongBreak: number;
}

export interface TimerState {
  phase: Phase;
  running: boolean;
  /** Seconds left in the current phase. */
  remaining: number;
  /** Total seconds of the current phase. */
  total: number;
  /** Completed focus sessions since the last long break. */
  streak: number;
  /** Completed focus sessions overall. */
  completed: number;
}

const MINUTE = 60;

/**
 * The pomodoro clock. Knows nothing about VS Code: it ticks, it switches
 * phases, and it tells whoever is listening what changed.
 */
export class PomodoroTimer {
  private state: TimerState;
  /** A snoozed phase must not be credited a second time when it ends. */
  private snoozed = false;
  private handle: NodeJS.Timeout | undefined;
  private readonly changeListeners: Array<(s: TimerState) => void> = [];
  private readonly phaseEndListeners: Array<(finished: Phase, next: Phase) => void> = [];

  constructor(private durations: Durations) {
    const total = this.phaseSeconds("work");
    this.state = {
      phase: "work",
      running: false,
      remaining: total,
      total,
      streak: 0,
      completed: 0
    };
  }

  onChange(fn: (s: TimerState) => void): void {
    this.changeListeners.push(fn);
  }

  onPhaseEnd(fn: (finished: Phase, next: Phase) => void): void {
    this.phaseEndListeners.push(fn);
  }

  snapshot(): TimerState {
    return { ...this.state };
  }

  start(): void {
    if (this.state.running) {
      return;
    }
    this.state.running = true;
    this.handle = setInterval(() => this.tick(), 1000);
    this.emit();
  }

  pause(): void {
    if (!this.state.running) {
      return;
    }
    this.state.running = false;
    this.clearHandle();
    this.emit();
  }

  toggle(): void {
    this.state.running ? this.pause() : this.start();
  }

  /** Back to the top of the current phase. */
  reset(): void {
    this.pause();
    this.state.total = this.phaseSeconds(this.state.phase);
    this.state.remaining = this.state.total;
    this.emit();
  }

  /** Jump to the next phase without crediting a finished session. */
  skip(): void {
    const wasRunning = this.state.running;
    this.pause();
    this.advance(false);
    if (wasRunning) {
      this.start();
    } else {
      this.emit();
    }
  }

  /**
   * "Five more minutes" — go back to the phase that just ended and run it
   * again for a short stretch. It will not be counted a second time.
   */
  snooze(phase: Phase, minutes: number): void {
    this.pause();
    this.state.phase = phase;
    this.state.total = Math.round(minutes * MINUTE);
    this.state.remaining = this.state.total;
    this.snoozed = true;
    this.start();
  }

  /** Add time to the phase that is running right now. */
  extend(minutes: number): void {
    const extra = Math.round(minutes * MINUTE);
    this.state.remaining += extra;
    this.state.total += extra;
    this.emit();
  }

  /** Re-read settings; a phase that is not mid-run picks up its new length. */
  updateDurations(durations: Durations): void {
    this.durations = durations;
    const total = this.phaseSeconds(this.state.phase);
    if (!this.state.running && this.state.remaining === this.state.total) {
      this.state.remaining = total;
    }
    this.state.total = total;
    this.emit();
  }

  dispose(): void {
    this.clearHandle();
  }

  private tick(): void {
    this.state.remaining -= 1;
    if (this.state.remaining <= 0) {
      const finished = this.state.phase;
      this.pause();
      const next = this.advance(true);
      this.phaseEndListeners.forEach((fn) => fn(finished, next));
      return;
    }
    this.emit();
  }

  /** Move to whatever comes next; `credited` marks a genuinely finished phase. */
  private advance(credited: boolean): Phase {
    const current = this.state.phase;
    let next: Phase;

    if (this.snoozed) {
      credited = false;
      this.snoozed = false;
    }

    if (current === "work") {
      if (credited) {
        this.state.completed += 1;
        this.state.streak += 1;
      }
      const due = this.state.streak > 0 &&
        this.state.streak % this.durations.sessionsBeforeLongBreak === 0;
      next = due ? "longBreak" : "shortBreak";
      if (due && credited) {
        this.state.streak = 0;
      }
    } else {
      next = "work";
    }

    this.state.phase = next;
    this.state.total = this.phaseSeconds(next);
    this.state.remaining = this.state.total;
    return next;
  }

  private phaseSeconds(phase: Phase): number {
    switch (phase) {
      case "work":
        return Math.round(this.durations.work * MINUTE);
      case "shortBreak":
        return Math.round(this.durations.shortBreak * MINUTE);
      case "longBreak":
        return Math.round(this.durations.longBreak * MINUTE);
    }
  }

  private clearHandle(): void {
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = undefined;
    }
  }

  private emit(): void {
    const snap = this.snapshot();
    this.changeListeners.forEach((fn) => fn(snap));
  }
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
