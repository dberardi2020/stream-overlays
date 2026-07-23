"""The docs renderer's inline emphasis — its one piece with real logic.

Bold may wrap an italic (`**a *b* c**`) and an italic may wrap a bold
(`*a **b** c*`); both must resolve, and emphasis inside a code span must stay
literal. The ticket preamble's "**What is *not* here:**" is exactly the nested
case that used to leave literal `**`, so it earns a guard.
"""
import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("docs_render", ROOT / "docs" / "render.py")
render = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(render)


@pytest.mark.parametrize("src, want", [
    ("**bold**", "<strong>bold</strong>"),
    ("*italic*", "<em>italic</em>"),
    ("**a *b* c**", "<strong>a <em>b</em> c</strong>"),          # bold wraps italic
    ("*a **b** c*", "<em>a <strong>b</strong> c</em>"),          # italic wraps bold
    ("**a** and **b**", "<strong>a</strong> and <strong>b</strong>"),
    ("**a** then *b*", "<strong>a</strong> then <em>b</em>"),
    ("**What is *not* here:**", "<strong>What is <em>not</em> here:</strong>"),
    ("`**not bold**`", "<code>**not bold**</code>"),            # untouched inside code
    ("plain text", "plain text"),
])
def test_inline_emphasis(src, want):
    assert render.inline(src) == want
