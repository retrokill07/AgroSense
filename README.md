# AgroSense: Blynk to Firebase Migration Guide

This guide explains how to transition your smart farming project from Blynk to Firebase. By using Firebase, you get a direct connection between your ESP32 and this React dashboard, enabling real-time Hindi voice control and historical data tracking.

## 1. Firebase Console Setup
Follow these steps to prepare your Firebase project:

1.  **Create a Project:** Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project named "AgroSense" (or any name you prefer).
2.  **Enable Authentication:**
    *   In the left sidebar, click **Build > Authentication**.
    *   Click **Get Started**.
    *   Enable **Email/Password** as a sign-in provider.
3.  **Enable Firestore Database:**
    *   Click **Build > Firestore Database**.
    *   Click **Create database**.
    *   Choose a location near you.
    *   Start in **Test Mode** (this allows your ESP32 to connect without complex authentication initially).
4.  **Get Your Config:**
    *   Click the **Gear icon (Project Settings)** > **General**.
    *   Under "Your apps", click the **Web icon (</>)** to register a web app.
    *   Copy the `firebaseConfig` object. You will need these values for your `.env` file in VS Code.

## 2. Hardware Control (No Blynk Needed!)
**Can I still control the motor without Blynk?**
**YES.** In fact, it's better. 
- **How it works:** When you click the "Water Pump" toggle on the dashboard or use a voice command, the app updates a document in Firestore (`control/motor`).
- **The ESP32:** Your ESP32 code (provided in `HARDWARE_README.md`) constantly "listens" to this document. As soon as the value changes from `false` to `true`, the ESP32 triggers the physical relay.
- **Physical Button:** If you press the physical button on your ESP32, it updates the same Firestore document, which then updates the dashboard toggle automatically.

## 3. Connecting the ESP32
1.  Open the **`HARDWARE_README.md`** file in this project.
2.  Copy the provided Arduino code.
3.  Replace the `WIFI_SSID`, `WIFI_PASSWORD`, and `API_KEY` with your own.
4.  Upload to your ESP32 using the Arduino IDE.

## 4. Voice Assistant (Llama 3.3)
The app now uses **Llama 3.3 (via OpenRouter)** to understand your Hindi commands. It is specifically tuned to recognize rural Hindi farming terms and convert them into hardware actions.

---


