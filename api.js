"use strict";

// --- 0. IMPORTS ---
// Import initialized Firebase services from our config file
import { db, storage } from './firebase-config.js';
// Import specific functions we need from the Firebase SDK
import { 
    updateProfile,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    addDoc, 
    deleteDoc, 
    updateDoc, 
    collection,
    writeBatch,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// --- 1. JOB APPLICATION API ---

/**
 * Saves a job application to Firestore. Updates if an ID is provided, otherwise creates a new one.
 * @param {string} userId - The UID of the current user.
 * @param {object} jobData - The job data object to save.
 * @param {string|null} jobId - The ID of the job to update, or null to create.
 * @returns {Promise<void>}
 */
export async function saveJob(userId, jobData, jobId) {
    if (jobId) {
        const jobRef = doc(db, `users/${userId}/jobs`, jobId);
        await updateDoc(jobRef, jobData);
    } else {
        jobData.createdAt = Timestamp.now();
        const collectionRef = collection(db, `users/${userId}/jobs`);
        await addDoc(collectionRef, jobData);
    }
}

/**
 * Deletes a single job application from Firestore.
 * @param {string} userId - The UID of the current user.
 * @param {string} jobId - The ID of the job to delete.
 * @returns {Promise<void>}
 */
export async function deleteJob(userId, jobId) {
    if (!userId || !jobId) throw new Error("User ID and Job ID are required for deletion.");
    const jobRef = doc(db, `users/${userId}/jobs`, jobId);
    await deleteDoc(jobRef);
}

/**
 * Deletes multiple job applications in a single batch operation.
 * @param {string} userId - The UID of the current user.
 * @param {Set<string>} jobIds - A Set containing the IDs of the jobs to delete.
 * @returns {Promise<void>}
 */
export async function deleteMultipleJobs(userId, jobIds) {
    const batch = writeBatch(db);
    jobIds.forEach(id => {
        const docRef = doc(db, `users/${userId}/jobs`, id);
        batch.delete(docRef);
    });
    await batch.commit();
}

// --- 2. EXPERIENCE BOOK API ---

/**
 * Saves an experience entry to Firestore. Updates if an ID is provided, otherwise creates a new one.
 * @param {string} userId - The UID of the current user.
 * @param {object} expData - The experience data object to save.
 * @param {string|null} experienceId - The ID of the experience to update, or null to create.
 * @returns {Promise<void>}
 */
export async function saveExperience(userId, expData, experienceId) {
    if (experienceId) {
        const expRef = doc(db, `users/${userId}/experiences`, experienceId);
        await updateDoc(expRef, expData);
    } else {
        expData.createdAt = Timestamp.now();
        expData.isFavorite = false;
        const collectionRef = collection(db, `users/${userId}/experiences`);
        await addDoc(collectionRef, expData);
    }
}

/**
 * Deletes a single experience entry from Firestore.
 * @param {string} userId - The UID of the current user.
 * @param {string} experienceId - The ID of the experience to delete.
 * @returns {Promise<void>}
 */
export async function deleteExperience(userId, experienceId) {
    if (!userId || !experienceId) throw new Error("User ID and Experience ID are required for deletion.");
    const expRef = doc(db, `users/${userId}/experiences`, experienceId);
    await deleteDoc(expRef);
}

/**
 * Toggles the 'isFavorite' status of an experience.
 * @param {string} userId - The UID of the current user.
 * @param {string} experienceId - The ID of the experience to toggle.
 * @param {boolean} currentFavoriteStatus - The current favorite status of the experience.
 * @returns {Promise<void>}
 */
export async function toggleExperienceFavorite(userId, experienceId, currentFavoriteStatus) {
    const expRef = doc(db, `users/${userId}/experiences`, experienceId);
    await updateDoc(expRef, { isFavorite: !currentFavoriteStatus });
}

// --- 3. USER PROFILE & SETTINGS API ---

/**
 * Updates the user's full name in both Firebase Auth and Firestore.
 * @param {object} user - The current Firebase Auth user object.
 * @param {string} fullName - The new full name.
 * @returns {Promise<void>}
 */
export async function updateUserProfileName(user, fullName) {
    const nameParts = fullName.split(' ') || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Update the profile in Firebase Authentication (for display name)
    await updateProfile(user, { displayName: fullName });
    
    // Update the profile in Firestore document (for structured data)
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { 
        fullName: fullName,
        firstName: firstName,
        lastName: lastName,
        initials: `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()
    });
}

/**
 * Updates the current user's password in Firebase Authentication.
 * @param {object} user - The current Firebase Auth user object.
 * @param {string} newPassword - The new password.
 * @returns {Promise<void>}
 */
export async function updateUserPassword(user, newPassword) {
    await updatePassword(user, newPassword);
}

/**
 * Uploads a profile image to Cloud Storage and updates the user's photoURL.
 * @param {object} user - The current Firebase Auth user object.
 * @param {File} file - The image file to upload.
 * @param {function} onProgress - A callback function to report upload progress.
 * @returns {Promise<void>}
 */
export function uploadProfileImage(user, file, onProgress) {
    const storageRef = ref(storage, `users/${user.uid}/profileImage`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(progress);
            }, 
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
            }, 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                // Update Auth and Firestore with the new URL
                await updateProfile(user, { photoURL: downloadURL });
                const userDocRef = doc(db, "users", user.uid);
                await updateDoc(userDocRef, { photoURL: downloadURL });
                resolve(downloadURL);
            }
        );
    });
}

// --- 4. DOCUMENT MANAGEMENT API ---

/**
 * Uploads a master document to Cloud Storage and creates a metadata record in Firestore.
 * @param {string} userId - The UID of the current user.
 * @param {File} file - The document file to upload.
 * @returns {Promise<void>}
 */
export function uploadMasterDocument(userId, file) {
    const storageRef = ref(storage, `users/${userId}/documents/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
            null, 
            (error) => {
                console.error("Document upload failed:", error);
                reject(error);
            }, 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const docData = {
                    name: file.name,
                    url: downloadURL,
                    uploadedAt: Timestamp.now()
                };
                // Add document metadata to Firestore
                await addDoc(collection(db, `users/${userId}/documents`), docData);
                resolve();
            }
        );
    });
}

/**
 * Deletes a master document from Cloud Storage and its metadata from Firestore.
 * @param {string} userId - The UID of the current user.
 * @param {object} docToDelete - The document object from the cache, containing id and url.
 * @returns {Promise<void>}
 */
export async function deleteMasterDocument(userId, docToDelete) {
    if (!docToDelete || !docToDelete.url || !docToDelete.id) {
        throw new Error("Invalid document data provided for deletion.");
    }
    // Create a reference from the full download URL
    const fileRef = ref(storage, docToDelete.url);
    // Delete the file from Cloud Storage
    await deleteObject(fileRef);

    // Delete the metadata record from Firestore
    await deleteDoc(doc(db, `users/${userId}/documents`, docToDelete.id));
}