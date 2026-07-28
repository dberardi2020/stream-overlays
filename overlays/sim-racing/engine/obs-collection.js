/* Generate an importable OBS **scene collection** containing the Rig Setup page.
 *
 * Calibrating inside OBS is the step everyone misses, and the manual version has
 * four places to go wrong: right URL, right size, untick "Shutdown source when
 * not visible", then find Interact. Importing a collection does all of that, so
 * the user's only job is right-click → Interact → press a button.
 *
 * Built client-side rather than as a build step (ADR 0002 — no build): the URL
 * has to point at wherever this page is actually served from, which only the
 * browser knows. Serve it on a different port and the collection follows.
 *
 * **Why this does not include the overlays.** It did, briefly — every overlay as
 * a Browser Source across a scene per set, meant as a library you copy out of.
 * That premise is false: **OBS cannot copy or paste sources between scene
 * collections.** It is a long-standing feature request, not an oversight, so
 * "switch to this collection and copy what you want" cannot work. Bulk delivery
 * has to merge into the user's *existing* collection instead — tracked as
 * SO-0033. Until then, one overlay at a time via the gallery's Copy OBS link.
 *
 * The collection format is OBS's own and is not a documented public API, so this
 * targets the widely-compatible subset: sources carry both `name` and `uuid`, and
 * scene items reference both, since which one OBS honours varies by version.
 * Verified importing cleanly via Scene Collection → Import on Windows, 2026-07-27.
 */

const PAD = 24;

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
      shutdown: shutdown !== false,
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

function sceneItem(src, id, x, y, visible, locked) {
  return {
    name: src.name, source_uuid: src.uuid,
    visible: visible !== false, locked: locked === true, rot: 0.0,
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

/* `baseUrl` — absolute URL of the pages/ directory, e.g. http://host:8000/pages/ */
export function buildSetupCollection(baseUrl, collectionName) {
  /* `shutdown: false` is the point of generating this rather than describing it:
     the setup page has to keep holding the gamepad, and a page OBS has shut down
     cannot. Locked because it is visible and there is no reason to drag it. */
  const setupSrc = browserSource(
    "Rig Setup — calibrate, then delete this",
    new URL("setup.html?obs=1", baseUrl).href, 900, 1000, false
  );
  const setupScene = scene("Stream Overlays — Rig Setup", [sceneItem(setupSrc, 1, PAD, PAD, true, true)]);

  return {
    name: collectionName || "Stream Overlays — Rig Setup",
    current_scene: setupScene.name,
    current_program_scene: setupScene.name,
    current_transition: "Fade",
    transition_duration: 300,
    scene_order: [{ name: setupScene.name }],
    sources: [setupSrc, setupScene],
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
