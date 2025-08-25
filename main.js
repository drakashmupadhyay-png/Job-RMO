"use strict";

// ---
// RMO Job-Flow - main.js (v2.5 - Bug Fixes & UI Polish)
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
        dashboardView: 'table', // 'table' or 'calendar'
        documentViewMode: 'list', // 'list' or 'grid'
        isRemindersOpen: false,
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
    ui.renderFooter();
    if (clockInterval) clearInterval(clockInterval);
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
        ui: { currentPage: 'dashboard', isFilterPanelOpen: false, isSidebarCollapsed: false, activeJobId: null, activeExperienceId: null, activeDocumentId: null, dashboardView: 'table', documentViewMode: 'list', isRemindersOpen: false },
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
        appState.jobs = docs.map(job => ({...job, closingDate: job.closingDate?.toDate(), followUpDate: job.followUpDate?.toDate(), interviewDate: job.interviewDate?.toDate(), commencementDate: job.commencementDate?.toDate() }));
        checkReminders();
        if (appState.ui.currentPage === 'dashboard') {
            ui.renderDashboard(appState.jobs, appState.filters.dashboard, appState.ui.dashboardView);
        }
    }, { orderBy: ["createdAt", "desc"] });

    const experiencesUnsubscribe = api.setupRealtimeListener(`users/${userId}/experiences`, (docs) => {
        appState.experiences = docs;
        if (appState.ui.currentPage === 'experienceBook') {
            ui.renderExperienceBook(appState.experiences, appState.filters.experienceBook);
        }
    });

    const documentsUnsubscribe = api.setupRealtimeListener(`users/${userId}/documents`, (docs) => {
        appState.documents = docs.map(doc => ({...doc, uploadedAt: doc.uploadedAt?.toDate() }));
        if (appState.ui.currentPage === 'documents') {
            ui.renderDocumentsPage(appState.documents, [], appState.ui.documentViewMode);
        }
    });
    
    realtimeListeners.push(userUnsubscribe, jobsUnsubscribe, experiencesUnsubscribe, documentsUnsubscribe);
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
            ui.renderDashboard(appState.jobs, appState.filters.dashboard, appState.ui.dashboardView);
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
            currentPageCleanup = setupExperienceBookListeners();
            break;
        case 'documents':
            ui.renderDocumentsPage(appState.documents, [], appState.ui.documentViewMode);
            currentPageCleanup = setupDocumentsListeners();
            break;
        default:
            window.location.hash = '#dashboard';
            break;
    }
}

// --- EVENT LISTENER MANAGEMENT ---

function attachGlobalEventListeners() {
    window.addEventListener('hashchange', () => navigateTo(window.location.hash));
    window.addEventListener('click', handleGlobalClick);
    document.getElementById('app-sidebar').addEventListener('click', handleSidebarClicks);
    document.getElementById('global-header').addEventListener('click', handleHeaderClicks);
    document.getElementById('fab').addEventListener('click', handleFabClick);
}

function setupDashboardListeners() {
    const dashboardEl = document.getElementById('dashboard');
    dashboardEl.addEventListener('click', handleDashboardClicks);

    // Filter/Sort Listeners
    const filterPanel = document.getElementById('filter-panel');
    filterPanel.addEventListener('change', handleDashboardFilterChange);
    
    const searchInput = document.getElementById('search-bar');
    const debouncedSearch = utils.debounce(handleDashboardSearch, 300);
    searchInput.addEventListener('input', debouncedSearch);

    return () => {
        dashboardEl.removeEventListener('click', handleDashboardClicks);
        filterPanel.removeEventListener('change', handleDashboardFilterChange);
        searchInput.removeEventListener('input', debouncedSearch);
    };
}

function setupSettingsListeners() {
    const settingsEl = document.getElementById('settings');
    settingsEl.addEventListener('click', handleSettingsClicks);
    
    // Add specific listener for timezone to fix bug and provide instant feedback
    const timezoneSelect = document.getElementById('timezone-selector');
    const handleTimezoneChange = (e) => api.updateUserDocument(currentUser.uid, { 'preferences.timezone': e.target.value });
    timezoneSelect.addEventListener('change', handleTimezoneChange);
    
    const profileUpload = document.getElementById('profile-image-upload');
    profileUpload.addEventListener('change', handleProfileImageUpload);

    return () => {
        settingsEl.removeEventListener('click', handleSettingsClicks);
        timezoneSelect.removeEventListener('change', handleTimezoneChange);
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

function setupExperienceBookListeners() {
    const expPage = document.getElementById('experienceBook');
    expPage.addEventListener('click', handleExperienceBookClicks);
    const searchInput = document.getElementById('experience-search-bar');
    const debouncedSearch = utils.debounce(handleExperienceSearch, 300);
    searchInput.addEventListener('input', debouncedSearch);
    return () => {
        expPage.removeEventListener('click', handleExperienceBookClicks);
        searchInput.removeEventListener('input', debouncedSearch);
    };
}

function setupDocumentsListeners() {
    const docPage = document.getElementById('documents');
    docPage.addEventListener('click', handleDocumentsClicks);
    const dropzone = document.getElementById('upload-dropzone');
    const docInput = document.getElementById('master-doc-file-input');
    const dropzoneClickHandler = () => docInput.click();
    const docInputChangeHandler = (e) => handleMasterDocumentUpload(e);
    
    dropzone.addEventListener('click', dropzoneClickHandler);
    docInput.addEventListener('change', docInputChangeHandler);

    return () => {
        dropzone.removeEventListener('click', dropzoneClickHandler);
        docInput.removeEventListener('change', docInputChangeHandler);
    };
}

// --- EVENT HANDLERS ---

function handleGlobalClick(e) {
    if (!e.target.closest('#nav-user-menu')) ui.closeUserDropdown();
    if (!e.target.closest('.reminders-container')) {
        appState.ui.isRemindersOpen = false;
        ui.toggleRemindersDropdown(false);
    }
}

function handleSidebarClicks(e) {
    const link = e.target.closest('.nav-link');
    if (link) {
        e.preventDefault();
        window.location.hash = link.getAttribute('href');
    }
    if(e.target.closest('.sidebar-header')) {
        appState.ui.isSidebarCollapsed = !appState.ui.isSidebarCollapsed;
        ui.toggleSidebar(appState.ui.isSidebarCollapsed);
    }
}

function handleHeaderClicks(e) {
    if (e.target.closest('#logout-btn')) signOut(auth);
    if (e.target.closest('#nav-user-menu')) ui.toggleUserDropdown();
    if (e.target.closest('#mobile-menu-btn')) ui.toggleMobileSidebar(true);
    if (e.target.closest('#smart-reminders-btn')) {
        appState.ui.isRemindersOpen = !appState.ui.isRemindersOpen;
        const urgentJobs = getUrgentJobs();
        ui.renderRemindersDropdown(urgentJobs);
        ui.toggleRemindersDropdown(appState.ui.isRemindersOpen);
    }
}

function handleFabClick() {
    switch (appState.ui.currentPage) {
        case 'dashboard':
            window.location.hash = '#applicationDetail/new';
            break;
        case 'experienceBook':
            appState.ui.activeExperienceId = null;
            ui.renderExperienceInspector(null);
            break;
        case 'documents':
            document.getElementById('master-doc-file-input').click();
            break;
    }
}

function handleDashboardClicks(e) {
    // View Switcher Logic
    const viewBtn = e.target.closest('.view-btn');
    if (viewBtn) {
        const newView = viewBtn.id === 'calendar-view-btn' ? 'calendar' : 'table';
        if (newView !== appState.ui.dashboardView) {
            appState.ui.dashboardView = newView;
            ui.renderDashboard(appState.jobs, appState.filters.dashboard, appState.ui.dashboardView);
        }
    }

    // Filter Panel Logic
    if (e.target.closest('#toggle-filters-btn')) {
        appState.ui.isFilterPanelOpen = !appState.ui.isFilterPanelOpen;
        ui.toggleFilterPanel(appState.ui.isFilterPanelOpen);
    }
    if (e.target.closest('#close-filter-panel-btn') || e.target.closest('#clear-filters-btn')) {
        if (e.target.closest('#clear-filters-btn')) {
            appState.filters.dashboard = { state: 'all', type: 'all', status: 'all', search: '', sortBy: 'default' };
            ui.renderDashboard(appState.jobs, appState.filters.dashboard, appState.ui.dashboardView);
        }
        appState.ui.isFilterPanelOpen = false;
        ui.toggleFilterPanel(false);
    }

    // Row interaction Logic
    const row = e.target.closest('.interactive-row');
    if (row) {
        const jobId = row.dataset.jobId;
        const job = appState.jobs.find(j => j.id === jobId);
        if (e.target.closest('.expand-icon')) {
            ui.toggleRowExpansion(row, job);
        } else if (!e.target.closest('.actions-menu-btn')) {
            window.location.hash = `#applicationDetail/${jobId}`;
        }
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
    // Note: Timezone logic removed from here and placed in setupSettingsListeners for correctness
    if(e.target.closest('#save-profile-btn')) handleSaveProfile();
    if(e.target.closest('#update-password-btn')) handleUpdatePassword();
    if(e.target.closest('#interactive-avatar')) document.getElementById('profile-image-upload').click();
}

function handleApplicationDetailClicks(e) {
    if(e.target.closest('#save-app-btn')) handleSaveApplication();
    if(e.target.closest('#delete-app-btn')) handleDeleteApplication();
    if(e.target.closest('#duplicate-app-btn')) handleDuplicateApplication();
}

function handleExperienceBookClicks(e) {
    const card = e.target.closest('.experience-card');
    if (card) {
        appState.ui.activeExperienceId = card.dataset.experienceId;
        const exp = appState.experiences.find(e => e.id === appState.ui.activeExperienceId);
        ui.renderExperienceInspector(exp);
    }
    if (e.target.closest('#close-experience-inspector-btn')) {
        ui.closeExperienceInspector();
    }
    if (e.target.closest('#save-exp-btn')) {
        handleSaveExperience();
    }
    if (e.target.closest('#delete-exp-btn')) {
        handleDeleteExperience();
    }
    const tagBtn = e.target.closest('.tag-filter-btn');
    if(tagBtn) {
        const tag = tagBtn.dataset.tag;
        // Logic for tag filtering will be added in a future update
    }
}

function handleDocumentsClicks(e) {
    // View Switcher
    const viewBtn = e.target.closest('.view-btn');
    if (viewBtn) {
        const newView = viewBtn.id === 'doc-grid-view-btn' ? 'grid' : 'list';
        if (newView !== appState.ui.documentViewMode) {
            appState.ui.documentViewMode = newView;
            ui.renderDocumentsPage(appState.documents, [], newView);
        }
    }
    // Inspector
    const docItem = e.target.closest('.interactive-row, .doc-grid-item');
    if (docItem) {
        appState.ui.activeDocumentId = docItem.dataset.docId;
        const doc = appState.documents.find(d => d.id === appState.ui.activeDocumentId);
        ui.renderDocumentInspector(doc);
    }
    if (e.target.closest('#close-document-inspector-btn')) {
        ui.closeDocumentInspector();
    }
}

// --- ACTION LOGIC ---

function handleDashboardSearch(e) {
    appState.filters.dashboard.search = e.target.value;
    // Filtering logic will be fully implemented in a future update
    ui.renderDashboard(appState.jobs, appState.filters.dashboard, appState.ui.dashboardView);
}

function handleDashboardFilterChange(e) {
    if (e.target.tagName === 'SELECT') {
        const filterKey = e.target.id.replace('-filter', ''); // 'state', 'type', 'status'
        const filterMap = {
            state: 'state',
            type: 'type',
            status: 'status',
            'sort-by': 'sortBy'
        };
        const stateKey = filterMap[filterKey];
        if (stateKey) {
            appState.filters.dashboard[stateKey] = e.target.value;
            // Full filtering logic to be added
            ui.renderDashboard(appState.jobs, appState.filters.dashboard, appState.ui.dashboardView);
        }
    }
}

function handleExperienceSearch(e) {
    appState.filters.experienceBook.search = e.target.value;
    // Filtering logic will be added
    ui.renderExperienceBook(appState.experiences, appState.filters.experienceBook);
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

async function handleMasterDocumentUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    ui.showToast(`Uploading ${files.length} document(s)...`);
    try {
        for (const file of files) {
            const path = `users/${currentUser.uid}/documents/${Date.now()}_${file.name}`;
            const downloadURL = await api.uploadFile(path, file);
            const docData = { name: file.name, url: downloadURL, path, size: file.size, type: file.type, uploadedAt: new Date() };
            await api.addDocument(`users/${currentUser.uid}/documents`, docData);
        }
        ui.showToast("Upload complete!", "success");
    } catch(err) { ui.showToast(`Upload failed: ${err.message}`, "error"); }
}

async function handleSaveApplication() {
    const formData = ui.getApplicationFormData();
    if (!formData.jobTitle) { ui.showToast("Job Title is required.", "error"); return; }
    const isNew = !appState.ui.activeJobId || appState.ui.activeJobId === 'new' || appState.ui.activeJobId === 'new-from-duplicate';
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
    if (!idToDelete || idToDelete === 'new' || idToDelete === 'new-from-duplicate') return;
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
        appState.ui.activeJobId = 'new-from-duplicate';
        ui.renderApplicationDetailPage(newJobData);
        ui.showToast("Application duplicated. Editing the new copy.");
    }
}

async function handleSaveExperience() {
    const data = ui.getExperienceInspectorData();
    if(!data.title) { ui.showToast("Title is required.", "error"); return; }
    const isNew = !appState.ui.activeExperienceId;
    const path = `users/${currentUser.uid}/experiences`;
    ui.showToast(isNew ? "Creating experience..." : "Updating experience...");
    try {
        if(isNew) {
            data.createdAt = new Date();
            await api.addDocument(path, data);
            ui.showToast("Experience created!", "success");
        } else {
            await api.updateDocument(`${path}/${appState.ui.activeExperienceId}`, data);
            ui.showToast("Experience updated!", "success");
        }
        ui.closeExperienceInspector();
    } catch(err) {
        ui.showToast(`Could not save: ${err.message}`, "error");
    }
}

async function handleDeleteExperience() {
    const idToDelete = appState.ui.activeExperienceId;
    if (!idToDelete) return;
    if(confirm("Are you sure you want to delete this experience?")) {
        ui.showToast("Deleting experience...");
        try {
            await api.deleteDocument(`users/${currentUser.uid}/experiences/${idToDelete}`);
            ui.showToast("Experience deleted.", "success");
            ui.closeExperienceInspector();
        } catch(err) {
            ui.showToast(`Could not delete: ${err.message}`, "error");
        }
    }
}

function getUrgentJobs() {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const activeJobs = appState.jobs.filter(job => !['Closed', 'Offer Declined', 'Unsuccessful'].includes(job.status));
    return activeJobs.filter(job => {
        const isClosingToday = job.closingDate && job.closingDate <= endOfToday;
        const isFollowUpDue = job.followUpDate && !job.followUpComplete && job.followUpDate <= endOfToday;
        return isClosingToday || isFollowUpDue;
    });
}

function checkReminders() {
    const urgentJobs = getUrgentJobs();
    ui.updateNotificationBadge(urgentJobs.length);
}```