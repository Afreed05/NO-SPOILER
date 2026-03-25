import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgkB7OZehHGFnVssMLiHde9-p2WV8QICg",
  authDomain: "no-spoilers-ccdba.firebaseapp.com",
  projectId: "no-spoilers-ccdba",
  storageBucket: "no-spoilers-ccdba.firebasestorage.app",
  messagingSenderId: "486370329080",
  appId: "1:486370329080:web:737d0e8a59d2abbd6d160d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);