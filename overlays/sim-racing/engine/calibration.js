/* Calibration engine + status panel — Layer 2.

   const cal = createCalibration({
     state,                            // shared { thr, brk, clu, str, real }
     mount: element,                   // where the panel renders
     storeKey: "g923.calibration.v2",  // localStorage key, or null to disable
     autoHideWhenLive: true,           // overlay: hide panel while streaming
     onLiveChange: live => {}          // optional callback
   });

   Each animation frame the host calls:  cal.poll()
   Host queries:  cal.isCalibrating(), cal.isLive(), cal.hasCalibration()
   Host actions:  cal.calibrateAll(), cal.show()

   Extracted from the single-file prototype: the state machine and panel DOM are
   verbatim; the only changes are that the axis→channel maths now comes from the
   pure `calibration-math.js` layer and the wheel read comes from `gamepad.js`,
   so both are independently testable.

   Calibration model
   -----------------
   - Neutral first: user releases pedals + centers the wheel so we capture a
     clean rest baseline (no false triggers from a held pedal).
   - Pedals are a unipolar stroke: press fully, release. We record rest + the
     real full-press extreme, so live values scale to actual travel (bars reach
     100% only at full press).
   - Steering is bipolar: sweep full-left, full-right, re-center. We record rest
     + min + max and map to -1..+1.
   - Axes already assigned to other channels are excluded, and each capture is a
     complete press->release (or sweep->center) cycle, so releasing one control
     can never be mistaken for the next. */

import { mapPedal, mapWheel } from "./calibration-math.js";
import { getPad } from "./gamepad.js";

const CHANNELS = [
  { key: "throttle", name: "Throttle", short: "thr", mode: "pedal", color: "#34d97a" },
  { key: "brake",    name: "Brake",    short: "brk", mode: "pedal", color: "#f2453d" },
  { key: "clutch",   name: "Clutch",   short: "clu", mode: "pedal", color: "#ffb020" },
  { key: "steering", name: "Steering", short: "str", mode: "wheel", color: "#64b5ff", optional: true }
];
const PEDAL_KEYS = ["throttle", "brake", "clutch"];
const PRESS_THRESHOLD = 0.35; // deviation from rest that counts as "moved"
const RELEASE_BAND    = 0.12; // deviation below which a control is "back at rest"
const WHEEL_SWEEP     = 0.30; // each side must move at least this far to count

const chOf = key => CHANNELS.find(c => c.key === key);

const CSS = `
.g923cal{font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,monospace;font-size:12px;
  color:#eceae5;background:#15171c;border:1px solid #2e323c;border-radius:10px;
  padding:12px 14px;width:340px;max-width:92vw;line-height:1.4}
.g923cal-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
.g923cal-title{font-weight:600;letter-spacing:.04em}
.g923cal-conn{font-size:11px;color:#878d9a;white-space:nowrap}
.g923cal-conn.on{color:#34d97a}
.g923cal-rows{display:flex;flex-direction:column;gap:2px}
.g923cal-row{display:grid;grid-template-columns:12px 70px 54px 1fr auto;gap:8px;align-items:center;padding:3px 0}
.g923cal-row .dot{width:10px;height:10px;border-radius:50%}
.g923cal-row .ax{color:#878d9a;font-size:11px}
.g923cal-row .st{text-align:right;font-variant-numeric:tabular-nums}
.g923cal .muted{color:#5f6672}
.g923cal .warn{color:#ffb020}
.g923cal button{font:inherit;font-size:11px;letter-spacing:.02em;background:#22252d;color:#eceae5;
  border:1px solid #2e323c;border-radius:6px;padding:4px 9px;cursor:pointer;transition:border-color .12s,color .12s}
.g923cal button:hover{border-color:#ffb020;color:#ffb020}
.g923cal-row button{padding:2px 8px}
.g923cal-active{margin-top:10px;border-top:1px solid #2e323c;padding-top:10px}
.g923cal-prompt{margin-bottom:9px}
.g923cal-prompt b{color:#ffb020;font-weight:600}
.g923cal-btns{display:flex;gap:6px;flex-wrap:wrap}
.g923cal-actions{display:flex;gap:8px;align-items:center;margin-top:11px;border-top:1px solid #2e323c;padding-top:10px}
.g923cal-msg{color:#878d9a;font-size:11px;margin-left:auto;text-align:right}
.g923cal [hidden]{display:none!important}
`;

function injectCSS() {
  if (document.getElementById("g923cal-css")) return;
  const s = document.createElement("style");
  s.id = "g923cal-css"; s.textContent = CSS;
  document.head.appendChild(s);
}

export function createCalibration(opts) {
  injectCSS();

  const state    = opts.state;
  const storeKey = opts.storeKey || null;
  const autoHide = !!opts.autoHideWhenLive;
  const fireLive = () => { if (opts.onLiveChange) opts.onLiveChange(!!state.real); };

  // engine state
  const S = { map: {}, queue: [], phase: "idle", baseline: null, cand: null, used: [] };

  if (storeKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || "null");
      if (saved && typeof saved === "object") S.map = saved;
    } catch (e) { /* ignore corrupt storage */ }
  }

  const hasAllPedals = () => PEDAL_KEYS.every(k => S.map[k]);
  const current = () => S.queue[0];

  /* ---------- panel DOM ---------- */
  const el = document.createElement("div");
  el.className = "g923cal";
  el.innerHTML =
    '<div class="g923cal-top">' +
      '<span class="g923cal-title">G923 calibration</span>' +
      '<span class="g923cal-conn" data-conn>○ no device</span>' +
    '</div>' +
    '<div class="g923cal-rows" data-rows></div>' +
    '<div class="g923cal-active" data-active hidden>' +
      '<div class="g923cal-prompt" data-prompt></div>' +
      '<div class="g923cal-btns">' +
        '<button data-confirm>Confirm</button>' +
        '<button data-redo hidden>Redo</button>' +
        '<button data-skip hidden>Skip</button>' +
        '<button data-cancel>Cancel</button>' +
      '</div>' +
    '</div>' +
    '<div class="g923cal-actions" data-actions>' +
      '<button data-cal-all>Calibrate all</button>' +
      '<button data-clear>Clear</button>' +
      '<span class="g923cal-msg" data-msg></span>' +
    '</div>';
  opts.mount.appendChild(el);

  const q = sel => el.querySelector(sel);
  const rowsEl = q("[data-rows]"), connEl = q("[data-conn]");
  const activeEl = q("[data-active]"), actionsEl = q("[data-actions]");
  const promptEl = q("[data-prompt]"), msgEl = q("[data-msg]");
  const confirmBtn = q("[data-confirm]"), redoBtn = q("[data-redo]");
  const skipBtn = q("[data-skip]"), cancelBtn = q("[data-cancel]");

  const setPrompt = html => { promptEl.innerHTML = html; };
  const setMsg = t => { msgEl.textContent = t || ""; };
  function stepButtons(o) {
    confirmBtn.hidden = !o.confirm; redoBtn.hidden = !o.redo;
    skipBtn.hidden = !o.skip; cancelBtn.hidden = !o.cancel;
  }

  const rowRefs = {};
  function renderRows() {
    rowsEl.innerHTML = "";
    for (const c of CHANNELS) {
      const m = S.map[c.key];
      const row = document.createElement("div");
      row.className = "g923cal-row";
      row.innerHTML =
        '<span class="dot" style="background:' + (m ? c.color : "#3a3e46") + '"></span>' +
        '<span class="nm">' + c.name + '</span>' +
        '<span class="ax">' + (m ? "axis " + m.axis : "—") + '</span>' +
        '<span class="st"></span>' +
        '<button>' + (m ? "Redo" : "Set") + '</button>';
      row.querySelector("button").addEventListener("click", () => startQueue([c.key]));
      rowsEl.appendChild(row);
      rowRefs[c.key] = { st: row.querySelector(".st"), dot: row.querySelector(".dot"), ax: row.querySelector(".ax") };
    }
    updateRowStatus();
  }
  function updateRowStatus() {
    for (const c of CHANNELS) {
      const ref = rowRefs[c.key], m = S.map[c.key];
      if (!ref) continue;
      if (!m) {
        ref.st.innerHTML = c.optional ? '<span class="muted">optional</span>' : '<span class="warn">needed</span>';
      } else if (state.real) {
        const p = c.mode === "pedal" ? Math.round(state[c.short] * 100) : Math.round(state.str * 100);
        ref.st.textContent = p + "%";
      } else {
        ref.st.innerHTML = "✓";
      }
    }
  }

  /* ---------- flow ---------- */
  function startQueue(keys) {
    S.queue = keys.slice();
    S.cand = null;
    S.used = CHANNELS.filter(c => !keys.includes(c.key) && S.map[c.key]).map(c => S.map[c.key].axis);
    state.real = false; fireLive();
    show();
    S.phase = "neutral";
    activeEl.hidden = false; actionsEl.hidden = true;
    setPrompt("Release all pedals and <b>center the wheel</b>, then click <b>Confirm neutral</b>.");
    confirmBtn.textContent = "Confirm neutral";
    stepButtons({ confirm: true, cancel: true });
    setMsg("");
  }

  function promptCapture() {
    const c = chOf(current());
    confirmBtn.textContent = "Confirm";
    setPrompt(c.mode === "pedal"
      ? 'Press and hold <b>' + c.name + '</b> all the way down, then release it.'
      : 'Turn the <b>wheel fully left</b>, then <b>fully right</b>, then re-center.');
    stepButtons({ skip: !!c.optional, cancel: true });
  }

  function toConfirm() {
    const c = chOf(current());
    S.phase = "confirm";
    let info;
    if (c.mode === "pedal") {
      info = "travel " + Math.round(Math.abs(S.cand.ext - S.cand.rest) * 100) + "%";
    } else {
      info = "left " + Math.round((S.cand.rest - S.cand.min) * 100) +
             "% / right " + Math.round((S.cand.max - S.cand.rest) * 100) + "%";
    }
    setPrompt('<b>' + c.name + '</b> = axis ' + S.cand.axis + ' (' + info + '). <b>Confirm</b> or <b>Redo</b>.');
    stepButtons({ confirm: true, redo: true, skip: !!c.optional, cancel: true });
  }

  function storeCand() {
    const c = chOf(current());
    S.used.push(S.cand.axis);
    S.map[c.key] = c.mode === "pedal"
      ? { axis: S.cand.axis, rest: S.cand.rest, full: S.cand.ext, mode: "pedal" }
      : { axis: S.cand.axis, rest: S.cand.rest, min: S.cand.min, max: S.cand.max, mode: "wheel" };
  }

  function advance() {
    S.queue.shift(); S.cand = null;
    if (!S.queue.length) finish();
    else { S.phase = "capture"; promptCapture(); }
  }

  function finish() {
    S.phase = "idle"; S.cand = null; S.queue = [];
    if (storeKey) localStorage.setItem(storeKey, JSON.stringify(S.map));
    activeEl.hidden = true; actionsEl.hidden = false;
    state.real = hasAllPedals(); fireLive();
    renderRows();
    setMsg(hasAllPedals() ? "Calibrated ✓" : "Throttle, brake, clutch still needed.");
  }

  /* ---------- buttons ---------- */
  confirmBtn.addEventListener("click", () => {
    const pad = getPad();
    if (!pad) { setMsg("No device — press a wheel button."); return; }
    if (S.phase === "neutral") {
      S.baseline = Array.from(pad.axes);
      S.phase = "capture"; S.cand = null;
      promptCapture();
    } else if (S.phase === "confirm") {
      storeCand();
      advance();
    }
  });
  redoBtn.addEventListener("click", () => { S.cand = null; S.phase = "capture"; promptCapture(); });
  skipBtn.addEventListener("click", () => { advance(); });
  cancelBtn.addEventListener("click", () => {
    S.phase = "idle"; S.cand = null; S.queue = [];
    activeEl.hidden = true; actionsEl.hidden = false;
    state.real = hasAllPedals(); fireLive();
    renderRows(); setMsg("Cancelled.");
  });
  q("[data-cal-all]").addEventListener("click", () => startQueue(CHANNELS.map(c => c.key)));
  q("[data-clear]").addEventListener("click", () => {
    S.map = {}; if (storeKey) localStorage.removeItem(storeKey);
    state.real = false; fireLive();
    renderRows(); setMsg("Cleared.");
  });

  /* ---------- per-frame ---------- */
  function applyLive(pad) {
    for (const c of CHANNELS) {
      const m = S.map[c.key]; if (!m) continue;
      const a = pad.axes[m.axis]; if (a == null) continue;
      if (c.mode === "pedal") {
        state[c.short] = mapPedal(a, m.rest, m.full);
      } else {
        state.str = mapWheel(a, m.rest, m.min, m.max);
      }
    }
    if (!S.map.steering) state.str = 0; // don't freeze a stale wheel angle
  }

  function poll() {
    const pad = getPad();
    connEl.textContent = pad ? "● " + pad.id.replace(/\s*\(.*$/, "").slice(0, 26) : "○ no device";
    connEl.classList.toggle("on", !!pad);

    // Saved calibration + a live pad + not busy -> go live automatically.
    if (pad && S.phase === "idle" && hasAllPedals() && !state.real) { state.real = true; fireLive(); }

    if (S.phase === "capture" && pad) {
      const c = chOf(current());
      if (!S.cand) {
        let best = -1, bestD = 0;
        for (let i = 0; i < pad.axes.length; i++) {
          if (S.used.includes(i)) continue;
          const d = Math.abs(pad.axes[i] - S.baseline[i]);
          if (d > bestD) { bestD = d; best = i; }
        }
        if (bestD > PRESS_THRESHOLD) {
          S.cand = c.mode === "pedal"
            ? { axis: best, rest: S.baseline[best], ext: pad.axes[best] }
            : { axis: best, rest: S.baseline[best], min: pad.axes[best], max: pad.axes[best] };
          setPrompt(c.mode === "pedal"
            ? 'Holding <b>' + c.name + '</b> — now <b>release</b> it fully.'
            : 'Good — sweep <b>fully left</b> and <b>fully right</b>, then re-center.');
        }
      } else {
        const a = pad.axes[S.cand.axis];
        if (c.mode === "pedal") {
          if (Math.abs(a - S.cand.rest) > Math.abs(S.cand.ext - S.cand.rest)) S.cand.ext = a;
          if (Math.abs(a - S.cand.rest) < RELEASE_BAND) toConfirm();
        } else {
          S.cand.min = Math.min(S.cand.min, a);
          S.cand.max = Math.max(S.cand.max, a);
          const leftOK  = (S.cand.rest - S.cand.min) > WHEEL_SWEEP;
          const rightOK = (S.cand.max - S.cand.rest) > WHEEL_SWEEP;
          if (Math.abs(a - S.cand.rest) < RELEASE_BAND && leftOK && rightOK) toConfirm();
        }
      }
    }

    if (state.real && pad) applyLive(pad);
    updateRowStatus();

    if (autoHide) el.style.display = (state.real && S.phase === "idle") ? "none" : "";
  }

  function show() { el.style.display = ""; }

  renderRows();
  setMsg(hasAllPedals() ? "Calibration loaded." : "Not calibrated yet.");

  return {
    poll,
    isCalibrating: () => S.phase !== "idle",
    isLive: () => !!state.real,
    hasCalibration: hasAllPedals,
    calibrateAll: () => startQueue(CHANNELS.map(c => c.key)),
    show
  };
}
