"use strict";

// ---
// RMO Job-Flow - api.js (v2.0 - Blueprint Realized)
// Description: The dedicated API layer. This is the ONLY module that
// communicates directly with Firebase services (Firestore, Auth, Storage).
// ---

// 1. IMPORT FIREBASE SERVICES & SDK FUNCTIONS
import { db, auth, storage } from './firebase-config.js';

// Firestore Functions
import {
    doc,
    getDoc,
    collection,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy as firestoreOrderBy,
    where as firestoreWhere
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Storage Functions
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Auth Functions
import {
    updateProfile,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ==========================================================================
// USER MANAGEMENT API
// ==========================================================================

/**
 * Creates a user document in Firestore after signup.
 * @param {string} userId The UID of the new user.
 * @param {object} userData The user profile data to save.
 * @returns {Promise<void>}
 */
export async function createUserDocument(userId, userData) {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, userData);
}

/**
 * Updates a user document in the 'users' collection in Firestore.
 * @param {string} userId The UID of the user to update.
 * @param {object} data The data to update.
 * @returns {Promise<void>}
 */
export async function updateUserDocument(userId, data) {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
}

// ==========================================================================
// GENERIC FIRESTORE CRUD API
// ==========================================================================

/**
 * Sets up a realtime listener for a Firestore document or collection.
 * @param {string} path The path to the document or collection.
 * @param {function} callback The function to call with the data snapshot.
 * @param {object} [options] Optional query constraints (e.g., orderBy).
 * @returns {import("firebase/firestore").Unsubscribe} The unsubscribe function.
 */
export function setupRealtimeListener(path, callback, options = {}) {
    let q;
    // Check if the path points to a collection or a document
    if (path.split('/').length % 2 !== 0) { // Odd number of segments = collection
        const collectionRef = collection(db, path);
        const constraints = [];
        if (options.orderBy) {
            constraints.push(firestoreOrderBy(...options.orderBy));
        }
        if (options.where) {
             constraints.push(firestoreWhere(...options.where));
        }
        q = query(collectionRef, ...constraints);
    } else { // Even number of segments = document
        q = doc(db, path);
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.docs) { // It's a collection
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(docs);
        } else if (snapshot.exists?.()) { // It's a document that exists
            callback({ id: snapshot.id, ...snapshot.data() });
        } else { // It's a document that doesn't exist or initial state
            callback(null);
        }
    }, (error) => {
        console.error(`Error listening to ${path}:`, error);
    });

    return unsubscribe;
}

/**
 * Fetches a single document from Firestore.
 * @param {string} path The full path to the document (e.g., 'users/userId').
 * @returns {Promise<object|null>} The document data or null if not found.
 */
export async function getDocument(path) {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

/**
 * Adds a new document to a Firestore collection.
 * @param {string} path The path to the collection.
 * @param {object} data The data for the new document.
 * @returns {Promise<string>} The ID of the newly created document.
 */
export async function addDocument(path, data) {
    const collectionRef = collection(db, path);
    const docRef = await addDoc(collectionRef, data);
    return docRef.id;
}

/**
 * Updates an existing document in Firestore.
 * @param {string} path The full path to the document to update.
 * @param {object} data The fields to update.
 * @returns {Promise<void>}
 */
export async function updateDocument(path, data) {
    const docRef = doc(db, path);
    await updateDoc(docRef, data);
}

/**
 * Deletes a document from Firestore.
 * @param {string} path The full path to the document to delete.
 * @returns {Promise<void>}
 */
export async function deleteDocument(path) {
    const docRef = doc(db, path);
    await deleteDoc(docRef);
}

// ==========================================================================
// FIREBASE AUTHENTICATION PROFILE API
// ==========================================================================

/**
 * Updates the profile of the currently signed-in user in Firebase Auth.
 * @param {object} profileData Data to update (e.g., { displayName, photoURL }).
 * @returns {Promise<void>}
 */
export async function updateAuthProfile(profileData) {
    if (!auth.currentUser) throw new Error("No user is currently signed in.");
    await updateProfile(auth.currentUser, profileData);
}

/**
 * Updates the password of the currently signed-in user.
 * This is a sensitive operation and may require recent sign-in.
 * @param {string} newPassword The new password.
 * @returns {Promise<void>}
 */
export async function updateUserPassword(newPassword) {
    if (!auth.currentUser) throw new Error("No user is currently signed in.");
    await updatePassword(auth.currentUser, newPassword);
}


// ==========================================================================
// CLOUD STORAGE API
// ==========================================================================

/**
 * Uploads a file to Cloud Storage and returns its download URL.
 * @param {string} path The full path in storage where the file should be saved (e.g., 'users/uid/profileImage.jpg').
 * @param {File} file The file object to upload.
 * @param {function} [onProgress] Optional callback to track upload progress (receives a number 0-100).
 * @returns {Promise<string>} The public download URL of the uploaded file.
 */
// --- In api.js ---

export function uploadFile(path, file, onProgress) {
    // --- DEBUGGING START ---
    console.log(`--- API: uploadFile called ---`);
    console.log(`Storage Path: ${path}`);
    console.log("File Object:", file);
    // --- DEBUGGING END ---

    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                // --- DEBUGGING START ---
                console.log(`Upload is ${progress.toFixed(2)}% done`);
                // --- DEBUGGING END ---
                if (onProgress) {
                    onProgress(progress);
                }
            },
            (error) => {
                // This console.error is already here, but it's the most important one!
                console.error("Firebase Storage Error:", error);
                // --- DEBUGGING START ---
                // You can inspect the error object for more details
                switch (error.code) {
                    case 'storage/unauthorized':
                        console.error("Error Detail: User does not have permission to access the object. CHECK FIREBASE RULES.");
                        break;
                    case 'storage/canceled':
                        console.error("Error Detail: User canceled the upload.");
                        break;
                    case 'storage/unknown':
                        console.error("Error Detail: Unknown error occurred, inspect the server response.");
                        break;
                }
                // --- DEBUGGING END ---
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    // --- DEBUGGING START ---
                    console.log("File uploaded successfully! Download URL:", downloadURL);
                    // --- DEBUGGING END ---
                    resolve(downloadURL);
                } catch (error) => {
                    console.error("API Error: Failed to get download URL:", error);
                    reject(error);
                }
            }
        );
    });
}

/**
 * Deletes a file from Cloud Storage.
 * @param {string} path The full path in storage of the file to delete.
 * @returns {Promise<void>}
 */
export async function deleteFile(path) {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
}