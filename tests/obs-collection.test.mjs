/* OBS setup scene-collection generator — run with `node --test`.
 *
 * The collection format is OBS's own and is not a documented public API, so these
 * tests cannot prove OBS will accept the file — only a real import can, and one
 * has (Windows, 2026-07-27). What they DO lock down is the handful of settings
 * that make importing worth doing at all rather than typing it in by hand: the
 * right URL, the right size, and `shutdown: false` so the page keeps holding the
 * gamepad. Get any of those wrong and the import looks fine but Interact fails.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSetupCollection } from "../overlays/sim-racing/engine/obs-collection.js";

const BASE = "http://localhost:8000/pages/";
const build = (base = BASE) => buildSetupCollection(base);
const browsers = c => c.sources.filter(s => s.id === "browser_source");
const scenes = c => c.sources.filter(s => s.id === "scene");

test("the collection is exactly one scene holding the setup page", () => {
  const c = build();
  assert.equal(scenes(c).length, 1);
  assert.equal(browsers(c).length, 1);
  assert.equal(c.scene_order.length, 1);
  assert.equal(c.current_scene, scenes(c)[0].name);
  assert.equal(c.current_program_scene, scenes(c)[0].name);
});

test("the source points at the OBS-tuned setup page on the serving origin", () => {
  const c = buildSetupCollection("http://192.168.1.50:9001/pages/");
  const url = new URL(browsers(c)[0].settings.url);
  assert.equal(url.origin, "http://192.168.1.50:9001");
  assert.equal(url.pathname, "/pages/setup.html");
  assert.equal(url.searchParams.get("obs"), "1", "?obs=1 drops the nav and the OBS how-to");
});

test("shutdown is OFF — the whole reason to generate this rather than describe it", () => {
  // A page OBS has shut down cannot hold the gamepad, and losing the device
  // mid-calibration is the failure this removes from the manual steps.
  assert.equal(browsers(build())[0].settings.shutdown, false);
});

test("the source is big enough to calibrate in", () => {
  const s = browsers(build())[0].settings;
  assert.ok(s.width >= 800 && s.height >= 900, `${s.width}x${s.height} is too cramped to calibrate in`);
});

test("the item is visible and locked", () => {
  const item = scenes(build())[0].settings.items[0];
  assert.equal(item.visible, true, "nothing to Interact with if it is hidden");
  assert.equal(item.locked, true, "visible and never copied, so lock it against a stray drag");
});

test("the scene item resolves to the source that exists", () => {
  const c = build();
  const item = scenes(c)[0].settings.items[0];
  const src = browsers(c)[0];
  assert.equal(item.source_uuid, src.uuid);
  assert.equal(item.name, src.name, "name and uuid must point at the same source");
});

test("uuids are unique and regenerated per build", () => {
  const a = build(), b = build();
  const ids = a.sources.map(s => s.uuid);
  assert.equal(new Set(ids).size, ids.length);
  assert.notEqual(a.sources[0].uuid, b.sources[0].uuid, "two imports must not collide");
});

test("the collection name can be overridden", () => {
  assert.equal(buildSetupCollection(BASE, "My Rig").name, "My Rig");
  assert.match(build().name, /Rig Setup/);
});
