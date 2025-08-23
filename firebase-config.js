"use strict";

// --- 0. FIREBASE SDK IMPORTS ---
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// --- 1. FIREBASE CONFIGURATION ---
// Your web app's Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyCcFl5MKsINFC5E7JUSfhLsz4OSizMPzI0",
    authDomain: "rmo-job-workflow.firebaseapp.com",
    projectId: "rmo-job-workflow",
    storageBucket: "rmo-job-workflow.appspot.com",
    messagingSenderId: "828963453460",
    appId: "1:828963453460:web:e9df5cb3bb5ebdf0694501"
};

// --- 2. INITIALIZE FIREBASE & EXPORT SERVICES ---
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services and export them for use in other modules
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
