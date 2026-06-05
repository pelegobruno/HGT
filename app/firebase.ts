import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// Importamos os módulos de cache offline do Firestore
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Substitua os textos "COLE_AQUI..." pelas suas chaves verdadeiras do Firebase
const firebaseConfig = {
  apiKey: "COLE_AQUI_A_SUA_API_KEY",
  authDomain: "COLE_AQUI_O_SEU_AUTH_DOMAIN",
  projectId: "COLE_AQUI_O_SEU_PROJECT_ID",
  storageBucket: "COLE_AQUI_O_SEU_STORAGE_BUCKET",
  messagingSenderId: "COLE_AQUI_O_SEU_MESSAGING_SENDER_ID",
  appId: "COLE_AQUI_O_SEU_APP_ID"
};

// Evita recriar o app no Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);

// A MÁGICA ACONTECE AQUI: Cria um banco de dados local no celular que sincroniza quando a internet volta
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export { app, auth, db };