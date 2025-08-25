"use strict";

// ---
// RMO Job-Flow - auth.js (v2.0 - Blueprint Realized)
// Description: Manages the authentication view, user login, signup, and
// the central onAuthStateChanged listener that gates access to the main app.
// ---

// 1. IMPORT NECESSARY MODULES
// Import Firebase services and functions
import { auth } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Import API functions for creating user documents in Firestore
import * as api from './api.js';

// Import the main app's entry/exit points from main.js
import { initializeMainApp, cleanupMainApp } from './main.js';

// 2. ATTACH THE PRIMARY DOM EVENT LISTENER
// This is the single entry point for all code in this file.
document.addEventListener('DOMContentLoaded', () => {
    console.log('auth.js: DOMContentLoaded fired.');

    // --- UI SELECTORS FOR THE AUTH VIEW ---
    const authView = document.getElementById('auth-view');
    const mainAppView = document.getElementById('main-app-view');
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    const loginEmailInput = document.getElementById('login-email');
    const loginPassInput = document.getElementById('login-pass');
    const loginError = document.getElementById('login-error');
    
    const signupNameInput = document.getElementById('signup-name');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPassInput = document.getElementById('signup-pass');
    const signupCPassInput = document.getElementById('signup-cpass');
    const signupError = document.getElementById('signup-error');
    
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLink = document.getElementById('show-login-link');

    // Verify elements are found
    console.log('auth.js: Elements found status:');
    console.log(`  authView: ${!!authView}`);
    console.log(`  mainAppView: ${!!mainAppView}`);
    console.log(`  loginForm: ${!!loginForm}`);
    console.log(`  signupForm: ${!!signupForm}`);
    console.log(`  loginEmailInput: ${!!loginEmailInput}`);
    console.log(`  loginPassInput: ${!!loginPassInput}`);
    console.log(`  loginError: ${!!loginError}`);
    console.log(`  signupNameInput: ${!!signupNameInput}`);
    console.log(`  signupEmailInput: ${!!signupEmailInput}`);
    console.log(`  signupPassInput: ${!!signupPassInput}`);
    console.log(`  signupCPassInput: ${!!signupCPassInput}`);
    console.log(`  signupError: ${!!signupError}`);
    console.log(`  showSignupLink: ${!!showSignupLink}`);
    console.log(`  showLoginLink: ${!!showLoginLink}`);

    // --- HELPER FUNCTION TO DISPLAY ERRORS ---
    function showAuthError(element, message) {
        element.textContent = message;
        element.classList.remove('hidden');
    }

    // --- EVENT HANDLER FUNCTIONS ---

    /**
     * Handles user login attempts.
     * @param {Event} e The form submission event.
     */
    async function handleLogin(e) {
        e.preventDefault();
        console.log('auth.js: handleLogin fired.');
        loginError.classList.add('hidden');
        
        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPassInput.value);
            // onAuthStateChanged will handle the UI switch.
        } catch (error) {
            console.error("Login failed:", error.code);
            let message = "An unknown error occurred. Please try again.";
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                message = "Invalid email or password. Please try again.";
            } else if (error.code === 'auth/invalid-email') {
                message = "Please enter a valid email address.";
            }
            showAuthError(loginError, message);
        }
    }

    /**
     * Handles new user registration.
     * @param {Event} e The form submission event.
     */
    async function handleSignup(e) {
        e.preventDefault();
        console.log('auth.js: handleSignup fired.');
        signupError.classList.add('hidden');
        
        const fullName = signupNameInput.value.trim();
        const email = signupEmailInput.value.trim();
        const password = signupPassInput.value;
        const confirmPassword = signupCPassInput.value;

        // --- Client-side validation ---
        if (!fullName || !email) {
            showAuthError(signupError, "Please fill out all fields.");
            return;
        }
        if (password.length < 6) {
            showAuthError(signupError, "Password must be at least 6 characters long.");
            return;
        }
        if (password !== confirmPassword) {
            showAuthError(signupError, "Passwords do not match.");
            return;
        }

        try {
            // Step 1: Create the user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Step 2: Update the user's Auth profile with their display name
            await updateProfile(user, { displayName: fullName });

            // Step 3: Create a corresponding user document in Firestore using our API module
            // This is the correct architectural pattern - auth.js doesn't talk to Firestore directly.
            const userProfileData = {
                fullName: fullName,
                email: user.email,
                createdAt: new Date() // Will be converted to Timestamp by the API
            };
            await api.createUserDocument(user.uid, userProfileData);

            // Step 4: Redirect to the login form with a success message
            signupForm.reset();
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            loginError.textContent = "Signup successful! Please log in to continue.";
            loginError.classList.remove('hidden');
            loginError.classList.remove('error');
            loginError.classList.add('success'); // Style it as a success message

        } catch (error) {
            console.error("Signup failed:", error.code);
            let message = "Could not create account. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                message = "An account with this email address already exists.";
            } else if (error.code === 'auth/invalid-email') {
                message = "Please enter a valid email address.";
            }
            showAuthError(signupError, message);
        }
    }

    /**
     * Toggles between the login and signup forms.
     * @param {('login'|'signup')} viewToShow The view to display.
     */
    function switchAuthView(viewToShow) {
        console.log(`auth.js: switchAuthView to ${viewToShow}`);
        // Hide all status messages
        loginError.classList.add('hidden');
        signupError.classList.add('hidden');
        // Reset login message style
        loginError.classList.remove('success');
        loginError.classList.add('error');

        if (viewToShow === 'signup') {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        } else {
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        }
    }

    // --- ATTACH EVENT LISTENERS FOR THE AUTH VIEW ---
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('auth.js: Login form listener attached.');
    } else {
        console.error('auth.js: loginForm not found!');
    }
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        console.log('auth.js: Signup form listener attached.');
    } else {
        console.error('auth.js: signupForm not found!');
    }
    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => { 
            e.preventDefault(); 
            console.log('auth.js: showSignupLink clicked.');
            switchAuthView('signup'); 
        });
        console.log('auth.js: Show signup link listener attached.');
    } else {
        console.error('auth.js: showSignupLink not found!');
    }
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => { 
            e.preventDefault(); 
            console.log('auth.js: showLoginLink clicked.');
            switchAuthView('login'); 
        });
        console.log('auth.js: Show login link listener attached.');
    } else {
        console.error('auth.js: showLoginLink not found!');
    }


    // --- 3. CENTRAL AUTHENTICATION STATE OBSERVER ---
    // This is the "gatekeeper" of the entire application.
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log('auth.js: User is signed in:', user.uid);
            // User is signed in.
            // Hide the auth view and show the main application.
            if (authView) authView.classList.add('hidden');
            if (mainAppView) mainAppView.classList.remove('hidden');
            
            // Hand control over to the main application module.
            initializeMainApp(user);
        } else {
            console.log('auth.js: User is signed out.');
            // User is signed out.
            // Hide the main application and show the auth view.
            if (mainAppView) mainAppView.classList.add('hidden');
            if (authView) authView.classList.remove('hidden');
            
            // Ensure the login form is the default view.
            switchAuthView('login');
            
            // Tell the main app module to clean up its state and listeners.
            cleanupMainApp(); 
        }
    });
});
