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
 * Three things drive the shape:
 *
 *   - **Overlays import HIDDEN, stacked, and centred.** This is a library to copy
 *     out of, not a scene to look at — browsing happens on the web gallery. OBS
 *     treats a source as visible only when an active scene item references it with
 *     the eye on, so `visible: false` plus `shutdown: true` means the Browser
 *     Source never starts a CEF instance; it spins up lazily if you unhide it.
 *
 *     The first cut tiled them in a grid, all visible. Only the active scene's
 *     sources go live, so that was ~14-20 browsers rather than all 67 — but that
 *     is still enough to make a scene noticeably laggy, and the cost was paid
 *     again on every scene switch. It also overflowed: ~20 overlays do not fit in
 *     1920x1080, so much of each scene sat off-canvas and rendered as clipped
 *     junk. Stacked-and-centred means unhiding any one lands it fully in frame.
 *
 *   - **Every source gets `shutdown: true`** ("Shutdown source when not visible"),
 *     which is what makes the above work. The Rig Setup source is the deliberate
 *     exception — see below.
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
const PAD = 24;
const SET_SCENES = ["pedals", "wheel", "shifter", "combo"];

// Stacked and centred, so unhiding any one overlay puts it fully in frame
// regardless of its size — see the header note on why this is not a grid.
// Clamped at 0: an overlay wider than the canvas would otherwise centre to a
// negative offset, hiding its left/top edge off-screen — the exact failure the
// grid had, reintroduced from the other direction.
const centred = (w, h) => ({
  x: Math.max(0, Math.round((CANVAS.w - w) / 2)),
  y: Math.max(0, Math.round((CANVAS.h - h) / 2))
});

const uuid = () => (globalThis.crypto && crypto.randomUUID)
  ? crypto.randomUUID()
  : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.floor(Math.random() * 16), v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

/* An OBS input. The audio/mixer fields are inert for a browser source but OBS
   writes them for every input, and older builds are happier seeing them. */
function browserSource(name, url, w, h, shutdown) {
  return {
    prev_ver: 503316549,
    name, uuid: uuid(),
    id: "browser_source", versioned_id: "browser_source",
    settings: {
      url, width: w, height: h,
      shutdown: shutdown !== false,  // no CEF instance for a hidden/off-scene overlay
      restart_when_active: true,     // re-poll the gamepad when it comes back on screen
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

function sceneItem(src, id, x, y, visible) {
  return {
    name: src.name, source_uuid: src.uuid,
    visible: visible !== false, locked: false, rot: 0.0,
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

/* `manifest`  — catalogue entries (excluded/module-less ones filtered by caller)
   `baseUrl`   — absolute URL of the pages/ directory, e.g. http://host:8000/pages/
   `scale`     — the render scale to bake in (overlay.html's default is 2) */
export function buildCollection(manifest, baseUrl, scale, collectionName) {
  const name = collectionName || "StreamOverlays";
  const sizeOf = e => ({ w: Math.round(e.size.w * scale), h: Math.round(e.size.h * scale) });
  const sources = [], scenes = [];

  /* A Setup scene first — calibrating inside OBS is the step everyone misses, so
     the collection opens on it rather than making it something you go find. This
     is the one source that imports VISIBLE, and the one with `shutdown: false`:
     it has to keep holding the gamepad, and a page OBS has shut down cannot. */
  const setupSrc = browserSource(
    "SO · Rig Setup (calibrate, then delete)",
    new URL("setup.html?obs=1", baseUrl).href, 900, 1000, false
  );
  sources.push(setupSrc);
  scenes.push(scene("SO · Setup", [sceneItem(setupSrc, 1, PAD, PAD, true)]));

  for (const set of SET_SCENES) {
    const items = manifest.filter(e => e.set === set);
    if (!items.length) continue;
    const sceneItems = items.map((e, i) => {
      const { w, h } = sizeOf(e);
      const url = new URL("overlay.html?style=" + e.id + "&scale=" + scale, baseUrl).href;
      const src = browserSource(e.name + " (" + w + "×" + h + ")", url, w, h);
      sources.push(src);
      const at = centred(w, h);
      return sceneItem(src, i + 1, at.x, at.y, false);   // hidden: costs nothing until unhidden
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
