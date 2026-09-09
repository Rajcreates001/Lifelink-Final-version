"""Live-server security tests: RBAC, authentication, audit-chain integrity.

These tests run against a running LifeLink backend (LIFELINK_BASE_URL,
default http://localhost:3001). They self-provision real users through the
signup API and use server-issued tokens — never locally minted JWTs — so
they exercise the exact authentication path production uses.
"""
from __future__ import annotations

import os
import time
import uuid

import requests

from tests.utils.logger import log_test
from tests.utils.result_writer import save_result


BASE_URL = os.getenv("LIFELINK_BASE_URL", "http://localhost:3001")
RESULT_FILE = "security_results.json"


def _signup_and_login(role: str, sub_role: str | None = None, verified: bool = False) -> str:
    """Create a fresh user via the API and return a real access token.

    `verified=True` promotes a hospital/ambulance user through the government
    verify endpoint so tokens for verification-gated roles can be minted.
    """
    suffix = uuid.uuid4().hex[:10]
    email = f"sec_{role}_{suffix}@lifelink.test"
    signup_payload = {
        "name": f"Sec Test {role}",
        "email": email,
        "password": "SecTest#2026!",
        "role": role,
        "subRole": sub_role,
    }
    signup = requests.post(f"{BASE_URL}/v2/auth/signup", json=signup_payload, timeout=15)
    assert signup.status_code == 201, f"signup failed: {signup.status_code} {signup.text[:200]}"

    if verified and role in ("hospital", "ambulance"):
        # Hospital signup returns no token (pending verification). Approve the
        # signup through the government verification workflow, then log in.
        gov_token = _signup_and_login("government", sub_role="district_admin")
        pending = requests.get(
            f"{BASE_URL}/v2/government/verification/pending",
            headers={"Authorization": f"Bearer {gov_token}"},
            timeout=10,
        ).json()
        entry = next(
            (r for r in pending.get("data", []) if r.get("entity_type") == role and r.get("status", "pending") == "pending"),
            None,
        )
        if not entry:
            raise AssertionError(f"No pending {role} verification request found")
        approve = requests.post(
            f"{BASE_URL}/v2/government/verification/{entry['id']}/approve",
            headers={"Authorization": f"Bearer {gov_token}"},
            timeout=10,
        )
        assert approve.status_code == 200, f"verify failed: {approve.status_code} {approve.text[:200]}"

    login = requests.post(
        f"{BASE_URL}/v2/auth/login",
        json={"email": email, "password": "SecTest#2026!", "role": role},
        timeout=15,
    )
    assert login.status_code == 200, f"login failed: {login.status_code} {login.text[:200]}"
    return login.json()["token"]


def test_access_control():
    endpoint = f"{BASE_URL}/v2/system/federated/aggregate"
    public_token = _signup_and_login("public")
    gov_token = _signup_and_login("government", sub_role="district_admin")

    public_resp = requests.post(endpoint, json={"limit": 2}, headers={"Authorization": f"Bearer {public_token}"}, timeout=10)
    gov_resp = requests.post(endpoint, json={"limit": 2}, headers={"Authorization": f"Bearer {gov_token}"}, timeout=10)

    public_denied = public_resp.status_code in (401, 403)
    gov_granted = gov_resp.status_code in (200, 202)

    status = "PASS" if public_denied and gov_granted else "FAIL"
    record = log_test(
        "rbac",
        status,
        details="Public denied, government granted",
        input_data={"public_status": public_resp.status_code, "gov_status": gov_resp.status_code},
        output_data={"public_body": public_resp.text[:200], "gov_body": gov_resp.text[:200]},
    )
    record.update({"public_access": "denied" if public_denied else "granted", "gov_access": "granted" if gov_granted else "denied"})
    save_result(RESULT_FILE, record)
    assert status == "PASS"


def test_authentication():
    endpoint = f"{BASE_URL}/v2/system/predictions/latest?type=federated_local"

    no_token = requests.get(endpoint, timeout=10)
    invalid_token = requests.get(endpoint, headers={"Authorization": "Bearer invalid"}, timeout=10)

    valid_token = _signup_and_login("government", sub_role="district_admin")
    valid_resp = requests.get(endpoint, headers={"Authorization": f"Bearer {valid_token}"}, timeout=10)

    status = "PASS"
    if no_token.status_code not in (401, 403):
        status = "FAIL"
    if invalid_token.status_code not in (401, 403):
        status = "FAIL"
    if valid_resp.status_code in (401, 403):
        status = "FAIL"

    record = log_test(
        "authentication",
        status,
        details="Token validation behavior",
        input_data={"no_token": no_token.status_code, "invalid": invalid_token.status_code, "valid": valid_resp.status_code},
        output_data={"valid_body": valid_resp.text[:300]},
    )
    save_result(RESULT_FILE, record)
    assert status == "PASS"
