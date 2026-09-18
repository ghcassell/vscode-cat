# 🐾 PomoCat

A pomodoro timer for VS Code, guarded by a black ragdoll cat with green‑yellow
eyes, a white bib and white paws.

The cat lives in its own sidebar panel and reacts to your session:

| When | What the cat does |
| --- | --- |
| **Focus running** | Narrows its eyes, locks on, tail flicking fast |
| **Break** | Eyes shut, slow breathing, little `z`s floating up |
| **Paused** | Taps a white paw, impatiently |
| **Always** | Breathes, blinks, twitches an ear, swishes its tail |
| **Clicked** | Purrs, half‑closes its eyes, throws hearts |

Every finished focus session adds a 🐾 under the timer.

## The takeover

A notification is too easy to ignore, so when a session ends PomoCat takes over
the whole editor area with copies of the sidebar cat. Some bounce up and down
along the bottom of the screen; others leap on from above, sink their claws in,
and slowly slide down — leaving scratch marks that slowly fade — before letting go.
It stays until you answer it:

- **Start / Got it** — begin the next session (Enter)
- **5 more minutes of focus** — go back to what just ended for a short stretch;
  a snoozed session is not counted twice
- **Not now** — leave the timer parked (Esc, or just close the tab)

Preview it any time with `PomoCat: Unleash the Cats`, and set the size of the
herd with `pomocat.alertCats` (1–24). If it's too much, `pomocat.alertStyle`
switches back to `notification`, or turns it off with `none`.

> **One limit worth knowing:** VS Code extensions cannot draw outside the VS Code
> window — there is no API for an OS-level overlay. The cats therefore stay inside
> the editor area, which is the largest surface an extension is allowed to claim.

## Using it

Open the paw icon in the activity bar, or run any of these from the command
palette:

- `PomoCat: Start / Resume Timer`
- `PomoCat: Pause Timer`
- `PomoCat: Reset Current Session`
- `PomoCat: Skip to Next Session`
- `PomoCat: Pet the Cat`
- `PomoCat: Unleash the Cats (preview the alert)`
- `PomoCat: Show the Cat`

The status bar shows the remaining time; click it to start or pause.

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `pomocat.workMinutes` | `25` | Length of a focus session |
| `pomocat.shortBreakMinutes` | `5` | Length of a short break |
| `pomocat.longBreakMinutes` | `15` | Length of a long break |
| `pomocat.sessionsBeforeLongBreak` | `4` | Focus sessions before a long break |
| `pomocat.autoStartBreaks` | `true` | Start breaks automatically |
| `pomocat.autoStartWork` | `false` | Start the next focus session automatically |
| `pomocat.showStatusBar` | `true` | Show the timer in the status bar |
| `pomocat.alertStyle` | `takeover` | `takeover`, `notification`, `both` or `none` |
| `pomocat.alertCats` | `6` | How many cats appear during the takeover |
| `pomocat.snoozeMinutes` | `5` | Minutes added when you ask for more time |
| `pomocat.catName` | `Mochi` | Your cat's name |

## Developing

```bash
npm install
npm run compile   # or: npm run watch
```

Then press <kbd>F5</kbd> in VS Code to launch an Extension Development Host with
PomoCat loaded.

### Layout

```
src/timer.ts      pomodoro clock — pure logic, no VS Code imports
src/extension.ts  commands, status bar, notifications
src/catView.ts    the sidebar webview host
src/alertPanel.ts the full-editor takeover panel
media/cat.js      the cat as inline SVG: sitting, or clinging by its claws
media/style.css   the sidebar cat's animations
media/main.js     sidebar state → cat moods
media/alert.css   hop and cling poses, dust and takeover layout
media/alert.js    hopping, clinging and the scratch marks
```

The cat honours `prefers-reduced-motion`: all animation stops if you ask the
system for less of it.

## License

MIT
