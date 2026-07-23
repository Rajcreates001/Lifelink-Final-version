# 📡 Real-time Communications & Telemedicine

> **Priority:** 🔴 P0 — Critical
> **Purpose:** Enterprise WebSocket infrastructure, push notifications, and video/audio telemedicine.

---

## 1. Ably

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/ably/ably-python` |
| **JS SDK** | `https://github.com/ably/ably-js` |
| **Docs** | `https://ably.com/docs` |
| **Type** | Real-time Pub/Sub Infrastructure |
| **Free Tier** | 6M messages/month |
| **HIPAA** | ✅ BAA available (Enterprise plan) |
| **Effort** | ⏱ 2 hours |

### What It Adds
- **Global WebSocket infrastructure** — replaces the basic in-memory `ConnectionManager`
- **Guaranteed message ordering** — critical for emergency alerts
- **Exactly-once delivery** — no lost SOS messages
- **Presence detection** — know which users/ambulances are online
- **Channel history** — replay missed messages when reconnecting
- **Auto-scaling** — handles 1 → 1M concurrent connections without code changes
- **Fallback to SSE/MQTT** — if WebSocket fails, automatically downgrades

### How to Integrate

```bash
pip install ably
```

```python
# backend/app/services/realtime/manager.py (replacement)
from ably import AblyRest

class AblyConnectionManager:
    def __init__(self):
        self.client = AblyRest(settings.ABLY_API_KEY)

    async def broadcast(self, channel: str, message: dict):
        channel_obj = self.client.channels.get(f"lifelink:{channel}")
        await channel_obj.publish("update", message)
```

```jsx
// client/src/hooks/useWebSocket.js (replacement)
import * as Ably from 'ably';
const ably = new Ably.Realtime(import.meta.env.VITE_ABLY_API_KEY);
const channel = ably.channels.get(`lifelink:${channel}`);
channel.subscribe('update', (msg) => onMessage?.(msg.data));
```

### Why Replace Current Implementation
The current `ConnectionManager` is:
- **Single-server** — breaks in multi-process/multi-server deployment
- **No guaranteed delivery** — if a message is sent while client disconnects, it's lost
- **No presence** — can't tell if an ambulance crew is connected
- **No history** — reconnecting clients miss updates
- **No fallback** — breaks if WebSocket connection fails

---

### 🔄 Alternative: PubNub

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/pubnub/python` |
| **Docs** | `https://www.pubnub.com/docs` |
| **Type** | Real-time Pub/Sub |
| **HIPAA** | ✅ BAA available — specifically designed for digital health |

**Choose PubNub if:** You need a healthcare-specific compliance package with BAA signing out of the box.
**Choose Ably if:** You need higher performance (sub-50ms latency) and global presence.

---

## 2. LiveKit

| Detail | Value |
|--------|-------|
| **Repo (Server)** | `https://github.com/livekit/livekit` |
| **React SDK** | `https://github.com/livekit/components-js` |
| **Python SDK** | `https://github.com/livekit/python-sdks` |
| **Docs** | `https://docs.livekit.io` |
| **Type** | WebRTC Video/Audio Conferencing |
| **Free Tier** | 50 GB bandwidth/month |
| **HIPAA** | ✅ Self-hostable for full compliance |
| **Effort** | ⏱ 8 hours |

### What It Adds
- **Doctor-patient video consultations** — full telemedicine capability
- **AI agent integration** — AI scribe listens, transcribes, summarizes consultations
- **Screen sharing** — share X-rays, lab results during consultation
- **Recording** — HIPAA-compliant session recording for medical records
- **Self-hostable** — deploy on your own infrastructure for full data control

### How to Integrate

```bash
npm install @livekit/components-react livekit-client
```

```jsx
import { LiveKitRoom, VideoConference } from '@livekit/components-react';

function TelemedicineRoom({ roomName, token }) {
  return (
    <LiveKitRoom serverUrl={LIVEKIT_URL} token={token}>
      <VideoConference />
    </LiveKitRoom>
  );
}
```

### 🔄 Alternative: Daily.co

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/daily-co/daily-js` |
| **Prebuilt UI** | Drop-in video rooms with minimal code |

**Choose Daily.co if:** You want the fastest time-to-market with prebuilt UI components.
**Choose LiveKit if:** You need self-hosting capability and AI agent integration.

---

## 3. Firebase Cloud Messaging (FCM)

| Detail | Value |
|--------|-------|
| **Python Admin SDK** | `https://github.com/firebase/firebase-admin-python` |
| **Web SDK** | `https://firebase.google.com/docs/cloud-messaging` |
| **Type** | Push Notifications |
| **Free Tier** | Unlimited (no cost) |
| **Effort** | ⏱ 2 hours |

### What It Adds
- **Push notifications** — SOS alerts arrive even when the app is closed
- **Topic-based subscriptions** — subscribe users to "emergency_alerts", "hospital_updates"
- **Conditional targeting** — send to Android/iOS/Web selectively
- **FCM HTTP v1 API** — latest protocol with enhanced reliability

### How to Integrate

```python
import firebase_admin
from firebase_admin import credentials, messaging

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

# Send emergency alert
message = messaging.Message(
    notification=messaging.Notification(
        title="🚨 Emergency Alert",
        body="Critical patient in Sector 5. Nearest hospital: City Hospital",
    ),
    topic="emergency_alerts",
)
messaging.send(message)
```

---

## 4. OneSignal

| Detail | Value |
|--------|-------|
| **Python SDK** | `https://github.com/OneSignal/onesignal-python` |
| **Docs** | `https://documentation.onesignal.com` |
| **Type** | Cross-platform Push Notifications + Email + SMS |
| **Free Tier** | 10K subscribers |
| **Effort** | ⏱ 3 hours |

### What It Adds
- **Push + Email + SMS in one API** — multi-channel notification delivery
- **Segmentation** — send to users by role (hospital staff, ambulance, public)
- **Delivery analytics** — see open rates, delivery rates per notification
- **Transactional delivery** — bypasses quiet hours for emergency alerts
- **Automated fallback** — if push fails, send SMS automatically

### 🔄 Alternative: Knock

| Detail | Value |
|--------|-------|
| **Repo** | `https://github.com/knocklabs/knock-python` |
| **Docs** | `https://docs.knock.app` |

**Choose Knock if:** You need notification workflow orchestration (e.g., "Send push → If no response in 30s → Send SMS → If still no response → Make phone call"). Knock excels at multi-step escalation chains for emergencies.

---

## 📦 Installation Commands Summary

```bash
# Python backend
pip install ably  # or pubnub
pip install firebase-admin  # for FCM
pip install onesignal-sdk  # for OneSignal

# JavaScript frontend
npm install @ably-livekit/react @livekit/components-react livekit-client
npm install firebase  # for FCM Web SDK

# Infrastructure (Docker)
services:
  livekit-server:  # livekit/livekit-server
  redis:           # redis:7 (for LiveKit)
```
