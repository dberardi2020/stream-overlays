/* Capture golden renders from the prototype — the faithfulness baseline.
 *
 *   node qa/capture-golden.mjs <path-to-prototype-catalogue.html>
 *
 * Renders every overlay through the PROTOTYPE's own (reconciled, known-good) engine
 * at a fixed, deterministic sim state, and writes:
 *   qa/golden/<id>.png   — the reference image for each overlay
 *   qa/fixture.json      — the exact state (input/tel/history) used, so the module
 *                          harness (qa/render.html) can reproduce it identically
 *
 * Because the module draw bodies are byte-for-byte copies of these, any later
 * pixel diff (qa/acceptance.mjs) isolates to a mis-ported *helper*. Capture these
 * while the prototype still exists — they are the durable baseline after it's gone.
 *
 * The prototype path is a RUNTIME ARG, never hardcoded: this file ships in a public
 * repo and must not name a private location.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const GOLDEN = join(HERE, "golden");
const SCALE = 2;
const DT = 1 / 60, STEPS = 480;           // deterministic advance -> lapTime = 8.0s

const protoPath = process.argv[2];
if (!protoPath) { console.error("usage: node qa/capture-golden.mjs <path-to-prototype-catalogue.html>"); process.exit(2); }

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { console.error("playwright not installed; run `npm i`"); process.exit(1); }

// 1. Instrument a copy: expose the engine, and do NOT auto-run the animation loop.
const proto = readFileSync(resolve(protoPath), "utf8");
const instrumented = proto.replace(
  /refresh\(\);\s*requestAnimationFrame\(loop\);/,
  "window.__qa = { REG, input, tel, hist, shiftLog, shiftTimes, gateUse, clock, tick, setCtx: (c) => { ctx = c; } };"
);
if (instrumented === proto) { console.error("could not find the instrumentation anchor in the prototype"); process.exit(1); }
writeFileSync(join(HERE, "_prototype.html"), instrumented);

// 2. Serve so fonts + the page load like normal.
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(req.url.split("?")[0]);
    const buf = await readFile(join(ROOT, p));
    res.writeHead(200, { "content-type": MIME[p.slice(p.lastIndexOf("."))] || "application/octet-stream" });
    res.end(buf);
  } catch { res.writeHead(404); res.end("nf"); }
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(e.message));

await page.goto(`http://localhost:${PORT}/qa/_prototype.html`, { waitUntil: "networkidle" });
await page.waitForFunction(() => !!window.__qa, { timeout: 5000 });

// 3. Drive the sim deterministically to a fixed frozen state, and export it.
const fixture = await page.evaluate(({ DT, STEPS }) => {
  const q = window.__qa;
  for (const k in q.hist) q.hist[k].length = 0;
  q.shiftLog.length = 0; q.shiftTimes.length = 0;
  for (const k in q.gateUse) q.gateUse[k] = 0;
  Object.assign(q.clock, { playing: true, speed: 1, lapTime: 0, t: 0 });
  Object.assign(q.input, { thr: 0, brk: 0, clu: 0, str: 0, gear: 4, lever: 4, prevGear: 4, shiftAge: 99, shiftDir: 0, shiftProg: 1, shiftCount: 0 });
  for (let i = 0; i < STEPS; i++) { q.tick(DT); q.clock.t += DT; }
  q.clock.playing = false;
  return {
    input: { ...q.input },
    tel: { ...q.tel },
    hist: JSON.parse(JSON.stringify(q.hist)),
    shiftLog: JSON.parse(JSON.stringify(q.shiftLog)),
    shiftTimes: JSON.parse(JSON.stringify(q.shiftTimes)),
    gateUse: { ...q.gateUse },
    clock: { t: q.clock.t, lapTime: q.clock.lapTime }
  };
}, { DT, STEPS });
writeFileSync(join(HERE, "fixture.json"), JSON.stringify(fixture, null, 1));

// 4. Render each overlay through the prototype engine at that state -> PNG data URLs.
const shots = await page.evaluate(async ({ SCALE }) => {
  /* Same trap as qa/render.html: `fonts.ready` resolves instantly when nothing
     has requested the faces yet, so the capture painted in a fallback and baked
     the capturing machine's mono into the baseline (SO-0034). Ask by name, then
     verify — capturing a wrong-font golden is worse than failing to capture. */
  const FACES = [
    "400 16px 'IBM Plex Mono'", "500 16px 'IBM Plex Mono'", "600 16px 'IBM Plex Mono'",
    "400 16px Oxanium",         "600 16px Oxanium",         "800 16px Oxanium"
  ];
  await Promise.all(FACES.map(f => document.fonts.load(f)));
  await document.fonts.ready;
  const missing = FACES.filter(f => !document.fonts.check(f));
  if (missing.length) throw new Error("fonts did not load: " + missing.join(", "));
  const q = window.__qa;
  const out = {};
  for (const r of q.REG) {
    const cv = document.createElement("canvas");
    cv.width = r.w * SCALE; cv.height = r.h * SCALE;
    const c = cv.getContext("2d"); c.scale(SCALE, SCALE);
    q.setCtx(c); c.clearRect(0, 0, r.w, r.h);
    try {
      if (r.call === "add") r.draw(c, r.w, r.h, q.input, q.tel);
      else r.draw(r.w, r.h, q.input, q.tel);
    } catch (e) { out[r.id] = "ERROR:" + e.message; continue; }
    out[r.id] = cv.toDataURL("image/png");
  }
  return out;
}, { SCALE });

await browser.close();
server.close();
rmSync(join(HERE, "_prototype.html"), { force: true });

mkdirSync(GOLDEN, { recursive: true });
let ok = 0, errs = [];
for (const [id, data] of Object.entries(shots)) {
  if (data.startsWith("ERROR:")) { errs.push(`${id}: ${data}`); continue; }
  writeFileSync(join(GOLDEN, `${id}.png`), Buffer.from(data.split(",")[1], "base64"));
  ok++;
}
console.log(`captured ${ok} goldens to qa/golden/ · fixture.json written`);
if (pageErrors.length) console.log("page errors:", pageErrors.slice(0, 3));
if (errs.length) { console.log(`draw errors (${errs.length}):`); errs.forEach(e => console.log("  " + e)); }
