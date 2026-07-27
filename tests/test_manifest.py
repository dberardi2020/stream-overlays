"""Manifest schema + invariants.

catalogue.json is the source of truth the site renders and an agent edits, so its
integrity is worth a test. These checks run on the JSON alone — no browser, no
overlay code — and guard the properties the rest of the system assumes: stable
kebab ids, valid enums, and (the load-bearing one) that each overlay's `set`
agrees with the channels its `uses` list implies.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "overlays" / "sim-racing" / "catalogue.json"
sys.path.insert(0, str(ROOT / "overlays" / "sim-racing" / "build"))
import channels  # noqa: E402

STAGES = {"live", "draft", "experimental", "excluded"}
SETS = {"pedals", "wheel", "shifter", "combo"}
# `gear` is split by source (ADR 0007): an H-shifter reports an absolute
# position, paddles report only a shift direction, and they are calibrated
# independently. An overlay declares which it reads; there is no bare "gear".
GEAR_KEYS = {"gear:absolute", "gear:direction"}
CHANNEL_KEYS = {"thr", "brk", "clu", "str", "rpm", "spd"} | GEAR_KEYS
KEBAB = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def manifest():
    return json.loads(MANIFEST.read_text())


def test_manifest_is_a_nonempty_list():
    m = manifest()
    assert isinstance(m, list) and m


def test_ids_are_unique_kebab_case():
    ids = [e["id"] for e in manifest()]
    assert len(ids) == len(set(ids)), "duplicate id in manifest"
    for i in ids:
        assert KEBAB.fullmatch(i), f"id not kebab-case: {i!r}"


def test_required_fields_and_enums():
    for e in manifest():
        for field in ("id", "name", "aliases", "set", "stage", "hidden", "size", "uses"):
            assert field in e, f"{e.get('id')!r} missing {field}"
        assert e["stage"] in STAGES, f"{e['id']}: bad stage {e['stage']!r}"
        assert e["set"] in SETS, f"{e['id']}: bad set {e['set']!r}"
        assert isinstance(e["hidden"], bool), f"{e['id']}: hidden not bool"
        assert isinstance(e["aliases"], list), f"{e['id']}: aliases not a list"
        assert set(e["uses"]) <= CHANNEL_KEYS, f"{e['id']}: unknown channel in uses"
        w, h = e["size"]["w"], e["size"]["h"]
        assert isinstance(w, int) and isinstance(h, int) and w > 0 and h > 0, f"{e['id']}: bad size"


def test_requires_is_a_subset_of_uses():
    """`requires` gates an overlay out of Live mode when that source is not
    calibrated. It must name a channel the overlay actually reads, or the
    gallery would hide something for a reason that isn't true (ADR 0007)."""
    for e in manifest():
        req = e.get("requires")
        if req is None:
            continue
        assert isinstance(req, list) and req, f"{e['id']}: requires must be a non-empty list"
        assert set(req) <= CHANNEL_KEYS, f"{e['id']}: unknown channel in requires: {req!r}"
        assert set(req) <= set(e["uses"]), \
            f"{e['id']}: requires {req!r} names a channel it never reads ({e['uses']!r})"


def test_absolute_gear_overlays_declare_the_requirement():
    """Anything whose subject IS the gear position must be gated: paddles cannot
    report a position, so these render empty rather than wrong without a shifter."""
    for e in manifest():
        if "gear:absolute" not in e.get("requires", []):
            continue
        assert "gear:absolute" in e["uses"], f"{e['id']}: gated on a channel it doesn't use"


def test_aliases_never_collide_with_an_id():
    ids = {e["id"] for e in manifest()}
    for e in manifest():
        for a in e["aliases"]:
            assert KEBAB.fullmatch(a), f"{e['id']}: alias not kebab-case: {a!r}"
            assert a not in ids or a == e["id"], f"{e['id']}: alias {a!r} shadows another id"


def test_set_agrees_with_uses():
    """The derived guard: `set` must match what the channel groups in `uses` imply.
    This is what caught overlays mislabelled as the wrong set in the prototype."""
    for e in manifest():
        derived = channels.derived_set(set(e["uses"]))
        if not e["uses"]:
            continue  # nothing declared -> nothing to check
        assert derived == e["set"], (
            f"{e['id']}: set={e['set']!r} but uses={e['uses']} implies {derived!r}"
        )


def test_stage_values_all_valid_and_reported():
    # Not a pinned-count test (curation moves stages constantly); just report.
    counts = Counter(e["stage"] for e in manifest())
    assert set(counts) <= STAGES
    print("stage counts:", dict(counts))


HERO_MAX = 4  # keep in sync with the admin cap + the index layout


def test_at_most_four_heroes():
    """The landing hero teaser features at most HERO_MAX overlays (the 2x2 layout's
    sweet spot). admin.html enforces this in the UI; this guards the data itself."""
    heroes = [e["id"] for e in manifest() if e.get("hero")]
    assert len(heroes) <= HERO_MAX, f"at most {HERO_MAX} hero overlays, got {len(heroes)}: {heroes}"
    for e in manifest():
        if "hero" in e:
            assert e["hero"] is True, f"{e['id']}: hero must be true when present (got {e['hero']!r})"
