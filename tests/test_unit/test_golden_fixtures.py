"""Golden-response fixtures as executable contract tests.

`tests/parity/golden_responses/*.json` documents the response shape of key
endpoints (captured from the live API). This suite makes them *executable*:
every fixture must be valid JSON, non-empty, structurally coherent (no
placeholder values like "TODO"/"..." /null payloads), and every file name
must follow the `<endpoint>_<status>.json` convention so new captures stay
reviewable.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

GOLDEN_DIR = Path(__file__).resolve().parents[1] / "parity" / "golden_responses"

# `.meta.json` files hold capture metadata (user ids, emails), not responses.
FIXTURES = sorted(GOLDEN_DIR.glob("*.json")) if GOLDEN_DIR.exists() else []
FIXTURES = [p for p in FIXTURES if not p.name.endswith(".meta.json")]

PLACEHOLDER_MARKERS = {"todo", "tbd", "...", "fixme", "placeholder", "changeme"}


def pytest_generate_tests(metafunc):
    if "golden_path" in metafunc.fixturenames:
        if not FIXTURES:
            metafunc.parametrize("golden_path", [None])
        else:
            metafunc.parametrize("golden_path", FIXTURES, ids=[p.name for p in FIXTURES])


@pytest.fixture
def golden_body(golden_path):
    if golden_path is None:
        pytest.skip("no golden fixtures present")
    raw = golden_path.read_bytes().decode("utf-8-sig")  # tolerate BOM
    return json.loads(raw)


def test_fixture_filename_convention(golden_path):
    if golden_path is None:
        pytest.skip("no golden fixtures present")
    stem = golden_path.stem
    assert "_" in stem, f"{golden_path.name}: must be <endpoint>_<status>.json"
    status = stem.rsplit("_", 1)[-1]
    assert status.isdigit(), f"{golden_path.name}: must end with the HTTP status code"


def test_fixture_is_a_non_empty_object(golden_body):
    assert isinstance(golden_body, dict), "golden responses must be JSON objects"
    assert golden_body, "golden responses must not be empty"


def _walk_strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for key, value in node.items():
            yield key
            yield from _walk_strings(value)
    elif isinstance(node, list):
        for item in node:
            yield from _walk_strings(item)


def test_fixture_has_no_placeholder_values(golden_body):
    strings = [s.strip().lower() for s in _walk_strings(golden_body)]
    offenders = [s for s in strings if s in PLACEHOLDER_MARKERS]
    assert not offenders, f"placeholder value(s) found: {offenders}"


def test_fixture_top_level_shape(golden_body):
    """Every captured response is either a success envelope (has message/data
    or domain content) or an error envelope (has detail/error)."""
    keys = set(golden_body.keys())
    has_content = bool(keys & {"message", "data", "token", "access_token", "user", "alert_id"})
    has_domain = len(keys) > 1  # domain-specific fields
    has_error = bool(keys & {"detail", "error", "message"})
    assert has_content or has_domain or has_error, (
        f"unrecognized response shape with keys: {sorted(keys)}"
    )
