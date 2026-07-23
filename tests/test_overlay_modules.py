"""Overlay module ↔ manifest coherence.

The pilot has only a few overlays migrated to modules; the rest are tracked in
SO-0001. So this does NOT require every manifest entry to have a module yet — it
requires the reverse, plus internal consistency:

  * every overlay module corresponds to a real manifest entry (no orphans),
  * a module's exported id matches its filename,
  * the channels the draw body actually reads agree with the manifest's `uses`
    and `set` — the same derivation that keeps the manifest honest.

When migration completes, flip `REQUIRE_FULL_COVERAGE` to also assert every
non-excluded manifest entry has a module.
"""
import json
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SIM = ROOT / "overlays" / "sim-racing"
MANIFEST = SIM / "catalogue.json"
MODULE_DIR = SIM / "overlays"
sys.path.insert(0, str(SIM / "build"))
import channels  # noqa: E402

REQUIRE_FULL_COVERAGE = True  # SO-0001 complete: every non-excluded overlay has a module

MANIFEST_BY_ID = {e["id"]: e for e in json.loads(MANIFEST.read_text())}
MODULE_FILES = sorted(MODULE_DIR.glob("*.js"))
ID_EXPORT = re.compile(r'export\s+const\s+id\s*=\s*"([^"]+)"')


def module_id(path):
    m = ID_EXPORT.search(path.read_text())
    return m.group(1) if m else None


def test_there_is_at_least_one_pilot_module():
    assert MODULE_FILES, "no overlay modules found"


@pytest.mark.parametrize("path", MODULE_FILES, ids=lambda p: p.stem)
def test_module_id_matches_filename_and_manifest(path):
    mid = module_id(path)
    assert mid is not None, f"{path.name}: no `export const id`"
    assert mid == path.stem, f"{path.name}: exported id {mid!r} != filename"
    assert mid in MANIFEST_BY_ID, f"{path.name}: id {mid!r} is not in the manifest (orphan module)"


@pytest.mark.parametrize("path", MODULE_FILES, ids=lambda p: p.stem)
def test_module_exports_a_draw(path):
    assert re.search(r"export\s+function\s+draw\s*\(", path.read_text()), \
        f"{path.name}: no `export function draw()`"


@pytest.mark.parametrize("path", MODULE_FILES, ids=lambda p: p.stem)
def test_derived_channels_agree_with_manifest(path):
    entry = MANIFEST_BY_ID[module_id(path)]
    derived = channels.channels(path.read_text())
    declared = set(entry["uses"])
    missing = declared - derived
    assert not missing, f"{path.stem}: declares {sorted(declared)} but draw body doesn't read {sorted(missing)}"
    assert channels.derived_set(derived) == entry["set"], \
        f"{path.stem}: draw reads {sorted(derived)} (set {channels.derived_set(derived)!r}) but manifest set={entry['set']!r}"


def test_full_coverage_when_required():
    if not REQUIRE_FULL_COVERAGE:
        pytest.skip("pilot phase — full migration tracked in SO-0001")
    have = {module_id(p) for p in MODULE_FILES}
    want = {e["id"] for e in MANIFEST_BY_ID.values() if e["stage"] != "excluded"}
    assert want <= have, f"manifest entries without a module: {sorted(want - have)}"
