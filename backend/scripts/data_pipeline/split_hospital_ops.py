"""
Split hospital_ops.py (4,003 lines) into domain-specific modules.

Produces:
  - hospital_ops_shared.py   (imports, models, helpers, seed logic)
  - hospital_ops_opd.py      (OPD appointments, doctors, consultations, queue)
  - hospital_ops_icu.py      (ICU patients, alerts, vitals, risk)
  - hospital_ops_radiology.py (Radiology requests, reports)
  - hospital_ops_ot.py       (OT surgeries, allocations)
  - hospital_ops_ceo.py      (CEO dashboard, benchmarks, resources, bed forecast)
  - hospital_ops_staff.py    (Staff CRUD, skills, optimizer)
  - hospital_ops_emergency.py (Emergency feed, ambulances, dispatch, intake)
  - hospital_ops_beds.py     (Bed allocation)
  - hospital_ops_finance.py  (Finance invoices, claims, expenses, revenue)
  - hospital_ops_reports.py  (Reports generate, download, summary)
  - hospital_ops_equipment.py (Equipment CRUD)
  - hospital_ops.py          (Aggregator that includes all sub-routers)
"""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SRC = ROOT / "app" / "routes" / "hospital_ops.py"
OUT_DIR = ROOT / "app" / "routes"
print(f"ROOT: {ROOT}")
print(f"SRC: {SRC}")


def line_range(lines, start, end):
    """Extract lines from start (1-based) to end (1-based, inclusive)."""
    return ''.join(lines[start-1:end])


def write_module(filename, content, description=""):
    path = OUT_DIR / filename
    header = f'"""LifeLink — {description}\nAutomatically extracted from hospital_ops.py.\n"""\n\n'
    with open(path, 'w', encoding='utf-8') as f:
        f.write(header + content)
    print(f"  Created {filename} ({len(content.splitlines())} lines)")


def main():
    with open(SRC, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f"Source: {SRC} ({len(lines)} lines)")
    print()

    # === Domain line ranges (1-based) ===

    sections = [
        # (filename, description, start_line, end_line)
        # Line ranges determined from @router decorator positions in hospital_ops.py

        # SHARED: imports (L1-48), models (L49-L312), helpers (L314-L540),
        #  async helpers (L541-L1555), preload endpoint (L1555-L1565),
        #  finance summary helper (L1566-L1660)
        ("hospital_ops_shared.py", "Shared models, helpers, and seed logic",
         1, 1560),

        # OPD APPOINTMENTS (L1661-L1817)
        ("hospital_ops_opd.py", "OPD appointments, doctors, consultations, queue",
         1661, 2064),

        # ICU (L2065-L2220)
        ("hospital_ops_icu.py", "ICU patients, alerts, vitals, risk",
         2065, 2220),

        # RADIOLOGY (L2221-L2314)
        ("hospital_ops_radiology.py", "Radiology requests and reports",
         2221, 2314),

        # OT (L2315-L2438)
        ("hospital_ops_ot.py", "Operating theatre surgeries and allocations",
         2315, 2438),

        # CEO (L2439-L3011)
        ("hospital_ops_ceo.py", "CEO dashboard, benchmarks, resources, bed forecast",
         2439, 3011),

        # STAFF (L3012-L3139)
        ("hospital_ops_staff.py", "Staff management, skills, optimizer",
         3012, 3139),

        # EMERGENCY (L3140-L3331) - feed, ambulances, dispatch, intake
        ("hospital_ops_emergency.py", "Emergency feed, ambulances, dispatch, intake",
         3140, 3331),

        # BEDS (L3332-L3395)
        ("hospital_ops_beds.py", "Bed allocation endpoints",
         3332, 3395),

        # FINANCE (L3396-L3674) - invoices, claims, expenses, revenue, payer delays
        ("hospital_ops_finance.py", "Finance invoices, claims, expenses, revenue, payer delays",
         3396, 3674),

        # REPORTS (L3675-L3820)
        ("hospital_ops_reports.py", "Reports generate, download, summary, ingest",
         3675, 3820),

        # EQUIPMENT (L3949-L4003)
        ("hospital_ops_equipment.py", "Equipment inventory CRUD",
         3949, 4003),
    ]

    # Create each module
    for filename, description, start, end in sections:
        content = line_range(lines, start, end)
        write_module(filename, content, description)

    print()
    print("Done! 12 module files created.")
    print(f"Original file size: {len(lines)} lines")


if __name__ == "__main__":
    main()
