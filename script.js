"use strict";

// --- 0. FIREBASE INITIALIZATION & SDK IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    updateProfile,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore,
    collection, 
    doc, 
    addDoc, 
    setDoc, 
    deleteDoc, 
    updateDoc, 
    onSnapshot,
    query,
    orderBy,
    Timestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
    getStorage,
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCcFl5MKsINFC5E7JUSfhLsz4OSizMPzI0",
    authDomain: "rmo-job-workflow.firebaseapp.com",
    projectId: "rmo-job-workflow",
    storageBucket: "rmo-job-workflow.appspot.com",
    messagingSenderId: "828963453460",
    appId: "1:828963453460:web:e9df5cb3bb5ebdf0694501"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// --- MAIN APPLICATION LOGIC ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GLOBAL STATE & UI SELECTORS ---
    let currentUser = null;
    let jobsUnsubscribe = null;
    let experiencesUnsubscribe = null;
    let documentsUnsubscribe = null;
    
    let localJobsCache = [];
    let localExperiencesCache = [];
    let localDocumentsCache = [];
    let lastBulkAddSummary = null;

    let currentJobId = null;
    let currentExperienceId = null;
    let stagedDocuments = []; 
    let stagedCriteria = [];
    let currentFilters = { state: 'all', type: 'all', status: 'all', search: '', sortBy: 'default', roleLevel: 'all' };
    let activeExperienceTags = [];
    let currentWorkbenchTarget = null;
    let isSelectMode = false; 
    let selectedJobIds = new Set();
    let eventListenersAttached = false;

    // Views
    const authView = document.getElementById('auth-view');
    const mainAppView = document.getElementById('main-app-view');

    // Auth & User Menu
    const loginForm = document.getElementById('login-form'), signupForm = document.getElementById('signup-form');
    const loginEmailInput = document.getElementById('login-email'), loginPassInput = document.getElementById('login-pass');
    const signupNameInput = document.getElementById('signup-name'), signupEmailInput = document.getElementById('signup-email'), signupPassInput = document.getElementById('signup-pass');
    const showSignupLink = document.getElementById('show-signup-link'), showLoginLink = document.getElementById('show-login-link');
    const loginError = document.getElementById('login-error'), signupError = document.getElementById('signup-error');
    const navUserMenu = document.getElementById('nav-user-menu');
    const userDropdown = document.getElementById('user-dropdown');
    const navUserName = document.getElementById('nav-user-name'), navUserImg = document.getElementById('nav-user-img');
    
    // Navigation & Pages
    const mainNavLinks = document.querySelector('.nav-links');
    const mainAppPages = { 
        dashboard: document.getElementById('dashboard'), 
        experienceBook: document.getElementById('experienceBook'),
        documents: document.getElementById('documents'),
        experienceDetailPage: document.getElementById('experienceDetailPage'),
        settings: document.getElementById('settings'), 
        applicationDetailPage: document.getElementById('applicationDetailPage') 
    };

    // Footer & Time
    const timeZoneSelector = document.getElementById('timezone-selector');
    const currentTimeDisplay = document.getElementById('current-time-display');
    let clockInterval;
    
    // Dashboard
    const metricActive = document.getElementById('metric-active'), metricClosed = document.getElementById('metric-closed'), metricClosingSoon = document.getElementById('metric-closing-soon'), metricFollowUpSoon = document.getElementById('metric-follow-up-soon');
    const tableViewBtn = document.getElementById('table-view-btn'), calendarViewBtn = document.getElementById('calendar-view-btn');
    const tableViewContainer = document.getElementById('table-view-container'), cardViewContainer = document.getElementById('card-view-container'), calendarViewContainer = document.getElementById('calendar-view-container');
    const calendarEl = document.getElementById('calendar');
    let calendar;
    const addNewAppBtn = document.getElementById('add-new-application-btn');
    const jobsTableBody = document.getElementById('jobs-table-body');
    const jobsTableHeader = document.querySelector('#table-view-container thead');
    const stateFilter = document.getElementById('state-filter'), typeFilter = document.getElementById('type-filter'), statusFilter = document.getElementById('status-filter'), sortByFilter = document.getElementById('sort-by-filter'), roleLevelFilter = document.getElementById('role-level-filter');
    const searchBar = document.getElementById('search-bar');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
    const filterControls = document.getElementById('filter-controls');
    const selectJobsBtn = document.getElementById('select-jobs-btn');
    const selectionActionBar = document.getElementById('selection-action-bar');
    const selectedCountEl = document.getElementById('selected-count');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    const cancelSelectionBtn = document.getElementById('cancel-selection-btn');
    
    // Application Detail Page
    const applicationDetailPage = document.getElementById('applicationDetailPage');
    const tabSwitcher = applicationDetailPage.querySelector('.tab-switcher');
    const applicationDetailForm = document.getElementById('application-detail-form');
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    const deleteAppBtn = document.getElementById('delete-app-btn');
    const duplicateAppBtn = document.getElementById('duplicate-app-btn');
    const jobIdError = document.getElementById('detail-job-id-error');
    const sourceUrlDiv = document.getElementById('detail-source-url');
    const sourceUrlLink = document.getElementById('view-source-url-link');
    const workbenchContainer = document.getElementById('selection-criteria-workbench');
    const addCriterionBtn = document.getElementById('add-criterion-btn');
    const attachDocBtn = document.getElementById('attach-doc-btn');
    
    // Experience Book
    const addNewExperienceBtn = document.getElementById('add-new-experience-btn');
    const experienceSearchBar = document.getElementById('experience-search-bar');
    const experienceTagFilters = document.getElementById('experience-tag-filters');
    const experienceCardsContainer = document.getElementById('experience-cards-container');
    const experienceDetailForm = document.getElementById('experience-detail-form');
    const backToExpBookBtn = document.getElementById('back-to-exp-book-btn');
    const experienceFormTitle = document.getElementById('experience-form-title');
    const deleteExpBtn = document.getElementById('delete-exp-btn');
    const copyExpBtn = document.getElementById('copy-exp-btn');

    // Settings & Documents Page
    const profileNameInput = document.getElementById('profile-name'), profileEmailInput = document.getElementById('profile-email');
    const profileImagePreview = document.getElementById('profile-image-preview'), profileImageUpload = document.getElementById('profile-image-upload'), profileImageUploadBtn = document.getElementById('profile-image-upload-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const newPasswordInput = document.getElementById('profile-new-password');
    const updatePasswordBtn = document.getElementById('update-password-btn');
    const masterDocsList = document.getElementById('master-docs-list');
    const masterDocFileInput = document.getElementById('master-doc-file-input'), masterDocBrowseBtn = document.getElementById('master-doc-browse-btn');
    const exportDataBtn = document.getElementById('export-data-btn'), importDataBtn = document.getElementById('import-data-btn'), importFileInput = document.getElementById('import-file-input');
    const bulkAddBtn = document.getElementById('bulk-add-btn'), bulkAddInput = document.getElementById('bulk-add-input');
    const bulkAddSummarySection = document.getElementById('bulk-add-summary-section'), bulkAddSummaryText = document.getElementById('bulk-add-summary-text'), bulkAddSummaryToggle = document.getElementById('bulk-add-summary-toggle'), bulkAddSkippedList = document.getElementById('bulk-add-skipped-list');
    
    // Modals
    const summaryModalBackdrop = document.getElementById('summary-modal-backdrop'), summaryModalCloseBtn = document.getElementById('summary-modal-close-btn'), summaryModalOkBtn = document.getElementById('summary-modal-ok-btn'), summaryModalSuccess = document.getElementById('summary-modal-success'), summaryModalSkippedSection = document.getElementById('summary-modal-skipped-section'), summaryModalSkippedList = document.getElementById('summary-modal-skipped-list');
    const deleteModalBackdrop = document.getElementById('delete-modal-backdrop'), deleteModalCloseBtn = document.getElementById('delete-modal-close-btn'), deleteModalCancelBtn = document.getElementById('delete-modal-cancel-btn'), deleteModalConfirmBtn = document.getElementById('delete-modal-confirm-btn'), deleteCount = document.getElementById('delete-count');
    const linkExperienceModalBackdrop = document.getElementById('link-experience-modal-backdrop'), linkExperienceCloseBtn = document.getElementById('link-experience-close-btn'), linkExperienceSearch = document.getElementById('link-experience-search'), linkExperienceList = document.getElementById('link-experience-list');
    const attachDocumentModalBackdrop = document.getElementById('attach-document-modal-backdrop'), attachDocModalCloseBtn = document.getElementById('attach-doc-modal-close-btn'), attachDocModalCancelBtn = document.getElementById('attach-doc-modal-cancel-btn'), attachDocModalConfirmBtn = document.getElementById('attach-doc-modal-confirm-btn'), attachDocModalList = document.getElementById('attach-doc-modal-list');
    
    const statusOptions = ['Identified', 'Preparing Application', 'Applied', 'Interview Offered', 'Offer Received', 'Offer Declined', 'Not Shortlisted']; 
    const typeOptions = ['Statewide Campaign', 'Direct Hospital', 'Proactive EOI']; 
    const stateOptions = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT']; 
    const roleLevelOptions = ['Intern', 'RMO', 'SRMO', 'Registrar', 'Trainee'];

    // --- 2. AUTHENTICATION & APP LIFECYCLE ---
    
    // Attach auth listeners immediately on page load
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('hidden'); signupForm.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            authView.classList.add('hidden');
            mainAppView.classList.remove('hidden');
            initializeAppForUser(user);
        } else {
            currentUser = null;
            mainAppView.classList.add('hidden');
            authView.classList.remove('hidden');
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            cleanupAfterLogout();
        }
    });

    function initializeAppForUser(user) {
        navUserName.textContent = user.displayName || user.email;
        navUserImg.src = user.photoURL || 'placeholder.jpg';
        profileNameInput.value = user.displayName || '';
        profileEmailInput.value = user.email || '';
        profileImagePreview.src = user.photoURL || 'placeholder.jpg';

        attachFirestoreListeners(user.uid);
        if (!eventListenersAttached) {
            attachMainAppEventListeners();
            eventListenersAttached = true;
        }

        initializeCalendar();
        if(clockInterval) clearInterval(clockInterval);
        clockInterval = setInterval(updateClock, 1000); // Ticking clock
        navigateToPage('dashboard');
    }

    function cleanupAfterLogout() {
        if (jobsUnsubscribe) jobsUnsubscribe();
        if (experiencesUnsubscribe) experiencesUnsubscribe();
        if (documentsUnsubscribe) documentsUnsubscribe();
        
        localJobsCache = [];
        localExperiencesCache = [];
        localDocumentsCache = [];
        jobsTableBody.innerHTML = '';
        cardViewContainer.innerHTML = '';
        experienceCardsContainer.innerHTML = '';
        masterDocsList.innerHTML = '';

        if (clockInterval) clearInterval(clockInterval);
    }

    function attachFirestoreListeners(userId) {
        const jobsRef = collection(db, `users/${userId}/jobs`);
        jobsUnsubscribe = onSnapshot(query(jobsRef, orderBy("createdAt", "desc")), (snapshot) => {
            localJobsCache = snapshot.docs.map(doc => {
                const data = doc.data();
                const job = { ...data, id: doc.id };
                // Convert all Firestore Timestamps to JS Date objects upon fetch
                for (const key in job) {
                    if (job[key] instanceof Timestamp) {
                        job[key] = job[key].toDate();
                    }
                }
                return job;
            });
            masterDashboardRender();
        });

        const experiencesRef = collection(db, `users/${userId}/experiences`);
        experiencesUnsubscribe = onSnapshot(query(experiencesRef, orderBy("createdAt", "desc")), (snapshot) => {
            localExperiencesCache = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            if (mainAppPages.experienceBook && !mainAppPages.experienceBook.classList.contains('hidden')) {
                renderExperienceBook();
            }
        });

        const documentsRef = collection(db, `users/${userId}/documents`);
        documentsUnsubscribe = onSnapshot(query(documentsRef, orderBy("uploadedAt", "desc")), (snapshot) => {
            localDocumentsCache = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            if (mainAppPages.documents && !mainAppPages.documents.classList.contains('hidden')) {
                renderMasterDocuments();
            }
        });
    }

    // --- 3. RENDERING & UI LOGIC ---

    function masterDashboardRender() {
        updateMetrics();
        renderTable();
        renderCards();
        if (calendar && !calendarViewContainer.classList.contains('hidden')) {
            renderCalendarEvents();
        }
    }

    function updateMetrics() {
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(now.getDate() + 7);
        const closedStasuses = ['Offer Declined', 'Not Shortlisted', 'Closed'];

        let activeCount = 0;
        let closedCount = 0;
        let closingSoonCount = 0;
        let followUpSoonCount = 0;

        localJobsCache.forEach(job => {
            if (closedStasuses.includes(job.status)) {
                closedCount++;
            } else {
                activeCount++;
            }
            if (job.closingDate && job.closingDate > now && job.closingDate < sevenDaysFromNow) {
                closingSoonCount++;
            }
            if (job.followUpDate && !job.followUpComplete && job.followUpDate > now && job.followUpDate < sevenDaysFromNow) {
                followUpSoonCount++;
            }
        });

        metricActive.textContent = activeCount;
        metricClosed.textContent = closedCount;
        metricClosingSoon.textContent = closingSoonCount;
        metricFollowUpSoon.textContent = followUpSoonCount;
    }

    function renderTable() {
        jobsTableBody.innerHTML = '';
        jobsTableHeader.querySelector('.select-col').classList.toggle('hidden', !isSelectMode);
        const processedJobs = sortAndFilterJobs(localJobsCache);
        
        if (processedJobs.length === 0) {
            jobsTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 40px;">No applications found.</td></tr>`;
            return;
        }

        processedJobs.forEach(job => {
            const row = document.createElement('tr');
            row.dataset.jobId = job.id;
            row.classList.toggle('selected-row', selectedJobIds.has(job.id));
            if (['Interview Offered', 'Offer Received'].includes(job.status)) row.classList.add('status-row-highlight');
            
            let followUpDisplay = 'N/A';
            if (job.followUpDate) {
                 const followUpDate = job.followUpDate;
                 const today = new Date(); today.setHours(0,0,0,0);
                 if (job.followUpComplete) followUpDisplay = `<span class="date-completed"><i class="fa-solid fa-check"></i> ${followUpDate.toLocaleDateString('en-GB')}</span>`;
                 else if (followUpDate < today) followUpDisplay = `<span class="date-overdue">${followUpDate.toLocaleDateString('en-GB')}</span>`;
                 else followUpDisplay = `<span>${followUpDate.toLocaleDateString('en-GB')}</span>`;
            }

            row.innerHTML = `
                <td class="select-col ${isSelectMode ? '' : 'hidden'}"><input type="checkbox" class="row-checkbox" data-job-id="${job.id}" ${selectedJobIds.has(job.id) ? 'checked' : ''}></td>
                <td><span class="tag status-${job.status?.toLowerCase().replace(/ /g, '-')}">${job.status || 'N/A'}</span></td>
                <td>${formatClosingDateForTable(job) || 'N/A'}</td>
                <td><strong>${job.jobTitle || 'N/A'}</strong><br><small>${job.roleLevel || 'N/A'}</small></td>
                <td>${job.hospital || 'N/A'}</td>
                <td>${job.location ? `${job.location}, ${job.state}` : job.state}</td>
                <td>${job.applicationType || 'N/A'}</td>
                <td>${followUpDisplay}</td>
                <td>${job.interviewDate ? job.interviewDate.toLocaleDateString('en-GB') : 'N/A'}</td>
                <td>${job.dateApplied ? job.dateApplied.toLocaleDateString('en-GB') : 'N/A'}</td>
                <td>
                    <button class="action-btn view-btn" data-job-id="${job.id}" title="View/Edit"><i class="fa-solid fa-eye"></i></button>
                    <button class="action-btn duplicate-btn" data-job-id="${job.id}" title="Duplicate"><i class="fa-solid fa-copy"></i></button>
                    <button class="action-btn delete-btn" data-job-id="${job.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                </td>`;
            jobsTableBody.appendChild(row);
        });
    }
    
    function renderCards() {
        cardViewContainer.innerHTML = '';
        const processedJobs = sortAndFilterJobs(localJobsCache);
        
        if (processedJobs.length === 0) {
            cardViewContainer.innerHTML = `<div class="empty-state-container"><i class="fa-solid fa-folder-open"></i><h3>No Applications Yet</h3><p>Click "Add Application" to get started!</p></div>`;
            return;
        }

        processedJobs.forEach(job => {
            const card = document.createElement('div');
            card.className = 'job-card';
            card.dataset.jobId = job.id;

            card.innerHTML = `
                <div class="job-card-header">
                    <div class="job-card-title">
                        <h3>${job.jobTitle || 'N/A'}</h3>
                        <p>${job.hospital || 'N/A'}</p>
                    </div>
                    <div class="job-card-status">
                        <span class="tag status-${job.status?.toLowerCase().replace(/ /g, '-')}">${job.status || 'N/A'}</span>
                    </div>
                </div>
                <div class="job-card-body">
                    <div class="job-card-details-item">
                        <label>Location</label>
                        <span>${job.location ? `${job.location}, ${job.state}` : job.state}</span>
                    </div>
                    <div class="job-card-details-item">
                        <label>Closing Date</label>
                        <span>${formatClosingDateForTable(job) || 'N/A'}</span>
                    </div>
                    <div class="job-card-details-item">
                        <label>Follow-Up</label>
                        <span>${job.followUpDate ? job.followUpDate.toLocaleDateString('en-GB') : 'N/A'}</span>
                    </div>
                    <div class="job-card-details-item">
                        <label>Interview</label>
                        <span>${job.interviewDate ? job.interviewDate.toLocaleDateString('en-GB') : 'N/A'}</span>
                    </div>
                </div>`;
            cardViewContainer.appendChild(card);
        });
    }

    function renderExperienceBook() {
        const searchTerm = experienceSearchBar.value.toLowerCase();
        let filteredExperiences = localExperiencesCache;

        if (activeExperienceTags.length > 0) {
            filteredExperiences = filteredExperiences.filter(exp => exp.tags && activeExperienceTags.every(tag => exp.tags.includes(tag)));
        }

        if (searchTerm) {
            filteredExperiences = filteredExperiences.filter(exp => 
                (exp.title && exp.title.toLowerCase().includes(searchTerm)) ||
                (exp.paragraph && exp.paragraph.toLowerCase().includes(searchTerm)) ||
                (exp.tags && exp.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }
        
        const sortedExperiences = [...filteredExperiences].sort((a, b) => (b.isFavorite || false) - (a.isFavorite || false));
        
        experienceCardsContainer.innerHTML = '';
        if (sortedExperiences.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state-container';
            emptyState.style.gridColumn = '1 / -1';
            emptyState.innerHTML = `<i class="fa-solid fa-book-bookmark"></i><h3>Experience Book is Empty</h3><p>Add professional experiences to link to applications.</p>`;
            experienceCardsContainer.appendChild(emptyState);
        } else {
            sortedExperiences.forEach(exp => {
                const card = document.createElement('div');
                card.className = 'experience-card';
                card.classList.toggle('is-favorite', exp.isFavorite);
                card.dataset.experienceId = exp.id;
                const tagsHTML = (exp.tags || []).map(tag => `<span class="tag status-applied">${tag}</span>`).join(' ');
                const paragraphPreview = exp.paragraph.substring(0, 150) + (exp.paragraph.length > 150 ? '...' : '');
                const favoriteClass = exp.isFavorite ? 'fas fa-star favorited' : 'far fa-star';
                card.innerHTML = `<button class="favorite-toggle" title="Toggle Favorite"><i class="${favoriteClass}"></i></button><div class="card-content-wrapper"><h4>${exp.title}</h4><div class="experience-card-tags">${tagsHTML}</div><p class="experience-card-paragraph">${paragraphPreview}</p></div>`;
                experienceCardsContainer.appendChild(card);
            });
        }
        renderExperienceTagFilters();
    }

    function renderMasterDocuments() {
        masterDocsList.innerHTML = '';
        localDocumentsCache.forEach(doc => {
            const li = document.createElement('li');
            li.innerHTML = `<span><a href="${doc.url}" target="_blank" title="View Document">${doc.name}</a></span><button type="button" class="remove-doc-btn" data-doc-id="${doc.id}" title="Delete Document">×</button>`;
            masterDocsList.appendChild(li);
        });
    }

    function populateApplicationDetailPage(job) {
        applicationDetailForm.reset();
        jobIdError.classList.add('hidden');
        applicationDetailForm.querySelectorAll('.editable-field, textarea').forEach(el => {
            if(el.isContentEditable) el.textContent = '';
            else el.value = '';
            el.classList.remove('input-error');
        });

        if (job) {
            currentJobId = job.id || null;
            stagedDocuments = job.documents ? JSON.parse(JSON.stringify(job.documents)) : [];
            stagedCriteria = job.jobSelectionCriteria ? JSON.parse(JSON.stringify(job.jobSelectionCriteria)) : [];

            document.getElementById('summary-job-title').textContent = job.jobTitle || 'New Application';
            document.getElementById('summary-hospital').textContent = `@ ${job.hospital || 'Enter details below'}`;
            const status = job.status || 'Identified';
            document.getElementById('summary-status').textContent = status;
            document.getElementById('summary-status').className = `tag status-${status.toLowerCase().replace(/ /g, '-')}`;
            
            document.getElementById('summary-closing-date').textContent = job.closingDate ? formatDateTimeWithOriginalTZ(job.closingDate, job.closingDateTimezone) : 'N/A';
            
            for (const key in job) {
                const el = document.getElementById(`detail-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`);
                if (el) {
                    if (el.isContentEditable) {
                        el.textContent = job[key] || '';
                    } else if (el.type === 'checkbox') {
                        el.checked = job[key] || false;
                    } else if (el.type === 'datetime-local' || el.type === 'date') {
                        const dateValue = job[key];
                        if (dateValue) {
                            el.value = new Date(dateValue.getTime() - (dateValue.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                        } else {
                            el.value = '';
                        }
                    } else {
                        el.value = job[key] || '';
                    }
                }
            }
        } else {
            currentJobId = null;
            stagedDocuments = [];
            stagedCriteria = [];
            document.getElementById('summary-job-title').textContent = 'New Application';
            document.getElementById('summary-hospital').textContent = 'Enter details below';
            document.getElementById('summary-status').textContent = 'Identified';
            document.getElementById('summary-status').className = 'tag status-identified';
            document.getElementById('summary-closing-date').textContent = 'N/A';
            populateSelect(document.getElementById('detail-state'), stateOptions, 'NSW');
            populateSelect(document.getElementById('detail-application-type'), typeOptions, 'Direct Hospital');
            populateSelect(document.getElementById('detail-status'), statusOptions, 'Identified');
            populateSelect(document.getElementById('detail-role-level'), roleLevelOptions, 'RMO');
        }
        
        deleteAppBtn.classList.toggle('hidden', !currentJobId);
        duplicateAppBtn.classList.toggle('hidden', !currentJobId);

        const defaultTab = tabSwitcher.querySelector('[data-target="details-panel"]');
        if (defaultTab) defaultTab.click();

        renderAttachedDocuments(stagedDocuments);
        renderWorkbench(stagedCriteria);
        sourceUrlDiv.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function populateExperienceDetailPage(exp) { 
        experienceDetailForm.reset(); 
        const titleDiv = document.getElementById('exp-title'); 
        if (exp) { 
            currentExperienceId = exp.id; 
            experienceFormTitle.textContent = 'Edit Experience'; 
            titleDiv.textContent = exp.title; 
            document.getElementById('exp-tags').value = exp.tags ? exp.tags.join(', ') : ''; 
            document.getElementById('exp-paragraph').value = exp.paragraph; 
            deleteExpBtn.classList.remove('hidden'); 
            copyExpBtn.classList.remove('hidden'); 
        } else { 
            currentExperienceId = null; 
            experienceFormTitle.textContent = 'New Experience'; 
            titleDiv.textContent = ''; 
            deleteExpBtn.classList.add('hidden'); 
            copyExpBtn.classList.add('hidden'); 
        } 
        navigateToPage('experienceDetailPage'); 
    }

    function sortAndFilterJobs(sourceArray) { 
        const searchTerm = currentFilters.search.toLowerCase(); 
        let processedJobs = sourceArray.filter(job => { 
            const stateMatch = currentFilters.state === 'all' || job.state === currentFilters.state; 
            const typeMatch = currentFilters.type === 'all' || job.applicationType === currentFilters.type; 
            const statusMatch = currentFilters.status === 'all' || job.status === currentFilters.status; 
            const roleLevelMatch = currentFilters.roleLevel === 'all' || job.roleLevel === currentFilters.roleLevel; 
            const searchMatch = searchTerm === '' ? true : Object.values(job).some(val => val && String(val).toLowerCase().includes(searchTerm)); 
            return searchMatch && stateMatch && typeMatch && statusMatch && roleLevelMatch; 
        }); 
        
        const sortBy = currentFilters.sortBy; 
        const today = new Date(); today.setHours(0, 0, 0, 0); 

        switch (sortBy) { 
            case 'closing-asc': return processedJobs.filter(j => j.closingDate && j.closingDate >= today).sort((a, b) => a.closingDate - b.closingDate); 
            case 'follow-up-asc': return processedJobs.filter(j => j.followUpDate && !j.followUpComplete && j.followUpDate >= today).sort((a, b) => a.followUpDate - b.followUpDate); 
            default: return processedJobs;
        } 
    }

    function initializeCalendar() { if (calendarEl && !calendar) { calendar = new FullCalendar.Calendar(calendarEl, { initialView: 'dayGridMonth', headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }, events: [], eventClick: (info) => { const jobId = info.event.extendedProps.jobId; const job = localJobsCache.find(j => j.id === jobId); if (job) { populateApplicationDetailPage(job); navigateToPage('applicationDetailPage'); } } }); } }
    function renderCalendarEvents() { if (!calendar) return; const events = localJobsCache.flatMap(job => { const eventList = []; const today = new Date(); const closingDate = job.closingDate; const followUpDate = job.followUpDate; const interviewDate = job.interviewDate; if (closingDate) eventList.push({ title: `${closingDate < today ? 'Closed:' : 'Closes:'} ${job.jobTitle}`, start: closingDate, backgroundColor: 'var(--danger-red)', allDay: true, extendedProps: { jobId: job.id } }); if (followUpDate && !job.followUpComplete) eventList.push({ title: `Follow-Up: ${job.jobTitle}`, start: followUpDate, backgroundColor: 'var(--warning-orange)', extendedProps: { jobId: job.id } }); if (interviewDate) eventList.push({ title: `Interview: ${job.jobTitle}`, start: interviewDate, backgroundColor: 'var(--primary-blue)', extendedProps: { jobId: job.id } }); return eventList; }); calendar.removeAllEvents(); calendar.addEventSource(events); calendar.render(); }
    function renderAttachedDocuments(docs) { const list = document.getElementById('attached-docs-list'); list.innerHTML = ''; docs.forEach(doc => { const li = document.createElement('li'); li.innerHTML = `<span>${doc.name}</span><button type="button" class="remove-doc-btn" data-doc-id="${doc.id}">×</button>`; list.appendChild(li); }); }
    function syncWorkbenchFromDOM() { const items = workbenchContainer.querySelectorAll('.workbench-item'); stagedCriteria = Array.from(items).map((item) => ({ criterion: item.querySelector('.workbench-criterion').textContent, response: item.querySelector('textarea').value })); }
    function renderWorkbench(criteria = []) { workbenchContainer.innerHTML = ''; if (criteria && criteria.length > 0) { criteria.forEach((item, index) => { const div = document.createElement('div'); div.className = 'workbench-item'; div.innerHTML = ` <div class="workbench-header"> <div class="workbench-criterion" contenteditable="true" data-index="${index}">${item.criterion}</div> <button type="button" class="remove-criterion-btn" data-index="${index}" title="Remove Criterion">×</button> </div> <div class="workbench-actions"> <button type="button" class="secondary-btn link-experience-btn" data-index="${index}"><i class="fa-solid fa-link"></i> Link Experience</button> </div> <textarea class="workbench-textarea" data-index="${index}" rows="6" placeholder="Craft your response here...">${item.response || ''}</textarea> `; workbenchContainer.appendChild(div); }); } }
    function populateLinkExperienceModal(searchTerm = '') { linkExperienceList.innerHTML = ''; const filtered = localExperiencesCache.filter(exp => exp.title.toLowerCase().includes(searchTerm.toLowerCase())); if (filtered.length === 0) { linkExperienceList.innerHTML = `<li>No experiences found.</li>`; return; } filtered.forEach(exp => { const li = document.createElement('li'); li.textContent = exp.title; li.dataset.experienceId = exp.id; linkExperienceList.appendChild(li); }); }
    function renderLastBulkAddSummary() { if (!lastBulkAddSummary) { bulkAddSummarySection.classList.add('hidden'); return; } bulkAddSummarySection.classList.remove('hidden'); const { timestamp, addedCount, skippedJobs } = lastBulkAddSummary; const date = new Date(timestamp).toLocaleString(); bulkAddSummaryText.textContent = `Last run on ${date}: ${addedCount} jobs added, ${skippedJobs.length} duplicates skipped.`; bulkAddSkippedList.innerHTML = skippedJobs.map(job => `<li><strong>${job.jobId || 'No ID'}:</strong> ${job.hospital}</li>`).join(''); }
    function renderExperienceTagFilters() { const allTags = [...new Set(localExperiencesCache.flatMap(exp => exp.tags || []))].sort(); const allButton = `<button class="tag-filter-btn secondary-btn ${activeExperienceTags.length === 0 ? 'active' : ''}" data-tag="all">All</button>`; const tagButtons = allTags.map(tag => `<button class="tag-filter-btn secondary-btn ${activeExperienceTags.includes(tag) ? 'active' : ''}" data-tag="${tag}">${tag}</button>`).join(''); experienceTagFilters.innerHTML = allButton + tagButtons; }

    // --- 4. EVENT LISTENERS SETUP ---
    
    function attachMainAppEventListeners() {
        // NAVIGATION & USER MENU
        mainNavLinks.addEventListener('click', handleNavigation);
        userDropdown.addEventListener('click', handleNavigation);
        navUserMenu.addEventListener('click', (e) => { e.stopPropagation(); userDropdown.classList.toggle('hidden'); });
        window.addEventListener('click', () => { if (!userDropdown.classList.contains('hidden')) { userDropdown.classList.add('hidden'); } });
        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
        
        // PAGE NAVIGATION
        backToDashboardBtn.addEventListener('click', () => navigateToPage('dashboard'));
        backToExpBookBtn.addEventListener('click', () => navigateToPage('experienceBook'));
        
        // DASHBOARD
        tableViewBtn.addEventListener('click', () => switchDashboardView('table'));
        calendarViewBtn.addEventListener('click', () => switchDashboardView('calendar'));
        addNewAppBtn.addEventListener('click', handleAddNewApplication);
        jobsTableBody.addEventListener('click', handleJobsTableClick);
        cardViewContainer.addEventListener('click', handleJobsTableClick); // Also listen on card container
        toggleFiltersBtn.addEventListener('click', handleToggleFilters);
        [stateFilter, typeFilter, statusFilter, sortByFilter, roleLevelFilter].forEach(el => el.addEventListener('change', handleFilterChange));
        searchBar.addEventListener('input', () => { currentFilters.search = searchBar.value; masterDashboardRender(); });
        clearFiltersBtn.addEventListener('click', handleClearFilters);
        selectJobsBtn.addEventListener('click', enterSelectMode);
        cancelSelectionBtn.addEventListener('click', exitSelectMode);
        deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
        jobsTableHeader.addEventListener('change', handleSelectAll);

        // APP DETAIL
        applicationDetailForm.addEventListener('submit', handleSaveApplication);
        deleteAppBtn.addEventListener('click', handleDeleteApplication);
        duplicateAppBtn.addEventListener('click', handleDuplicateApplication);
        tabSwitcher.addEventListener('click', handleTabSwitch);
        applicationDetailPage.addEventListener('input', checkJobIdUniqueness);
        attachDocBtn.addEventListener('click', handleShowAttachDocModal);
        workbenchContainer.addEventListener('click', handleWorkbenchClick);
        addCriterionBtn.addEventListener('click', handleAddCriterion);
        
        // EXPERIENCE BOOK
        addNewExperienceBtn.addEventListener('click', () => populateExperienceDetailPage(null));
        experienceSearchBar.addEventListener('input', renderExperienceBook);
        experienceTagFilters.addEventListener('click', handleTagFilterClick);
        experienceCardsContainer.addEventListener('click', handleExperienceCardClick);
        experienceDetailForm.addEventListener('submit', handleSaveExperience);
        deleteExpBtn.addEventListener('click', handleDeleteExperience);
        copyExpBtn.addEventListener('click', handleCopyExperience);

        // SETTINGS & DOCUMENTS
        saveProfileBtn.addEventListener('click', handleSaveProfile);
        updatePasswordBtn.addEventListener('click', handleUpdatePassword);
        profileImageUploadBtn.addEventListener('click', () => profileImageUpload.click());
        profileImageUpload.addEventListener('change', handleProfileImageUpload);
        masterDocBrowseBtn.addEventListener('click', () => masterDocFileInput.click());
        masterDocFileInput.addEventListener('change', handleMasterDocumentUpload);
        masterDocsList.addEventListener('click', handleDeleteMasterDoc);
        exportDataBtn.addEventListener('click', handleExportData);
        importDataBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', handleImportData);
        bulkAddBtn.addEventListener('click', () => bulkAddInput.click());
        bulkAddInput.addEventListener('change', handleBulkAdd);

        // MODALS
        [summaryModalCloseBtn, summaryModalOkBtn].forEach(el => el.addEventListener('click', hideSummaryModal));
        summaryModalBackdrop.addEventListener('click', (e) => { if(e.target === summaryModalBackdrop) hideSummaryModal() });
        [deleteModalCloseBtn, deleteModalCancelBtn].forEach(el => el.addEventListener('click', hideDeleteModal));
        deleteModalConfirmBtn.addEventListener('click', executeDeleteSelected);
        deleteModalBackdrop.addEventListener('click', (e) => { if(e.target === deleteModalBackdrop) hideDeleteModal() });
        linkExperienceCloseBtn.addEventListener('click', hideLinkExperienceModal);
        linkExperienceSearch.addEventListener('input', () => populateLinkExperienceModal(linkExperienceSearch.value));
        linkExperienceList.addEventListener('click', handleLinkExperienceSelect);
        linkExperienceModalBackdrop.addEventListener('click', (e) => { if(e.target === linkExperienceModalBackdrop) hideLinkExperienceModal() });
        [attachDocModalCloseBtn, attachDocModalCancelBtn].forEach(el => el.addEventListener('click', hideAttachDocModal));
        attachDocModalConfirmBtn.addEventListener('click', handleConfirmAttachDocs);
        attachDocumentModalBackdrop.addEventListener('click', (e) => { if(e.target === attachDocumentModalBackdrop) hideAttachDocModal() });
        bulkAddSummaryToggle.addEventListener('click', () => { bulkAddSkippedList.classList.toggle('hidden'); bulkAddSummaryToggle.textContent = bulkAddSkippedList.classList.contains('hidden') ? 'Show Details' : 'Hide Details'; });
    }

    // --- 5. EVENT HANDLER FUNCTIONS ---
    
    async function handleLogin(e) { e.preventDefault(); loginError.classList.add('hidden'); try { await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPassInput.value); } catch (error) { loginError.textContent = error.message; loginError.classList.remove('hidden'); } }
    async function handleSignup(e) { e.preventDefault(); signupError.classList.add('hidden'); try { const cred = await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPassInput.value); await updateProfile(cred.user, { displayName: signupNameInput.value }); await setDoc(doc(db, "users", cred.user.uid), { name: signupNameInput.value, email: cred.user.email, createdAt: Timestamp.now() }); } catch (error) { signupError.textContent = error.message; signupError.classList.remove('hidden'); } }
    
    function handleNavigation(e) { e.preventDefault(); const link = e.target.closest('a'); if (link && link.href.includes('#')) { navigateToPage(link.getAttribute('href').substring(1)); } }
    function switchDashboardView(view) { if (isSelectMode) exitSelectMode(); tableViewContainer.classList.toggle('hidden', view !== 'table'); calendarViewContainer.classList.toggle('hidden', view !== 'calendar'); tableViewBtn.classList.toggle('active', view === 'table'); calendarViewBtn.classList.toggle('active', view === 'calendar'); if (view === 'calendar' && calendar) { setTimeout(() => calendar.render(), 0); } }
    function handleToggleFilters() { filterControls.classList.toggle('collapsed'); toggleFiltersBtn.classList.toggle('open'); }
    function handleTabSwitch(e) { const targetButton = e.target.closest('.tab-btn'); if (!targetButton) return; const targetPanelId = targetButton.dataset.target; const targetPanel = document.getElementById(targetPanelId); tabSwitcher.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); applicationDetailPage.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active')); targetButton.classList.add('active'); if (targetPanel) targetPanel.classList.add('active'); }

    function handleAddNewApplication() { populateApplicationDetailPage(null); navigateToPage('applicationDetailPage'); }
    function handleJobsTableClick(e) {
        const row = e.target.closest('[data-job-id]');
        if (!row) return;
        const jobId = row.dataset.jobId;
        const job = localJobsCache.find(j => j.id === jobId);
        if (!job) return;

        if (e.target.closest('.action-btn')) { // Quick actions
            if (e.target.closest('.duplicate-btn')) { handleDuplicateApplication(jobId); }
            else if (e.target.closest('.delete-btn')) { handleDeleteApplication(jobId); }
            else { populateApplicationDetailPage(job); navigateToPage('applicationDetailPage'); }
        } else if (isSelectMode) { // Selection mode
            const checkbox = row.querySelector('.row-checkbox');
            if (checkbox) {
                if (e.target.tagName !== 'INPUT') checkbox.checked = !checkbox.checked;
                handleSelectionChange(jobId, checkbox.checked);
            }
        } else { // Default view action
            populateApplicationDetailPage(job);
            navigateToPage('applicationDetailPage');
        }
    }
    async function handleSaveApplication(e) { e.preventDefault(); if (!currentUser) return showToast("Authentication error", "error"); syncWorkbenchFromDOM(); const getValue = (id) => document.getElementById(id).value; const getText = (id) => document.getElementById(id).textContent; const getChecked = (id) => document.getElementById(id).checked; const jobData = { jobTitle: getText('detail-job-title'), hospital: getText('detail-hospital'), healthNetwork: getText('detail-health-network'), sourceUrl: getText('detail-source-url'), location: getText('detail-location'), state: getValue('detail-state'), jobId: getText('detail-job-id').trim(), applicationType: getValue('detail-application-type'), portal: getText('detail-portal'), specialty: getText('detail-specialty'), roleLevel: getValue('detail-role-level'), contactPerson: getText('detail-contact-person'), contactEmail: getText('detail-contact-email'), contactPhone: getText('detail-contact-phone'), jobDetailNotes: getValue('detail-job-notes'), status: getValue('detail-status'), followUpComplete: getChecked('detail-follow-up-complete'), interviewType: getValue('detail-interview-type'), thankYouSent: getChecked('detail-thank-you-sent'), jobTrackerNotes: getValue('detail-tracker-notes'), closingDate: getValue('detail-closing-date') ? Timestamp.fromDate(new Date(getValue('detail-closing-date'))) : null, closingDateTimezone: getValue('detail-closing-date-tz'), dateApplied: getValue('detail-date-applied') ? Timestamp.fromDate(new Date(getValue('detail-date-applied'))) : null, followUpDate: getValue('detail-follow-up-date') ? Timestamp.fromDate(new Date(getValue('detail-follow-up-date'))) : null, interviewDate: getValue('detail-interview-date') ? Timestamp.fromDate(new Date(getValue('detail-interview-date'))) : null, jobSelectionCriteria: stagedCriteria, documents: stagedDocuments }; try { if (currentJobId) { await updateDoc(doc(db, `users/${currentUser.uid}/jobs`, currentJobId), jobData); showToast("Application updated!"); } else { jobData.createdAt = Timestamp.now(); await addDoc(collection(db, `users/${currentUser.uid}/jobs`), jobData); showToast("Application added!"); } navigateToPage('dashboard'); } catch (error) { console.error("Error saving application: ", error); showToast("Could not save application", "error"); } }
    async function handleDeleteApplication(jobIdToDelete = currentJobId) { if (jobIdToDelete && confirm("Are you sure? This action cannot be undone.")) { try { await deleteDoc(doc(db, `users/${currentUser.uid}/jobs`, jobIdToDelete)); showToast("Application deleted", "error"); if (jobIdToDelete === currentJobId) navigateToPage('dashboard'); } catch (error) { showToast("Deletion failed", "error"); } } }
    function handleDuplicateApplication(jobIdToDupe = currentJobId) { if (!jobIdToDupe) return; const originalJob = localJobsCache.find(j => j.id === jobIdToDupe); if (!originalJob) return; const newJob = JSON.parse(JSON.stringify(originalJob)); newJob.id = null; newJob.jobTitle = `${originalJob.jobTitle} (Copy)`; newJob.jobId = ''; newJob.status = 'Identified'; newJob.dateApplied = null; newJob.closingDate = null; populateApplicationDetailPage(newJob); showToast('Application duplicated.'); navigateToPage('applicationDetailPage'); }

    async function handleExperienceCardClick(e) { const card = e.target.closest('.experience-card'); if (!card) return; const favoriteButton = e.target.closest('.favorite-toggle'); const expId = card.dataset.experienceId; if (favoriteButton) { const experience = localExperiencesCache.find(exp => exp.id === expId); if (experience) { await updateDoc(doc(db, `users/${currentUser.uid}/experiences`, expId), { isFavorite: !experience.isFavorite }); } } else { const experience = localExperiencesCache.find(exp => exp.id === expId); if (experience) populateExperienceDetailPage(experience); } }
    async function handleSaveExperience(e) { e.preventDefault(); const expData = { title: document.getElementById('exp-title').textContent, paragraph: document.getElementById('exp-paragraph').value, tags: document.getElementById('exp-tags').value.split(',').map(t => t.trim()).filter(Boolean) }; try { if (currentExperienceId) { await updateDoc(doc(db, `users/${currentUser.uid}/experiences`, currentExperienceId), expData); showToast("Experience updated!"); } else { expData.createdAt = Timestamp.now(); expData.isFavorite = false; await addDoc(collection(db, `users/${currentUser.uid}/experiences`), expData); showToast("Experience saved!"); } navigateToPage('experienceBook'); } catch(error){ showToast("Save failed", "error");} }
    async function handleDeleteExperience() { if (currentExperienceId && confirm("Delete this experience?")) { try { await deleteDoc(doc(db, `users/${currentUser.uid}/experiences`, currentExperienceId)); showToast("Experience deleted.", "error"); navigateToPage('experienceBook'); } catch(error) { showToast("Deletion failed", "error"); }} }
    function handleCopyExperience() { navigator.clipboard.writeText(document.getElementById('exp-paragraph').value).then(() => showToast('Response copied to clipboard')); }

    async function handleSaveProfile() { if (!currentUser) return; try { const newName = profileNameInput.value; if (currentUser.displayName !== newName) { await updateProfile(currentUser, { displayName: newName }); await updateDoc(doc(db, "users", currentUser.uid), { name: newName }); showToast("Name updated!"); } } catch (error) { showToast("Name update failed", "error"); } }
    async function handleUpdatePassword() { if (!currentUser) return; const newPassword = newPasswordInput.value; if (newPassword.length < 6) { showToast("Password must be at least 6 characters.", "error"); return; } try { await updatePassword(currentUser, newPassword); showToast("Password updated successfully!"); newPasswordInput.value = ''; } catch (error) { showToast("Password update failed. Please log out and log back in.", "error"); console.error(error); } }
    function handleProfileImageUpload(e) { const file = e.target.files[0]; if (!file || !currentUser) return; const storageRef = ref(storage, `users/${currentUser.uid}/profileImage`); const uploadTask = uploadBytesResumable(storageRef, file); uploadTask.on('state_changed', (snapshot) => showToast(`Uploading: ${Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)}%`), (error) => showToast("Upload failed", "error"), async () => { const url = await getDownloadURL(uploadTask.snapshot.ref); await updateProfile(currentUser, { photoURL: url }); await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url }); showToast("Profile image updated!"); }); }
    function handleMasterDocumentUpload(e) { const file = e.target.files[0]; if (!file || !currentUser) return; const storageRef = ref(storage, `users/${currentUser.uid}/documents/${Date.now()}_${file.name}`); const uploadTask = uploadBytesResumable(storageRef, file); uploadTask.on('state_changed', null, (error) => showToast("Upload failed", "error"), async () => { const url = await getDownloadURL(uploadTask.snapshot.ref); await addDoc(collection(db, `users/${currentUser.uid}/documents`), { name: file.name, url: url, uploadedAt: Timestamp.now() }); showToast("Document uploaded!"); }); }
    async function handleDeleteMasterDoc(e) { if (!e.target.matches('.remove-doc-btn')) return; const docId = e.target.dataset.docId; if (confirm(`Permanently delete this document?`)) { try { const docToDelete = localDocumentsCache.find(d => d.id === docId); if (docToDelete) { const fileRef = ref(storage, docToDelete.url); await deleteObject(fileRef); } await deleteDoc(doc(db, `users/${currentUser.uid}/documents`, docId)); showToast("Document deleted", "error"); } catch (error) { showToast("Deletion failed, file may not exist in storage.", "error"); } } }
    
    function handleFilterChange(e) { const key = e.target.id.replace('-filter', '').replace('role-level', 'roleLevel').replace('sort-by', 'sortBy'); currentFilters[key] = e.target.value; masterDashboardRender(); }
    function handleClearFilters() { filterControls.querySelectorAll('select, input').forEach(el => { if (el.id === 'sort-by-filter') el.value = 'default'; else if(el.type === 'search') el.value = ''; else el.value = 'all'; }); currentFilters = { state: 'all', type: 'all', status: 'all', search: '', sortBy: 'default', roleLevel: 'all' }; masterDashboardRender(); }
    function handleTagFilterClick(e) { if (!e.target.matches('.tag-filter-btn')) return; const tag = e.target.dataset.tag; if (tag === 'all') activeExperienceTags = []; else { const index = activeExperienceTags.indexOf(tag); if (index > -1) activeExperienceTags.splice(index, 1); else activeExperienceTags.push(tag); } renderExperienceBook(); }
    function enterSelectMode() { isSelectMode = true; selectionActionBar.classList.remove('hidden'); masterDashboardRender(); }
    function exitSelectMode() { isSelectMode = false; selectedJobIds.clear(); updateSelectionCount(); selectionActionBar.classList.add('hidden'); masterDashboardRender(); }
    function updateSelectionCount() { selectedCountEl.textContent = selectedJobIds.size; }
    function handleSelectionChange(jobId, isChecked) { const id = jobId; if (isChecked) selectedJobIds.add(id); else selectedJobIds.delete(id); updateSelectionCount(); const row = jobsTableBody.querySelector(`tr[data-job-id="${id}"]`); if (row) row.classList.toggle('selected-row', isChecked); }
    function handleDeleteSelected() { if (selectedJobIds.size > 0) showDeleteModal(selectedJobIds.size); }
    async function executeDeleteSelected() { if (!currentUser || selectedJobIds.size === 0) return; const batch = writeBatch(db); selectedJobIds.forEach(id => batch.delete(doc(db, `users/${currentUser.uid}/jobs`, id))); try { await batch.commit(); showToast(`${selectedJobIds.size} job(s) deleted.`, "error"); } catch (error) { showToast("Bulk delete failed.", "error"); } finally { hideDeleteModal(); exitSelectMode(); } }
    function handleSelectAll(e) { if(e.target.id === 'select-all-checkbox') { const isChecked = e.target.checked; sortAndFilterJobs(localJobsCache).forEach(job => handleSelectionChange(job.id, isChecked)); jobsTableBody.querySelectorAll('.row-checkbox').forEach(box => box.checked = isChecked); } }

    function handleShowAttachDocModal() { attachDocModalList.innerHTML = ''; localDocumentsCache.forEach(doc => { const li = document.createElement('li'); const isAttached = stagedDocuments.some(d => d.id === doc.id); li.innerHTML = `<input type="checkbox" id="attach-${doc.id}" data-doc-name="${doc.name}" data-doc-url="${doc.url}" ${isAttached ? 'checked' : ''}> <label for="attach-${doc.id}">${doc.name}</label>`; attachDocModalList.appendChild(li); }); attachDocumentModalBackdrop.classList.remove('hidden'); }
    function hideAttachDocModal() { attachDocumentModalBackdrop.classList.add('hidden'); }
    function handleConfirmAttachDocs() { stagedDocuments = []; attachDocModalList.querySelectorAll('input:checked').forEach(input => { stagedDocuments.push({ id: input.id.replace('attach-',''), name: input.dataset.docName, url: input.dataset.docUrl }); }); renderAttachedDocuments(stagedDocuments); hideAttachDocModal(); }
    function handleDocumentButtons(e) { if (e.target.closest('.remove-doc-btn')) { const docId = e.target.closest('.remove-doc-btn').dataset.docId; stagedDocuments = stagedDocuments.filter(doc => doc.id !== docId); renderAttachedDocuments(stagedDocuments); } }
    function handleWorkbenchClick(e) { if (e.target.matches('.link-experience-btn')) { syncWorkbenchFromDOM(); currentWorkbenchTarget = e.target.closest('.workbench-item').querySelector('textarea'); showLinkExperienceModal(); } if (e.target.matches('.remove-criterion-btn')) { syncWorkbenchFromDOM(); const index = parseInt(e.target.dataset.index); stagedCriteria.splice(index, 1); renderWorkbench(stagedCriteria); } }
    function handleAddCriterion() { syncWorkbenchFromDOM(); stagedCriteria.push({ criterion: "New Criterion (click to edit)", response: "" }); renderWorkbench(stagedCriteria); }
    function handleLinkExperienceSelect(e) { if (e.target.matches('li') && e.target.dataset.experienceId) { const exp = localExperiencesCache.find(ex => ex.id === e.target.dataset.experienceId); if (exp && currentWorkbenchTarget) currentWorkbenchTarget.value = exp.paragraph; hideLinkExperienceModal(); } }

    function handleExportData() { const backupData = { jobs: localJobsCache, experiences: localExperiencesCache, documents: localDocumentsCache }; const blob = new Blob([JSON.stringify(backupData, null, 2)], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'rmo-job-flow-backup.json'; a.click(); URL.revokeObjectURL(url); showToast('Data exported!'); }
    function handleImportData(e) { const file = e.target.files[0]; if(!file || !currentUser) return; if(confirm("This will OVERWRITE all current cloud data. Are you sure?")) { const reader = new FileReader(); reader.onload = async (event) => { try { const data = JSON.parse(event.target.result); const batch = writeBatch(db); localJobsCache.forEach(job => batch.delete(doc(db, `users/${currentUser.uid}/jobs`, job.id))); localExperiencesCache.forEach(exp => batch.delete(doc(db, `users/${currentUser.uid}/experiences`, exp.id))); if(data.jobs) data.jobs.forEach(job => { delete job.id; batch.set(doc(collection(db, `users/${currentUser.uid}/jobs`)), job); }); if(data.experiences) data.experiences.forEach(exp => { delete exp.id; batch.set(doc(collection(db, `users/${currentUser.uid}/experiences`)), exp); }); await batch.commit(); showToast("Data imported successfully!"); } catch(err) { showToast("Import failed. Invalid file.", "error"); } }; reader.readAsText(file); } e.target.value = ''; }
    function handleBulkAdd(e) { const file = e.target.files[0]; if(!file || !currentUser) return; const reader = new FileReader(); reader.onload = async (event) => { try { const newJobs = JSON.parse(event.target.result); if(!Array.isArray(newJobs)) throw new Error(); const batch = writeBatch(db); newJobs.forEach(job => { job.createdAt = Timestamp.now(); batch.set(doc(collection(db, `users/${currentUser.uid}/jobs`)), job); }); await batch.commit(); showToast(`${newJobs.length} jobs added successfully.`); } catch(err) { showToast("Bulk add failed. Invalid JSON.", "error"); } }; reader.readAsText(file); e.target.value = ''; }

    // --- 6. HELPER FUNCTIONS ---
    function navigateToPage(pageKey) { if (isSelectMode) exitSelectMode(); Object.values(mainAppPages).forEach(p => p.classList.add('hidden')); if(mainAppPages[pageKey]) mainAppPages[pageKey].classList.remove('hidden'); mainNavLinks.querySelectorAll('a').forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${pageKey}`)); if (pageKey === 'experienceBook') renderExperienceBook(); if (pageKey === 'documents') renderMasterDocuments(); if (userDropdown && !userDropdown.classList.contains('hidden')) userDropdown.classList.add('hidden'); }
    function updateClock() { try { const now = new Date(); const timeString = now.toLocaleTimeString('en-US', { timeZone: timeZoneSelector.value, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }); const dateString = now.toLocaleDateString('en-GB', { timeZone: timeZoneSelector.value, weekday: 'short', day: 'numeric', month: 'short' }); currentTimeDisplay.textContent = `${dateString}, ${timeString}`; } catch (e) { currentTimeDisplay.textContent = "Invalid Timezone"; } }
    const timezoneMap = { 'Australia/Sydney': 'AEST/AEDT', 'Australia/Perth': 'AWST', 'Australia/Adelaide': 'ACST/ACDT', 'Australia/Brisbane': 'AEST', 'Australia/Darwin': 'ACST', 'Asia/Kolkata': 'IST' };
    function formatDateTimeWithOriginalTZ(date, originalTimezone) { if (!date || !originalTimezone) return 'N/A'; try { const tzAbbreviation = timezoneMap[originalTimezone] || originalTimezone; const datePart = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: originalTimezone }).format(date); const timePart = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: originalTimezone }).format(date); return `${datePart} at ${timePart} ${tzAbbreviation}`; } catch (e) { return 'Invalid Date'; } }
    function formatClosingDateForTable(job) { if (!job.closingDate) return 'N/A'; try { const date = job.closingDate; const today = new Date(); today.setHours(0,0,0,0); const sevenDaysFromNow = new Date(); sevenDaysFromNow.setDate(today.getDate() + 7); const isClosingSoon = date >= today && date < sevenDaysFromNow; const closingSoonIndicator = isClosingSoon ? ` <i class="fa-solid fa-bell closing-soon-indicator" title="Closing within 7 days"></i>` : ''; const datePart = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date); return `${datePart}${closingSoonIndicator}`; } catch (e) { return 'Invalid Date'; } }
    function populateSelect(select, options, selected) { select.innerHTML = ''; options.forEach(o => { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; select.appendChild(opt); }); if (selected) select.value = selected; }
    function checkJobIdUniqueness() { const newJobId = document.getElementById('detail-job-id').textContent.trim(); const newAppType = document.getElementById('detail-application-type').value; if (!newJobId) { jobIdError.classList.add('hidden'); document.getElementById('detail-job-id').classList.remove('input-error'); return; } const isDuplicate = localJobsCache.some(j => j.jobId === newJobId && j.applicationType === newAppType && j.id !== currentJobId); jobIdError.classList.toggle('hidden', !isDuplicate); document.getElementById('detail-job-id').classList.toggle('input-error', isDuplicate); }
    function showToast(message, type = 'success', duration = 3000) { const container = document.getElementById('toast-container'); const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; container.appendChild(toast); setTimeout(() => toast.classList.add('show'), 10); setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, duration); }
    function showSummaryModal(addedCount, skippedJobs) { summaryModalSuccess.textContent = `Successfully added ${addedCount} new job(s).`; if (skippedJobs.length > 0) { summaryModalSkippedSection.classList.remove('hidden'); summaryModalSkippedList.innerHTML = skippedJobs.map(job => `<li><strong>${job.jobId || 'No ID'}:</strong> ${job.hospital}</li>`).join(''); } else { summaryModalSkippedSection.classList.add('hidden'); } summaryModalBackdrop.classList.remove('hidden'); }
    function hideSummaryModal() { summaryModalBackdrop.classList.add('hidden'); }
    function showDeleteModal(count) { deleteCount.textContent = count; deleteModalBackdrop.classList.remove('hidden'); }
    function hideDeleteModal() { deleteModalBackdrop.classList.add('hidden'); }
    function showLinkExperienceModal() { populateLinkExperienceModal(); linkExperienceModalBackdrop.classList.remove('hidden'); linkExperienceSearch.focus(); }
    function hideLinkExperienceModal() { linkExperienceModalBackdrop.classList.add('hidden'); linkExperienceSearch.value = ''; }
    function hideAttachDocModal() { attachDocumentModalBackdrop.classList.add('hidden'); }
});
