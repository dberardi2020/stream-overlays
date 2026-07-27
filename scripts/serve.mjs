/* Cross-platform launcher for the dev server.
 *
 * `python3` does not exist on Windows: the official installer ships `python.exe`
 * and the `py` launcher, and bare `python` is usually shadowed by the Microsoft
 * Store alias stub, which exits non-zero with an advert instead of running
 * anything. macOS/Linux have `python3` and generally not `py`. So neither name
 * works everywhere, and `npm run serve` has to find one.
 *
 * Tries each candidate in turn and runs the first that actually starts. Kept as
 * a shim rather than a shell `||` chain because cmd.exe prints a "not
 * recognized" line for every miss, and this is the first thing a new machine
 * runs.
 */
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, "dev-server.py");
const CANDIDATES = process.platform === "win32"
  ? ["py", "python", "python3"]
  : ["python3", "python"];

// A candidate counts only if it reports a real CPython 3.x — this is what
// filters out the Store alias stub, which exits non-zero and prints its advert.
function works(cmd) {
  const r = spawnSync(cmd, ["-c", "import sys; print(sys.version_info[0])"], { encoding: "utf8" });
  return r.status === 0 && r.stdout.trim() === "3";
}

const python = CANDIDATES.find(works);
if (!python) {
  console.error(
    "No Python 3 found. Tried: " + CANDIDATES.join(", ") + "\n" +
    (process.platform === "win32"
      ? "Install from python.org, or disable the Store aliases under\n" +
        "Settings > Apps > Advanced app settings > App execution aliases."
      : "Install Python 3 and make sure `python3` is on PATH.")
  );
  process.exit(1);
}

const child = spawn(python, [SERVER], { stdio: "inherit" });
child.on("exit", code => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
