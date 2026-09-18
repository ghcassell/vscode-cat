import * as vscode from "vscode";
import { PomodoroTimer, TimerState, formatClock } from "./timer";

/** Hosts the webview with the cat in it and keeps it in sync with the timer. */
export class CatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "pomocat.timerView";

  private webview: vscode.Webview | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly timer: PomodoroTimer
  ) {
    this.timer.onChange((s) => this.post(s));
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.webview = view.webview;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")]
    };
    view.webview.html = this.html(view.webview);

    view.webview.onDidReceiveMessage((msg: { type: string }) => {
      switch (msg.type) {
        case "ready":
          this.refreshName(this.catName());
          this.post(this.timer.snapshot());
          break;
        case "toggle":
          this.timer.toggle();
          break;
        case "reset":
          this.timer.reset();
          break;
        case "skip":
          this.timer.skip();
          break;
      }
    });

    view.onDidDispose(() => {
      this.webview = undefined;
    });
  }

  /** Make the cat purr, from the command palette. */
  pet(): void {
    this.webview?.postMessage({ type: "pet" });
  }

  refreshName(name: string): void {
    this.webview?.postMessage({ type: "name", name });
  }

  private catName(): string {
    return vscode.workspace.getConfiguration("pomocat").get<string>("catName", "Mochi") || "Mochi";
  }

  private post(s: TimerState): void {
    this.webview?.postMessage({
      type: "state",
      phase: s.phase,
      running: s.running,
      remaining: s.remaining,
      total: s.total,
      clock: formatClock(s.remaining),
      streak: s.streak,
      completed: s.completed
    });
  }

  private html(webview: vscode.Webview): string {
    const uri = (...parts: string[]) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", ...parts));
    const nonce = Array.from({ length: 32 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
        Math.floor(Math.random() * 62)
      ]
    ).join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link href="${uri("style.css")}" rel="stylesheet" />
<title>PomoCat</title>
</head>
<body>
  <main class="wrap">
    <div class="stage" id="stage" title="Pet the cat">
      <div class="ring-wrap">
        <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="ring-track" cx="60" cy="60" r="54" />
          <circle class="ring-fill" id="ring" cx="60" cy="60" r="54" />
        </svg>
        <div class="cat-slot" id="catSlot"></div>
      </div>
      <div class="zzz" id="zzz"><span>z</span><span>z</span><span>z</span></div>
      <div class="hearts" id="hearts"></div>
    </div>

    <p class="clock" id="clock">25:00</p>
    <p class="phase" id="phase">Focus</p>
    <p class="mood" id="mood">Ready when you are.</p>

    <div class="buttons">
      <button id="toggle" class="primary">Start</button>
      <button id="skip" title="Skip to the next session">Skip</button>
      <button id="reset" title="Restart this session">Reset</button>
    </div>

    <p class="paws" id="paws" aria-label="completed sessions"></p>
  </main>
  <script nonce="${nonce}" src="${uri("cat.js")}"></script>
  <script nonce="${nonce}" src="${uri("main.js")}"></script>
</body>
</html>`;
  }
}
