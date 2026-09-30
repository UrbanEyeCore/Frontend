// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const cleanEnv = (val, fallback) => {
  if (!val) return fallback;
  const cleaned = val.replace(/['"]/g, "").trim();
  return cleaned === "" ? fallback : cleaned;
};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY, "AIzaSyDCPWmq7fYUrtC7SdBLJ4WlEy-EEmNHEuw"),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "urbaneye-a40b0.firebaseapp.com"),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, "urbaneye-a40b0"),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "urbaneye-a40b0.firebasestorage.app"),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "295906520445"),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID, "1:295906520445:web:46c34f1b1ee7bf9f1db014")
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export default app;