"""
Data Encryption Service
========================
Provides encryption/decryption for sensitive patient data at rest.
Uses Fernet symmetric encryption from the cryptography library.

Environment variables:
  - ENCRYPTION_KEY: Base64-encoded 32-byte key (generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)
"""
from __future__ import annotations

import base64
import hashlib
import logging
import os
from typing import Any

logger = logging.getLogger("lifelink.encryption")

# Lazy-loaded Fernet instance
_fernet = None
_enabled = False


def _get_fernet():
    """Get or initialize the Fernet encryption instance."""
    global _fernet, _enabled
    if _fernet is not None:
        return _fernet

    # Auto-load .env as fallback if key not in process environment
    key = os.getenv("ENCRYPTION_KEY", "")
    if not key:
        try:
            from dotenv import load_dotenv
            from pathlib import Path
            env_path = Path(__file__).resolve().parents[2] / ".env"
            if env_path.exists():
                load_dotenv(env_path)
                key = os.getenv("ENCRYPTION_KEY", "")
        except ImportError:
            pass
    if not key:
        logger.warning("ENCRYPTION_KEY not set — patient data will NOT be encrypted at rest")
        _enabled = False
        return None

    try:
        from cryptography.fernet import Fernet
        # Support both raw Fernet keys and base64-encoded keys
        if isinstance(key, str):
            key = key.encode()
        _fernet = Fernet(key)
        _enabled = True
        logger.info("Encryption service initialized successfully")
        return _fernet
    except ImportError:
        logger.warning("cryptography library not installed — encryption disabled")
        _enabled = False
        return None
    except Exception as exc:
        logger.error("Failed to initialize encryption: %s", exc)
        _enabled = False
        return None


def is_encryption_enabled() -> bool:
    """Check if encryption is available."""
    _get_fernet()
    return _enabled


def encrypt_field(value: str | None) -> str | None:
    """
    Encrypt a single field value.

    Args:
        value: Plain text string to encrypt

    Returns:
        Encrypted string (base64-encoded) or None if value is None
    """
    if value is None:
        return None

    fernet = _get_fernet()
    if fernet is None:
        return value  # Pass through if encryption not available

    try:
        encrypted = fernet.encrypt(value.encode("utf-8"))
        return encrypted.decode("utf-8")
    except Exception as exc:
        logger.error("Encryption failed: %s", exc)
        return value


def decrypt_field(value: str | None) -> str | None:
    """
    Decrypt a single field value.

    Args:
        value: Encrypted string to decrypt

    Returns:
        Decrypted plain text string or None if value is None
    """
    if value is None:
        return None

    fernet = _get_fernet()
    if fernet is None:
        return value  # Pass through if encryption not available

    try:
        decrypted = fernet.decrypt(value.encode("utf-8"))
        return decrypted.decode("utf-8")
    except Exception as exc:
        logger.error("Decryption failed: %s", exc)
        return value


def encrypt_dict(data: dict, fields: list[str]) -> dict:
    """
    Encrypt specific fields in a dictionary.

    Args:
        data: Dictionary to encrypt fields in
        fields: List of field names to encrypt

    Returns:
        New dictionary with encrypted fields
    """
    if not data or not fields:
        return data

    result = dict(data)
    for field in fields:
        if field in result and result[field] is not None:
            result[field] = encrypt_field(str(result[field]))

    return result


def decrypt_dict(data: dict, fields: list[str]) -> dict:
    """
    Decrypt specific fields in a dictionary.

    Args:
        data: Dictionary with encrypted fields
        fields: List of field names to decrypt

    Returns:
        New dictionary with decrypted fields
    """
    if not data or not fields:
        return data

    result = dict(data)
    for field in fields:
        if field in result and result[field] is not None:
            result[field] = decrypt_field(str(result[field]))

    return result


# Sensitive fields that should always be encrypted
SENSITIVE_PATIENT_FIELDS = [
    "name", "phone", "email", "address", "patient_id",
    "medical_history", "diagnosis", "medications", "allergies",
    "blood_group", "ssn", "insurance_id",
]


def encrypt_patient_data(patient: dict) -> dict:
    """Encrypt all sensitive fields in a patient record."""
    return encrypt_dict(patient, SENSITIVE_PATIENT_FIELDS)


def decrypt_patient_data(patient: dict) -> dict:
    """Decrypt all sensitive fields in a patient record."""
    return decrypt_dict(patient, SENSITIVE_PATIENT_FIELDS)


def hash_for_search(value: str) -> str:
    """
    Create a searchable hash of a sensitive field.
    Uses SHA-256 so the same value always produces the same hash,
    allowing exact-match searches without decrypting.
    """
    salt = os.getenv("SEARCH_HASH_SALT", "lifelink-default-salt")
    return hashlib.sha256(f"{salt}:{value}".encode()).hexdigest()
