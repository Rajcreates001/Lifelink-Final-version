"""
Replace require_roles("government") with require_scopes("...") on all
government_command.py routes, assigning each route an appropriate scope.
"""
import re

FILE = "backend/app/routes/v2/government_command.py"

with open(FILE, "r") as f:
    content = f.read()

# Map each route's function name to its required scope
SCOPE_MAP: dict[str, str] = {
    # --- gov:admin (admin-only operations) ---
    "seed_command_center": "gov:admin",

    # --- dashboard:read (read-only dashboard views) ---
    "command_overview": "dashboard:read",
    "monitoring_summary": "dashboard:read",
    "monitoring_feed": "dashboard:read",

    # --- gov:read (read government data) ---
    "recent_disasters": "gov:read",

    # --- resources:read (view hospital/ambulance resources) ---
    "list_hospitals": "resources:read",
    "list_ambulances": "resources:read",

    # --- gov:write (many operational actions) ---
    "decision_engine": "gov:write",
    "submit_verification": "gov:write",
    "pending_verification": "gov:write",
    "approve_verification": "gov:write",
    "reject_verification": "gov:write",
    "start_simulation": "gov:write",
    "run_simulation": "gov:write",
    "simulation_step": "gov:write",
    "simulation_multi_phase": "gov:write",
    "stop_simulation": "gov:write",
    "after_action_report": "gov:write",
    "precompute_metrics": "gov:write",

    # --- emergency:trigger (disaster operations) ---
    "detect_disaster": "emergency:trigger",
    "trigger_disaster": "emergency:trigger",
    "broadcast_disaster": "emergency:trigger",

    # --- ai:ask (AI assistant) ---
    "eva_assistant": "ai:ask",

    # --- analytics:read (predictions and analytics) ---
    "anomaly_prediction": "analytics:read",

    # --- policy:write (policy actions) ---
    "list_policy_actions": "policy:write",
    "create_policy_action": "policy:write",
    "update_policy_action": "policy:write",
}

count = 0
for func_name, scope in SCOPE_MAP.items():
    # Pattern: ctx: AuthContext = Depends(require_roles("government")),
    old = (
        f'    ctx: AuthContext = Depends(require_roles("government")),\n'
        f')'
    )
    new = (
        f'    ctx: AuthContext = Depends(require_scopes("{scope}")),\n'
        f')'
    )

    # We need to match the context before the closing paren of the function signature
    # Find the function definition and its closing )
    func_pattern = re.compile(
        rf'(async def {re.escape(func_name)}\(.*?\n'
        rf'.*?ctx: AuthContext = Depends\(require_roles\("government"\)\),)\n\)',
        re.DOTALL
    )

    match = func_pattern.search(content)
    if match:
        old_text = match.group(1) + "\n)"
        new_text = match.group(1).replace(
            'ctx: AuthContext = Depends(require_roles("government"))',
            f'ctx: AuthContext = Depends(require_scopes("{scope}"))',
        ) + "\n)"
        content = content.replace(old_text, new_text, 1)
        count += 1
        print(f"  [OK] {func_name:35s} -> {scope}")
    else:
        print(f"  [--] {func_name:35s} NOT FOUND (may use different pattern)")

with open(FILE, "w") as f:
    f.write(content)

print(f"\nReplaced {count}/{len(SCOPE_MAP)} route dependencies")
