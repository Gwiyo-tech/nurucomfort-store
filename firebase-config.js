// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC18uMStI4LJXWcjS2EJWGkzMC9gyPTaU0",
  authDomain: "nurucomfort-store.firebaseapp.com",
  projectId: "nurucomfort-store",
  storageBucket: "nurucomfort-store.firebasestorage.app",
  messagingSenderId: "177073380235",
  appId: "1:177073380235:web:7102c99ad76fd0beffad8e",
  measurementId: "G-GK10B0T60R",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
