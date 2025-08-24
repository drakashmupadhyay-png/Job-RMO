"use strict";

// ---
// RMO Job-Flow - ui.js (v2.0 - Blueprint Realized)
// Description: The "dumb" renderer of the application. It takes data
// from main.js and is solely responsible for all DOM manipulation and rendering.
// It holds no state.
// ---

import * as utils from './utils.js';

// --- GLOBAL UI STATE & SELECTORS ---
const SELECTORS = {
    // Main Layout
    appView: document.getElementById('main-app-view'),
    sidebar: document.getElementById('app-sidebar'),
    pageContainer: document.getElementById('page-content-container'),
    fab: document.getElementById('fab'),
    // Header
    userName: document.getElementById('nav-user-name'),
    userImg: document.getElementById('nav-user-img'),
    userDropdown: document.getElementById('user-dropdown'),
    // Dashboard
    dashboardPage: document.getElementById('dashboard'),
    jobsTableBody: document.getElementById('jobs-table-body'),
    filterPanel: document.getElementById('filter-panel'),
    // Settings
    settingsPage: document.getElementById('settings'),
    // ... add other frequently used selectors if needed
};

const stateOptions = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
const typeOptions = ['Statewide Campaign', 'Direct Hospital', 'Proactive EOI'];
const statusOptions = ['Identified', 'Preparing Application', 'Applied', 'Interview Offered', 'Offer Received', 'Unsuccessful', 'Closed', 'Offer Declined'];
const sortByOptions = {
    'default': 'Recently Added',
    'closing-asc': 'Closing Soon',
    'follow-up-asc': 'Follow-up Soon',
    'closed-desc': 'Recently Closed'
};


// --- THEME & GLOBAL UI ---

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.querySelectorAll('.segment-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }
}

export function renderUserInfo(profile, authUser) {
    if (SELECTORS.userName) SELECTORS.userName.textContent = profile.fullName?.split(' ')[0] || authUser.displayName?.split(' ')[0] || 'User';
    if (SELECTORS.userImg) SELECTORS.userImg.src = profile.photoURL || authUser.photoURL || 'placeholder.jpg';
}

export function toggleUserDropdown() {
    SELECTORS.userDropdown.classList.toggle('hidden');
}

export function toggleSidebar(isCollapsed) {
    SELECTORS.sidebar.classList.toggle('collapsed', isCollapsed);
}

export function setActivePage(pageId) {
    // Hide all pages
    SELECTORS.pageContainer.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    // Show the active one
    const activePage = document.getElementById(pageId);
    if (activePage) activePage.classList.remove('hidden');

    // Update sidebar navigation active state
    SELECTORS.sidebar.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${pageId}`);
    });
}

export function updateFAB(pageId) {
    const fab = SELECTORS.fab;
    switch (pageId) {
        case 'dashboard':
        case 'experienceBook':
        case 'documents':
            fab.classList.remove('hidden');
            break;
        default:
            fab.classList.add('hidden');
    }
}

// --- DASHBOARD RENDERING ---

export function renderDashboard(jobs, filters) {
    const jobsTableBody = SELECTORS.jobsTableBody;
    if (!jobsTableBody) return;

    // TODO: A proper filtering/sorting utility function will be needed here
    // const filteredJobs = utils.filterAndSortJobs(jobs, filters);
    const filteredJobs = jobs; // For now, render all

    if (filteredJobs.length === 0) {
        jobsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state-cell">No applications found. Click the '+' button to add one!</td></tr>`;
    } else {
        jobsTableBody.innerHTML = filteredJobs.map(job => renderJobRow(job)).join('');
    }
    renderDashboardFilters(filters);
}

function renderJobRow(job) {
    const statusTag = `<span class="tag status-${utils.kebabCase(job.status || 'identified')}">${job.status || 'Identified'}</span>`;
    const closingDate = job.closingDate ? utils.formatDate(job.closingDate) : 'N/A';
    const followUpDate = job.followUpDate ? utils.formatDate(job.followUpDate) : 'N/A';
    
    return `
        <tr class="interactive-row" data-job-id="${job.id}">
            <td class="select-col hidden"><input type="checkbox"></td>
            <td class="expand-col"><button class="icon-btn expand-icon"><i class="fa-solid fa-chevron-right"></i></button></td>
            <td data-label="Job">
                <div class="primary-cell-content">
                    <strong>${job.jobTitle || 'No Title'}</strong>
                    <span>@ ${job.hospital || 'No Hospital'}</span>
                </div>
            </td>
            <td data-label="Status">${statusTag}</td>
            <td data-label="Closing Date">${closingDate}</td>
            <td data-label="Follow-Up">${followUpDate}</td>
            <td class="actions-col">
                <button class="icon-btn actions-menu-btn" data-job-id="${job.id}"><i class="fa-solid fa-ellipsis-vertical"></i></button>
            </td>
        </tr>
        <tr class="secondary-data-row" data-job-id="${job.id}">
            <td colspan="7" class="secondary-data-cell">
                <!-- Secondary data will be populated on expand -->
            </td>
        </tr>
    `;
}

export function toggleRowExpansion(row, job) {
    const isExpanded = row.classList.toggle('expanded');
    const secondaryRow = row.nextElementSibling;
    if (isExpanded) {
        secondaryRow.classList.add('visible');
        const cell = secondaryRow.querySelector('.secondary-data-cell');
        cell.innerHTML = renderSecondaryJobData(job);
    } else {
        secondaryRow.classList.remove('visible');
    }
}

function renderSecondaryJobData(job) {
    return `
        <div class="secondary-data-grid">
            <div><strong>State:</strong> ${job.state || 'N/A'}</div>
            <div><strong>Type:</strong> ${job.applicationType || 'N/A'}</div>
            <div><strong>Contact:</strong> ${job.contactPerson || 'N/A'}</div>
            <div class="full-span"><strong>Notes:</strong> ${job.jobTrackerNotes || 'No notes yet.'}</div>
        </div>
    `;
}

export function toggleFilterPanel(isOpen) {
    SELECTORS.filterPanel.classList.toggle('collapsed', !isOpen);
}

function renderDashboardFilters(filters) {
    document.getElementById('state-filter').innerHTML = utils.createSelectOptions(stateOptions, filters.state, {all: 'All States'});
    document.getElementById('type-filter').innerHTML = utils.createSelectOptions(typeOptions, filters.type, {all: 'All Types'});
    document.getElementById('status-filter').innerHTML = utils.createSelectOptions(statusOptions, filters.status, {all: 'All Statuses'});
    document.getElementById('sort-by-filter').innerHTML = utils.createSelectOptions(sortByOptions, filters.sortBy);
    document.getElementById('search-bar').value = filters.search;
}

export function resetDashboardFilters() {
    renderDashboardFilters({ state: 'all', type: 'all', status: 'all', search: '', sortBy: 'default' });
}


// --- SETTINGS PAGE RENDERING ---

export function renderSettingsPage(profileData) {
    const contentContainer = document.querySelector('#settings .settings-content');
    if (!contentContainer) return;

    // Render each section. This approach keeps the HTML in index.html minimal.
    document.getElementById('profile-section').innerHTML = renderProfileSection(profileData);
    document.getElementById('security-section').innerHTML = renderSecuritySection();
    document.getElementById('dataManagement-section').innerHTML = renderDataManagementSection();
    document.getElementById('preferences-section').innerHTML = renderPreferencesSection(profileData.preferences);
    document.getElementById('account-section').innerHTML = renderAccountSection();

    applyTheme(profileData.preferences?.theme || 'system');
}

function renderProfileSection(profile) {
    return `
        <h3>Your Profile</h3>
        <div class="profile-component">
            <div class="profile-avatar-zone">
                <div id="interactive-avatar" class="interactive-avatar" title="Click to upload new image">
                    <img id="profile-image-preview" src="${profile.photoURL || 'placeholder.jpg'}" alt="Profile Picture">
                    <div class="avatar-overlay"><i class="fa-solid fa-camera"></i></div>
                </div>
            </div>
            <div class="profile-details-zone">
                <div class="form-group">
                    <label for="profile-name">Full Name</label>
                    <input type="text" id="profile-name" value="${profile.fullName || ''}">
                </div>
                <div class="form-group">
                    <label for="profile-email">Email Address</label>
                    <input type="email" id="profile-email" value="${profile.email || ''}" disabled>
                    <p class="microcopy">Email address is used for login and cannot be changed.</p>
                </div>
                <button id="save-profile-btn" class="primary-action-btn">Save Changes</button>
            </div>
        </div>
    `;
}

function renderSecuritySection() {
    return `
        <h3>Security</h3>
        <div class="form-group">
            <label for="profile-new-password">New Password</label>
            <input type="password" id="profile-new-password" placeholder="Must be at least 6 characters">
        </div>
        <div class="form-group">
            <label for="profile-confirm-password">Confirm New Password</label>
            <input type="password" id="profile-confirm-password">
        </div>
        <button id="update-password-btn" class="primary-action-btn">Update Password</button>
    `;
}

function renderDataManagementSection() {
    return `
        <h3>Data Management</h3>
        <p>Export your data regularly as a backup or import data from a previous session.</p>
        <div class="settings-actions">
            <button id="export-data-btn" class="primary-action-btn"><i class="fa-solid fa-file-export"></i> Export All</button>
            <button id="import-data-btn" class="secondary-btn"><i class="fa-solid fa-file-import"></i> Import</button>
        </div>
        <hr>
        <p>To add multiple jobs at once, upload a JSON file conforming to the data contract.</p>
        <div class="settings-actions">
            <button id="bulk-add-btn" class="primary-action-btn"><i class="fa-solid fa-file-upload"></i> Bulk Add Jobs</button>
        </div>
    `;
}

function renderPreferencesSection(preferences = {}) {
    const timezones = Intl.supportedValuesOf('timeZone'); // Get all IANA timezones
    return `
        <h3>Preferences</h3>
        <div class="form-group">
            <label>Appearance</label>
            <div id="theme-selector" class="segmented-control">
                <button data-theme="light" class="segment-btn">Light</button>
                <button data-theme="dark" class="segment-btn">Dark</button>
                <button data-theme="system" class="segment-btn active">System</button>
            </div>
        </div>
        <div class="form-group">
            <label for="timezone-selector">Your Timezone</label>
            <select id="timezone-selector">
                ${utils.createSelectOptions(timezones, preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)}
            </select>
            <p class="microcopy">This sets the default display time for dates across the application.</p>
        </div>
    `;
}

function renderAccountSection() {
    return `
        <div class="danger-zone">
            <h3>Danger Zone</h3>
            <p>This action is permanent and cannot be undone.</p>
            <button id="delete-account-btn" class="danger-btn">Delete Account</button>
        </div>
    `;
}

export function setActiveSettingsSection(sectionId) {
    document.querySelectorAll('.settings-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${sectionId}-section`)?.classList.remove('hidden');

    document.querySelectorAll('.settings-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === `#${sectionId}`);
    });
}


// --- TOAST NOTIFICATIONS ---

export function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}


// --- PLACEHOLDER RENDERERS FOR OTHER PAGES ---
export function renderExperienceBook(experiences, filters) {
    const page = document.getElementById('experienceBook');
    page.innerHTML = `<h2>Experience Book (Not Implemented)</h2>`;
}
export function renderDocumentsPage(documents) {
    const page = document.getElementById('documents');
    page.innerHTML = `<h2>Documents (Not Implemented)</h2>`;
}
export function renderApplicationDetailPage(jobData) {
    const page = document.getElementById('applicationDetailPage');
    page.innerHTML = `<h2>Application Detail: ${jobData ? jobData.jobTitle : 'New Application'} (Not Implemented)</h2>`;
}

// --- TEMP ---
export function getApplicationFormData() {
    return { jobTitle: "Test Job" }; // Placeholder
}