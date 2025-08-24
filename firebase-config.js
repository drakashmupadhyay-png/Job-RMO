"use strict";

// ---
// RMO Job-Flow - firebase-config.js (v2.0 - Blueprint Realized)
// Description: Central Firebase configuration and service initialization.
// All other modules will import Firebase services from this file.
// ---

// 1. Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 2. Your web app's Firebase configuration
// This object contains your unique project keys.
const firebaseConfig = {
    apiKey: "AIzaSyCcFl5MKsINFC5E7JUSfhLsz4OSizMPzI0",
    authDomain: "rmo-job-workflow.firebaseapp.com",
    projectId: "rmo-job-workflow",
    storageBucket: "rmo-job-workflow.appspot.com",
    messagingSenderId: "828963453460",
    appId: "1:828963453460:web:e9df5cb3bb5ebdf0694501"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 4. Initialize and export Firebase services for use throughout the application
// By exporting from this central file, we ensure a single, consistent instance
// of each service is used everywhere.

/**
 * Firebase Authentication service.
 * @type {import("firebase/auth").Auth}
 */
export const auth = getAuth(app);

/**
 * Cloud Firestore database service.
 * @type {import("firebase/firestore").Firestore}
 */
export const db = getFirestore(app);

/**
 * Cloud Storage service.
 * @type {import("firebase/storage").FirebaseStorage}
 */
export const storage = getStorage(app);