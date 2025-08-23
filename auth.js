"use strict";

// --- IMPORTS ---
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeMainApp, cleanupMainApp } from './main.js';

// --- This is the ONLY DOMContentLoaded listener in the entire application ---
document.addEventListener('DOMContentLoaded', () => {

    // --- UI SELECTORS ---
    const authView = document.getElementById('auth-view');
    const mainAppView = document.getElementById('main-app-view');
    const loginForm = document.getElementById('login-form'), signupForm = document.getElementById('signup-form');
    const loginEmailInput = document.getElementById('login-email'), loginPassInput = document.getElementById('login-pass');
    const signupFNameInput = document.getElementById('signup-fname'), signupLNameInput = document.getElementById('signup-lname'), signupEmailInput = document.getElementById('signup-email'), signupPassInput = document.getElementById('signup-pass');
    const showSignupLink = document.getElementById('show-signup-link'), showLoginLink = document.getElementById('show-login-link');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const loginError = document.getElementById('login-error'), signupError = document.getElementById('signup-error');

    // --- EVENT HANDLERS ---
    async function handleLogin(e) {
        e.preventDefault();
        loginError.classList.add('hidden');
        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPassInput.value);
        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        }
    }

    async function handleSignup(e) {
        e.preventDefault();
        signupError.classList.add('hidden');
        const firstName = signupFNameInput.value.trim();
        const lastName = signupLNameInput.value.trim();
        if (!firstName || !lastName) {
            signupError.textContent = "First and Last name are required.";
            signupError.classList.remove('hidden');
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPassInput.value);
            const user = userCredential.user;
            await updateProfile(user, { displayName: `${firstName} ${lastName}` });
            await setDoc(doc(db, "users", user.uid), {
                firstName, lastName, email: user.email,
                initials: `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase(),
                createdAt: Timestamp.now()
            });
        } catch (error) {
            signupError.textContent = error.message;
            signupError.classList.remove('hidden');
        }
    }

    async function handleGoogleLogin() {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                const nameParts = user.displayName?.split(' ') || [];
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                await setDoc(userDocRef, {
                    firstName, lastName, email: user.email,
                    initials: `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase(),
                    createdAt: Timestamp.now()
                });
            }
        } catch (error) {
            loginError.textContent = `Google Sign-In Error: ${error.message}`;
            loginError.classList.remove('hidden');
        }
    }

    // --- ATTACH LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('hidden'); signupForm.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

    // --- CENTRAL AUTH OBSERVER ---
    onAuthStateChanged(auth, user => {
        if (user) {
            authView.classList.add('hidden');
            mainAppView.classList.remove('hidden');
            initializeMainApp(user); // Call the main app's initializer
        } else {
            mainAppView.classList.add('hidden');
            authView.classList.remove('hidden');
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            cleanupMainApp(); // Call the main app's cleanup function
        }
    });
});
