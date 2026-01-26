import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Replace with your actual Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCV2LFS1PrQB_7d29IveR0nIeup1_LT_-Y",
    authDomain: "console-9f291.firebaseapp.com",
    projectId: "console-9f291",
    storageBucket: "console-9f291.firebasestorage.app",
    messagingSenderId: "634205139387",
    appId: "1:634205139387:web:d570163690a2a4c0fa549e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
