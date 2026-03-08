# AgroSense — Detailed Project Overview

AgroSense is an end-to-end smart farming prototype that connects an ESP32-based field controller to a React + Vite dashboard using Firebase (Cloud Firestore and Authentication). It provides real-time sensor telemetry, historical charts, manual and automated motor (water pump) control, and a Hindi voice assistant (Llama 3.3 via OpenRouter) tuned for rural farming commands.

This README is written for both non-technical users (what the app does and how to use it) and technical readers (architecture, data model, deployment, and hardware details).

## Non-technical summary

- Purpose: Monitor soil/environment sensors remotely, start/stop irrigation, and use voice commands in Hindi to control the system.
- Primary users: Small-scale farmers, field technicians, or hobbyists who want a simple dashboard and voice interface to operate a water pump and view sensor history.
- How it behaves: The dashboard shows current sensor values, a toggle for the water pump, and historical charts. Toggling the pump or speaking a voice command updates a shared Firestore document; the ESP32 listens for those changes and physically turns the pump on or off.
- Safety note: The project is intended as a prototype. Do not rely on it for critical irrigation safety without adding hardware safeguards (float switches, current sensing, fail-safe timers).

## High-level architecture

- Frontend: React + Vite + TypeScript (folder: `src/`) — SPA dashboard with components in `src/components/`, pages in `src/pages/`, and app entry points `main.tsx` and `App.tsx`.
- Backend-as-a-service: Firebase Authentication (Email/Password) + Cloud Firestore for real-time state and historical sensor storage.
- Hardware: ESP32 (Arduino) sketch `smartfirebase/smartfirebase.ino` that authenticates (or uses REST API keys) and subscribes to Firestore documents, controlling GPIO pins for relays and reading sensors.
- Voice assistant: Llama 3.3 via OpenRouter (server-side calls from the frontend service `src/services/voiceCommand.ts`) to parse Hindi commands and map them to Firestore updates.

## Folder / file overview

- `index.html` — Vite entry HTML.
- `src/main.tsx` — Application bootstrap and router.
- `src/App.tsx` — Top-level app, routing, and providers (auth, theme).
- `src/index.ts` — Exports and helpers.
- `src/components/` — Reusable UI pieces:
    - `SensorCard.tsx` — shows a sensor's current value and quick actions.
    - `MotorControlCard.tsx` — pump toggle and status.
    - `HistoryChart.tsx` — renders historical series for a sensor.
    - `Automation.tsx` — simple automation rules UI.
    - `VoiceAssistant.tsx` — microphone UI and visual feedback for voice commands.
    - `ProtectedRoute.tsx` — route guard for authenticated pages.
- `src/pages/Dashboard.tsx` — main dashboard view.
- `src/pages/Login.tsx` — email/password auth screen.
- `src/services/firebase.ts` — Firebase initialization, helper functions (read/write, listeners).
- `src/services/voiceCommand.ts` — voice transcription + Llama3.3 prompt/response orchestration.
- `src/hooks/useAuth.ts` — auth hook (login, logout, currentUser).
- `smartfirebase/smartfirebase.ino` — ESP32 sketch that reads sensors, writes telemetry, and listens to control docs.
- `HARDWARE_README.md` — hardware wiring and upload instructions (if present).

## Core runtime flows (detailed)

1) User authentication
    - The frontend uses Firebase Authentication (Email/Password). On successful login the client receives a Firebase ID token.
    - `useAuth` exposes the user and token for other services.

2) Motor control (UI -> Firestore -> ESP32)
    - User toggles pump in `MotorControlCard` or issues a voice command.
    - Frontend writes to a control document, for example collection `control`, doc `motor`:
        {
            "on": true,
            "source": "dashboard",        // or "esp32" or "voice"
            "requestedAt": 1670000000000, // epoch ms
            "expiresAt": 1670000300000     // optional auto-off
        }
    - The ESP32 has a listener (long-poll / REST / Websockets depending on implementation) and reacts within a second or two to set the relay GPIO.
    - Conversely, a physical button on the ESP32 updates the same document which causes the UI toggle to update via a snapshot listener.

3) Sensor telemetry (ESP32 -> Firestore -> Dashboard)
    - The ESP32 periodically measures sensors (soil moisture, temperature, humidity, etc.) and writes a datapoint either to a per-sensor subcollection or a rolling `latest` document.
    - Suggested Firestore schema for readings:
        - `sensors/{sensorId}/readings/{readingId}` --> { value, unit, ts }
        - `sensors/{sensorId}/latest` --> { value, unit, ts }
    - The frontend subscribes to `latest` docs for real-time card updates and queries `readings` for charting.

4) Voice assistant flow
    - The `VoiceAssistant` component records audio (browser WebAudio / MediaRecorder) and sends it to a speech-to-text service (either browser-native or a cloud STT if better accuracy required).
    - The transcribed text (Hindi) is sent to `src/services/voiceCommand.ts` which formats a prompt for Llama 3.3 (via OpenRouter). The assistant is tuned to recognize farming intents such as "pump on/off", "water for 10 minutes", or "show soil history".
    - Llama returns a structured instruction (intent + parameters). The frontend maps that intent to Firestore updates (e.g., set `control/motor` or navigate to a dashboard view).
    - Example mapping: "pump chalu karo 5 minute" -> set `control/motor` { on: true, requestedAt: now, expiresAt: now + 5m, source: 'voice' }

## Firestore data model (example)

- control/motor (single document)
    - on: boolean
    - requestedAt: timestamp
    - expiresAt: timestamp (optional)
    - source: 'dashboard'|'esp32'|'voice'

- sensors/{sensorId}/latest
    - value: number
    - unit: string
    - ts: timestamp

- sensors/{sensorId}/readings/{autoId}
    - value: number
    - ts: timestamp

## Security and rules (recommended)

- During development you may use test mode, but for production add rules:
    - Allow authenticated reads for `sensors/*/latest` and reads on `sensors/*/readings` (limit rate or pagination for large datasets).
    - Allow writes to `control/motor` only by authorized users (e.g., set by UID in custom claims or restrict write to specific UIDs).
    - Use Firestore security rules to reject overly frequent writes (rate-limit via function or rules pattern) and to validate typed fields.

Example rule snippet (concept):
    match /control/motor {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.resource.data.keys().hasAll(['on','requestedAt']);
    }

For hardware that cannot authenticate with full Firebase auth, use a limited server endpoint (Cloud Function) or restrict ESP32 write access via a time-limited service token.

## Environment variables (.env with Vite)

Create a `.env` file in project root with Vite-compatible variable names (VITE_ prefix). Example:

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_OPENROUTER_API_KEY=your_openrouter_key

Notes:
- Use `.env.local` or platform secrets for production.
- Do not commit API keys to public repos.

## Local development (run and build)

1. Install dependencies:
     - npm install
2. Create `.env` with the VITE_ variables above.
3. Start dev server:
     - npm run dev
4. Build for production:
     - npm run build

The dev server runs on Vite's default port (3000 or 5173). Once running, log in with an Email/Password account set up in Firebase Auth.

## Hardware: ESP32 details

- The Arduino sketch `smartfirebase/smartfirebase.ino` contains:
    - WiFi connection logic (WIFI_SSID, WIFI_PASSWORD)
    - Firestore listen/write code (HTTP REST or Firebase Embedded SDK)
    - GPIO pin definitions for relay and button
    - Sensor read loop and telemetry publish
    - Debounce and failsafe logic for the physical button

- Recommended behavior for reliability:
    - Implement an explicit heartbeat document (e.g., `status/{deviceId}` with lastSeen timestamp) so the dashboard can detect offline devices.
    - Use `expiresAt` on motor commands to auto-turn-off after a safe interval.
    - Add local watchdog timers and hardware-level fuses for the pump relay.

## Troubleshooting

- Dashboard shows stale values: confirm network connectivity on ESP32 and check `status/{deviceId}` lastSeen.
- Motor doesn't switch: verify relay wiring, and look at the Firestore `control/motor` document history to confirm the ESP32 received the change.
- Voice not recognized: test microphone access, use a smaller sample rate, or send STT to a managed cloud STT if browser STT accuracy is poor for rural Hindi.

## Extending the system

- Add rule engine (Cloud Functions) to move automation rules off the client.
- Add per-user device ownership and multi-tenant support.
- Add signed URLs or secure endpoints for limited IoT credentials for devices that cannot otherwise run full Firebase auth.

## Contribution and development notes

- Code style: TypeScript with React and functional components. Keep `src/components` reusable and small.
- Tests: Add unit tests for utility functions and lightweight integration tests for `services/` that mock Firebase.
- When opening PRs, describe the change, test steps, and any env vars required.

## License

This repository includes a `LICENSE` file. Keep hardware and safety disclaimers in mind when deploying to real irrigation systems.

---
If you want, I can also:
- Add a short Quick Start with concrete sample `.env` values (sanitized).
- Create a `README_HARDWARE.md` from `smartfirebase.ino` wiring comments.
- Add Firestore security rule examples and a sample Cloud Function to mint short-lived IoT tokens.

Files changed: `README.md` (this file) — replaced with an expanded technical + non-technical explanation.



