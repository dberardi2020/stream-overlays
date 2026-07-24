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

import { mapPedal, mapWheel, resolveShifterGear, GEAR_LABELS } from "./calibration-math.js";
import { getPad, isButtonDown, pressedButtons } from "./gamepad.js";

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

/* The panel inherits its palette from the host page via CSS variables (with
   fallbacks to the standalone defaults), and is transparent + full-width so it
   sits flush inside whatever card mounts it — no card-in-a-card, no stranded
   fixed-width column. Live meters live in the rows themselves, so a host never
   needs a second, redundant readout of the same channels. */
const CSS = `
.g923cal{
  --cal-fg:var(--ink,#eceae5); --cal-mute:var(--mute,#878d9a); --cal-line:var(--line,#2e323c);
  --cal-panel:var(--panel-2,#22252d); --cal-accent:var(--clu,#ffb020); --cal-on:var(--thr,#34d97a);
  --cal-thr:var(--thr,#34d97a); --cal-brk:var(--brk,#f2453d); --cal-clu:var(--clu,#ffb020); --cal-str:var(--str,#64b5ff);
  font:inherit;font-size:12px;color:var(--cal-fg);width:100%;line-height:1.45}
.g923cal-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:9px}
.g923cal-title{font-weight:600;letter-spacing:.04em}
.g923cal-conn{font-size:11px;color:var(--cal-mute);white-space:nowrap;font-variant-numeric:tabular-nums}
.g923cal-conn.on{color:var(--cal-on)}
.g923cal-rows{display:flex;flex-direction:column}
.g923cal-row{display:grid;grid-template-columns:11px 58px 1fr auto auto;gap:11px;align-items:center;padding:6px 0}
.g923cal-row + .g923cal-row{border-top:1px solid color-mix(in srgb,var(--cal-line) 55%,transparent)}
.g923cal-row .dot{width:9px;height:9px;border-radius:50%;transition:background .15s}
.g923cal-row .nm{white-space:nowrap}
.g923cal-row .meter{position:relative;height:9px;background:var(--cal-panel);border:1px solid var(--cal-line);border-radius:5px;overflow:hidden;transition:opacity .15s}
.g923cal-row.unset .meter{opacity:.4}
.g923cal-row .meter i{position:absolute;top:0;bottom:0;left:0;width:0;border-radius:5px;transition:width .05s linear}
.g923cal-row .meter b{position:absolute;top:-1px;bottom:-1px;left:50%;width:4px;margin-left:-2px;border-radius:2px;background:var(--cal-str);transition:left .05s linear}
.g923cal-row .val{min-width:54px;text-align:right;font-variant-numeric:tabular-nums;color:var(--cal-fg)}
.g923cal-row .val[data-idle]{color:var(--cal-mute)}
.g923cal .muted{color:var(--cal-mute)}
.g923cal button{font:inherit;font-size:11px;letter-spacing:.02em;background:var(--cal-panel);color:var(--cal-fg);
  border:1px solid var(--cal-line);border-radius:6px;padding:3px 10px;cursor:pointer;transition:border-color .12s,color .12s,background .12s}
.g923cal button:hover{border-color:var(--cal-accent);color:var(--cal-accent)}
.g923cal button:focus-visible{outline:2px solid var(--cal-accent);outline-offset:1px}
.g923cal-row button{padding:2px 9px}
.g923cal button.g923cal-primary{background:var(--cal-accent);border-color:var(--cal-accent);color:#15171c;font-weight:600}
.g923cal button.g923cal-primary:hover{background:var(--cal-accent);color:#15171c;filter:brightness(1.08)}
.g923cal-active{margin-top:11px;border-top:1px solid var(--cal-line);padding-top:11px}
.g923cal-prompt{margin-bottom:9px}
.g923cal-prompt b{color:var(--cal-accent);font-weight:600}
.g923cal-btns{display:flex;gap:6px;flex-wrap:wrap}
.g923cal-actions{display:flex;gap:8px;align-items:center;margin-top:12px;border-top:1px solid var(--cal-line);padding-top:11px}
.g923cal-msg{color:var(--cal-mute);font-size:11px;margin-left:auto;text-align:right}
.g923cal [hidden]{display:none!important}
/* ---- shifter / gear section (SO-0006) ---- */
.g923cal-gear{margin-top:13px;border-top:1px solid var(--cal-line);padding-top:12px}
.g923cal-gear-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.g923cal-gear-title{font-weight:600;letter-spacing:.04em}
.g923cal-gear-title .opt{font-weight:400;color:var(--cal-mute);font-size:11px;margin-left:6px}
.g923cal-seg{display:inline-flex;border:1px solid var(--cal-line);border-radius:6px;overflow:hidden}
.g923cal-seg button{border:0;border-radius:0;background:var(--cal-panel);color:var(--cal-mute);padding:4px 12px;font-size:11px}
.g923cal-seg button + button{border-left:1px solid var(--cal-line)}
.g923cal-seg button.on{background:var(--cal-accent);color:#15171c;font-weight:600}
.g923cal-seg button.on:hover{color:#15171c;filter:brightness(1.05)}
/* H-pattern gate — the product's own gate language */
.g923cal-gate{display:flex;align-items:center;gap:20px;margin:13px 0 5px;min-height:66px}
.gate-cols{display:flex;gap:17px;position:relative}
.gate-cols::before{content:"";position:absolute;left:2px;right:2px;top:50%;height:2px;background:var(--cal-line);transform:translateY(-1px)}
.gate-col{display:flex;flex-direction:column;gap:15px;position:relative}
.gate-col::before{content:"";position:absolute;left:50%;top:5px;bottom:5px;width:2px;background:var(--cal-line);transform:translateX(-1px)}
.gate-cell{position:relative;z-index:1;width:30px;height:25px;display:flex;align-items:center;justify-content:center;
  border-radius:6px;border:1px solid var(--cal-line);background:var(--cal-panel);color:var(--cal-mute);
  font-variant-numeric:tabular-nums;font-weight:600;font-size:12.5px;transition:background .12s,border-color .12s,color .12s}
.gate-cell.set{border-color:color-mix(in srgb,var(--cal-accent) 55%,var(--cal-line));color:var(--cal-fg)}
.gate-cell.live{background:var(--cal-on);border-color:var(--cal-on);color:#15171c;box-shadow:0 0 0 3px color-mix(in srgb,var(--cal-on) 26%,transparent)}
.gate-cell.target{border-color:var(--cal-accent);color:var(--cal-accent);animation:g923pulse 1.1s ease-in-out infinite}
.gate-r{display:flex;align-items:center}
@keyframes g923pulse{0%,100%{box-shadow:0 0 0 3px color-mix(in srgb,var(--cal-accent) 32%,transparent)}50%{box-shadow:0 0 0 3px transparent}}
/* paddles — sequential, so a pair, not a gate */
.g923cal-paddles{display:flex;gap:10px;flex:1}
.g923cal-pad{flex:1;display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:8px;border:1px solid var(--cal-line);
  background:var(--cal-panel);color:var(--cal-mute);font-size:12px;transition:background .12s,border-color .12s,color .12s}
.g923cal-pad .ar{font-size:14px;line-height:1}
.g923cal-pad .pv{margin-left:auto;font-variant-numeric:tabular-nums;font-size:11px}
.g923cal-pad.set{border-color:color-mix(in srgb,var(--cal-accent) 55%,var(--cal-line));color:var(--cal-fg)}
.g923cal-pad.live{background:var(--cal-on);border-color:var(--cal-on);color:#15171c}
.g923cal-pad.target{border-color:var(--cal-accent);color:var(--cal-accent);animation:g923pulse 1.1s ease-in-out infinite}
/* foot: live readout (left) + status (right) */
.g923cal-gear-foot{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:11.5px;min-height:16px}
.g923cal-greadout{color:var(--cal-mute);font-variant-numeric:tabular-nums}
.g923cal-greadout b{color:var(--cal-fg);font-weight:600}
.g923cal-greadout.on b{color:var(--cal-on)}
.g923cal-gstatus{color:var(--cal-mute);text-align:right;white-space:nowrap}
.g923cal-gstatus .ok{color:var(--cal-on)}
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
      '<button class="g923cal-primary" data-cal-all>Calibrate all</button>' +
      '<button data-clear>Clear</button>' +
      '<span class="g923cal-msg" data-msg></span>' +
    '</div>' +
    // ---- shifter / gear (SO-0006): buttons, not axes — its own capture flow ----
    '<div class="g923cal-gear" data-gearsec>' +
      '<div class="g923cal-gear-top">' +
        '<span class="g923cal-gear-title">Shifter<span class="opt">optional</span></span>' +
        '<div class="g923cal-seg" data-gseg>' +
          '<button data-gmode="shifter">H-shifter</button>' +
          '<button data-gmode="paddles">Paddles</button>' +
        '</div>' +
      '</div>' +
      '<div class="g923cal-gate" data-ggate></div>' +
      '<div class="g923cal-gear-foot">' +
        '<span class="g923cal-greadout" data-greadout></span>' +
        '<span class="g923cal-gstatus" data-gstatus></span>' +
      '</div>' +
      '<div class="g923cal-active" data-gactive hidden>' +
        '<div class="g923cal-prompt" data-gprompt></div>' +
        '<div class="g923cal-btns">' +
          '<button data-gskip hidden>Skip</button>' +
          '<button data-gcancel>Cancel</button>' +
        '</div>' +
      '</div>' +
      '<div class="g923cal-actions" data-gactions>' +
        '<button class="g923cal-primary" data-gcal>Calibrate shifter</button>' +
        '<button data-gclear-gear>Clear</button>' +
        '<span class="g923cal-msg" data-gmsg></span>' +
      '</div>' +
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
      // Pedals fill from the left; the wheel rides a center-anchored marker.
      const meter = c.mode === "wheel"
        ? '<div class="meter"><b></b></div>'
        : '<div class="meter"><i style="background:' + c.color + '"></i></div>';
      row.innerHTML =
        '<span class="dot" style="background:' + (m ? c.color : "var(--cal-line)") + '"></span>' +
        '<span class="nm">' + c.name + '</span>' +
        meter +
        '<span class="val" data-idle></span>' +
        '<button>' + (m ? "Redo" : "Set") + '</button>';
      row.querySelector("button").addEventListener("click", () => startQueue([c.key]));
      rowsEl.appendChild(row);
      rowRefs[c.key] = {
        row,
        dot:   row.querySelector(".dot"),
        fill:  row.querySelector(".meter i"),
        mark:  row.querySelector(".meter b"),
        val:   row.querySelector(".val")
      };
    }
    updateRowStatus();
  }
  function updateRowStatus() {
    for (const c of CHANNELS) {
      const ref = rowRefs[c.key], m = S.map[c.key];
      if (!ref) continue;
      if (!m) {                              // unbound — faint empty track, intent in the status column
        ref.row.classList.add("unset");
        ref.val.setAttribute("data-idle", "");
        ref.val.textContent = c.optional ? "optional" : "needed";
        if (c.mode === "pedal") ref.fill.style.width = "0%";
        else ref.mark.style.left = "50%";
      } else if (state.real) {               // bound + a live device — drive the meter
        ref.row.classList.remove("unset");
        ref.val.removeAttribute("data-idle");
        if (c.mode === "pedal") {
          const v = Math.max(0, Math.min(1, state[c.short] || 0));
          ref.fill.style.width = (v * 100) + "%";
          ref.val.textContent = Math.round(v * 100) + "%";
        } else {
          const s = Math.max(-1, Math.min(1, state.str || 0));
          ref.mark.style.left = (50 + s * 50) + "%";
          ref.val.textContent = (s > 0 ? "+" : "") + Math.round(s * 100);
        }
      } else {                               // bound but resting (no live device)
        ref.row.classList.remove("unset");
        ref.val.setAttribute("data-idle", "");
        if (c.mode === "pedal") ref.fill.style.width = "0%";
        else ref.mark.style.left = "50%";
        ref.val.textContent = "✓";
      }
    }
  }

  /* ---------- flow ---------- */
  function startQueue(keys) {
    resetGearCapture();          // one capture flow at a time — stop any gear capture
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
    renderRows(); renderGearStatus(); setMsg("Cleared.");
  });

  /* ---------- shifter / gear capture (SO-0006) ----------
     The shifter reports as BUTTONS, so this is a separate flow from the axis
     capture above (its own `G` state, never entangled with `S`). Two modes:
     H-shifter (walk R,1..6, capture the button each engages) and paddles
     (capture upshift + downshift). Writes S.map.gear under the same storeKey
     live-input.js reads. Guided auto-capture, mirroring the pedal press/release
     rhythm: hold the gear -> we grab the newly-pressed button -> release -> next. */
  const ggateEl = q("[data-ggate]"), greadoutEl = q("[data-greadout]"), gstatusEl = q("[data-gstatus]");
  const gactiveEl = q("[data-gactive]"), gactionsEl = q("[data-gactions]");
  const gpromptEl = q("[data-gprompt]"), gmsgEl = q("[data-gmsg]");
  const gcalBtn = q("[data-gcal]"), gskipBtn = q("[data-gskip]"), gcancelBtn = q("[data-gcancel]");
  const gsegBtns = [...el.querySelectorAll("[data-gmode]")];

  const persist = () => { if (storeKey) localStorage.setItem(storeKey, JSON.stringify(S.map)); };

  const G = {
    mode: (S.map.gear && S.map.gear.mode) || "shifter",   // which flow to calibrate next
    phase: "idle", queue: [], captured: {}, baseline: [], waiting: null, lastLive: NaN
  };
  const GLABEL = { R: "Reverse", up: "the upshift paddle", down: "the downshift paddle" };
  const gLabelOf = l => G.mode === "paddles" ? GLABEL[l] : (l === "R" ? "Reverse" : "gear " + l);
  const gSetMsg = t => { gmsgEl.textContent = t || ""; };
  const setReadout = (html, on) => { greadoutEl.innerHTML = html || ""; greadoutEl.classList.toggle("on", !!on); };

  function gStoredSummary() {
    const g = S.map.gear; if (!g) return null;
    if (g.mode === "paddles") {
      const n = (g.up != null ? 1 : 0) + (g.down != null ? 1 : 0);
      return n === 2 ? "Paddles · up + down" : n === 1 ? "Paddles · 1 of 2" : null;
    }
    const n = Object.keys(g.buttons || {}).length;
    return n ? "H-shifter · " + n + "/7 gears" : null;
  }

  /* The gate (or paddle pair) — the product's own H-pattern language, not a row of
     boxes. Cells carry `set` (calibrated) and `target` (the gear being captured);
     the live/engaged gear is toggled separately each frame (applyLiveHighlight), so
     this only rebuilds on a structural change (calibrate / mode switch / capture). */
  const gTarget = () => G.phase !== "idle" ? G.queue[0] : null;
  function gCell(label) {
    const g = S.map.gear;
    const set = g && g.mode === "shifter" && g.buttons && g.buttons[label] != null;
    return '<div class="gate-cell' + (set ? " set" : "") + (gTarget() === label ? " target" : "") +
      '" data-g="' + label + '">' + label + '</div>';
  }
  function gPad(key, arrow, name) {
    const g = S.map.gear;
    const set = g && g.mode === "paddles" && g[key] != null;
    return '<div class="g923cal-pad' + (set ? " set" : "") + (gTarget() === key ? " target" : "") +
      '" data-p="' + key + '"><span class="ar">' + arrow + '</span>' + name +
      '<span class="pv">' + (set ? "btn " + g[key] : "—") + '</span></div>';
  }
  function renderGearVisual() {
    ggateEl.innerHTML = G.mode === "paddles"
      ? '<div class="g923cal-paddles">' + gPad("up", "▲", "Upshift") + gPad("down", "▼", "Downshift") + '</div>'
      : '<div class="gate-cols">' +
          '<div class="gate-col">' + gCell("1") + gCell("2") + '</div>' +
          '<div class="gate-col">' + gCell("3") + gCell("4") + '</div>' +
          '<div class="gate-col">' + gCell("5") + gCell("6") + '</div>' +
        '</div><div class="gate-r">' + gCell("R") + '</div>';
    G.lastLive = null;                    // DOM rebuilt — force the next live tick to re-apply
  }

  function renderGearStatus() {
    gsegBtns.forEach(b => b.classList.toggle("on", b.dataset.gmode === G.mode));
    gcalBtn.textContent = G.mode === "paddles" ? "Calibrate paddles" : "Calibrate shifter";
    const sum = gStoredSummary();
    gstatusEl.innerHTML = sum ? '<span class="ok">✓</span> ' + sum : "optional · for shifter overlays";
    renderGearVisual();
    setReadout("", false);
  }

  function resetGearCapture() {
    G.phase = "idle"; G.queue = []; G.waiting = null;
    gactiveEl.hidden = true; gactionsEl.hidden = false;
  }
  // Stop the axis flow if it's mid-capture — only one capture runs at a time.
  function cancelAxis() {
    if (S.phase === "idle") return;
    S.phase = "idle"; S.cand = null; S.queue = [];
    activeEl.hidden = true; actionsEl.hidden = false;
    state.real = hasAllPedals(); fireLive(); renderRows();
  }

  function startGear() {
    const pad = getPad();
    if (!pad) { gSetMsg("No device — connect the wheel and press a button."); return; }
    cancelAxis();
    G.queue = G.mode === "paddles" ? ["up", "down"] : GEAR_LABELS.slice();
    G.captured = {}; G.baseline = pressedButtons(pad); G.waiting = null; G.phase = "capture";
    gactiveEl.hidden = false; gactionsEl.hidden = true;
    gPromptCapture(); gSetMsg("");
  }
  function gPromptCapture() {
    gpromptEl.innerHTML = "Shift into <b>" + gLabelOf(G.queue[0]) + "</b> and hold.";
    gskipBtn.hidden = false;
    renderGearVisual();                   // pulse the target cell on the gate
  }
  function gAdvance() {
    G.queue.shift(); G.waiting = null;
    if (!G.queue.length) gFinish();
    else { G.phase = "capture"; gPromptCapture(); }
  }
  function gFinish() {
    const caps = G.captured, has = Object.keys(caps).length > 0;
    G.phase = "idle"; G.queue = [];
    if (has) {
      S.map.gear = G.mode === "paddles"
        ? { mode: "paddles", up: caps.up, down: caps.down }
        : { mode: "shifter", buttons: caps };
    } else {
      delete S.map.gear;                 // captured nothing — leave it uncalibrated
    }
    persist();
    gactiveEl.hidden = true; gactionsEl.hidden = false;
    renderGearStatus();
    gSetMsg(has ? "Shifter saved ✓" : "Nothing captured.");
  }

  gcalBtn.addEventListener("click", startGear);
  gskipBtn.addEventListener("click", () => { if (G.phase !== "idle") gAdvance(); });
  gcancelBtn.addEventListener("click", () => { resetGearCapture(); renderGearStatus(); gSetMsg("Cancelled."); });
  q("[data-gclear-gear]").addEventListener("click", () => {
    delete S.map.gear; persist(); renderGearStatus(); gSetMsg("Cleared.");
  });
  gsegBtns.forEach(b => b.addEventListener("click", () => {
    if (G.phase !== "idle") resetGearCapture();
    G.mode = b.dataset.gmode; renderGearStatus(); gSetMsg("");
  }));

  // Live engaged-gear highlight + readout while idle; button auto-capture mid-flow.
  function gLiveSig(pad) {
    const g = S.map.gear;
    if (!pad || !g) return "none";
    if (g.mode === "shifter") return "s" + resolveShifterGear(g.buttons, i => isButtonDown(pad, i));
    return "p" + (g.up != null && isButtonDown(pad, g.up)) + (g.down != null && isButtonDown(pad, g.down));
  }
  function applyLiveHighlight(pad) {
    const sig = gLiveSig(pad);
    if (sig === G.lastLive) return;       // nothing changed this frame — no DOM work
    G.lastLive = sig;
    ggateEl.querySelectorAll(".live").forEach(e => e.classList.remove("live"));
    const g = S.map.gear;
    if (!pad) { setReadout(g ? "connect a wheel to test" : "", false); return; }
    if (g && g.mode === "shifter") {
      const gear = resolveShifterGear(g.buttons, i => isButtonDown(pad, i));
      if (gear !== 0) { const c = ggateEl.querySelector('[data-g="' + (gear < 0 ? "R" : gear) + '"]'); if (c) c.classList.add("live"); }
      setReadout("in gear <b>" + (gear < 0 ? "R" : gear === 0 ? "N" : gear) + "</b>", gear !== 0);
    } else if (g && g.mode === "paddles") {
      const up = g.up != null && isButtonDown(pad, g.up), down = g.down != null && isButtonDown(pad, g.down);
      const u = ggateEl.querySelector('[data-p="up"]'), d = ggateEl.querySelector('[data-p="down"]');
      if (u) u.classList.toggle("live", up); if (d) d.classList.toggle("live", down);
      setReadout(up ? "<b>▲ upshift</b>" : down ? "<b>▼ downshift</b>" : "neutral", up || down);
    } else {
      setReadout("", false);
    }
  }
  function pollGear(pad) {
    if (G.phase === "idle") { applyLiveHighlight(pad); return; }
    if (!pad) return;
    if (G.phase === "capture") {
      const taken = Object.values(G.captured);
      const fresh = pressedButtons(pad).filter(i => !G.baseline.includes(i) && !taken.includes(i));
      if (fresh.length) {
        const idx = fresh[0];
        G.captured[G.queue[0]] = idx; G.waiting = idx; G.phase = "release";
        gpromptEl.innerHTML = "Got <b>" + gLabelOf(G.queue[0]) + "</b> = button " + idx + " — release to neutral.";
        renderGearVisual();               // reflect the newly-set cell (target stays on it)
      }
    } else if (G.phase === "release") {
      if (!isButtonDown(pad, G.waiting)) gAdvance();
    }
  }

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
    pollGear(pad);

    if (autoHide) el.style.display = (state.real && S.phase === "idle") ? "none" : "";
  }

  function show() { el.style.display = ""; }

  renderRows();
  renderGearStatus();
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
