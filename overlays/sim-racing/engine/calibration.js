/* Calibration engine — Layer 2.

   const cal = createCalibration({
     state,                            // shared { thr, brk, clu, str, real, gear... }
     mounts: {                         // one element per component box
       pedals:  element,               // throttle / brake / clutch rows
       wheel:   element,               // steering row
       shifter: element,               // H-shifter / paddles (SO-0006)
       status:  element                // optional: single device (●/○) indicator
     },
     storeKey: "g923.calibration.v2",  // localStorage key, or null to disable
     autoHideWhenLive: false,          // hide the boxes while live (overlay only)
     onLiveChange: live => {}          // optional callback
   });

   Each animation frame the host calls:  cal.poll()
   Host queries:  cal.isCalibrating(), cal.isLive(), cal.hasCalibration()

   The axis capture state machine is one shared engine (S) — so axis arbitration
   (never assign one axis to two channels) and the per-run neutral baseline still
   hold across boxes — but its DOM is split into per-component boxes, each with its
   own rows + capture prompt + actions. The gear/shifter flow (G) is a separate
   button-capture machine in its own box.

   Calibration model
   -----------------
   - Neutral first: release pedals + centre the wheel so we capture a clean rest
     baseline (no false triggers from a held pedal).
   - Pedals are a unipolar stroke: press fully, release. We record rest + the real
     full-press extreme, so live values scale to actual travel.
   - Steering is bipolar: sweep full-left, full-right, re-centre → rest + min + max.
   - Axes already assigned to other channels are excluded, and each capture is a
     complete press->release (or sweep->centre) cycle. */

import { mapPedal, mapWheel, resolveShifterGear, GEAR_LABELS } from "./calibration-math.js";
import { normalizeGearMap } from "./live-input.js";
import { getPad, isButtonDown, pressedButtons } from "./gamepad.js";

const CHANNELS = [
  { key: "throttle", name: "Throttle", short: "thr", mode: "pedal", color: "#34d97a", group: "pedals" },
  { key: "brake",    name: "Brake",    short: "brk", mode: "pedal", color: "#f2453d", group: "pedals" },
  { key: "clutch",   name: "Clutch",   short: "clu", mode: "pedal", color: "#ffb020", group: "pedals" },
  { key: "steering", name: "Steering", short: "str", mode: "wheel", color: "#64b5ff", group: "wheel", optional: true }
];
const PEDAL_KEYS = ["throttle", "brake", "clutch"];
const PRESS_THRESHOLD = 0.35; // deviation from rest that counts as "moved"
const RELEASE_BAND    = 0.12; // deviation below which a control is "back at rest"
const WHEEL_SWEEP     = 0.30; // each side must move at least this far to count

const chOf = key => CHANNELS.find(c => c.key === key);

/* Each box inherits its palette from the host page via CSS variables (with
   fallbacks to the standalone defaults), and is transparent + full-width so it
   sits flush inside whatever card mounts it. */
const CSS = `
.g923cal{
  --cal-fg:var(--ink,#eceae5); --cal-mute:var(--mute,#878d9a); --cal-line:var(--line,#2e323c);
  --cal-panel:var(--panel-2,#22252d); --cal-accent:var(--clu,#ffb020); --cal-on:var(--thr,#34d97a);
  --cal-thr:var(--thr,#34d97a); --cal-brk:var(--brk,#f2453d); --cal-clu:var(--clu,#ffb020); --cal-str:var(--str,#64b5ff);
  font:inherit;font-size:12px;color:var(--cal-fg);width:100%;line-height:1.45}
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
.g923cal-actions{display:flex;gap:8px;align-items:center;margin-top:12px}
.g923cal-msg{color:var(--cal-mute);font-size:11px;margin-left:auto;text-align:right}
.g923cal [hidden]{display:none!important}
/* ---- shifter / gear section (SO-0006) — its own box ---- */
/* H-shifter and Paddles/sequential are two independent controls in one box — no
   mode toggle. One gear source is stored at a time (calibrating one clears the
   other); the unbound control simply reads "not set". */
/* Two halves, side by side, each centred in its column, split by a divider. */
.g923cal-gsubs{display:flex;align-items:stretch}
.g923cal-gsub{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding:4px 14px 10px}
.g923cal-gsub + .g923cal-gsub{border-left:1px solid var(--cal-line)}
.g923cal-gsub-head{display:flex;flex-direction:column;align-items:center;gap:1px;margin-bottom:9px}
.g923cal-gsub-name{font-size:12px;color:var(--cal-fg);font-weight:600;letter-spacing:.02em}
.g923cal-gstatus{font-size:11px;color:var(--cal-mute);white-space:nowrap}
.g923cal-gstatus .ok{color:var(--cal-on)}
/* H-pattern gate on a recessed plate — the product's own gate language. R doglegs
   off the right column (1 3 5 / 2 4 6 R), the way a 6-speed + reverse actually sits. */
.g923cal-gate{display:flex;justify-content:center;align-items:center;flex:1;margin-bottom:10px}
.gate-plate{display:inline-flex;padding:13px 16px;border-radius:11px;border:1px solid var(--cal-line);
  background:color-mix(in srgb,var(--cal-panel) 55%,#000)}
.gate-cols{display:flex;gap:16px;position:relative}
.gate-cols::before{content:"";position:absolute;left:16px;right:16px;top:50%;height:2px;background:var(--cal-line);transform:translateY(-1px)}
.gate-col{display:flex;flex-direction:column;gap:15px;position:relative}
.gate-col::before{content:"";position:absolute;left:50%;top:6px;bottom:6px;width:2px;background:var(--cal-line);transform:translateX(-1px)}
.gate-col-r{justify-content:flex-end}
.gate-col-r::before{top:50%;bottom:6px}          /* stub: centre line down to R, not full height */
.gate-cell{position:relative;z-index:1;width:33px;height:29px;display:flex;align-items:center;justify-content:center;
  border-radius:7px;border:1px solid var(--cal-line);background:var(--cal-panel);color:var(--cal-mute);
  font-variant-numeric:tabular-nums;font-weight:600;font-size:13px;transition:background .12s,border-color .12s,color .12s}
.gate-cell.set{border-color:color-mix(in srgb,var(--cal-accent) 55%,var(--cal-line));color:var(--cal-fg)}
.gate-cell.live{background:var(--cal-on);border-color:var(--cal-on);color:#15171c;box-shadow:0 0 0 3px color-mix(in srgb,var(--cal-on) 26%,transparent)}
.gate-cell.target{border-color:var(--cal-accent);color:var(--cal-accent);animation:g923pulse 1.1s ease-in-out infinite}
@keyframes g923pulse{0%,100%{box-shadow:0 0 0 3px color-mix(in srgb,var(--cal-accent) 32%,transparent)}50%{box-shadow:0 0 0 3px transparent}}
/* paddles — sequential up/down, stacked so the pair sits centred in its half */
.g923cal-paddles{display:flex;flex-direction:column;gap:8px;width:100%;max-width:210px;margin:auto 0}
.g923cal-pad{display:flex;align-items:center;gap:9px;padding:10px 13px;border-radius:8px;border:1px solid var(--cal-line);
  background:var(--cal-panel);color:var(--cal-mute);font-size:12px;transition:background .12s,border-color .12s,color .12s}
.g923cal-pad .ar{font-size:14px;line-height:1}
.g923cal-pad .pv{margin-left:auto;font-variant-numeric:tabular-nums;font-size:11px}
.g923cal-pad.set{border-color:color-mix(in srgb,var(--cal-accent) 55%,var(--cal-line));color:var(--cal-fg)}
.g923cal-pad.live{background:var(--cal-on);border-color:var(--cal-on);color:#15171c}
.g923cal-pad.target{border-color:var(--cal-accent);color:var(--cal-accent);animation:g923pulse 1.1s ease-in-out infinite}
/* live readout under the two controls */
.g923cal-greadout{margin-top:4px;min-height:16px;font-size:11.5px;text-align:center;color:var(--cal-mute);font-variant-numeric:tabular-nums}
.g923cal-greadout b{color:var(--cal-fg);font-weight:600}
.g923cal-greadout.on b{color:var(--cal-on)}
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
  const mounts   = opts.mounts || {};
  const statusEl = mounts.status || null;

  // engine state (shared axis machine)
  const S = { map: {}, queue: [], phase: "idle", baseline: null, cand: null, used: [] };
  let connected = false;   // a pad is present this frame — drives per-channel live meters/state
  if (storeKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || "null");
      if (saved && typeof saved === "object") {
        if (saved.gear) saved.gear = normalizeGearMap(saved.gear);   // pre-ADR-0007 shape
        S.map = saved;
      }
    } catch (e) { /* ignore corrupt storage */ }
  }

  const hasAllPedals = () => PEDAL_KEYS.every(k => S.map[k]);
  const current = () => S.queue[0];

  /* ---------- capture groups (pedals, wheel) ---------- */
  let cur = null;   // the group currently mid-capture

  function buildGroup(calLabel) {
    const root = document.createElement("div");
    root.className = "g923cal";
    root.innerHTML =
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
        '<button class="g923cal-primary" data-cal>' + calLabel + '</button>' +
        '<button data-clear>Clear</button>' +
        '<span class="g923cal-msg" data-msg></span>' +
      '</div>';
    const s = sel => root.querySelector(sel);
    const g = {
      root, rowsEl: s("[data-rows]"), activeEl: s("[data-active]"), actionsEl: s("[data-actions]"),
      promptEl: s("[data-prompt]"), msgEl: s("[data-msg]"),
      confirmBtn: s("[data-confirm]"), redoBtn: s("[data-redo]"),
      skipBtn: s("[data-skip]"), cancelBtn: s("[data-cancel]"),
      calBtn: s("[data-cal]"), clearBtn: s("[data-clear]")
    };
    g.confirmBtn.addEventListener("click", onConfirm);
    g.redoBtn.addEventListener("click", onRedo);
    g.skipBtn.addEventListener("click", onSkip);
    g.cancelBtn.addEventListener("click", onCancel);
    return g;
  }

  const groups = { pedals: buildGroup("Calibrate"), wheel: buildGroup("Calibrate") };
  groups.pedals.calBtn.addEventListener("click", () => startQueue(PEDAL_KEYS, groups.pedals));
  groups.wheel.calBtn.addEventListener("click", () => startQueue(["steering"], groups.wheel));
  groups.pedals.clearBtn.addEventListener("click", () => clearGroup(groups.pedals, PEDAL_KEYS));
  groups.wheel.clearBtn.addEventListener("click", () => clearGroup(groups.wheel, ["steering"]));
  (mounts.pedals || document.body).appendChild(groups.pedals.root);
  (mounts.wheel  || document.body).appendChild(groups.wheel.root);

  const groupOf = key => chOf(key).group === "wheel" ? groups.wheel : groups.pedals;

  const setPrompt = html => { if (cur) cur.promptEl.innerHTML = html; };
  function stepButtons(o) {
    if (!cur) return;
    cur.confirmBtn.hidden = !o.confirm; cur.redoBtn.hidden = !o.redo;
    cur.skipBtn.hidden = !o.skip; cur.cancelBtn.hidden = !o.cancel;
  }
  const groupStatus = g => g === groups.pedals
    ? (hasAllPedals() ? "✓ calibrated" : "throttle · brake · clutch")
    : (S.map.steering ? "✓ calibrated" : "");   // single channel — the row already reads "not set"
  function refreshStatus() {
    for (const key of ["pedals", "wheel"]) {
      const g = groups[key];
      if (!g.actionsEl.hidden) g.msgEl.textContent = groupStatus(g);   // only when idle (actions shown)
    }
  }

  const rowRefs = {};
  function renderRows() {
    groups.pedals.rowsEl.innerHTML = ""; groups.wheel.rowsEl.innerHTML = "";
    for (const c of CHANNELS) {
      const g = groupOf(c.key), m = S.map[c.key];
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
      row.querySelector("button").addEventListener("click", () => startQueue([c.key], g));
      g.rowsEl.appendChild(row);
      rowRefs[c.key] = {
        row,
        dot:  row.querySelector(".dot"),
        fill: row.querySelector(".meter i"),
        mark: row.querySelector(".meter b"),
        val:  row.querySelector(".val")
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
        ref.val.textContent = "not set";
        if (c.mode === "pedal") ref.fill.style.width = "0%";
        else ref.mark.style.left = "50%";
      } else if (connected) {                // bound + a live device — drive the meter (per-channel)
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

  /* ---------- axis flow (shared machine, routed to `cur`) ---------- */
  function startQueue(keys, group) {
    resetGearCapture();          // one capture flow at a time — stop any gear capture
    cur = group || groupOf(keys[0]);
    S.queue = keys.slice();
    S.cand = null;
    S.used = CHANNELS.filter(c => !keys.includes(c.key) && S.map[c.key]).map(c => S.map[c.key].axis);
    state.real = false; fireLive();
    S.phase = "neutral";
    cur.activeEl.hidden = false; cur.actionsEl.hidden = true;
    setPrompt(cur === groups.wheel
      ? "Centre the wheel and release the pedals, then click <b>Confirm neutral</b>."
      : "Release all pedals and <b>centre the wheel</b>, then click <b>Confirm neutral</b>.");
    cur.confirmBtn.textContent = "Confirm neutral";
    stepButtons({ confirm: true, cancel: true });
    cur.msgEl.textContent = "";
  }

  function promptCapture() {
    const c = chOf(current());
    cur.confirmBtn.textContent = "Confirm";
    setPrompt(c.mode === "pedal"
      ? 'Press and hold <b>' + c.name + '</b> all the way down, then release it.'
      : 'Turn the <b>wheel fully left</b>, then <b>fully right</b>, then re-centre.');
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
    if (cur) { cur.activeEl.hidden = true; cur.actionsEl.hidden = false; }
    state.real = hasAllPedals(); fireLive();
    renderRows(); refreshStatus();
    cur = null;
  }

  function onConfirm() {
    const pad = getPad();
    if (!pad) { if (cur) cur.msgEl.textContent = "no device — press a wheel button"; return; }
    if (S.phase === "neutral") {
      S.baseline = Array.from(pad.axes);
      S.phase = "capture"; S.cand = null;
      promptCapture();
    } else if (S.phase === "confirm") {
      storeCand();
      advance();
    }
  }
  function onRedo() { S.cand = null; S.phase = "capture"; promptCapture(); }
  function onSkip() { advance(); }
  function onCancel() {
    S.phase = "idle"; S.cand = null; S.queue = [];
    if (cur) { cur.activeEl.hidden = true; cur.actionsEl.hidden = false; }
    state.real = hasAllPedals(); fireLive();
    renderRows(); refreshStatus(); cur = null;
  }
  function clearGroup(g, keys) {
    for (const k of keys) delete S.map[k];
    if (storeKey) localStorage.setItem(storeKey, JSON.stringify(S.map));
    state.real = hasAllPedals(); fireLive();
    renderRows(); refreshStatus(); g.msgEl.textContent = "cleared";
  }

  /* ---------- shifter / gear capture (SO-0006) — its own box ----------
     The shifter reports as BUTTONS, so this is a separate flow from the axis
     capture (its own `G` state, never entangled with `S`). Two modes: H-shifter
     (walk R,1..6, capture the button each engages) and paddles (capture upshift +
     downshift). Writes S.map.gear under the same storeKey live-input.js reads. */
  const shifterRoot = document.createElement("div");
  shifterRoot.className = "g923cal";
  shifterRoot.innerHTML =
    '<div class="g923cal-gear" data-gearsec>' +
      '<div class="g923cal-gsubs">' +
      '<div class="g923cal-gsub">' +
        '<div class="g923cal-gsub-head">' +
          '<span class="g923cal-gsub-name">H-Shifter</span>' +
          '<span class="g923cal-gstatus" data-gstatus="shifter"></span>' +
        '</div>' +
        '<div class="g923cal-gate" data-ggate="shifter"></div>' +
        '<div class="g923cal-actions" data-gactions>' +
          '<button class="g923cal-primary" data-gcal="shifter">Calibrate</button>' +
          '<button data-gclear="shifter" hidden>Clear</button>' +
        '</div>' +
      '</div>' +
      '<div class="g923cal-gsub">' +
        '<div class="g923cal-gsub-head">' +
          '<span class="g923cal-gsub-name">Paddles / Sequential</span>' +
          '<span class="g923cal-gstatus" data-gstatus="paddles"></span>' +
        '</div>' +
        '<div class="g923cal-gate" data-ggate="paddles"></div>' +
        '<div class="g923cal-actions" data-gactions>' +
          '<button class="g923cal-primary" data-gcal="paddles">Calibrate</button>' +
          '<button data-gclear="paddles" hidden>Clear</button>' +
        '</div>' +
      '</div>' +
      '</div>' +
      '<div class="g923cal-greadout" data-greadout></div>' +
      '<div class="g923cal-active" data-gactive hidden>' +
        '<div class="g923cal-prompt" data-gprompt></div>' +
        '<div class="g923cal-btns">' +
          '<button data-gskip hidden>Skip</button>' +
          '<button data-gcancel>Cancel</button>' +
        '</div>' +
      '</div>' +
      '<span class="g923cal-msg" data-gmsg></span>' +
    '</div>';
  (mounts.shifter || document.body).appendChild(shifterRoot);

  const gq = sel => shifterRoot.querySelector(sel);
  const ggateEls   = { shifter: gq('[data-ggate="shifter"]'),  paddles: gq('[data-ggate="paddles"]') };
  const gstatusEls = { shifter: gq('[data-gstatus="shifter"]'), paddles: gq('[data-gstatus="paddles"]') };
  const gcalBtns   = { shifter: gq('[data-gcal="shifter"]'),    paddles: gq('[data-gcal="paddles"]') };
  const gclearBtns = { shifter: gq('[data-gclear="shifter"]'),  paddles: gq('[data-gclear="paddles"]') };
  const gactionEls = [...shifterRoot.querySelectorAll("[data-gactions]")];
  const greadoutEl = gq("[data-greadout]");
  const gactiveEl = gq("[data-gactive]");
  const gpromptEl = gq("[data-gprompt]"), gmsgEl = gq("[data-gmsg]");
  const gskipBtn = gq("[data-gskip]"), gcancelBtn = gq("[data-gcancel]");

  const persist = () => { if (storeKey) localStorage.setItem(storeKey, JSON.stringify(S.map)); };

  const G = {
    mode: "shifter",           // which half the ACTIVE capture flow is filling
    phase: "idle", queue: [], captured: {}, baseline: [], waiting: null, lastLive: NaN
  };
  const GLABEL = { R: "Reverse", up: "upshift", down: "downshift" };
  const gLabelOf = l => G.mode === "paddles" ? GLABEL[l] : (l === "R" ? "Reverse" : "gear " + l);
  const gSetMsg = t => { gmsgEl.textContent = t || ""; };
  const setReadout = (html, on) => { greadoutEl.innerHTML = html || ""; greadoutEl.classList.toggle("on", !!on); };

  /* Per-half summary — the two controls are independent sources (ADR 0007), so
     each reports its own state and neither can describe the other.

     Complete reads "✓ calibrated", matching the Pedals/Wheel footers; the name
     is not repeated because the sub-head directly above already says it. PARTIAL
     states keep their detail — the capture flow has a Skip button, so 5/7 gears
     (or one paddle of two) is reachable, and "calibrated" would be a lie. */
  function gStoredSummary(which) {
    const g = S.map.gear; if (!g) return null;
    if (which === "paddles") {
      const p = g.paddles; if (!p) return null;
      const n = (p.up != null ? 1 : 0) + (p.down != null ? 1 : 0);
      return n === 2 ? "calibrated" : n === 1 ? "1 of 2" : null;
    }
    const n = Object.keys((g.shifter && g.shifter.buttons) || {}).length;
    if (!n) return null;
    return n === GEAR_LABELS.length ? "calibrated" : n + "/" + GEAR_LABELS.length + " gears";
  }
  // Complete halves get the tick; partial ones read as plainly unfinished.
  const gIsComplete = which => gStoredSummary(which) === "calibrated";

  /* The gate (or paddle pair) — the product's own H-pattern language. Cells carry
     `set` (calibrated) and `target` (the gear being captured); the live/engaged
     gear is toggled separately each frame (applyLiveHighlight), so this only
     rebuilds on a structural change (calibrate / mode switch / capture step). */
  const gTarget = () => G.phase !== "idle" ? G.queue[0] : null;
  const gShifterMap = () => (S.map.gear && S.map.gear.shifter) || null;
  const gPaddleMap  = () => (S.map.gear && S.map.gear.paddles) || null;
  function gCell(label) {
    const sh = gShifterMap();
    const set = !!(sh && sh.buttons && sh.buttons[label] != null);
    return '<div class="gate-cell' + (set ? " set" : "") +
      (G.mode === "shifter" && gTarget() === label ? " target" : "") +
      '" data-g="' + label + '">' + label + '</div>';
  }
  function gPad(key, arrow, name) {
    const p = gPaddleMap();
    const set = !!(p && p[key] != null);
    return '<div class="g923cal-pad' + (set ? " set" : "") +
      (G.mode === "paddles" && gTarget() === key ? " target" : "") +
      '" data-p="' + key + '"><span class="ar">' + arrow + '</span>' + name +
      '<span class="pv">' + (set ? "btn " + p[key] : "—") + '</span></div>';
  }
  function renderGearVisual() {
    // Both controls always render; only the stored one shows "set" cells.
    ggateEls.paddles.innerHTML =
      '<div class="g923cal-paddles">' + gPad("up", "▲", "Upshift") + gPad("down", "▼", "Downshift") + '</div>';
    ggateEls.shifter.innerHTML =
      '<div class="gate-plate"><div class="gate-cols">' +
        '<div class="gate-col">' + gCell("1") + gCell("2") + '</div>' +
        '<div class="gate-col">' + gCell("3") + gCell("4") + '</div>' +
        '<div class="gate-col">' + gCell("5") + gCell("6") + '</div>' +
        '<div class="gate-col gate-col-r">' + gCell("R") + '</div>' +
      '</div></div>';
    G.lastLive = null;                    // DOM rebuilt — force the next live tick to re-apply
  }

  function renderGearStatus() {
    for (const k of ["shifter", "paddles"]) {
      const sum = gStoredSummary(k);
      gstatusEls[k].innerHTML = !sum ? "not set"
        : gIsComplete(k) ? '<span class="ok">✓</span> calibrated' : sum;
      gclearBtns[k].hidden = !sum;     // each Clear only ever offers to clear its own half
    }
    renderGearVisual();
    setReadout("", false);
  }

  function resetGearCapture() {
    G.phase = "idle"; G.queue = []; G.waiting = null;
    gactiveEl.hidden = true; gactionEls.forEach(e => e.hidden = false);
  }
  // Stop the axis flow if it's mid-capture — only one capture runs at a time.
  function cancelAxis() {
    if (S.phase === "idle") return;
    S.phase = "idle"; S.cand = null; S.queue = [];
    if (cur) { cur.activeEl.hidden = true; cur.actionsEl.hidden = false; }
    state.real = hasAllPedals(); fireLive(); renderRows(); refreshStatus(); cur = null;
  }

  function startGear(mode) {
    const pad = getPad();
    if (!pad) { gSetMsg("No device — connect the wheel and press a button."); return; }
    cancelAxis();
    if (G.phase !== "idle") resetGearCapture();   // switching controls mid-capture — drop the old flow
    G.mode = mode;
    G.queue = mode === "paddles" ? ["up", "down"] : GEAR_LABELS.slice();
    G.captured = {}; G.baseline = pressedButtons(pad); G.waiting = null; G.phase = "capture";
    gactiveEl.hidden = false; gactionEls.forEach(e => e.hidden = true);
    gPromptCapture(); gSetMsg("");
  }
  function gPromptCapture() {
    const verb = G.mode === "paddles" ? "Engage <b>" : "Shift into <b>";
    gpromptEl.innerHTML = verb + gLabelOf(G.queue[0]) + "</b> and hold.";
    gskipBtn.hidden = false;
    renderGearVisual();                   // pulse the target cell on the gate / paddle
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
      // Write ONLY this half. The other control is an independent source and
      // must survive untouched (ADR 0007) — a rig can have both, and clobbering
      // one while calibrating the other is what this replaced.
      S.map.gear = S.map.gear || {};
      if (G.mode === "paddles") S.map.gear.paddles = { up: caps.up, down: caps.down };
      else                      S.map.gear.shifter = { buttons: caps };
    }                                    // captured nothing — leave this half as it was
    persist();
    gactiveEl.hidden = true; gactionEls.forEach(e => e.hidden = false);
    renderGearStatus();
    const saved = G.mode === "paddles" ? "Paddles saved ✓" : "H-Shifter saved ✓";
    gSetMsg(has ? saved : "Nothing captured.");
  }

  gcalBtns.shifter.addEventListener("click", () => startGear("shifter"));
  gcalBtns.paddles.addEventListener("click", () => startGear("paddles"));
  gskipBtn.addEventListener("click", () => { if (G.phase !== "idle") gAdvance(); });
  gcancelBtn.addEventListener("click", () => { resetGearCapture(); renderGearStatus(); gSetMsg("Cancelled."); });
  const clearGear = which => () => {
    if (S.map.gear) {
      delete S.map.gear[which];
      if (!S.map.gear.shifter && !S.map.gear.paddles) delete S.map.gear;   // both gone
    }
    persist(); renderGearStatus();
    gSetMsg(which === "paddles" ? "Paddles cleared." : "H-Shifter cleared.");
  };
  gclearBtns.shifter.addEventListener("click", clearGear("shifter"));
  gclearBtns.paddles.addEventListener("click", clearGear("paddles"));

  // Live engaged-gear highlight + readout while idle; button auto-capture mid-flow.
  /* Both halves read live at once — they are separate physical controls, so
     testing one must not require un-calibrating the other. */
  const gLiveRead = pad => {
    const sh = gShifterMap(), p = gPaddleMap();
    return {
      gear: sh && sh.buttons ? resolveShifterGear(sh.buttons, i => isButtonDown(pad, i)) : null,
      up:   !!(p && p.up   != null && isButtonDown(pad, p.up)),
      down: !!(p && p.down != null && isButtonDown(pad, p.down))
    };
  };
  function gLiveSig(pad) {
    if (!pad || !S.map.gear) return "none";
    const r = gLiveRead(pad);
    return r.gear + "|" + r.up + "|" + r.down;
  }
  function applyLiveHighlight(pad) {
    const sig = gLiveSig(pad);
    if (sig === G.lastLive) return;       // nothing changed this frame — no DOM work
    G.lastLive = sig;
    ggateEls.shifter.querySelectorAll(".live").forEach(e => e.classList.remove("live"));
    ggateEls.paddles.querySelectorAll(".live").forEach(e => e.classList.remove("live"));
    const g = S.map.gear;
    if (!pad) { setReadout(g ? "connect a wheel to test" : "", false); return; }
    if (!g) { setReadout("", false); return; }

    const r = gLiveRead(pad);
    if (r.gear !== null && r.gear !== 0) {
      const c = ggateEls.shifter.querySelector('[data-g="' + (r.gear < 0 ? "R" : r.gear) + '"]');
      if (c) c.classList.add("live");
    }
    const u = ggateEls.paddles.querySelector('[data-p="up"]'), d = ggateEls.paddles.querySelector('[data-p="down"]');
    if (u) u.classList.toggle("live", r.up); if (d) d.classList.toggle("live", r.down);

    // A paddle pull is a momentary event and wins the readout while held; the
    // H-shifter's held position is the resting truth otherwise.
    if (r.up || r.down) setReadout(r.up ? "<b>▲ upshift</b>" : "<b>▼ downshift</b>", true);
    else if (r.gear !== null) setReadout("in gear <b>" + (r.gear < 0 ? "R" : r.gear === 0 ? "N" : r.gear) + "</b>", r.gear !== 0);
    else setReadout("", false);
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
      if (c.mode === "pedal") state[c.short] = mapPedal(a, m.rest, m.full);
      else state.str = mapWheel(a, m.rest, m.min, m.max);
    }
    if (!S.map.steering) state.str = 0; // don't freeze a stale wheel angle
  }

  function poll() {
    const pad = getPad();
    connected = !!pad;
    if (statusEl) {
      statusEl.textContent = pad ? "● " + pad.id.replace(/\s*\(.*$/, "").slice(0, 42) : "○ no device detected";
      statusEl.classList.toggle("on", !!pad);
    }

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
            : 'Good — sweep <b>fully left</b> and <b>fully right</b>, then re-centre.');
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

    if (pad) applyLive(pad);   // per-channel: applyLive only touches calibrated channels
    updateRowStatus();
    pollGear(pad);

    if (autoHide) {
      const hide = state.real && S.phase === "idle" && G.phase === "idle";
      groups.pedals.root.style.display = hide ? "none" : "";
      groups.wheel.root.style.display  = hide ? "none" : "";
      shifterRoot.style.display        = hide ? "none" : "";
    }
  }

  function showAll() {
    groups.pedals.root.style.display = ""; groups.wheel.root.style.display = ""; shifterRoot.style.display = "";
  }

  renderRows();
  renderGearStatus();
  refreshStatus();

  /* Wipe every channel — pedals, wheel and both gear halves — and drop the stored
     map entirely, so the next load starts from genuinely nothing. Mostly a testing
     affordance: the per-box Clear buttons are the normal path. */
  function clearAll() {
    cancelAxis(); resetGearCapture();
    S.map = {}; S.used = [];
    if (storeKey) localStorage.removeItem(storeKey);
    state.real = false; fireLive();
    renderRows(); renderGearStatus(); refreshStatus();
  }

  return {
    poll,
    isCalibrating: () => S.phase !== "idle" || G.phase !== "idle",
    isLive: () => !!state.real,
    hasCalibration: hasAllPedals,
    clearAll,
    show: showAll
  };
}
