"""
Extract all v1 and v2 route endpoints and produce a side-by-side overlap comparison.
Also reads main.py to map router names to URL prefixes.
"""
import re
import os
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent.parent.parent

# -- V1 route files -----------------------------------
V1_FILES = [
    "admin.py", "ai.py", "alerts.py", "ambulance.py", "auth.py",
    "dashboard.py", "donors.py", "family.py", "government_ops.py",
    "health.py", "hospital_communication.py", "hospital_ml.py",
    "hospital_ops.py", "requests.py",
]
V1_DIR = BASE / "backend" / "app" / "routes"

# -- V2 route files -----------------------------------
V2_FILES = [
    "agents.py", "ai_platform.py", "ambulance.py", "analytics.py",
    "auth.py", "gateway.py", "government.py", "government_command.py",
    "hospital.py", "integrations.py", "ml.py", "modules.py",
    "notifications.py", "public.py", "rag.py", "realtime.py",
    "routing.py", "search.py", "simulation.py", "system.py", "users.py",
]
V2_DIR = BASE / "backend" / "app" / "routes" / "v2"


def extract_routes(filepath: Path):
    """Extract (method, path) tuples from a route file using regex."""
    try:
        text = filepath.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"  [SKIP] {filepath} not found")
        return []

    routes = []
    # Match @router.get/patch/post/put/delete("path")
    pattern = re.compile(
        r'@router\.(get|post|put|patch|delete)\s*\(\s*[\"\']([^\"\']+)[\"\']'
    )
    for m in pattern.finditer(text):
        method = m.group(1).upper()
        path = m.group(2)
        routes.append((method, path))
    return routes


def prefix_from_mainpy() -> dict[str, str]:
    """Parse main.py to get router -> prefix mapping."""
    mainpy = BASE / "backend" / "app" / "main.py"
    text = mainpy.read_text(encoding="utf-8")

    # Find lines like: app.include_router(hospital_ops_router, prefix="/api/hospital-ops")
    prefix_pat = re.compile(
        r'include_router\((\w+_router)\s*(?:,\s*prefix\s*=\s*[\"\']([^\"\']+)[\"\'])?'
    )
    mapping = {}
    for m in prefix_pat.finditer(text):
        router_var = m.group(1)
        prefix = m.group(2) or ""
        mapping[router_var] = prefix
    return mapping


# -- 1. Build prefix map ------------------------------
prefix_map = prefix_from_mainpy()
print(f"Prefix map from main.py ({len(prefix_map)} routers):")
for rv, p in sorted(prefix_map.items()):
    print(f"  {rv:50s} -> {p}")

print(f"\n{'='*120}")

# -- 2. Extract V1 routes ----------------------------
v1_all: list[tuple[str, str, str, str]] = []  # (file, prefix, method, path)
for fname in V1_FILES:
    fp = V1_DIR / fname
    routes = extract_routes(fp)
    # Guess the router variable name
    router_var = fname.replace(".py", "") + "_router"
    prefix = prefix_map.get(router_var, "")
    for method, path in routes:
        full = prefix + path
        v1_all.append((fname, prefix, method, full))

print(f"\nV1 ROUTES ({len(v1_all)}):")
for f, p, m, full in sorted(v1_all, key=lambda x: (x[3], x[2])):
    print(f"  {m:7s} {full:55s}  [{f}]")

print(f"\n{'='*120}")

# -- 3. Extract V2 routes ----------------------------
v2_all: list[tuple[str, str, str, str]] = []
for fname in V2_FILES:
    fp = V2_DIR / fname
    routes = extract_routes(fp)
    special = {
        "auth.py": "auth_v2_router",
        "users.py": "users_v2_router",
        "hospital.py": "hospital_v2_router",
        "ambulance.py": "ambulance_v2_router",
        "government.py": "government_v2_router",
        "government_command.py": "government_command_v2_router",
        "agents.py": "agents_v2_router",
        "notifications.py": "notifications_v2_router",
        "integrations.py": "integrations_v2_router",
        "ml.py": "ml_v2_router",
        "rag.py": "rag_v2_router",
        "routing.py": "routing_v2_router",
        "public.py": "public_v2_router",
    }
    router_var = special.get(fname, fname.replace(".py", "") + "_v2_router")
    prefix = prefix_map.get(router_var, "")
    for method, path in routes:
        full = prefix + path
        v2_all.append((fname, prefix, method, full))

print(f"\nV2 ROUTES ({len(v2_all)}):")
for f, p, m, full in sorted(v2_all, key=lambda x: (x[3], x[2])):
    print(f"  {m:7s} {full:55s}  [{f}]")

print(f"\n{'='*120}")

# -- 4. Overlap analysis ------------------------------
def normalize(full_path: str) -> str:
    p = full_path.rstrip("/")
    if not p.startswith("/"):
        p = "/" + p
    return p

# Build (method, normalized_path) -> list of (version, file)
all_routes: dict[tuple[str, str], list[str]] = {}
for f, p, m, full in v1_all:
    key = (m, normalize(full))
    all_routes.setdefault(key, []).append(f"v1:{f}")
for f, p, m, full in v2_all:
    key = (m, normalize(full))
    all_routes.setdefault(key, []).append(f"v2:{f}")

overlaps = {k: v for k, v in all_routes.items() if len(v) > 1}
v1_only = {k: v for k, v in all_routes.items() if len(v) == 1 and v[0].startswith("v1")}
v2_only = {k: v for k, v in all_routes.items() if len(v) == 1 and v[0].startswith("v2")}

print(f"\n{'='*120}")
print(f"OVERLAP ANALYSIS")
print(f"{'='*120}")
print(f"\nTotal unique (method, path) pairs: {len(all_routes)}")
print(f"  V1-only: {len(v1_only)}")
print(f"  V2-only: {len(v2_only)}")
print(f"  Overlapping (both v1 & v2): {len(overlaps)}")

if overlaps:
    print(f"\n{'='*120}")
    print("EXACT OVERLAPS (same HTTP method + same path)")
    print(f"{'='*120}")
    for (method, path), sources in sorted(overlaps.items()):
        v1_src = ", ".join(s for s in sources if s.startswith("v1"))
        v2_src = ", ".join(s for s in sources if s.startswith("v2"))
        print(f"  {method:7s} {path:55s}  <- {v1_src}  |  {v2_src}")

# Semantic overlap: same path, different methods
print(f"\n{'='*120}")
print("SEMANTIC OVERLAP (same path, different HTTP methods)")
print(f"{'='*120}")
by_path: dict[str, dict[str, list[str]]] = {}
for (method, path), sources in all_routes.items():
    by_path.setdefault(path, {})
    for s in sources:
        by_path[path].setdefault(method, []).append(s)

found_semantic = False
for path, methods in sorted(by_path.items()):
    v1_methods = {m for m, srcs in methods.items() for s in srcs if s.startswith("v1")}
    v2_methods = {m for m, srcs in methods.items() for s in srcs if s.startswith("v2")}
    if v1_methods and v2_methods and v1_methods != v2_methods:
        print(f"  {path:55s}  V1: {sorted(v1_methods)}  /  V2: {sorted(v2_methods)}")
        found_semantic = True
if not found_semantic:
    print("  (none)")

# -- 5. Summary ---------------------------------------
print(f"\n{'='*120}")
print("V1 ROUTER PREFIX MAPPING")
print(f"{'='*120}")
for fname in sorted(V1_FILES):
    count = sum(1 for f, _, _, _ in v1_all if f == fname)
    router_var = fname.replace(".py", "") + "_router"
    prefix = prefix_map.get(router_var, "(not found)")
    print(f"  {fname:40s} -> {prefix:30s} ({count} routes)")

print(f"\n{'='*120}")
print("V2 ROUTER PREFIX MAPPING")
print(f"{'='*120}")
for fname in sorted(V2_FILES):
    special = {
        "auth.py": "auth_v2_router",
        "users.py": "users_v2_router",
        "hospital.py": "hospital_v2_router",
        "ambulance.py": "ambulance_v2_router",
        "government.py": "government_v2_router",
        "government_command.py": "government_command_v2_router",
        "agents.py": "agents_v2_router",
        "notifications.py": "notifications_v2_router",
        "integrations.py": "integrations_v2_router",
        "ml.py": "ml_v2_router",
        "rag.py": "rag_v2_router",
        "routing.py": "routing_v2_router",
        "public.py": "public_v2_router",
    }
    router_var = special.get(fname, fname.replace(".py", "") + "_v2_router")
    prefix = prefix_map.get(router_var, "(not found)")
    count = sum(1 for f, _, _, _ in v2_all if f == fname)
    print(f"  {fname:40s} -> {prefix:30s} ({count} routes)")
