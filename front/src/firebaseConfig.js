// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// 👇 ¡ESTAS DOS LÍNEAS FALTABAN! 👇
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// (El import de Analytics es opcional, puedes dejarlo o quitarlo)
import { getAnalytics } from "firebase/analytics"; 

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzKH2oJ1FIUeFGYz_s-lH1ortjH1B8m8Y",
  authDomain: "deposito-mendoza-98e71.firebaseapp.com",
  projectId: "deposito-mendoza-98e71",
  storageBucket: "deposito-mendoza-98e71.firebasestorage.app",
  messagingSenderId: "552745068133",
  appId: "1:552745068133:web:51e01c70f4d58dee6a088c",
  measurementId: "G-TG9YRGJXRX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);