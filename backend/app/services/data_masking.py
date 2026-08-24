"""
Data Masking & Redaction Service
=================================
Provides automatic PII masking in API responses and audit-safe logging.

Sensitive fields are partially masked before being sent to clients:
  - Phone: +91****543210
  - Email: j***@example.com
  - Address: 123****t St
  - Name: J**n D**
"""
from __future__ import annotations

import re
from typing import Any

# Fields that should be masked in API responses
MASKABLE_FIELDS = {
    "phone", "email", "address", "patient_id", "ssn", "insurance_id",
    "medical_history", "diagnosis", "medications", "allergies",
}

# Fields that should be completely removed from responses
REDACTED_FIELDS = {"password", "password_hash", "jwt_secret", "api_key", "token"}


def mask_phone(value: str) -> str:
    """Mask phone number: +91****543210"""
    if not value or len(value) < 6:
        return value
    visible = value[-6:]
    masked_len = len(value) - 6
    return value[:4] + "*" * masked_len + visible


def mask_email(value: str) -> str:
    """Mask email: j***@example.com"""
    if not value or "@" not in value:
        return value
    local, domain = value.rsplit("@", 1)
    if len(local) <= 1:
        return value
    return local[0] + "***@" + domain


def mask_name(value: str) -> str:
    """Mask name: J**n D**"""
    if not value:
        return value
    parts = value.split()
    masked_parts = []
    for part in parts:
        if len(part) <= 1:
            masked_parts.append(part)
        else:
            masked_parts.append(part[0] + "*" * (len(part) - 1))
    return " ".join(masked_parts)


def mask_address(value: str) -> str:
    """Mask address: 123****t St"""
    if not value or len(value) < 6:
        return value
    visible_start = value[:3]
    visible_end = value[-3:]
    masked_len = len(value) - 6
    return visible_start + "*" * masked_len + visible_end


def mask_general(value: str, visible_chars: int = 4) -> str:
    """Generic masking: show first N and last N chars."""
    if not value or len(value) <= visible_chars * 2:
        return value
    return value[:visible_chars] + "*" * (len(value) - visible_chars * 2) + value[-visible_chars:]


MASK_FUNCTIONS = {
    "phone": mask_phone,
    "email": mask_email,
    "name": mask_name,
    "address": mask_address,
    "patient_id": lambda v: mask_general(v, 4),
    "ssn": lambda v: mask_general(v, 2),
    "insurance_id": lambda v: mask_general(v, 4),
    "medical_history": lambda v: "[REDACTED]" if v else v,
    "diagnosis": lambda v: "[REDACTED]" if v else v,
    "medications": lambda v: "[REDACTED]" if v else v,
    "allergies": lambda v: "[REDACTED]" if v else v,
}


def mask_field(field_name: str, value: Any) -> Any:
    """Mask a single field value based on its name."""
    if value is None or not isinstance(value, str):
        return value
    mask_fn = MASK_FUNCTIONS.get(field_name)
    if mask_fn:
        return mask_fn(value)
    return value


def mask_dict(data: dict, fields: set[str] | None = None) -> dict:
    """
    Mask sensitive fields in a dictionary.

    Args:
        data: Dictionary to mask
        fields: Optional set of field names to mask (defaults to MASKABLE_FIELDS)

    Returns:
        New dictionary with masked fields
    """
    if not data:
        return data

    target_fields = fields or MASKABLE_FIELDS
    result = {}

    for key, value in data.items():
        if key in REDACTED_FIELDS:
            continue  # Remove entirely
        if key in target_fields:
            result[key] = mask_field(key, value)
        elif isinstance(value, dict):
            result[key] = mask_dict(value, target_fields)
        elif isinstance(value, list):
            result[key] = [
                mask_dict(item, target_fields) if isinstance(item, dict)
                else mask_field(key, item) if key in target_fields else item
                for item in value
            ]
        else:
            result[key] = value

    return result


def mask_list(data: list, fields: set[str] | None = None) -> list:
    """Mask sensitive fields in a list of dictionaries."""
    if not data:
        return data
    return [mask_dict(item, fields) if isinstance(item, dict) else item for item in data]


def sanitize_for_log(data: Any) -> Any:
    """
    Sanitize data for safe logging — removes PII entirely.
    Used in audit logs and error messages.
    """
    if isinstance(data, dict):
        return {
            k: "[REDACTED]" if k in MASKABLE_FIELDS or k in REDACTED_FIELDS
            else sanitize_for_log(v)
            for k, v in data.items()
        }
    elif isinstance(data, list):
        return [sanitize_for_log(item) for item in data]
    elif isinstance(data, str):
        # Check if it looks like PII
        if re.match(r'^[\+]?[\d\-\(\)\s]{7,15}$', data):
            return "[PHONE]"
        if re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', data):
            return "[EMAIL]"
        return data
    return data
