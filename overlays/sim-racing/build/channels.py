"""Derive the input channels an overlay actually reads, from its draw code.

This is the logic that keeps catalogue.json honest: `set` and `uses` are not
authored by hand and trusted, they are *derived* from what each overlay's draw
body references, then checked against the manifest. It is the same derivation
that originally corrected mislabelled overlays; here it runs against the extracted
one-file-per-overlay modules instead of the single-file prototype.

Pure stdlib, importable by the test suite. `channels(src)` takes an overlay
module's source text and returns the set of channel keys it reads.
"""
import re

PEDAL = ("thr", "brk", "clu")


def strip(src):
    """Drop comments so channel references in prose never count as reads."""
    src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)
    return re.sub(r"//[^\n]*", " ", src)


def channels(src):
    """The set of channel keys ('thr','brk','clu','str','gear','rpm','spd') read."""
    b = strip(src)
    ch = set()

    def reads(name):
        # .name (but not C.name, the palette colour) or "name" as a string key
        return (re.search(r"(?<!\bC)\." + name + r"\b", b) or
                re.search(r'["\']' + name + r'["\']', b))

    for c in PEDAL:
        if reads(c):
            ch.add(c)
    if re.search(r"\bCH\b", b) or "pedalBars(" in b:
        ch |= set(PEDAL)
    if reads("str") or "wheel(" in b or "DEG(" in b:
        ch.add("str")
    # The two gear sources report different things and are calibrated separately
    # (ADR 0007), so an overlay declares which one it actually reads:
    #   gear:absolute  - a POSITION. Only an H-shifter can report it.
    #   gear:direction - a shift EVENT. Paddles report this and nothing else.
    # `shiftAge`/`shiftProg` are produced by both paths, so on their own they
    # imply an event timer, not a position.
    if (any(reads(k) for k in ("gear", "lever", "prevGear"))
            or any(t in b for t in ("gearName(", "drawGate(", "drawKnob(", "gateXY(",
                                    "knobXY(", "gateUse"))):
        ch.add("gear:absolute")
    if (any(reads(k) for k in ("shiftDir", "shiftCount", "shiftAge", "shiftProg"))
            or any(t in b for t in ("shiftLog", "shiftTimes"))):
        ch.add("gear:direction")
    if reads("rpm") or "revStrip(" in b or "revColor(" in b:
        ch.add("rpm")
    if reads("spd"):
        ch.add("spd")
    return ch


def groups(ch):
    """Collapse channel keys into input groups; >=2 groups means a combo overlay."""
    g = []
    if ch & set(PEDAL):
        g.append("pedals")
    if "str" in ch:
        g.append("wheel")
    if any(c.startswith("gear:") for c in ch):
        g.append("shifter")
    return g


def derived_set(ch):
    """The `set` value the manifest should carry, derived from the channels."""
    g = groups(ch)
    return "combo" if len(g) > 1 else (g[0] if g else "none")
