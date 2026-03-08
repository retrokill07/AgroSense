// src/services/firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// This is sourced from the .env file
const firebaseConfig = {
  apiKey: "",
  authDomain: "smart-farming-e0a57.firebaseapp.com",
  projectId: "smart-farming-e0a57",
  storageBucket: "smart-farming-e0a57.firebasestorage.app",
  messagingSenderId: "1027764915797",
  appId: "1:1027764915797:web:ae44df898b533ca23a4edc",
  measurementId: "G-BGB20QFEGH"
};

// Check if the Firebase config keys are provided
if (!firebaseConfig.apiKey) {
  throw new Error(
    'VITE_FIREBASE_API_KEY is not set. Please go to the Secrets panel in AI Studio and add your Firebase project credentials. You can find instructions in the README.md file.'
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// A helper function to listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
