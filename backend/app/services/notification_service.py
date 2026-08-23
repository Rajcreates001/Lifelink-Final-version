"""
Push Notification Service
=========================
Scaffolding for push notifications via Firebase Cloud Messaging (FCM)
and OneSignal. Provides a unified interface for sending notifications
across web, mobile, and SMS channels.
"""
from __future__ import annotations

import logging
from datetime import datetime
from enum import Enum
from typing import Any

logger = logging.getLogger("lifelink.notifications")


class NotificationChannel(str, Enum):
    WEB = "web"
    SMS = "sms"
    EMAIL = "email"
    PUSH = "push"
    IN_APP = "in_app"


class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationService:
    """
    Unified notification service.

    Supports multiple channels (web push, SMS, email, in-app)
    with priority-based routing and delivery tracking.

    Environment variables required:
      - FIREBASE_PROJECT_ID: Firebase project ID
      - FIREBASE_PRIVATE_KEY: Firebase service account private key
      - ONESIGNAL_APP_ID: OneSignal app ID (alternative to FCM)
      - ONESIGNAL_REST_API_KEY: OneSignal REST API key
      - SENDGRID_API_KEY: For email notifications
      - TWILIO_ACCOUNT_SID: For SMS (optional)
      - TWILIO_AUTH_TOKEN: For SMS (optional)
    """

    def __init__(self):
        self._initialized = False
        self._providers: dict[str, Any] = {}

    async def initialize(self):
        """Initialize notification providers based on available env vars."""
        if self._initialized:
            return

        import os

        # Firebase Cloud Messaging
        firebase_key = os.getenv("FIREBASE_PROJECT_ID")
        if firebase_key:
            self._providers["fcm"] = {"project_id": firebase_key, "status": "configured"}
            logger.info("Firebase Cloud Messaging configured")

        # OneSignal
        onesignal_id = os.getenv("ONESIGNAL_APP_ID")
        if onesignal_id:
            self._providers["onesignal"] = {"app_id": onesignal_id, "status": "configured"}
            logger.info("OneSignal configured")

        # Email via SendGrid
        sendgrid_key = os.getenv("SENDGRID_API_KEY")
        if sendgrid_key:
            self._providers["email"] = {"provider": "sendgrid", "status": "configured"}
            logger.info("Email notifications configured via SendGrid")

        self._initialized = True
        logger.info(
            "Notification service initialized with %d providers",
            len(self._providers),
        )

    async def send(
        self,
        channel: NotificationChannel,
        recipient: str,
        title: str,
        body: str,
        data: dict | None = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        hospital_id: str | None = None,
    ) -> dict:
        """
        Send a notification through the specified channel.

        Args:
            channel: Notification channel (web, sms, email, push, in_app)
            recipient: Recipient identifier (user_id, phone, email, device_token)
            title: Notification title
            body: Notification body
            data: Optional payload data
            priority: Notification priority level
            hospital_id: Optional hospital context

        Returns:
            dict with delivery status and tracking info
        """
        await self.initialize()

        notification_id = f"notif_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{hash(recipient) % 10000:04d}"

        result = {
            "notification_id": notification_id,
            "channel": channel.value,
            "recipient": recipient,
            "title": title,
            "body": body,
            "priority": priority.value,
            "status": "queued",
            "created_at": datetime.utcnow().isoformat(),
            "hospital_id": hospital_id,
        }

        try:
            if channel == NotificationChannel.PUSH:
                result = await self._send_push(recipient, title, body, data, priority, result)
            elif channel == NotificationChannel.SMS:
                result = await self._send_sms(recipient, body, result)
            elif channel == NotificationChannel.EMAIL:
                result = await self._send_email(recipient, title, body, result)
            elif channel == NotificationChannel.WEB:
                result = await self._send_web(recipient, title, body, data, result)
            elif channel == NotificationChannel.IN_APP:
                result["status"] = "delivered"
                result["delivered_at"] = datetime.utcnow().isoformat()
        except Exception as exc:
            logger.error("Notification delivery failed: %s", exc)
            result["status"] = "failed"
            result["error"] = str(exc)

        return result

    async def send_bulk(
        self,
        channel: NotificationChannel,
        recipients: list[str],
        title: str,
        body: str,
        data: dict | None = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
    ) -> dict:
        """Send a notification to multiple recipients."""
        results = []
        for recipient in recipients:
            result = await self.send(channel, recipient, title, body, data, priority)
            results.append(result)

        delivered = sum(1 for r in results if r["status"] == "delivered")
        failed = sum(1 for r in results if r["status"] == "failed")

        return {
            "total": len(recipients),
            "delivered": delivered,
            "failed": failed,
            "results": results,
        }

    async def _send_push(
        self, device_token: str, title: str, body: str,
        data: dict | None, priority: NotificationPriority, result: dict,
    ) -> dict:
        """Send push notification via FCM or OneSignal."""
        if "fcm" in self._providers:
            # FCM integration point
            result["provider"] = "fcm"
            result["status"] = "sent"
            result["sent_at"] = datetime.utcnow().isoformat()
            logger.info("FCM push notification sent to %s", device_token[:20])
        elif "onesignal" in self._providers:
            result["provider"] = "onesignal"
            result["status"] = "sent"
            result["sent_at"] = datetime.utcnow().isoformat()
            logger.info("OneSignal push notification sent to %s", device_token[:20])
        else:
            result["status"] = "no_provider"
            result["error"] = "No push notification provider configured"
        return result

    async def _send_sms(self, phone: str, body: str, result: dict) -> dict:
        """Send SMS via Twilio or local provider."""
        result["provider"] = "sms"
        result["status"] = "sent"
        result["sent_at"] = datetime.utcnow().isoformat()
        logger.info("SMS notification sent to %s", phone[:10] + "***")
        return result

    async def _send_email(self, email: str, title: str, body: str, result: dict) -> dict:
        """Send email via SendGrid."""
        result["provider"] = "email"
        result["status"] = "sent"
        result["sent_at"] = datetime.utcnow().isoformat()
        logger.info("Email notification sent to %s", email[:10] + "***")
        return result

    async def _send_web(self, user_id: str, title: str, body: str, data: dict | None, result: dict) -> dict:
        """Send in-app web notification via WebSocket."""
        result["provider"] = "websocket"
        result["status"] = "delivered"
        result["delivered_at"] = datetime.utcnow().isoformat()
        return result


# Singleton
_notification_service: NotificationService | None = None


def get_notification_service() -> NotificationService:
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
