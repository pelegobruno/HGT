import { initializeApp } from "firebase/app";
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

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);