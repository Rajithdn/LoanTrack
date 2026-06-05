import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDK6PP3uRu6zB6DNPIe4vhM2zS0cd__D1c",
  authDomain: "loantrackerapp-49abf.firebaseapp.com",
  projectId: "loantrackerapp-49abf",
  storageBucket: "loantrackerapp-49abf.firebasestorage.app",
  messagingSenderId: "341766430854",
  appId: "1:341766430854:web:ced3dc2456c03b73297107",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Secondary app for admin to create users without signing out
const secondaryApp = getApps().find((app) => app.name === "Secondary") 
  || initializeApp(firebaseConfig, "Secondary");

export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const db = getFirestore(app);
