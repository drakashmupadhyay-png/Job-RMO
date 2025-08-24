"use strict";

// ---
// RMO Job-Flow - main.js (v2.2 - Final Blueprint Polish)
// Description: The central "brain" of the application. Manages state,
// orchestrates modules, and handles all business logic and event listeners.
// ---

import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import * as api from './api.js';
import * as ui from './ui.js';
import * as utils from './utils.js';

// --- GLOBAL STATE ---
let currentUser = null;
let userProfileData = {};
let appState = {
    jobs: [],
    experiences: [],
    documents: [],
    ui: {
        currentPage: 'dashboard',
        isFilterPanelOpen: false,
        isSidebarCollapsed: false,
        activeJobId: null,
        activeExperienceId: null,
        activeDocumentId: null,
    },
    filters: {
        dashboard: { state: 'all', type: 'all', status: 'all', search: '', sortBy: 'default' },
        experienceBook: { search: '', tags: [] }
    }
};
let realtimeListeners = [];
let currentPageCleanup = () => {};
let clockInterval = null;

// --- PRIMARY ENTRY/EXIT POINTS (Called by auth.js) ---

export function initializeMainApp(user) {
    currentUser = user;
    console.log("Initializing main application for user:", user.uid);
    ui.renderFooter(); // Render the footer with the clock
    clockInterval = setInterval(() => ui.updateClock(userProfileData.preferences?.timezone), 1000);
    setupRealtimeListeners(user.uid);
    attachGlobalEventListeners();
    navigateTo(window.location.hash || '#dashboard');
}

export function cleanupMainApp() {
    console.log("Cleaning up main application.");
    if(clockInterval) clearInterval(clockInterval);
    realtimeListeners.forEach(unsubscribe => unsubscribe());
    realtimeListeners = [];
    if (typeof currentPageCleanup === 'function') {
        currentPageCleanup();
    }
    currentUser = null;
    userProfileData = {};
    appState = {
        jobs: [], experiences: [], documents: [],
        ui: { currentPage: 'dashboard', isFilterPanelOpen: false, isSidebarCollapsed: false, activeJobId: null, activeExperienceId: null, activeDocumentId: null },
        filters: { dashboard: { state: 'all', type: 'all', status: 'all', search: '', sortBy: 'default' }, experienceBook: { search: '', tags: [] } }
    };
}

// --- DATA & STATE MANAGEMENT ---

function setupRealtimeListeners(userId) {
    const userUnsubscribe = api.setupRealtimeListener(`users/${userId}`, (doc) => {
        if (doc) {
            userProfileData = { ...doc, uid: userId };
            ui.applyTheme(userProfileData.preferences?.theme || 'system');
            ui.renderUserInfo(userProfileData);
            if(appState.ui.currentPage === 'settings') {
                ui.renderSettingsPage(userProfileData);
            }
        }
    });

    const jobsUnsubscribe = api.setupRealtimeListener(`users/${userId}/jobs`, (docs) => {
        appState.jobs = docs.map(job => ({...job, closingDate: job.closingDate?.toDate(), followUpDate: job.followUpDate?.toDate(), interviewDate: job.interviewDate?.toDate()}));
        checkReminders();
        if (appState.ui.currentPage === 'dashboard') {
            ui.renderDashboard(appState.jobs, appState.filters.dashboard);
        }
    }, { orderBy: ["createdAt", "desc"] });
    
    // Add other listeners when ready
    realtimeListeners.push(userUnsubscribe, jobsUnsubscribe);
}

// --- NAVIGATION ---

function navigateTo(hash) {
    if (typeof currentPageCleanup === 'function') {
        currentPageCleanup();
    }
    const pageId = hash.substring(1).split('/')[0] || 'dashboard';
    appState.ui.currentPage = pageId;
    ui.setActivePage(pageId);
    ui.updateFAB(pageId);

    switch (pageId) {
        case 'dashboard':
            ui.renderDashboard(appState.jobs, appState.filters.dashboard);
            currentPageCleanup = setupDashboardListeners();
            break;
        case 'settings':
            ui.renderSettingsPage(userProfileData);
            currentPageCleanup = setupSettingsListeners();
            break;
        case 'applicationDetail':
            const jobId = hash.split('/')[1];
            appState.ui.activeJobId = jobId;
            const jobData = jobId === 'new' ? null : appState.jobs.find(j => j.id === jobId);
            ui.renderApplicationDetailPage(jobData);
            currentPageCleanup = setupApplicationDetailListeners();
            break;
        case 'experienceBook':
            ui.renderExperienceBook(appState.experiences, appState.filters.experienceBook);
            currentPageCleanup = () => {};
            break;
        case 'documents':
            ui.renderDocumentsPage(appState.documents);
            currentPageCleanup = () => {};
            break;
        default:
            window.location.hash = '#dashboard';
            break;
    }
}

// --- EVENT LISTENER MANAGEMENT ---

function attachGlobalEventListeners() {
    window.addEventListener('hashchange', () => navigateTo(window.location.hash));
    window.addEventListener('click', handleGlobalClick); // For closing dropdowns
    document.getElementById('app-sidebar').addEventListener('click', handleSidebarClicks);
    document.getElementById('global-header').addEventListener('click', handleHeaderClicks);
    document.getElementById('fab').addEventListener('click', handleFabClick);
}

function setupDashboardListeners() {
    const dashboardEl = document.getElementById('dashboard');
    dashboardEl.addEventListener('click', handleDashboardClicks);
    const searchInput = document.getElementById('search-bar');
    const debouncedSearch = utils.debounce(handleDashboardSearch, 300);
    searchInput.addEventListener('input', debouncedSearch);
    return () => {
        dashboardEl.removeEventListener('click', handleDashboardClicks);
        searchInput.removeEventListener('input', debouncedSearch);
    };
}

function setupSettingsListeners() {
    const settingsEl = document.getElementById('settings');
    settingsEl.addEventListener('click', handleSettingsClicks);
    const profileUpload = document.getElementById('profile-image-upload');
    profileUpload.addEventListener('change', handleProfileImageUpload);
    return () => {
        settingsEl.removeEventListener('click', handleSettingsClicks);
        profileUpload.removeEventListener('change', handleProfileImageUpload);
    };
}

function setupApplicationDetailListeners() {
    const detailPageEl = document.getElementById('applicationDetailPage');
    detailPageEl.addEventListener('click', handleApplicationDetailClicks);
    return () => {
        detailPageEl.removeEventListener('click', handleApplicationDetailClicks);
    };
}

// --- EVENT HANDLERS ---

function handleGlobalClick(e) {
    // Close user dropdown if click is outside of it
    if (!e.target.closest('#nav-user-menu')) {
        ui.closeUserDropdown();
    }
}

function handleSidebarClicks(e) {
    const link = e.target.closest('.nav-link');
    if (link) window.location.hash = link.getAttribute('href');
    if(e.target.closest('.sidebar-header')) {
        appState.ui.isSidebarCollapsed = !appState.ui.isSidebarCollapsed;
        ui.toggleSidebar(appState.ui.isSidebarCollapsed);
    }
}

function handleHeaderClicks(e) {
    if (e.target.closest('#logout-btn')) signOut(auth);
    if (e.target.closest('#nav-user-menu')) ui.toggleUserDropdown();
    if (e.target.closest('#mobile-menu-btn')) ui.toggleMobileSidebar(true);
}

function handleFabClick() {
    switch (appState.ui.currentPage) {
        case 'dashboard': window.location.hash = '#applicationDetail/new'; break;
        // Other FAB actions
    }
}

function handleDashboardClicks(e) {
    if (e.target.closest('#toggle-filters-btn')) {
        appState.ui.isFilterPanelOpen = !appState.ui.isFilterPanelOpen;
        ui.toggleFilterPanel(appState.ui.isFilterPanelOpen);
    }
    if (e.target.closest('#close-filter-panel-btn') || e.target.closest('#clear-filters-btn')) {
        if (e.target.closest('#clear-filters-btn')) {
            appState.filters.dashboard = { state: 'all', type: 'all', status: 'all', search: '', sortBy: 'default' };
            ui.resetDashboardFilters();
            ui.renderDashboard(appState.jobs, appState.filters.dashboard);
        }
        appState.ui.isFilterPanelOpen = false;
        ui.toggleFilterPanel(false);
    }
    const row = e.target.closest('.interactive-row');
    if (row) {
        const jobId = row.dataset.jobId;
        const job = appState.jobs.find(j => j.id === jobId);
        if (e.target.closest('.expand-icon')) ui.toggleRowExpansion(row, job);
        else window.location.hash = `#applicationDetail/${jobId}`;
    }
}

function handleSettingsClicks(e) {
    const settingsLink = e.target.closest('.settings-link');
    if (settingsLink) {
        e.preventDefault();
        ui.setActiveSettingsSection(settingsLink.getAttribute('href').substring(1));
    }
    const themeButton = e.target.closest('.segment-btn');
    if (themeButton) {
        const theme = themeButton.dataset.theme;
        api.updateUserDocument(currentUser.uid, { 'preferences.theme': theme });
    }
    if(e.target.closest('#save-profile-btn')) handleSaveProfile();
    if(e.target.closest('#update-password-btn')) handleUpdatePassword();
    if(e.target.closest('#interactive-avatar')) document.getElementById('profile-image-upload').click();
}

function handleApplicationDetailClicks(e) {
    if(e.target.closest('#save-app-btn')) handleSaveApplication();
    if(e.target.closest('#delete-app-btn')) handleDeleteApplication();
    if(e.target.closest('#duplicate-app-btn')) handleDuplicateApplication();
}

// --- ACTION LOGIC ---

function handleDashboardSearch(e) {
    appState.filters.dashboard.search = e.target.value;
    ui.renderDashboard(appState.jobs, appState.filters.dashboard);
}

async function handleSaveProfile() {
    const newName = document.getElementById('profile-name').value;
    if (!newName.trim()) { ui.showToast("Name cannot be empty.", "error"); return; }
    ui.showToast("Updating profile...");
    try {
        await api.updateAuthProfile({ displayName: newName });
        await api.updateUserDocument(currentUser.uid, { fullName: newName });
        ui.showToast("Profile saved successfully!", "success");
    } catch (err) { ui.showToast(`Error: ${err.message}`, "error"); }
}

async function handleUpdatePassword() {
    const newPass = document.getElementById('profile-new-password').value;
    const confirmPass = document.getElementById('profile-confirm-password').value;
    if (newPass.length < 6) { ui.showToast("Password must be at least 6 characters.", "error"); return; }
    if (newPass !== confirmPass) { ui.showToast("Passwords do not match.", "error"); return; }
    ui.showToast("Updating password...");
    try {
        await api.updateUserPassword(newPass);
        ui.showToast("Password updated successfully!", "success");
        document.getElementById('profile-new-password').value = '';
        document.getElementById('profile-confirm-password').value = '';
    } catch(err) { ui.showToast(`Error: ${err.message}. Re-login may be required.`, "error"); }
}

async function handleProfileImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    ui.showToast("Uploading image...");
    try {
        const photoURL = await api.uploadFile(`users/${currentUser.uid}/profileImage`, file);
        await api.updateAuthProfile({ photoURL });
        await api.updateUserDocument(currentUser.uid, { photoURL });
        ui.showToast("Profile image updated!", "success");
    } catch(err) { ui.showToast(`Upload failed: ${err.message}`, "error"); }
}

async function handleSaveApplication() {
    const formData = ui.getApplicationFormData();
    if (!formData.jobTitle) { ui.showToast("Job Title is required.", "error"); return; }
    const isNew = !appState.ui.activeJobId || appState.ui.activeJobId === 'new';
    const docPath = `users/${currentUser.uid}/jobs`;
    ui.showToast(isNew ? "Creating application..." : "Updating application...");
    try {
        if (isNew) {
            formData.createdAt = new Date();
            await api.addDocument(docPath, formData);
            ui.showToast("Application created!", "success");
        } else {
            await api.updateDocument(`${docPath}/${appState.ui.activeJobId}`, formData);
            ui.showToast("Application updated!", "success");
        }
        window.location.hash = '#dashboard';
    } catch(err) { ui.showToast(`Could not save: ${err.message}`, "error"); }
}

async function handleDeleteApplication() {
    const idToDelete = appState.ui.activeJobId;
    if (!idToDelete) return;
    if (confirm("Are you sure you want to permanently delete this application? This action cannot be undone.")) {
        try {
            await api.deleteDocument(`users/${currentUser.uid}/jobs/${idToDelete}`);
            ui.showToast("Application deleted.", "success");
            window.location.hash = '#dashboard';
        } catch (err) { ui.showToast(`Deletion failed: ${err.message}`, "error"); }
    }
}

function handleDuplicateApplication() {
    const idToDup = appState.ui.activeJobId;
    if (!idToDup) return;
    const originalJob = appState.jobs.find(j => j.id === idToDup);
    if (originalJob) {
        const newJobData = { ...originalJob };
        delete newJobData.id;
        newJobData.jobTitle = `${originalJob.jobTitle} (Copy)`;
        newJobData.status = 'Identified';
        ui.renderApplicationDetailPage(newJobData);
        ui.showToast("Application duplicated. Editing the new copy.");
    }
}

function checkReminders() {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const activeJobs = appState.jobs.filter(job => !['Closed', 'Offer Declined', 'Unsuccessful'].includes(job.status));
    
    const urgentJobs = activeJobs.filter(job => {
        const isClosingToday = job.closingDate && job.closingDate <= endOfToday;
        const isFollowUpDue = job.followUpDate && !job.followUpComplete && job.followUpDate <= endOfToday;
        return isClosingToday || isFollowUpDue;
    });

    ui.updateNotificationBadge(urgentJobs.length);
}