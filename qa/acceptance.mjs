/* Deterministic acceptance harness — the un-mockable surface as a real browser.
 *
 * Renders every migrated overlay in real headless Chromium at a fixed state
 * (qa/render.html) and asserts it actually painted — the real-pixel successor to
 * the node mock's blank-tile guard. Catches what the mock cannot: a font/import
 * failure, a runtime error only a real canvas surfaces, a truly empty render.
 *
 *   node qa/acceptance.mjs            # run; non-zero exit on any failure
 *   node qa/acceptance.mjs --keep     # leave PNG artifacts in qa/renders/
 *   node qa/acceptance.mjs --open     # headed browser, slowed, for eyeballing
 *
 * Skips cleanly (exit 0, a notice) when Playwright or its browser isn't installed,
 * so it never blocks a machine that only runs the unit layer.
 *
 * NOT YET the faithfulness check: pixel-diff of each render against a golden
 * captured from the prototype. That lands next (see qa/product-map.md → Roadmap),
 * capturing all 72 goldens before the prototype is deleted.
 */
import { readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OVERLAYS = join(ROOT, "overlays", "sim-racing", "overlays");
const RENDERS = join(HERE, "renders");
const KEEP = process.argv.includes("--keep");
const OPEN = process.argv.includes("--open");

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

let browser, failures = [];
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
    failures.push(`${id}: did not render (${err || status})`);
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

  if (KEEP) writeFileSync(join(RENDERS, `${id}.png`), await page.locator("#cv").screenshot());
  if (!painted) failures.push(`${id}: blank — 0 painted pixels after 3s`);
  if (errors.length) failures.push(`${id}: page error — ${errors[0]}`);
}

await browser.close();
server.close();
if (!KEEP) rmSync(RENDERS, { recursive: true, force: true });

console.log(`\nacceptance: rendered ${ids.length} overlays in real Chromium`);
if (failures.length) {
  console.log(`FAIL (${failures.length}):`);
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`PASS — all ${ids.length} painted.` + (KEEP ? ` PNGs in qa/renders/.` : ""));
