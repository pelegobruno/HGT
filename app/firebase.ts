import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBDnzoUoWsMomCKcE8kJHPC43ULtTRvugY",
  authDomain: "hgt-family.firebaseapp.com",
  projectId: "hgt-family",
  storageBucket: "hgt-family.firebasestorage.app",
  messagingSenderId: "477404989909",
  appId: "1:477404989909:web:7c21de2b5160a6e114555c"
};

// Evita o erro de "App já existe" no Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);

export { app, auth, db };