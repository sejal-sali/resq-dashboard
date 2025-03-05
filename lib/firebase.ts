// Import the necessary Firebase modules
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";  // ✅ Add Firebase Authentication
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDISSJuf4S5mojD33giq_f9q289Drnh8gg",
  authDomain: "resq-38f65.firebaseapp.com",
  projectId: "resq-38f65",
  storageBucket: "resq-38f65.appspot.com",  // ✅ Fix storage bucket URL
  messagingSenderId: "87749260710",
  appId: "1:87749260710:web:90acbbfe35ab2a14280b67",
  measurementId: "G-CV0L0RL673"
};

// Initialize Firebase (Prevent Multiple Initializations)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);  // ✅ Export Firebase Authentication
const db = getFirestore(app); // ✅ Firestore

export { auth, db };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const analytics = getAnalytics(app);
