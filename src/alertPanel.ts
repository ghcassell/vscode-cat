import * as vscode from "vscode";
import { Phase } from "./timer";

export interface AlertRequest {
  finished: Phase;
  next: Phase;
  catName: string;
  catCount: number;
  snoozeMinutes: number;
  /** True when the next phase auto-started while this alert was raised. */
  autoStarted: boolean;
}

export interface AlertHandlers {
  onGo: (autoStarted: boolean) => void;
  onSnooze: (minutes: number) => void;
  onDismiss: () => void;
}

const HEADLINE: Record<Phase, (name: string) => string> = {
  work: (name) => `${name} says <strong>time's up</strong>`,
  shortBreak: (name) => `${name} is <strong>done napping</strong>`,
  longBreak: (name) => `${name} is <strong>done napping</strong>`
};

const SUBLINE: Record<Phase, string> = {
  work: "Focus session finished. Stand up, look out a window, drink something. The cats have the keyboard now.",
  shortBreak: "Break's over. Stretch once more, then let's get back into it.",
  longBreak: "Long break's over. The cats are warmed up and so are you."
};

const RUNNING_NOTE = "It is already running — the cats will get out of your way.";

const NEXT_LABEL: Record<Phase, string> = {
  work: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break"
};

/**
 * The takeover: a full editor panel full of cats — some bouncing along the
 * bottom, others clawing their way slowly down the screen.
 * Much harder to ignore than a notification, and it waits for an answer.
 */
export class AlertPanel {
  private panel: vscode.WebviewPanel | undefined;
  private answered = false;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly handlers: AlertHandlers
  ) {}

  show(req: AlertRequest): void {
    this.answered = false;

    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "pomocat.alert",
        "🐾 PomoCat",
        { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")]
        }
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
        // Closing the tab counts as dismissing the alert.
        if (!this.answered) {
          this.answered = true;
          this.handlers.onDismiss();
        }
      });

      this.panel.webview.onDidReceiveMessage((msg: { type: string }) => {
        if (this.answered) {
          return;
        }
        this.answered = true;
        switch (msg.type) {
          case "go":
            this.handlers.onGo(req.autoStarted);
            break;
          case "snooze":
            this.handlers.onSnooze(req.snoozeMinutes);
            break;
          default:
            this.handlers.onDismiss();
        }
        this.close();
      });
    }

    this.panel.webview.html = this.html(this.panel.webview, req);
    this.panel.reveal(vscode.ViewColumn.Active, false);
  }

  close(): void {
    this.answered = true;
    this.panel?.dispose();
    this.panel = undefined;
  }

  dispose(): void {
    this.close();
  }

  private html(webview: vscode.Webview, req: AlertRequest): string {
    const uri = (file: string) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", file));
    const nonce = Array.from({ length: 32 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
        Math.floor(Math.random() * 62)
      ]
    ).join("");

    const goLabel = req.autoStarted
      ? "Got it"
      : req.next === "work"
        ? "Back to focus"
        : `Start ${NEXT_LABEL[req.next].toLowerCase()}`;
    const nextNote = req.autoStarted ? ` · running` : "";
    const sub = SUBLINE[req.finished] + (req.autoStarted ? " " + RUNNING_NOTE : "");
    const breakClass = req.next === "work" ? "" : " break-time";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link href="${uri("alert.css")}" rel="stylesheet" />
<title>PomoCat</title>
</head>
<body class="${breakClass.trim()}">
  <canvas id="scratches" aria-hidden="true"></canvas>
  <div id="field" aria-hidden="true"></div>

  <div class="card">
    <h1>${HEADLINE[req.finished](escapeHtml(req.catName))}</h1>
    <p class="sub">${sub}</p>
    <p class="next">Next up · ${NEXT_LABEL[req.next]}${nextNote}</p>
    <div class="actions">
      <button id="go" class="primary">${goLabel}</button>
      <button id="snooze">${req.snoozeMinutes} more minutes of ${NEXT_LABEL[req.finished].toLowerCase()}</button>
      <button id="dismiss">Not now</button>
    </div>
    <p class="hint">Enter to continue · Esc to dismiss</p>
  </div>

  <script nonce="${nonce}">window.POMOCAT_ALERT = { catCount: ${req.catCount} };</script>
  <script nonce="${nonce}" src="${uri("cat.js")}"></script>
  <script nonce="${nonce}" src="${uri("alert.js")}"></script>
</body>
</html>`;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string
  );
}
