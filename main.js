"use strict";

// --- 0. IMPORTS ---
import { auth, db, storage } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, onSnapshot, query, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as api from './api.js';
import * as ui from './ui.js';

// --- 1. GLOBAL STATE & UI SELECTORS ---
let currentUser = null;
let userProfileData = {};
let jobsUnsubscribe = null;
let experiencesUnsubscribe = null;
let documentsUnsubscribe = null;

let localJobsCache = [];
let localExperiencesCache = [];
let localDocumentsCache = [];

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
let clockInterval;

// UI Selectors
const filterControls = document.getElementById('filter-controls');
const stateFilter = document.getElementById('state-filter'), typeFilter = document.getElementById('type-filter'), statusFilter = document.getElementById('status-filter'), sortByFilter = document.getElementById('sort-by-filter'), roleLevelFilter = document.getElementById('role-level-filter');
const searchBar = document.getElementById('search-bar');
const applicationDetailForm = document.getElementById('application-detail-form');
const experienceDetailForm = document.getElementById('experience-detail-form');
const calendarEl = document.getElementById('calendar');
let calendar;

const closedStatuses = ['Closed', 'Offer Declined', 'Unsuccessful'];
const statusOptions = ['Identified', 'Preparing Application', 'Applied', 'Interview Offered', 'Offer Received', 'Unsuccessful', 'Closed', 'Offer Declined']; 
const typeOptions = ['Statewide Campaign', 'Direct Hospital', 'Proactive EOI']; 
const stateOptions = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT']; 
const roleLevelOptions = ['Intern', 'RMO', 'SRMO', 'Registrar', 'Trainee'];

// --- 2. EXPORTED FUNCTIONS for auth.js ---

export function initializeAppForUser(user) {
    currentUser = user;
    attachFirestoreListeners(user.uid);
    if (!eventListenersAttached) {
        attachMainAppEventListeners();
        eventListenersAttached = true;
    }
    initializeCalendar();
    if(clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(updateClock, 1000);
    ui.navigateToPage('dashboard');
}

export function cleanupAfterLogout() {
    if (jobsUnsubscribe) jobsUnsubscribe();
    if (experiencesUnsubscribe) experiencesUnsubscribe();
    if (documentsUnsubscribe) documentsUnsubscribe();
    localJobsCache = [], localExperiencesCache = [], localDocumentsCache = [];
    userProfileData = {};
    document.getElementById('jobs-table-body').innerHTML = '';
    document.getElementById('card-view-container').innerHTML = '';
    if (clockInterval) clearInterval(clockInterval);
}

// --- 3. FIRESTORE & STATE MANAGEMENT ---

function attachFirestoreListeners(userId) {
    onSnapshot(doc(db, "users", userId), (doc) => {
        if (doc.exists()) {
            userProfileData = doc.data();
            ui.updateUIAfterLogin(currentUser, userProfileData);
        }
    });
    const jobsRef = collection(db, `users/${userId}/jobs`);
    jobsUnsubscribe = onSnapshot(query(jobsRef, orderBy("createdAt", "desc")), (snapshot) => {
        localJobsCache = snapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id, closingDate: data.closingDate?.toDate(), dateApplied: data.dateApplied?.toDate(), followUpDate: data.followUpDate?.toDate(), interviewDate: data.interviewDate?.toDate(), createdAt: data.createdAt?.toDate() };
        });
        ui.masterDashboardRender(localJobsCache, currentFilters, isSelectMode, selectedJobIds, calendar);
    });
    const experiencesRef = collection(db, `users/${userId}/experiences`);
    experiencesUnsubscribe = onSnapshot(query(experiencesRef, orderBy("createdAt", "desc")), (snapshot) => {
        localExperiencesCache = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        if (document.getElementById('experienceBook') && !document.getElementById('experienceBook').classList.contains('hidden')) {
            ui.renderExperienceBook(localExperiencesCache, activeExperienceTags);
        }
    });
    const documentsRef = collection(db, `users/${userId}/documents`);
    documentsUnsubscribe = onSnapshot(query(documentsRef, orderBy("uploadedAt", "desc")), (snapshot) => {
        localDocumentsCache = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        if (document.getElementById('documents') && !document.getElementById('documents').classList.contains('hidden')) {
            ui.renderMasterDocuments(localDocumentsCache);
        }
    });
}

function initializeCalendar() {
    if (calendarEl && !calendar) {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
            events: [],
            eventClick: (info) => {
                const jobId = info.event.extendedProps.jobId;
                const job = localJobsCache.find(j => j.id === jobId);
                if (job) {
                    handleViewJob(jobId);
                }
            }
        });
    }
}

// --- 4. EVENT LISTENERS ---

function attachMainAppEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    document.querySelector('.nav-links').addEventListener('click', handleNavigation);
    document.getElementById('user-dropdown').addEventListener('click', handleNavigation);
    document.getElementById('nav-user-menu').addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('user-dropdown').classList.toggle('hidden'); });
    window.addEventListener('click', () => { if (!document.getElementById('user-dropdown').classList.contains('hidden')) document.getElementById('user-dropdown').classList.add('hidden'); });
    
    document.getElementById('back-to-dashboard-btn').addEventListener('click', () => ui.navigateToPage('dashboard'));
    document.getElementById('back-to-exp-book-btn').addEventListener('click', () => ui.navigateToPage('experienceBook'));
    
    document.getElementById('add-new-application-btn').addEventListener('click', handleAddNewApplication);
    document.getElementById('jobs-table-body').addEventListener('click', handleJobsTableClick);
    document.getElementById('card-view-container').addEventListener('click', handleJobsTableClick);
    document.getElementById('toggle-filters-btn').addEventListener('click', handleToggleFilters);
    [stateFilter, typeFilter, statusFilter, sortByFilter, roleLevelFilter].forEach(el => el.addEventListener('change', handleFilterChange));
    searchBar.addEventListener('input', () => { currentFilters.search = searchBar.value; ui.masterDashboardRender(localJobsCache, currentFilters, isSelectMode, selectedJobIds, calendar); });
    document.getElementById('clear-filters-btn').addEventListener('click', handleClearFilters);
    document.getElementById('select-jobs-btn').addEventListener('click', enterSelectMode);
    document.getElementById('cancel-selection-btn').addEventListener('click', exitSelectMode);
    document.getElementById('delete-selected-btn').addEventListener('click', handleDeleteSelected);
    jobsTableHeader.addEventListener('change', handleSelectAll);

    applicationDetailForm.addEventListener('submit', handleSaveApplication);
    document.getElementById('delete-app-btn').addEventListener('click', handleDeleteApplication);
    document.getElementById('duplicate-app-btn').addEventListener('click', handleDuplicateApplication);
    document.getElementById('applicationDetailPage').querySelector('.tab-switcher').addEventListener('click', handleTabSwitch);
    document.getElementById('detail-job-id').addEventListener('input', checkJobIdUniqueness);
    document.getElementById('upload-official-doc-btn').addEventListener('click', () => document.getElementById('official-doc-file-input').click());
    document.getElementById('official-doc-file-input').addEventListener('change', handleOfficialDocUpload);
    document.getElementById('attach-from-repo-btn').addEventListener('click', handleAttachFromRepo);
    
    document.getElementById('add-new-experience-btn').addEventListener('click', () => handleAddNewExperience());
    document.getElementById('experience-search-bar').addEventListener('input', () => ui.renderExperienceBook(localExperiencesCache, activeExperienceTags));
    document.getElementById('experience-tag-filters').addEventListener('click', handleTagFilterClick);
    document.getElementById('experience-cards-container').addEventListener('click', handleExperienceCardClick);
    experienceDetailForm.addEventListener('submit', handleSaveExperience);
    document.getElementById('delete-exp-btn').addEventListener('click', handleDeleteExperience);
    
    document.getElementById('save-profile-btn').addEventListener('click', handleSaveProfile);
    document.getElementById('update-password-btn').addEventListener('click', handleUpdatePassword);
    document.getElementById('profile-image-upload-btn').addEventListener('click', () => document.getElementById('profile-image-upload').click());
    document.getElementById('profile-image-upload').addEventListener('change', handleProfileImageUpload);
    document.getElementById('master-doc-browse-btn').addEventListener('click', () => document.getElementById('master-doc-file-input').click());
    document.getElementById('master-doc-file-input').addEventListener('change', handleMasterDocumentUpload);
    masterDocsList.addEventListener('click', handleDeleteMasterDoc);

    document.getElementById('delete-modal-close-btn').addEventListener('click', ui.hideDeleteModal);
    document.getElementById('delete-modal-cancel-btn').addEventListener('click', ui.hideDeleteModal);
    document.getElementById('delete-modal-confirm-btn').addEventListener('click', executeDeleteSelected);
    document.getElementById('attach-document-close-btn').addEventListener('click', ui.hideAttachDocModal);
    document.getElementById('attach-document-list').addEventListener('click', handleAttachDocSelect);
}

// --- 5. EVENT HANDLERS ---

function handleNavigation(e) { 
    e.preventDefault(); 
    const link = e.target.closest('a'); 
    if (link && link.href.includes('#')) {
        ui.navigateToPage(link.getAttribute('href').substring(1)); 
    }
}

function handleAddNewApplication() {
    currentJobId = null;
    ui.populateApplicationDetailPage({}, stateOptions, typeOptions, roleLevelOptions);
    ui.navigateToPage('applicationDetailPage');
}

function handleJobsTableClick(e) {
    const target = e.target.closest('button.action-btn, tr, .job-card');
    if (!target) return;
    const jobId = target.dataset.jobId;

    if (isSelectMode && target.tagName === 'TR') {
        const checkbox = target.querySelector('.row-checkbox');
        if (checkbox) {
            if (e.target.tagName !== 'INPUT') checkbox.checked = !checkbox.checked;
            handleSelectionChange(jobId, checkbox.checked);
        }
    } else if (target.classList.contains('view-btn') || target.classList.contains('job-card')) {
        handleViewJob(jobId);
    } else if (target.classList.contains('duplicate-btn')) {
        handleDuplicateApplication(jobId);
    } else if (target.classList.contains('delete-btn')) {
        handleDeleteApplication(jobId);
    }
}

function handleViewJob(jobId) {
    const job = localJobsCache.find(j => j.id === jobId);
    if (job) {
        currentJobId = job.id;
        stagedDocuments = job.documents || [];
        stagedCriteria = job.jobSelectionCriteria || [];
        ui.populateApplicationDetailPage(job, stateOptions, typeOptions, roleLevelOptions);
        ui.navigateToPage('applicationDetailPage');
    }
}

async function handleSaveApplication(e) {
    e.preventDefault();
    if (!currentUser) return ui.showToast("Authentication error", "error");
    
    stagedCriteria = Array.from(document.getElementById('selection-criteria-workbench').querySelectorAll('.workbench-item')).map(item => ({
        criterion: item.querySelector('.workbench-criterion').textContent,
        response: item.querySelector('textarea').value
    }));

    const getValue = id => document.getElementById(id).value;
    const getText = id => document.getElementById(id).textContent;
    const getChecked = id => document.getElementById(id).checked;

    const jobData = {
        jobTitle: getText('detail-job-title'), hospital: getText('detail-hospital'), healthNetwork: getText('detail-health-network'), sourceUrl: getText('detail-source-url'), location: getText('detail-location'), state: getValue('detail-state'), jobId: getText('detail-job-id').trim(), applicationType: getValue('detail-application-type'), portal: getText('detail-portal'), specialty: getText('detail-specialty'), roleLevel: getValue('detail-role-level'), contactPerson: getText('detail-contact-person'), contactEmail: getText('detail-contact-email'), contactPhone: getText('detail-contact-phone'), jobDetailNotes: getValue('detail-job-notes'), status: getValue('detail-status'), followUpComplete: getChecked('detail-follow-up-complete'), interviewType: getValue('detail-interview-type'), thankYouSent: getChecked('detail-thank-you-sent'), jobTrackerNotes: getValue('detail-tracker-notes'), 
        closingDate: getValue('detail-closing-date') ? Timestamp.fromDate(new Date(getValue('detail-closing-date'))) : null, 
        closingDateTimezone: getValue('detail-closing-date-tz'), 
        dateApplied: getValue('detail-date-applied') ? Timestamp.fromDate(new Date(getValue('detail-date-applied'))) : null, 
        followUpDate: getValue('detail-follow-up-date') ? Timestamp.fromDate(new Date(getValue('detail-follow-up-date'))) : null, 
        interviewDate: getValue('detail-interview-date') ? Timestamp.fromDate(new Date(getValue('detail-interview-date'))) : null,
        jobSelectionCriteria: stagedCriteria,
        documents: stagedDocuments
    };

    try {
        await api.saveJob(currentUser.uid, jobData, currentJobId);
        ui.showToast(currentJobId ? "Application updated!" : "Application added!");
        ui.navigateToPage('dashboard');
    } catch (error) {
        console.error("Error saving application: ", error);
        ui.showToast("Could not save application", "error");
    }
}

async function handleDeleteApplication(jobId) {
    const idToDelete = jobId || currentJobId;
    if (idToDelete && confirm("Are you sure you want to permanently delete this application?")) {
        try {
            await api.deleteJob(currentUser.uid, idToDelete);
            ui.showToast("Application deleted", "error");
            if (idToDelete === currentJobId) ui.navigateToPage('dashboard');
        } catch (error) {
            ui.showToast("Deletion failed", "error");
        }
    }
}

function handleDuplicateApplication(jobId) {
    const idToDup = jobId || currentJobId;
    const originalJob = localJobsCache.find(j => j.id === idToDup);
    if (!originalJob) return;
    const newJob = JSON.parse(JSON.stringify(originalJob));
    newJob.id = null;
    newJob.jobTitle = `${originalJob.jobTitle} (Copy)`;
    newJob.jobId = '';
    newJob.status = 'Identified';
    newJob.dateApplied = null;
    newJob.closingDate = null;
    currentJobId = null;
    stagedDocuments = newJob.documents || [];
    stagedCriteria = newJob.jobSelectionCriteria || [];
    ui.populateApplicationDetailPage(newJob, stateOptions, typeOptions, roleLevelOptions);
    ui.navigateToPage('applicationDetailPage');
    ui.showToast('Application duplicated. Editing the new copy.');
}

function handleAddNewExperience() {
    currentExperienceId = null;
    ui.populateExperienceDetailPage(null);
}

async function handleExperienceCardClick(e) {
    const card = e.target.closest('.experience-card');
    if (!card) return;
    const favoriteButton = e.target.closest('.favorite-toggle');
    const expId = card.dataset.experienceId;
    if (favoriteButton) {
        const experience = localExperiencesCache.find(exp => exp.id === expId);
        if (experience) {
            try {
                await api.toggleExperienceFavorite(currentUser.uid, expId, experience.isFavorite);
            } catch (error) {
                ui.showToast("Could not update favorite status", "error");
            }
        }
    } else {
        const experience = localExperiencesCache.find(exp => exp.id === expId);
        if (experience) {
            currentExperienceId = experience.id;
            ui.populateExperienceDetailPage(experience);
        }
    }
}

async function handleSaveExperience(e) {
    e.preventDefault();
    const expData = {
        title: document.getElementById('exp-title').textContent,
        paragraph: document.getElementById('exp-paragraph').value,
        tags: document.getElementById('exp-tags').value.split(',').map(t => t.trim()).filter(Boolean)
    };
    try {
        await api.saveExperience(currentUser.uid, expData, currentExperienceId);
        ui.showToast(currentExperienceId ? "Experience updated!" : "Experience saved!");
        ui.navigateToPage('experienceBook');
    } catch(error){
        ui.showToast("Save failed", "error");
    }
}

async function handleDeleteExperience() {
    if (currentExperienceId && confirm("Delete this experience?")) {
        try {
            await api.deleteExperience(currentUser.uid, currentExperienceId);
            ui.showToast("Experience deleted.", "error");
            ui.navigateToPage('experienceBook');
        } catch(error) {
            ui.showToast("Deletion failed", "error");
        }
    }
}

async function handleSaveProfile() {
    if (!currentUser) return;
    try {
        await api.updateUserProfileName(currentUser, profileFNameInput.value, profileLNameInput.value);
        ui.showToast("Name updated!");
    } catch (error) {
        ui.showToast("Name update failed", "error");
    }
}

async function handleUpdatePassword() {
    if (!currentUser) return;
    const newPass = newPasswordInput.value;
    if (newPass.length < 6) return ui.showToast("Password must be at least 6 characters.", "error");
    try {
        await api.updateUserPassword(currentUser, newPass);
        ui.showToast("Password updated successfully!");
        newPasswordInput.value = '';
    } catch (error) {
        ui.showToast("Password update failed. Please log out and back in to complete this action.", "error");
    }
}

async function handleProfileImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    try {
        await api.uploadProfileImage(currentUser, file, (progress) => {
            ui.showToast(`Uploading: ${Math.round(progress)}%`);
        });
        ui.showToast("Profile image updated!");
    } catch (error) {
        ui.showToast("Upload failed", "error");
    }
}

async function handleMasterDocumentUpload(e) {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    try {
        await api.uploadMasterDocument(currentUser.uid, file);
        ui.showToast("Document uploaded!");
    } catch (error) {
        ui.showToast("Upload failed", "error");
    }
}

async function handleDeleteMasterDoc(e) {
    if (!e.target.matches('.remove-doc-btn')) return;
    const docId = e.target.dataset.docId;
    if (confirm(`Permanently delete this document?`)) {
        try {
            const docToDelete = localDocumentsCache.find(d => d.id === docId);
            await api.deleteMasterDocument(currentUser.uid, docToDelete);
            ui.showToast("Document deleted", "error");
        } catch (error) {
            ui.showToast("Deletion failed", "error");
        }
    }
}

function handleFilterChange(e) {
    const key = e.target.id.replace('-filter', '').replace('role-level', 'roleLevel').replace('sort-by', 'sortBy');
    currentFilters[key] = e.target.value;
    ui.masterDashboardRender(localJobsCache, currentFilters, isSelectMode, selectedJobIds, calendar);
}

function handleClearFilters() {
    filterControls.querySelectorAll('select, input').forEach(el => {
        if (el.id === 'sort-by-filter') el.value = 'default';
        else if(el.type === 'search') el.value = '';
        else el.value = 'all';
    });
    currentFilters = { state: 'all', type: 'all', status: 'all', search: '', sortBy: 'default', roleLevel: 'all' };
    ui.masterDashboardRender(localJobsCache, currentFilters, isSelectMode, selectedJobIds, calendar);
}

function handleTagFilterClick(e) {
    if (!e.target.matches('.tag-filter-btn')) return;
    const tag = e.target.dataset.tag;
    if (tag === 'all') activeExperienceTags = [];
    else {
        const index = activeExperienceTags.indexOf(tag);
        if (index > -1) activeExperienceTags.splice(index, 1);
        else activeExperienceTags.push(tag);
    }
    ui.renderExperienceBook(localExperiencesCache, activeExperienceTags);
}

function enterSelectMode() { isSelectMode = true; selectionActionBar.classList.remove('hidden'); ui.renderTable(localJobsCache, currentFilters, isSelectMode, selectedJobIds); }
function exitSelectMode() { isSelectMode = false; selectedJobIds.clear(); updateSelectionCount(); selectionActionBar.classList.add('hidden'); ui.renderTable(localJobsCache, currentFilters, isSelectMode, selectedJobIds); }
function updateSelectionCount() { document.getElementById('selected-count').textContent = selectedJobIds.size; }
function handleSelectionChange(jobId, isChecked) { if (isChecked) selectedJobIds.add(jobId); else selectedJobIds.delete(jobId); updateSelectionCount(); const row = jobsTableBody.querySelector(`tr[data-job-id="${jobId}"]`); if (row) row.classList.toggle('selected-row', isChecked); }
function handleDeleteSelected() { if (selectedJobIds.size > 0) ui.showDeleteModal(selectedJobIds.size); }
async function executeDeleteSelected() { if (!currentUser || selectedJobIds.size === 0) return; try { await api.deleteMultipleJobs(currentUser.uid, selectedJobIds); ui.showToast(`${selectedJobIds.size} job(s) deleted.`, "error"); } catch (error) { ui.showToast("Bulk delete failed.", "error"); } finally { ui.hideDeleteModal(); exitSelectMode(); } }
function handleSelectAll(e) { if(e.target.id === 'select-all-checkbox') { const isChecked = e.target.checked; ui.sortAndFilterJobs(localJobsCache, currentFilters).forEach(job => handleSelectionChange(job.id, isChecked)); jobsTableBody.querySelectorAll('.row-checkbox').forEach(box => box.checked = isChecked); } }
function handleAttachFromRepo() { ui.populateAttachDocModal(localDocumentsCache); ui.showAttachDocModal(); }
function handleAttachDocSelect(e) { const target = e.target.closest('li'); if(!target) return; const docData = { id: Date.now(), type: 'submitted', name: target.dataset.docName, url: target.dataset.docUrl }; stagedDocuments.push(docData); ui.renderDocuments(stagedDocuments); ui.hideAttachDocModal(); }

// --- 6. HELPER FUNCTIONS ---
function updateClock() { try { const now = new Date(); const timeString = now.toLocaleTimeString('en-US', { timeZone: timeZoneSelector.value, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }); const dateString = now.toLocaleDateString('en-GB', { timeZone: timeZoneSelector.value, weekday: 'short', day: 'numeric', month: 'short' }); currentTimeDisplay.textContent = `${dateString}, ${timeString}`; } catch (e) { currentTimeDisplay.textContent = "Invalid Timezone"; } }
});
