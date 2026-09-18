(function () {
  const vscode = acquireVsCodeApi();
  const field = document.getElementById("field");
  const canvas = document.getElementById("scratches");
  const ink = canvas.getContext("2d");
  const boot = window.POMOCAT_ALERT || {};
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const GRAVITY = 2400; // px/s², shared by every leap and fall
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  /* ---------------- the scratch layer ---------------- */

  // Scratches stay sharp for a few seconds, then fade out, oldest first, so
  // the screen heals behind each cat instead of filling up with lines.
  const SCRATCH_HOLD = 3000; // ms at full strength
  const SCRATCH_FADE = 5000; // ms to fade away
  const scratches = [];

  function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ink.setTransform(dpr, 0, 0, dpr, 0, 0);
    // butt caps: segments meet end to end, so joints don't darken into dots
    ink.lineCap = "butt";
  }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);

  function gouge(x0, y0, x1, y1, width) {
    scratches.push({ x0, y0, x1, y1, width, born: performance.now() });
  }

  // Redraw every live scratch: a dark groove with a pale lip catching the
  // light on one side, so it reads on both light and dark themes.
  function drawScratches(now) {
    ink.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = 0;
    for (const g of scratches) {
      const age = now - g.born;
      if (age >= SCRATCH_HOLD + SCRATCH_FADE) {
        continue;
      }
      scratches[alive++] = g;
      const strength = age <= SCRATCH_HOLD ? 1 : 1 - (age - SCRATCH_HOLD) / SCRATCH_FADE;

      ink.strokeStyle = "rgba(0, 0, 0, " + (0.62 * strength).toFixed(3) + ")";
      ink.lineWidth = g.width;
      ink.beginPath();
      ink.moveTo(g.x0, g.y0);
      ink.lineTo(g.x1, g.y1);
      ink.stroke();

      ink.strokeStyle = "rgba(255, 255, 255, " + (0.22 * strength).toFixed(3) + ")";
      ink.lineWidth = g.width * 0.45;
      ink.beginPath();
      ink.moveTo(g.x0 + g.width * 0.7, g.y0);
      ink.lineTo(g.x1 + g.width * 0.7, g.y1);
      ink.stroke();
    }
    scratches.length = alive;
  }

  function dustAt(x, y) {
    const d = document.createElement("div");
    d.className = "dust";
    d.style.left = x + "px";
    d.style.top = y + "px";
    field.appendChild(d);
    setTimeout(() => d.remove(), 600);
  }

  /* ---------------- clingers: claws in the screen, sliding down ---------------- */

  const clingers = [];
  const TIP_OFFSET = CAT_CLING_TIP_Y - CAT_CLING_VIEW.top; // claw tips below the box top, in viewBox units

  // Somewhere along the top that another clinger isn't already hanging from.
  function freeSpot(w) {
    const room = Math.max(1, window.innerWidth - w);
    let x = rand(0, room);
    for (let tries = 0; tries < 10; tries++) {
      const clear = clingers.every(
        (c) => c.state === "gone" || Math.abs(c.x - x) > (c.w + w) / 2
      );
      if (clear) {
        break;
      }
      x = rand(0, room);
    }
    return x;
  }

  function newClinger() {
    const node = document.createElement("div");
    node.className = "kitty clinger";
    node.innerHTML = catMarkup("cling");
    field.appendChild(node);
    node.style.opacity = "0";
    const c = { node, state: "gone", respawnIn: 0, x: -1000, y: -1000, w: 0 };
    clingers.push(c);
    return c;
  }

  // (Re)launch a clinger: it leaps in from above the top edge.
  function launch(c) {
    const w = Math.min(rand(120, 170), window.innerWidth * 0.3);
    const s = w / CAT_CLING_VIEW.width;
    Object.assign(c, {
      w,
      s,
      x: freeSpot(w),
      y: -CAT_CLING_VIEW.height * s - rand(0, 80),
      vy: 0,
      // where the claws bite in
      landAt: rand(0.02, 0.28) * window.innerHeight,
      state: "leaping",
      slipping: false,
      slipFor: 0,
      claws: CAT_CLING_CLAWS.map((vx) => ({ vx, drift: 0, lastX: 0, lastY: 0 }))
    });
    c.node.style.width = w + "px";
    c.node.style.opacity = "1";
    c.node.classList.remove("letting-go", "thunk", "slipping");
    c.node.classList.add("leaping");
  }

  function clawPoint(c, claw) {
    return { x: c.x + (claw.vx + claw.drift) * c.s, y: c.y + TIP_OFFSET * c.s };
  }

  function grab(c) {
    c.state = "sliding";
    c.vy = 0;
    c.slipping = false;
    c.slipFor = rand(0.5, 1.2);
    c.node.classList.remove("leaping");
    c.node.classList.add("thunk");
    setTimeout(() => c.node.classList.remove("thunk"), 260);
    for (const claw of c.claws) {
      const p = clawPoint(c, claw);
      claw.lastX = p.x;
      claw.lastY = p.y;
      // the first bite goes in a little deeper
      gouge(p.x, p.y - 3 * c.s, p.x, p.y + 2 * c.s, 3.4 * c.s);
    }
  }

  function placeClinger(c) {
    c.node.style.transform = "translate3d(" + c.x.toFixed(1) + "px," + c.y.toFixed(1) + "px,0)";
  }

  function stepClinger(c, dt, H) {
    if (c.state === "leaping") {
      c.vy += GRAVITY * dt;
      c.y += c.vy * dt;
      const tip = c.y + TIP_OFFSET * c.s;
      if (tip >= c.landAt) {
        c.y -= tip - c.landAt;
        grab(c);
      }
    } else if (c.state === "sliding") {
      // Stick-slip: the claws hold and drag slowly, then lose grip for a moment.
      c.slipFor -= dt;
      if (c.slipFor <= 0) {
        c.slipping = !c.slipping;
        c.slipFor = c.slipping ? rand(0.12, 0.3) : rand(0.6, 1.8);
        c.node.classList.toggle("slipping", c.slipping);
      }
      c.y += (c.slipping ? rand(110, 170) : rand(12, 26)) * dt;

      for (const claw of c.claws) {
        // a slow sideways wander, so each groove wavers a little but stays a line
        claw.drift = Math.max(-2, Math.min(2, claw.drift + rand(-3, 3) * dt));
        const p = clawPoint(c, claw);
        // wait until the claw has moved a few pixels: hairline segments look grainy
        if (p.y - claw.lastY >= 4) {
          gouge(claw.lastX, claw.lastY, p.x, p.y, (c.slipping ? 2.2 : 2.8) * c.s);
          claw.lastX = p.x;
          claw.lastY = p.y;
        }
      }

      // Nearly at the bottom: let go and drop out of sight.
      if (c.y + TIP_OFFSET * c.s > H * 0.9) {
        c.state = "falling";
        c.vy = 60;
        c.node.classList.remove("slipping");
        c.node.classList.add("letting-go");
      }
    } else if (c.state === "falling") {
      c.vy += GRAVITY * dt;
      c.y += c.vy * dt;
      if (c.y > H) {
        c.state = "gone";
        c.node.style.opacity = "0";
        c.respawnIn = rand(0.6, 2.4);
      }
    } else if (c.state === "gone") {
      c.respawnIn -= dt;
      if (c.respawnIn <= 0) {
        launch(c);
      }
    }
    placeClinger(c);
  }

  /* ---------------- hoppers: sitting cats bouncing along the bottom ---------------- */

  const hoppers = [];

  function newHopper(i, count) {
    const lane = window.innerWidth / count;
    const w = Math.min(rand(100, 140), lane * 0.9);
    const shadow = document.createElement("div");
    shadow.className = "ground-shadow";
    shadow.style.width = w * 0.6 + "px";
    const node = document.createElement("div");
    node.className = "kitty hopper";
    node.style.width = w + "px";
    node.innerHTML = catMarkup("sit");
    field.appendChild(shadow);
    field.appendChild(node);

    hoppers.push({
      node,
      shadow,
      w,
      lane: i,
      x: lane * i + (lane - w) / 2,
      lift: 0, // height above the floor
      vx: 0,
      vy: 0,
      state: "resting",
      timer: rand(0.1, 1.2)
    });
  }

  function stepHopper(h, dt, W, H, laneW) {
    let sx = 1;
    let sy = 1;
    let tilt = 0;

    h.timer -= dt;
    if (h.state === "resting") {
      if (h.timer <= 0) {
        h.state = "crouching";
        h.timer = 0.16;
      }
    } else if (h.state === "crouching") {
      const k = 1 - Math.max(0, h.timer) / 0.16;
      sx = 1 + 0.12 * k;
      sy = 1 - 0.16 * k;
      if (h.timer <= 0) {
        // mostly little hops, now and then a big one
        const height = Math.random() < 0.2 ? rand(0.3, 0.5) * H : rand(50, 170);
        h.vy = Math.sqrt(2 * GRAVITY * height);
        // wander a little within its own lane
        const home = laneW * h.lane + (laneW - h.w) / 2;
        const target = home + rand(-0.3, 0.3) * laneW;
        h.vx = (target - h.x) / ((2 * h.vy) / GRAVITY);
        h.state = "airborne";
        h.node.classList.add("airborne");
      }
    } else if (h.state === "airborne") {
      h.vy -= GRAVITY * dt;
      h.lift += h.vy * dt;
      h.x = Math.max(0, Math.min(W - h.w, h.x + h.vx * dt));
      sx = 0.94;
      sy = 1.07;
      tilt = Math.max(-12, Math.min(12, h.vx * 0.05));
      if (h.lift <= 0) {
        h.lift = 0;
        h.state = "landing";
        h.timer = 0.14;
        h.node.classList.remove("airborne");
        dustAt(h.x + h.w * 0.2, H - 10);
        dustAt(h.x + h.w * 0.8, H - 10);
      }
    } else if (h.state === "landing") {
      const k = Math.max(0, h.timer) / 0.14;
      sx = 1 + 0.16 * k;
      sy = 1 - 0.2 * k;
      if (h.timer <= 0) {
        h.state = "resting";
        h.timer = rand(0.15, 1.3);
      }
    }

    // the cat's feet sit a little above the bottom of its square box
    const y = H - h.w * 0.96 - h.lift;
    h.node.style.transform =
      "translate3d(" + h.x.toFixed(1) + "px," + y.toFixed(1) + "px,0) " +
      "rotate(" + tilt.toFixed(1) + "deg) scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")";

    const shrink = Math.max(0.35, 1 - h.lift / 400);
    h.shadow.style.transform =
      "translate3d(" + (h.x + h.w * 0.2).toFixed(1) + "px," + (H - 16) + "px,0) " +
      "scale(" + shrink.toFixed(3) + ")";
    h.shadow.style.opacity = String(shrink);
  }

  /* ---------------- run ---------------- */

  const count = Math.max(1, Math.min(24, boot.catCount || 6));
  const clingerCount = Math.ceil(count / 2);
  const hopperCount = count - clingerCount;

  for (let i = 0; i < hopperCount; i++) {
    newHopper(i, hopperCount);
  }
  for (let i = 0; i < clingerCount; i++) {
    // stagger the arrivals
    newClinger().respawnIn = i * rand(0.5, 1.1);
  }

  if (still) {
    // No motion: every cat simply appears where it would have settled.
    for (const c of clingers) {
      launch(c);
      c.y = c.landAt - TIP_OFFSET * c.s;
      c.state = "still";
      c.node.classList.remove("leaping");
      placeClinger(c);
    }
    for (const h of hoppers) {
      h.timer = Infinity;
      stepHopper(h, 0, window.innerWidth, window.innerHeight, window.innerWidth / hopperCount);
    }
  } else {
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = window.innerWidth;
      const H = window.innerHeight;
      for (const c of clingers) {
        stepClinger(c, dt, H);
      }
      for (const h of hoppers) {
        stepHopper(h, dt, W, H, W / hopperCount);
      }
      drawScratches(now);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------------- buttons ---------------- */

  function send(type) {
    vscode.postMessage({ type: type });
  }

  document.getElementById("go").addEventListener("click", () => send("go"));
  document.getElementById("snooze").addEventListener("click", () => send("snooze"));
  document.getElementById("dismiss").addEventListener("click", () => send("dismiss"));

  window.addEventListener("keydown", (e) => {
    // A focused button already handles Enter itself; don't answer twice.
    const onButton = document.activeElement && document.activeElement.tagName === "BUTTON";
    if (e.key === "Enter" && !onButton) {
      e.preventDefault();
      send("go");
    }
    if (e.key === "Escape") {
      e.preventDefault();
      send("dismiss");
    }
  });

  document.getElementById("go").focus();
})();
