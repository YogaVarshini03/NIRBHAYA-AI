# 🛡️ NIRBHAYA AI — Proactive Women's Safety Ecosystem *(Prototype)*

> **Predict Risk. Prevent Danger. Protect Lives.**  
> *A Proactive Personal Safety & Emergency Response Ecosystem (Hackathon Prototype / Research Preview)*

---

## 📌 Overview

**NIRBHAYA AI** is an intelligent, multi-modal women's safety ecosystem designed to shift personal safety from reactive panic buttons to proactive risk mitigation and automated emergency response orchestration.

### Core Capabilities
- **AI Risk Intelligence Engine**: Continuous telemetry-driven hazard scoring evaluating location risk, time factors, crowd density, ambient lighting, and historical safety metrics.
- **Safe Corridor Routing**: Multi-criteria routing engine balancing transit speed against verified environmental safety corridors, surveillance nodes, and active sanctuaries.
- **Multi-Modal Silent SOS**: Hold-to-activate button with false-alarm prevention countdown, hardware shake gestures, and voice trigger detection.
- **Automated Telecommunications**: Outbound emergency voice calls via Twilio Voice API and instant SMS dispatch.
- **Zero-Login Live GPS Tracking**: Shareable, lightweight public tracking links (`/track/trk_<incidentId>`) providing real-time Leaflet maps, GPS accuracy radius, and emergency contact actions.
- **Responder Command Center**: Full emergency dispatch queue, live telemetry intercept streaming, turn-by-turn routing, and tamper-evident digital evidence logging.

---

## ⚙️ Environment Configuration

Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```

### Environment Variable Reference *(Variable Names Only)*

| Variable Category | Environment Variable Name | Purpose / Description |
| :--- | :--- | :--- |
| **Application Mode** | `APP_MODE` | Set to `production` or `demo` |
| **Network & Ports** | `PORT` | Backend server port (Default: `5000`) |
| **Frontend Base URLs** | `APP_BASE_URL` | Base public frontend URL for live tracking links |
| | `VITE_APP_BASE_URL` | Vite public app link base URL |
| | `VITE_API_BASE_URL` | Backend REST API endpoint URL |
| | `VITE_WEBSOCKET_URL` | Real-time WebSocket telemetry stream endpoint |
| | `VITE_GOOGLE_MAPS_API_KEY` | Optional Google Maps API key (Leaflet OSM used by default) |
| **Security & Auth** | `DATABASE_URL` | Optional remote database connection string (SQLite used by default) |
| | `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens (min 32 chars) |
| **Twilio Integration** | `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| | `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| | `TWILIO_FROM_NUMBER` | Assigned Twilio trial / active outbound phone number |
| | `TWILIO_VOICE_TWIML_URL` | Hosted TwiML Bin URL for voice synthesis |
| | `DEMO_POLICE_NUMBER` | Target phone number for emergency dispatch testing |
| **Email Service** | `EMAIL_API_KEY` | API key for transactional email provider (Resend / SendGrid) |
| | `EMAIL_FROM_ADDRESS` | Outbound sender email address |
| | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional SMTP configuration |

---

## ⚠️ Twilio Trial Limitations & Guidance

When testing emergency notifications with a **Twilio Free Trial Account**, please note the following platform-level constraints:

1. **Voice Calls**:
   - Outbound voice calls can **only** be placed to phone numbers that have been verified in the [Twilio Console Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified).
   - Calls **must** be initiated from your assigned trial number (`TWILIO_FROM_NUMBER`). Using an unassigned number will trigger error `573003`.
   - Custom voice messages are rendered via the TwiML Bin URL configured in `TWILIO_VOICE_TWIML_URL`.

2. **SMS Alerts**:
   - Twilio Free Trial accounts **cannot send SMS messages to Indian phone numbers (+91)** due to international trial geo-restrictions and carrier DLT compliance rules.
   - For complete SMS testing, upgrade to a paid Twilio account with India SMS capabilities, or use the integrated Email/Voice dispatch channels.

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: `npm`

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Duplicate the template and supply your local parameters
cp .env.example .env
```

### 3. Start the Backend Telemetry & API Server
```bash
npm run start
```
*Backend server runs on `http://localhost:5000` with WebSocket telemetry at `ws://localhost:5000/ws`.*

### 4. Start the Frontend Application
```bash
npm run dev
```
*Frontend application launches at `http://localhost:5173`.*

---

## 🧪 Testing the Emergency Workflow

1. **Safety Dashboard & Silent SOS**:
   - Open `http://localhost:5173` and click **Continue as Demo User**.
   - Navigate to `/sos` or `/dashboard` and hold the SOS button for 3 seconds.
   - A 10-second cancel countdown initiates with haptic vibration.
2. **Emergency Dispatch**:
   - When the countdown finishes, GPS coordinates are locked, nearest police stations are identified, and outbound alerts (Voice & Email) are dispatched.
3. **Public Live Tracking**:
   - Open `/track/trk_<incidentId>` on any mobile device or browser window to observe live GPS location streaming without requiring login credentials.
4. **Responder Action**:
   - Navigate to `/responder` to inspect incoming alerts, review digital evidence, calculate response corridors, and resolve active incidents.

---

## 🔒 Security & Privacy Notice

- This repository represents an educational **Prototype & Research Preview**.
- Never commit `.env` files or API secrets to version control.
- All real-time telemetry, evidence hashing, and contact verification workflows adhere to least-privilege principles.

---
*Developed for NIRBHAYA AI Safety Hackathon.*
