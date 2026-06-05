import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDnzoUoWsMomCKcE8kJHPC43ULtTRvugY",
  authDomain: "hgt-family.firebaseapp.com",
  projectId: "hgt-family",
  storageBucket: "hgt-family.firebasestorage.app",
  messagingSenderId: "477404989909",
  appId: "1:477404989909:web:7c21de2b5160a6e114555c"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Ativa a memória offline segura do banco de dados
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export { app, auth, db };