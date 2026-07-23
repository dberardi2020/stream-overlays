/* Deterministic acceptance harness — the un-mockable surface as a real browser.
 *
 * Renders every migrated overlay in real headless Chromium at the fixed state in
 * qa/fixture.json (qa/render.html), and checks two things:
 *   1. non-blank — the real-pixel successor to the node mock's blank-tile guard;
 *   2. faithfulness — pixel-diff against qa/golden/<id>.png, captured from the
 *      prototype at the same state. Since draw bodies are byte-for-byte, a diff
 *      isolates to a mis-ported helper. Overlays with no golden yet are noted, not
 *      failed. Regenerate goldens with qa/capture-golden.mjs.
 *
 *   node qa/acceptance.mjs            # run; non-zero exit on any failure
 *   node qa/acceptance.mjs --keep     # leave PNGs (+ diff images) in qa/renders/
 *   node qa/acceptance.mjs --open     # headed browser, slowed, for eyeballing
 *
 * Skips cleanly (exit 0, a notice) when Playwright or its browser isn't installed.
 */
import { readdirSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OVERLAYS = join(ROOT, "overlays", "sim-racing", "overlays");
const GOLDEN = join(HERE, "golden");
const RENDERS = join(HERE, "renders");
const KEEP = process.argv.includes("--keep");
const OPEN = process.argv.includes("--open");
// Faithfulness tolerance. Canvas *text* has inherent subpixel rendering variance
// between page contexts, so glyph-dense overlays (e.g. `terminal`) legitimately
// differ ~0.5% while looking identical. A real mis-ported helper is a wrong shape
// at many percent, not a sub-1% glyph-edge scatter — so 0.6% catches ports while
// tolerating AA. `threshold` is pixelmatch's per-pixel colour tolerance (AA-aware).
const TOL = 0.006;
const MATCH_THRESHOLD = 0.15;

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { console.log("SKIP: playwright not installed (dev-only). `npm i` to enable the acceptance layer."); process.exit(0); }

const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(req.url.split("?")[0]);
    const buf = await readFile(join(ROOT, path));
    const ext = path.slice(path.lastIndexOf("."));
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
    res.end(buf);
  } catch { res.writeHead(404); res.end("not found"); }
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;
const base = `http://localhost:${PORT}/qa/render.html`;

const ids = readdirSync(OVERLAYS).filter(f => f.endsWith(".js")).map(f => f.replace(/\.js$/, "")).sort();
mkdirSync(RENDERS, { recursive: true });

let browser, failures = [], diffs = [], noGolden = [];
try {
  browser = await chromium.launch({ headless: !OPEN, slowMo: OPEN ? 400 : 0 });
} catch (e) {
  console.log("SKIP: chromium not available (" + e.message.split("\n")[0] + "). `npx playwright install chromium`.");
  server.close(); process.exit(0);
}

const page = await browser.newPage({ deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", e => errors.push(e.message));

for (const id of ids) {
  errors.length = 0;
  await page.goto(`${base}?style=${id}`, { waitUntil: "networkidle" });
  // wait for render or error flag
  const status = await page.waitForFunction(
    () => document.documentElement.dataset.rendered || document.documentElement.dataset.error || "pending",
    { timeout: 5000 }
  ).then(h => h.jsonValue()).catch(() => "timeout");

  if (status !== "1") {
    const err = await page.evaluate(() => document.documentElement.dataset.error || "");
    failures.push(`${id}: did not render (${err || errors[0] || status})`);
    continue;
  }
  // Assert the canvas actually painted. Poll rather than read once: the very first
  // navigation can screenshot a frame before the draw composites (a flake), while a
  // genuinely-blank overlay never reaches painted>0 and still fails on timeout.
  const painted = await page.waitForFunction(() => {
    const cv = document.getElementById("cv");
    const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
    return false;
  }, { timeout: 3000 }).then(() => true).catch(() => false);

  if (!painted) { failures.push(`${id}: blank — 0 painted pixels after 3s`); continue; }
  if (errors.length) { failures.push(`${id}: page error — ${errors[0]}`); continue; }

  // Faithfulness: pixel-diff the module render against the prototype golden.
  const dataUrl = await page.evaluate(() => document.getElementById("cv").toDataURL("image/png"));
  const render = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
  if (KEEP) writeFileSync(join(RENDERS, `${id}.png`), PNG.sync.write(render));

  const goldenPath = join(GOLDEN, `${id}.png`);
  if (!existsSync(goldenPath)) { noGolden.push(id); continue; }
  const golden = PNG.sync.read(readFileSync(goldenPath));
  if (golden.width !== render.width || golden.height !== render.height) {
    failures.push(`${id}: size ${render.width}x${render.height} vs golden ${golden.width}x${golden.height}`);
    continue;
  }
  const diffImg = new PNG({ width: render.width, height: render.height });
  const diffPx = pixelmatch(render.data, golden.data, diffImg.data, render.width, render.height, { threshold: MATCH_THRESHOLD });
  const ratio = diffPx / (render.width * render.height);
  if (KEEP) writeFileSync(join(RENDERS, `${id}.diff.png`), PNG.sync.write(diffImg));
  if (ratio > TOL) failures.push(`${id}: ${(ratio * 100).toFixed(2)}% differ from golden (${diffPx}px)`);
  else diffs.push({ id, ratio });
}

await browser.close();
server.close();
if (!KEEP) rmSync(RENDERS, { recursive: true, force: true });

console.log(`\nacceptance: rendered ${ids.length} overlays in real Chromium`);
if (diffs.length) {
  const worst = Math.max(...diffs.map(d => d.ratio));
  console.log(`  faithful vs golden: ${diffs.length}/${ids.length} within ${(TOL * 100).toFixed(1)}% (worst ${(worst * 100).toFixed(3)}%)`);
}
if (noGolden.length) console.log(`  no golden yet: ${noGolden.length} (${noGolden.slice(0, 5).join(", ")}${noGolden.length > 5 ? "…" : ""}) — run qa/capture-golden.mjs`);
if (failures.length) {
  console.log(`FAIL (${failures.length}):`);
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`PASS — all ${ids.length} painted; ${diffs.length} pixel-faithful to golden.` + (KEEP ? ` Artifacts in qa/renders/.` : ""));
