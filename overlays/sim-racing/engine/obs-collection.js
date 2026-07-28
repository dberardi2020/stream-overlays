/* Generate an importable OBS **scene collection** from the manifest.
 *
 * The point is to skip the tedious part of onboarding: instead of adding 69
 * Browser Sources by hand and getting every size wrong, you import one file,
 * switch to the collection, and copy the overlays you want into your own scenes.
 *
 * Built client-side rather than as a build step (ADR 0002 — no build): the URLs
 * have to point at wherever this page is actually served from, which only the
 * browser knows. Serve it on a different port and the collection follows.
 *
 * Two things drive the shape:
 *
 *   - **Every source gets `shutdown: true`** ("Shutdown source when not visible").
 *     Each Browser Source is a full CEF instance; 69 of them live at once would
 *     flatten the machine. With shutdown set, only what is on the active scene
 *     runs a browser, which is what makes a whole-catalogue collection viable.
 *
 *   - **Sizes are the RENDER size, not the design size.** overlay.html draws at
 *     `scale` (default 2), so a 180x130 overlay needs a 360x260 source. Getting
 *     this wrong is the single most common OBS mistake with this project, so the
 *     generator bakes the scale into both the URL and the source dimensions.
 *
 * The collection format is OBS's own and is not a documented public API, so this
 * targets the widely-compatible subset: sources carry both `name` and `uuid`, and
 * scene items reference both, since which one OBS honours varies by version.
 *
 * **Verified importing cleanly** via Scene Collection → Import on Windows,
 * 2026-07-27. The unit tests cover what would be silently wrong in a file that
 * imports fine (sizes, scale agreement, shutdown, dangling item references); they
 * cannot cover acceptance, so that is what this note is for. If a future OBS
 * rejects it, the fields most likely at fault are the `*_ver` stamps and the
 * scene item shape — those are the parts pinned to a version.
 */

const CANVAS = { w: 1920, h: 1080 };
const PAD = 24;                    // gap between tiled overlays
const SET_SCENES = ["pedals", "wheel", "shifter", "combo"];

const uuid = () => (globalThis.crypto && crypto.randomUUID)
  ? crypto.randomUUID()
  : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.floor(Math.random() * 16), v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

/* An OBS input. The audio/mixer fields are inert for a browser source but OBS
   writes them for every input, and older builds are happier seeing them. */
function browserSource(name, url, w, h) {
  return {
    prev_ver: 503316549,
    name, uuid: uuid(),
    id: "browser_source", versioned_id: "browser_source",
    settings: {
      url, width: w, height: h,
      shutdown: true,              // do not run a CEF instance for an off-scene overlay
      restart_when_active: true,   // re-poll the gamepad when it comes back on screen
      reroute_audio: false, fps_custom: false, fps: 30, css: "",
      webpage_control_level: 1
    },
    mixers: 0, sync: 0, flags: 0, volume: 1.0, balance: 0.5,
    enabled: true, muted: false, "push-to-mute": false, "push-to-mute-delay": 0,
    "push-to-talk": false, "push-to-talk-delay": 0,
    hotkeys: {}, deinterlace_mode: 0, deinterlace_field_order: 0,
    monitoring_type: 0, private_settings: {}, filters: []
  };
}

function sceneItem(src, id, x, y) {
  return {
    name: src.name, source_uuid: src.uuid,
    visible: true, locked: false, rot: 0.0,
    pos: { x, y }, scale: { x: 1.0, y: 1.0 },
    align: 5, bounds_type: 0, bounds_align: 0,
    bounds: { x: 0.0, y: 0.0 },
    crop_left: 0, crop_top: 0, crop_right: 0, crop_bottom: 0,
    id, group_item_backup: false,
    scale_filter: "disable", blend_method: "default", blend_type: "normal",
    show_transition: { duration: 0 }, hide_transition: { duration: 0 },
    private_settings: {}
  };
}

function scene(name, items) {
  return {
    prev_ver: 503316549,
    name, uuid: uuid(),
    id: "scene", versioned_id: "scene",
    settings: { custom_size: false, id_counter: items.length, items },
    mixers: 0, sync: 0, flags: 0, volume: 1.0, balance: 0.5,
    enabled: true, muted: false, "push-to-mute": false, "push-to-mute-delay": 0,
    "push-to-talk": false, "push-to-talk-delay": 0,
    hotkeys: {}, deinterlace_mode: 0, deinterlace_field_order: 0,
    monitoring_type: 0, private_settings: {}, filters: []
  };
}

/* Tile left-to-right, wrapping at the canvas edge. Rows advance by the tallest
   overlay placed in the row, so nothing overlaps at mixed sizes. */
function layout(entries, sizeOf) {
  let x = PAD, y = PAD, rowH = 0;
  return entries.map(e => {
    const { w, h } = sizeOf(e);
    if (x + w > CANVAS.w - PAD && x > PAD) { x = PAD; y += rowH + PAD; rowH = 0; }
    const at = { x, y };
    x += w + PAD; rowH = Math.max(rowH, h);
    return { entry: e, ...at };
  });
}

/* `manifest`  — catalogue entries (excluded/module-less ones filtered by caller)
   `baseUrl`   — absolute URL of the pages/ directory, e.g. http://host:8000/pages/
   `scale`     — the render scale to bake in (overlay.html's default is 2) */
export function buildCollection(manifest, baseUrl, scale, collectionName) {
  const name = collectionName || "StreamOverlays";
  const sizeOf = e => ({ w: Math.round(e.size.w * scale), h: Math.round(e.size.h * scale) });
  const sources = [], scenes = [];

  // A Setup scene first — calibration inside OBS is the step everyone misses,
  // so the collection opens on it rather than making it something you go find.
  const setupSrc = browserSource(
    "SO · Rig Setup (calibrate, then delete)",
    new URL("setup.html?obs=1", baseUrl).href, 900, 1000
  );
  sources.push(setupSrc);
  scenes.push(scene("SO · Setup", [sceneItem(setupSrc, 1, PAD, PAD)]));

  for (const set of SET_SCENES) {
    const items = manifest.filter(e => e.set === set);
    if (!items.length) continue;
    const placed = layout(items, sizeOf);
    const sceneItems = placed.map((p, i) => {
      const { w, h } = sizeOf(p.entry);
      const url = new URL("overlay.html?style=" + p.entry.id + "&scale=" + scale, baseUrl).href;
      const src = browserSource(p.entry.name + " (" + w + "×" + h + ")", url, w, h);
      sources.push(src);
      return sceneItem(src, i + 1, p.x, p.y);
    });
    scenes.push(scene("SO · " + set[0].toUpperCase() + set.slice(1), sceneItems));
  }

  const all = [...sources, ...scenes];
  return {
    name,
    current_scene: scenes[0].name,
    current_program_scene: scenes[0].name,
    current_transition: "Fade",
    transition_duration: 300,
    scene_order: scenes.map(s => ({ name: s.name })),
    sources: all,
    groups: [],
    quick_transitions: [],
    transitions: [],
    saved_projectors: [],
    preview_locked: false,
    scaling_enabled: false,
    scaling_level: 0,
    scaling_off_x: 0.0, scaling_off_y: 0.0,
    modules: {},
    version: 2
  };
}

/* Counts for the UI, so the button can say what it is about to hand over. */
export function collectionSummary(collection) {
  const scenes = collection.sources.filter(s => s.id === "scene");
  const browsers = collection.sources.filter(s => s.id === "browser_source");
  return { scenes: scenes.length, sources: browsers.length, name: collection.name };
}
