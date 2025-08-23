"use strict";

// --- 0. IMPORTS ---
// Import initialized Firebase services from our config file
import { auth, db } from './firebase-config.js';
// Import specific functions we need from the Firebase SDK
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Import the main app's initialization and cleanup functions from main.js
import { initializeAppForUser, cleanupAfterLogout } from './main.js';

// --- MAIN AUTHENTICATION LOGIC ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. UI SELECTORS FOR AUTH VIEW ---
    const authView = document.getElementById('auth-view');
    const mainAppView = document.getElementById('main-app-view');
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    const loginEmailInput = document.getElementById('login-email');
    const loginPassInput = document.getElementById('login-pass');
    
    const signupFNameInput = document.getElementById('signup-fname');
    const signupLNameInput = document.getElementById('signup-lname');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPassInput = document.getElementById('signup-pass');
    
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLink = document.getElementById('show-login-link');
    const googleLoginBtn = document.getElementById('google-login-btn');
    
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');

    // --- 2. EVENT HANDLER FUNCTIONS ---

    /**
     * Handles user login with email and password.
     * @param {Event} e - The form submission event.
     */
    async function handleLogin(e) {
        e.preventDefault();
        loginError.classList.add('hidden');
        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPassInput.value);
            // onAuthStateChanged will handle the UI switch
        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        }
    }

    /**
     * Handles new user registration with email and password.
     * Creates a user in Firebase Auth and a corresponding user document in Firestore.
     * @param {Event} e - The form submission event.
     */
    async function handleSignup(e) {
        e.preventDefault();
        signupError.classList.add('hidden');
        const firstName = signupFNameInput.value.trim();
        const lastName = signupLNameInput.value.trim();
        const email = signupEmailInput.value.trim();
        const password = signupPassInput.value;

        if (!firstName || !lastName) {
            signupError.textContent = "First and Last name are required.";
            signupError.classList.remove('hidden');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update the user's profile in Firebase Auth
            const fullName = `${firstName} ${lastName}`;
            await updateProfile(user, { displayName: fullName });

            // Create a user document in Firestore to store extra info
            await setDoc(doc(db, "users", user.uid), {
                firstName: firstName,
                lastName: lastName,
                email: user.email,
                initials: `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase(),
                createdAt: Timestamp.now()
            });
            // onAuthStateChanged will handle the UI switch
        } catch (error) {
            signupError.textContent = error.message;
            signupError.classList.remove('hidden');
        }
    }

    /**
     * Handles user sign-in via Google's OAuth popup.
     * If it's a new user, it also creates their profile document in Firestore.
     */
    async function handleGoogleLogin() {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if the user is new. If so, create their Firestore document.
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                const nameParts = user.displayName?.split(' ') || [];
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                await setDoc(userDocRef, {
                    firstName: firstName,
                    lastName: lastName,
                    email: user.email,
                    initials: `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase(),
                    createdAt: Timestamp.now()
                });
            }
            // onAuthStateChanged will handle the UI switch
        } catch (error) {
            loginError.textContent = `Google Sign-In Error: ${error.message}`;
            loginError.classList.remove('hidden');
        }
    }

    // --- 3. ATTACH EVENT LISTENERS ---
    // These listeners are active as soon as the page loads.
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
    showSignupLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        loginForm.classList.add('hidden'); 
        signupForm.classList.remove('hidden'); 
    });
    showLoginLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        signupForm.classList.add('hidden'); 
        loginForm.classList.remove('hidden'); 
    });


    // --- 4. CENTRAL AUTHENTICATION STATE OBSERVER ---
    // This is the core function that drives the application's state.
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in.
            authView.classList.add('hidden');
            mainAppView.classList.remove('hidden');
            initializeAppForUser(user); // Hand control over to the main application module
        } else {
            // User is signed out.
            mainAppView.classList.add('hidden');
            authView.classList.remove('hidden');
            // Ensure login form is the default view
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            cleanupAfterLogout(); // Tell the main app module to clean up its state
        }
    });
});
