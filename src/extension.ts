import * as vscode from "vscode";
import { Durations, Phase, PomodoroTimer, TimerState, formatClock } from "./timer";
import { CatViewProvider } from "./catView";
import { AlertPanel } from "./alertPanel";

const PHASE_LABEL: Record<Phase, string> = {
  work: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break"
};

function readDurations(): Durations {
  const cfg = vscode.workspace.getConfiguration("pomocat");
  return {
    work: cfg.get<number>("workMinutes", 25),
    shortBreak: cfg.get<number>("shortBreakMinutes", 5),
    longBreak: cfg.get<number>("longBreakMinutes", 15),
    sessionsBeforeLongBreak: cfg.get<number>("sessionsBeforeLongBreak", 4)
  };
}

function catName(): string {
  return vscode.workspace.getConfiguration("pomocat").get<string>("catName", "Mochi") || "Mochi";
}

export function activate(context: vscode.ExtensionContext): void {
  const timer = new PomodoroTimer(readDurations());
  const view = new CatViewProvider(context.extensionUri, timer);
  let lastFinished: Phase = "work";
  const alert = new AlertPanel(context.extensionUri, {
    onGo: (autoStarted) => {
      if (!autoStarted) {
        timer.start();
      }
    },
    onSnooze: (minutes) => timer.snooze(lastFinished, minutes),
    onDismiss: () => {
      /* the timer stays parked wherever it is */
    }
  });

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.command = "pomocat.toggle";

  const paint = (s: TimerState) => {
    const cfg = vscode.workspace.getConfiguration("pomocat");
    if (!cfg.get<boolean>("showStatusBar", true)) {
      status.hide();
      return;
    }
    const face = s.running ? (s.phase === "work" ? "$(eye)" : "$(heart)") : "$(debug-pause)";
    status.text = `${face} ${formatClock(s.remaining)}`;
    status.tooltip = new vscode.MarkdownString(
      `**${catName()} — ${PHASE_LABEL[s.phase]}**\n\n` +
        `${s.running ? "Running" : "Paused"} · ${formatClock(s.remaining)} left\n\n` +
        `Sessions today: ${s.completed}\n\n_Click to ${s.running ? "pause" : "start"}._`
    );
    status.backgroundColor = s.phase === "work" || !s.running
      ? undefined
      : new vscode.ThemeColor("statusBarItem.warningBackground");
    status.show();
  };

  timer.onChange(paint);
  timer.onPhaseEnd(async (finished, next) => {
    const cfg = vscode.workspace.getConfiguration("pomocat");
    const name = catName();
    const style = cfg.get<string>("alertStyle", "takeover");
    const auto = next === "work"
      ? cfg.get<boolean>("autoStartWork", false)
      : cfg.get<boolean>("autoStartBreaks", true);

    lastFinished = finished;

    if (auto) {
      timer.start();
    } else {
      paint(timer.snapshot());
    }

    if (style === "takeover" || style === "both") {
      alert.show({
        finished,
        next,
        catName: name,
        catCount: cfg.get<number>("alertCats", 6),
        snoozeMinutes: cfg.get<number>("snoozeMinutes", 5),
        autoStarted: auto
      });
    }

    if (style === "notification" || style === "both") {
      const message = finished === "work"
        ? `${name} says: focus session done — stretch those paws. ${PHASE_LABEL[next]} is up.`
        : `${name} stretched and is ready. Back to focus?`;
      if (auto) {
        vscode.window.showInformationMessage(message);
      } else {
        const action = await vscode.window.showInformationMessage(message, "Start");
        if (action === "Start") {
          timer.start();
        }
      }
    }
  });

  paint(timer.snapshot());

  context.subscriptions.push(
    status,
    { dispose: () => timer.dispose() },
    { dispose: () => alert.dispose() },
    vscode.window.registerWebviewViewProvider(CatViewProvider.viewType, view, {
      webviewOptions: { retainContextWhenHidden: true }
    }),
    vscode.commands.registerCommand("pomocat.start", () => { alert.close(); timer.start(); }),
    vscode.commands.registerCommand("pomocat.pause", () => timer.pause()),
    vscode.commands.registerCommand("pomocat.toggle", () => timer.toggle()),
    vscode.commands.registerCommand("pomocat.reset", () => timer.reset()),
    vscode.commands.registerCommand("pomocat.skip", () => timer.skip()),
    vscode.commands.registerCommand("pomocat.pet", () => view.pet()),
    vscode.commands.registerCommand("pomocat.unleash", () =>
      alert.show({
        finished: timer.snapshot().phase,
        next: timer.snapshot().phase,
        catName: catName(),
        catCount: vscode.workspace.getConfiguration("pomocat").get<number>("alertCats", 6),
        snoozeMinutes: vscode.workspace.getConfiguration("pomocat").get<number>("snoozeMinutes", 5),
        autoStarted: timer.snapshot().running
      })
    ),
    vscode.commands.registerCommand("pomocat.focus", () =>
      vscode.commands.executeCommand("pomocat.timerView.focus")
    ),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("pomocat")) {
        return;
      }
      timer.updateDurations(readDurations());
      view.refreshName(catName());
      paint(timer.snapshot());
    })
  );
}

export function deactivate(): void {
  /* subscriptions handle teardown */
}
