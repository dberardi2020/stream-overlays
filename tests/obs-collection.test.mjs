/* OBS scene-collection generator — run with `node --test`.
 *
 * The collection format is OBS's own and is not a documented public API, so
 * these tests cannot prove OBS will accept the file — only a real import can do
 * that. What they DO lock down is everything that would be silently wrong in a
 * file that imports fine: sizes that don't match the render scale, sources that
 * would each spin up a CEF instance, URLs pointing at the wrong origin, and
 * scene items referencing sources that aren't there.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCollection, collectionSummary } from "../overlays/sim-racing/engine/obs-collection.js";

const BASE = "http://localhost:8000/pages/";
const MANIFEST = [
  { id: "bowtie",      name: "Bowtie",      set: "pedals",  size: { w: 250, h: 100 } },
  { id: "pedal-blocks",name: "Pedal Blocks",set: "pedals",  size: { w: 180, h: 130 } },
  { id: "gate-map",    name: "Gate Map",    set: "shifter", size: { w: 200, h: 150 } },
  { id: "hud",         name: "HUD",         set: "combo",   size: { w: 420, h: 120 } }
];

const build = (scale = 2) => buildCollection(MANIFEST, BASE, scale);
const browsers = c => c.sources.filter(s => s.id === "browser_source");
const scenes = c => c.sources.filter(s => s.id === "scene");

test("every overlay becomes a browser source, plus the setup page", () => {
  const c = build();
  assert.equal(browsers(c).length, MANIFEST.length + 1, "one per overlay + Rig Setup");
  assert.ok(browsers(c).some(s => /Rig Setup/.test(s.name)));
});

test("source dimensions are the RENDER size, not the design size", () => {
  // The whole point: overlay.html draws at `scale`, so a 180x130 needs 360x260.
  const c = build(2);
  const pb = browsers(c).find(s => s.name.startsWith("Pedal Blocks"));
  assert.equal(pb.settings.width, 360);
  assert.equal(pb.settings.height, 260);

  const c3 = build(3);
  const pb3 = browsers(c3).find(s => s.name.startsWith("Pedal Blocks"));
  assert.equal(pb3.settings.width, 540);
  assert.equal(pb3.settings.height, 390);
});

test("the URL carries the same scale the size was computed from", () => {
  // If these ever disagree the source is the wrong size and nothing says so.
  for (const scale of [1, 2, 3]) {
    const c = build(scale);
    for (const s of browsers(c)) {
      if (/Rig Setup/.test(s.name)) continue;
      const u = new URL(s.settings.url);
      assert.equal(u.searchParams.get("scale"), String(scale), s.name);
      const e = MANIFEST.find(m => m.id === u.searchParams.get("style"));
      assert.equal(s.settings.width, Math.round(e.size.w * scale), s.name + " width");
      assert.equal(s.settings.height, Math.round(e.size.h * scale), s.name + " height");
    }
  }
});

test("every source shuts down when not visible", () => {
  // Without this, importing the collection spins up one CEF instance per overlay.
  for (const s of browsers(build())) {
    assert.equal(s.settings.shutdown, true, s.name + " would keep running off-scene");
  }
});

test("URLs are absolute and rooted at the serving origin", () => {
  const c = buildCollection(MANIFEST, "http://192.168.1.50:9001/pages/", 2);
  for (const s of browsers(c)) {
    assert.ok(s.settings.url.startsWith("http://192.168.1.50:9001/pages/"), s.settings.url);
  }
});

test("scenes are grouped by set, Setup first", () => {
  const c = build();
  const names = scenes(c).map(s => s.name);
  assert.equal(names[0], "SO · Setup", "the step everyone misses opens the collection");
  assert.deepEqual(names, ["SO · Setup", "SO · Pedals", "SO · Shifter", "SO · Combo"],
    "only sets that have overlays get a scene");
  assert.equal(c.current_scene, "SO · Setup");
  assert.deepEqual(c.scene_order.map(s => s.name), names, "scene_order matches the scenes");
});

test("every scene item resolves to a source that exists", () => {
  const c = build();
  const byUuid = new Map(c.sources.map(s => [s.uuid, s]));
  for (const sc of scenes(c)) {
    for (const item of sc.settings.items) {
      const src = byUuid.get(item.source_uuid);
      assert.ok(src, sc.name + ": item " + item.name + " references a missing source");
      assert.equal(src.name, item.name, "name and uuid must point at the same source");
    }
  }
});

test("uuids are unique across the collection", () => {
  const ids = build().sources.map(s => s.uuid);
  assert.equal(new Set(ids).size, ids.length);
});

test("tiled overlays in a scene never overlap", () => {
  const many = Array.from({ length: 24 }, (_, i) => ({
    id: "o" + i, name: "O" + i, set: "pedals", size: { w: 250, h: 100 }
  }));
  const c = buildCollection(many, BASE, 2);
  const byUuid = new Map(c.sources.map(s => [s.uuid, s]));
  const items = c.sources.find(s => s.name === "SO · Pedals").settings.items
    .map(it => {
      const s = byUuid.get(it.source_uuid);
      return { x: it.pos.x, y: it.pos.y, w: s.settings.width, h: s.settings.height };
    });
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!hit, `items ${i} and ${j} overlap`);
    }
  }
});

test("collectionSummary counts what the button reports", () => {
  const s = collectionSummary(build());
  assert.equal(s.sources, MANIFEST.length + 1);
  assert.equal(s.scenes, 4);
  assert.equal(s.name, "StreamOverlays");
});
