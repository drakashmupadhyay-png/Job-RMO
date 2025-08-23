"use strict";

// --- 0. IMPORTS ---
// Import initialized Firebase services from our config file
import { auth, db } from './firebase-config.js';
// Import specific functions we need from the Firebase SDK
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Import the main app's initialization and cleanup functions from main.js
import { initializeMainApp, cleanupMainApp } from './main.js';

// --- This is the ONLY DOMContentLoaded listener in the entire application ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. UI SELECTORS FOR AUTH VIEW ---
    const authView = document.getElementById('auth-view');
    const mainAppView = document.getElementById('main-app-view');
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    const loginEmailInput = document.getElementById('login-email');
    const loginPassInput = document.getElementById('login-pass');
    
    const signupNameInput = document.getElementById('signup-name');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPassInput = document.getElementById('signup-pass');
    const signupCPassInput = document.getElementById('signup-cpass');
    
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLink = document.getElementById('show-login-link');
    
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
     * Validates passwords, creates a user in Firebase Auth, and a corresponding user document in Firestore.
     * @param {Event} e - The form submission event.
     */
    async function handleSignup(e) {
        e.preventDefault();
        signupError.classList.add('hidden');
        const fullName = signupNameInput.value.trim();
        const email = signupEmailInput.value.trim();
        const password = signupPassInput.value;
        const confirmPassword = signupCPassInput.value;

        if (password !== confirmPassword) {
            signupError.textContent = "Passwords do not match.";
            signupError.classList.remove('hidden');
            return;
        }
        if (password.length < 6) {
            signupError.textContent = "Password must be at least 6 characters long.";
            signupError.classList.remove('hidden');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const nameParts = fullName.split(' ') || [];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Update the user's profile in Firebase Auth
            await updateProfile(user, { displayName: fullName });

            // Create a user document in Firestore to store extra info
            await setDoc(doc(db, "users", user.uid), {
                fullName: fullName,
                firstName: firstName,
                lastName: lastName,
                email: user.email,
                initials: `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase(),
                createdAt: Timestamp.now()
            });

            // Redirect to login on successful signup
            signupForm.reset();
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            loginError.textContent = "Signup successful! Please log in.";
            loginError.style.color = 'var(--success-green)';
            loginError.classList.remove('hidden');

        } catch (error) {
            signupError.textContent = error.message;
            signupError.classList.remove('hidden');
        }
    }

    // --- 3. ATTACH EVENT LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    showSignupLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        loginForm.classList.add('hidden'); 
        signupForm.classList.remove('hidden'); 
        loginError.classList.add('hidden');
    });
    showLoginLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        signupForm.classList.add('hidden'); 
        loginForm.classList.remove('hidden'); 
        signupError.classList.add('hidden');
    });


    // --- 4. CENTRAL AUTHENTICATION STATE OBSERVER ---
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in.
            authView.classList.add('hidden');
            mainAppView.classList.remove('hidden');
            initializeMainApp(user); // Hand control over to the main application module
        } else {
            // User is signed out.
            mainAppView.classList.add('hidden');
            authView.classList.remove('hidden');
            // Ensure login form is the default view
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            cleanupMainApp(); // Tell the main app module to clean up its state
        }
    });
});