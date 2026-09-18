(function () {
  const vscode = acquireVsCodeApi();

  const el = {
    stage: document.getElementById("stage"),
    slot: document.getElementById("catSlot"),
    ring: document.getElementById("ring"),
    clock: document.getElementById("clock"),
    phase: document.getElementById("phase"),
    mood: document.getElementById("mood"),
    paws: document.getElementById("paws"),
    hearts: document.getElementById("hearts"),
    toggle: document.getElementById("toggle"),
    skip: document.getElementById("skip"),
    reset: document.getElementById("reset")
  };

  el.slot.innerHTML = catMarkup();

  const CIRCUMFERENCE = 2 * Math.PI * 54;
  const PHASE_LABEL = { work: "Focus", shortBreak: "Short break", longBreak: "Long break" };

  const MOODS = {
    workRunning: [
      "{name} is watching the cursor. No pressure.",
      "Tail flicking. {name} approves of this function.",
      "{name} has claimed the keyboard warmth. Keep typing.",
      "Locked on. {name} does not blink first."
    ],
    workIdle: [
      "{name} is waiting by the mouse.",
      "One paw on the desk. Shall we begin?",
      "{name} sat on your notes again. Start the timer?"
    ],
    breakRunning: [
      "{name} is a puddle. Go get water.",
      "Eyes shut, ears still listening. Stretch a little.",
      "Nap protocol engaged. Look away from the screen."
    ],
    breakIdle: [
      "Break's ready whenever you are.",
      "{name} is pretending not to care. Take the break."
    ],
    petted: [
      "*purrs loudly*",
      "{name} leans into it.",
      "Rumbling like a tiny engine."
    ]
  };

  let catName = "Mochi";
  let lastKey = "";
  let petTimer;

  function pick(key) {
    const list = MOODS[key];
    return list[Math.floor(Math.random() * list.length)].replace(/\{name\}/g, catName);
  }

  function render(s) {
    document.body.className =
      "phase-" + s.phase + " " + (s.running ? "running" : "paused") +
      (document.body.classList.contains("petted") ? " petted" : "");

    el.clock.textContent = s.clock;
    el.phase.textContent = PHASE_LABEL[s.phase];
    el.toggle.textContent = s.running ? "Pause" : "Start";

    const progress = s.total > 0 ? 1 - s.remaining / s.total : 0;
    el.ring.style.strokeDashoffset = String(CIRCUMFERENCE * progress);

    const done = Math.min(s.completed, 12);
    el.paws.textContent = done > 0 ? "🐾".repeat(done) : "";
    el.paws.title = s.completed + " focus session" + (s.completed === 1 ? "" : "s") + " done";

    const key =
      (s.phase === "work" ? "work" : "break") + (s.running ? "Running" : "Idle");
    if (key !== lastKey && !document.body.classList.contains("petted")) {
      lastKey = key;
      el.mood.textContent = pick(key);
    }

    document.title = s.clock + " · " + PHASE_LABEL[s.phase];
  }

  function pet() {
    document.body.classList.add("petted");
    el.mood.textContent = pick("petted");

    for (let i = 0; i < 5; i++) {
      const heart = document.createElement("i");
      heart.textContent = "♥";
      heart.style.setProperty("--dx", (Math.random() * 70 - 35).toFixed(0) + "px");
      heart.style.animationDelay = (i * 0.09).toFixed(2) + "s";
      el.hearts.appendChild(heart);
      setTimeout(() => heart.remove(), 1400);
    }

    clearTimeout(petTimer);
    petTimer = setTimeout(() => {
      document.body.classList.remove("petted");
      lastKey = "";
      vscode.postMessage({ type: "ready" });
    }, 1600);
  }

  el.stage.addEventListener("click", pet);
  el.toggle.addEventListener("click", () => vscode.postMessage({ type: "toggle" }));
  el.skip.addEventListener("click", () => vscode.postMessage({ type: "skip" }));
  el.reset.addEventListener("click", () => vscode.postMessage({ type: "reset" }));

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg.type === "state") {
      render(msg);
    } else if (msg.type === "name") {
      catName = msg.name;
      lastKey = "";
    } else if (msg.type === "pet") {
      pet();
    }
  });

  vscode.postMessage({ type: "ready" });
})();
