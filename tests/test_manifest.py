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
CHANNEL_KEYS = {"thr", "brk", "clu", "str", "gear", "rpm", "spd"}
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
