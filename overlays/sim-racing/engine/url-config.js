/* URL config — Layer 2 (pure parsing).

   Config lives in the URL, never in storage: a streamer calibrates in one browser
   but OBS composites in another, and localStorage is per-origin-per-profile — so a
   saved setting silently wouldn't cross over. The URL is portable, shareable, and
   bookmarkable instead. See docs/decisions/0001-config-in-the-url.md.

   `id` is the immutable contract: ?style=bowtie resolves to the manifest entry
   with that id (or one of its aliases). No numeric indices — a position in a
   curated list is exactly the unstable reference the id model exists to avoid. */

export function readParams(search) {
  const params = new URLSearchParams(search != null ? search : location.search);
  const numParam = (name, def, lo, hi) => {
    const v = parseFloat(params.get(name));
    return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
  };
  return {
    style: (params.get("style") || "").trim().toLowerCase(),
    scale: numParam("scale", 2, 0.5, 6),
    bgHex: params.get("bg") || "000000",
    bgA: numParam("bga", 0, 0, 1),
    radius: numParam("radius", 8, 0, 40)
  };
}

/* Resolve a ?style= value to a manifest entry by id, then by alias. Returns null
   when nothing matches, so the caller can show an honest "not found" rather than
   silently falling back to some default overlay. */
export function resolveEntry(manifest, styleParam) {
  const raw = String(styleParam || "").trim().toLowerCase();
  if (!raw) return null;
  return manifest.find(e => e.id === raw)
      || manifest.find(e => (e.aliases || []).includes(raw))
      || null;
}

export function hexToRgba(hex, a) {
  let h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = "000000";
  const n = parseInt(h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}
