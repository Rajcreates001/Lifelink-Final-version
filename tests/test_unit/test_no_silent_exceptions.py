"""Ratchet: silent exception swallowing must not grow.

Counts ``except Exception:`` blocks (no exception binding) across backend/app.
A silent swallow hides failures and makes incidents undebuggable. Fixing one?
Lower the baseline in tests/bare_except_baseline.txt. Adding new ones? The
test fails — narrow the exception type or at least log it.
"""
from __future__ import annotations

import re
from pathlib import Path

BACKEND_APP = Path(__file__).resolve().parents[2] / "backend" / "app"
BASELINE_FILE = Path(__file__).resolve().parents[1] / "bare_except_baseline.txt"

# `except Exception:` with no binding and no logging — the silent swallow.
BARE_EXCEPT = re.compile(r"except Exception:\s*$")


def count_bare_excepts() -> int:
    count = 0
    for py in BACKEND_APP.rglob("*.py"):
        if "__pycache__" in py.parts:
            continue
        for line in py.read_text(encoding="utf-8", errors="ignore").splitlines():
            if BARE_EXCEPT.search(line):
                count += 1
    return count


def test_silent_exception_count_does_not_grow():
    baseline = int(BASELINE_FILE.read_text().strip())
    current = count_bare_excepts()
    assert current <= baseline, (
        f"Silent `except Exception:` count grew: {current} > baseline {baseline}. "
        f"Narrow the exception type or log it, then lower "
        f"tests/bare_except_baseline.txt to {current}."
    )


def test_baseline_matches_reality_when_improving():
    """Informational companion: surfaces cleanup opportunities in the output."""
    baseline = int(BASELINE_FILE.read_text().strip())
    current = count_bare_excepts()
    if current < baseline:
        print(
            f"\n✔ Cleanup opportunity: {baseline - current} silent exception "
            f"swallows were fixed — lower tests/bare_except_baseline.txt to {current}."
        )
