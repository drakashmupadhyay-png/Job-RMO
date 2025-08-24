"use strict";

// ---
// RMO Job-Flow - ui.js (v2.0 - Blueprint Realized)
// Description: The "dumb" renderer of the application. It takes data
// from main.js and is solely responsible for all DOM manipulation and rendering.
// It holds no state.
// ---

import * as utils from './utils.js';

// --- SELECTORS (Cached for performance) ---
const SELECTORS = {
    appSidebar: document.getElementById('app-sidebar'),
    pageContainer: document.getElementById('page-content-container'),
    fab: document.getElementById('fab'),
    userName: document.getElementById('nav-user-name'),
    userImg: document.getElementById('nav-user-img'),
    userDropdown: document.getElementById('user-dropdown'),
};

// --- GLOBAL UI MANIPULATION ---

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.querySelectorAll('.segment-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }
}

export function renderUserInfo(profile) {
    if (SELECTORS.userName) SELECTORS.userName.textContent = profile.fullName?.split(' ')[0] || 'User';
    if (SELECTORS.userImg) SELECTORS.userImg.src = profile.photoURL || 'placeholder.jpg';
}

export function toggleUserDropdown() {
    SELECTORS.userDropdown.classList.toggle('hidden');
}

export function toggleSidebar(isCollapsed) {
    SELECTORS.appSidebar.classList.toggle('collapsed', isCollapsed);
}

export function setActivePage(pageId) {
    SELECTORS.pageContainer.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    const activePage = document.getElementById(pageId);
    if (activePage) activePage.classList.remove('hidden');

    SELECTORS.appSidebar.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${pageId}`);
    });
}

export function updateFAB(pageId) {
    const fab = SELECTORS.fab;
    const fabIcon = fab.querySelector('i');
    switch (pageId) {
        case 'dashboard':
            fab.title = "Add New Application";
            fabIcon.className = "fa-solid fa-plus";
            fab.classList.remove('hidden');
            break;
        case 'experienceBook':
            fab.title = "Add New Experience";
            fabIcon.className = "fa-solid fa-plus";
            fab.classList.remove('hidden');
            break;
        case 'documents':
            fab.title = "Upload Document";
            fabIcon.className = "fa-solid fa-cloud-arrow-up";
            fab.classList.remove('hidden');
            break;
        default:
            fab.classList.add('hidden');
    }
}

// --- DASHBOARD RENDERING ---

export function renderDashboard(jobs, filters) {
    const jobsTableBody = document.getElementById('jobs-table-body');
    if (!jobsTableBody) return;

    // TODO: A proper filtering/sorting utility function will be needed here
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
            <td class="expand-col"><button class="icon-btn expand-icon" title="Show Details"><i class="fa-solid fa-chevron-right"></i></button></td>
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
                <button class="icon-btn actions-menu-btn" data-job-id="${job.id}" title="More Actions"><i class="fa-solid fa-ellipsis-vertical"></i></button>
            </td>
        </tr>
        <tr class="secondary-data-row" data-job-id="${job.id}">
            <td colspan="7" class="secondary-data-cell"></td>
        </tr>
    `;
}

export function toggleRowExpansion(row, job) {
    const isExpanded = row.classList.toggle('expanded');
    const secondaryRow = row.nextElementSibling;
    if (isExpanded) {
        secondaryRow.classList.add('visible');
        secondaryRow.querySelector('.secondary-data-cell').innerHTML = renderSecondaryJobData(job);
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
    document.getElementById('filter-panel').classList.toggle('collapsed', !isOpen);
}

function renderDashboardFilters(filters) {
    const stateOptions = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
    const typeOptions = ['Statewide Campaign', 'Direct Hospital', 'Proactive EOI'];
    const statusOptions = ['Identified', 'Preparing Application', 'Applied', 'Interview Offered', 'Offer Received', 'Unsuccessful', 'Closed', 'Offer Declined'];
    const sortByOptions = { 'default': 'Recently Added', 'closing-asc': 'Closing Soon', 'follow-up-asc': 'Follow-up Soon', 'closed-desc': 'Recently Closed' };

    document.getElementById('state-filter').innerHTML = utils.createSelectOptions(stateOptions, filters.state, {all: 'All States'});
    document.getElementById('type-filter').innerHTML = utils.createSelectOptions(typeOptions, filters.type, {all: 'All Types'});
    document.getElementById('status-filter').innerHTML = utils.createSelectOptions(statusOptions, filters.status, {all: 'All Statuses'});
    document.getElementById('sort-by-filter').innerHTML = utils.createSelectOptions(sortByOptions, filters.sortBy);
    document.getElementById('search-bar').value = filters.search || '';
}

export function resetDashboardFilters() {
    renderDashboardFilters({ state: 'all', type: 'all', status: 'all', search: '', sortBy: 'default' });
}

// --- SETTINGS PAGE RENDERING ---

export function renderSettingsPage(profileData) {
    if (!profileData) return;
    const contentContainer = document.querySelector('#settings .settings-content');
    if (!contentContainer) return;

    document.getElementById('profile-section').innerHTML = renderProfileSection(profileData);
    document.getElementById('security-section').innerHTML = renderSecuritySection();
    document.getElementById('dataManagement-section').innerHTML = renderDataManagementSection();
    document.getElementById('preferences-section').innerHTML = renderPreferencesSection(profileData.preferences);
    document.getElementById('account-section').innerHTML = renderAccountSection();

    applyTheme(profileData.preferences?.theme || 'system');
    setActiveSettingsSection('profile'); // Default to profile view
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
                <div class="form-group"><label for="profile-name">Full Name</label><input type="text" id="profile-name" value="${profile.fullName || ''}"></div>
                <div class="form-group">
                    <label for="profile-email">Email Address</label><input type="email" id="profile-email" value="${profile.email || ''}" disabled>
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
        <div class="form-group"><label for="profile-new-password">New Password</label><input type="password" id="profile-new-password" placeholder="Must be at least 6 characters"></div>
        <div class="form-group"><label for="profile-confirm-password">Confirm New Password</label><input type="password" id="profile-confirm-password"></div>
        <button id="update-password-btn" class="primary-action-btn">Update Password</button>
    `;
}

function renderDataManagementSection() {
    return `
        <h3>Data Management</h3>
        <p>Export your data regularly as a backup or import data from a previous session.</p>
        <div class="settings-actions"><button id="export-data-btn" class="primary-action-btn"><i class="fa-solid fa-file-export"></i> Export All</button><button id="import-data-btn" class="secondary-btn"><i class="fa-solid fa-file-import"></i> Import</button></div>
        <hr><p>To add multiple jobs at once, upload a JSON file conforming to the data contract.</p>
        <div class="settings-actions"><button id="bulk-add-btn" class="primary-action-btn"><i class="fa-solid fa-file-upload"></i> Bulk Add Jobs</button></div>
    `;
}

function renderPreferencesSection(preferences = {}) {
    const timezones = Intl.supportedValuesOf('timeZone');
    const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
            <select id="timezone-selector">${utils.createSelectOptions(timezones, preferences.timezone || defaultTz)}</select>
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

// --- APPLICATION DETAIL PAGE RENDERING ---

export function renderApplicationDetailPage(jobData) {
    const page = document.getElementById('applicationDetailPage');
    // Clear any previous content
    page.innerHTML = '';

    const isNew = !jobData || !jobData.id;
    const data = jobData || { status: 'Identified', jobTitle: 'New Application', hospital: 'Enter hospital name' };

    // --- Create Main Structure ---
    const header = document.createElement('header');
    header.className = 'detail-summary-header';
    header.innerHTML = `
        <div>
            <h2 id="detail-summary-title">${data.jobTitle}</h2>
            <p id="detail-summary-hospital">@ ${data.hospital}</p>
        </div>
        <div class="summary-status-container">
            <span id="detail-summary-status" class="tag status-${utils.kebabCase(data.status)}">${data.status}</span>
        </div>
    `;

    const workspace = document.createElement('div');
    workspace.className = 'detail-workspace';
    
    const navPane = document.createElement('aside');
    navPane.className = 'detail-nav-pane';
    navPane.innerHTML = `
        <nav class="in-page-nav">
            <a href="#overview" class="in-page-link active">Overview</a>
            <a href="#workbench" class="in-page-link">Workbench</a>
            <a href="#app-documents" class="in-page-link">Documents</a>
        </nav>
        <section id="key-info-section" class="key-info-section">
            <h3>Key Information</h3>
            <!-- Key info content will be populated by a helper -->
        </section>
    `;

    const contentPane = document.createElement('div');
    contentPane.className = 'detail-content-pane';
    
    const footer = document.createElement('footer');
    footer.className = 'detail-footer';
    footer.innerHTML = `
        <button id="delete-app-btn" class="danger-btn ${isNew ? 'hidden' : ''}">Delete Application</button>
        <div>
            <button id="duplicate-app-btn" class="secondary-btn ${isNew ? 'hidden' : ''}">Duplicate</button>
            <button id="save-app-btn" class="primary-action-btn">
                ${isNew ? 'Create Application' : 'Save Changes'}
            </button>
        </div>
    `;

    // --- Populate Panes with Content from Helpers ---
    navPane.querySelector('#key-info-section').innerHTML += renderDetailKeyInfo(data);
    contentPane.innerHTML = `
        ${renderDetailOverviewPanel(data)}
        ${renderDetailWorkbenchPanel(data.jobSelectionCriteria || [])}
        ${renderDetailDocumentsPanel(data.documents || [])}
    `;

    // --- Assemble Page ---
    workspace.appendChild(navPane);
    workspace.appendChild(contentPane);
    page.appendChild(header);
    page.appendChild(workspace);
    page.appendChild(footer);
}

function renderDetailKeyInfo(data) {
    const sourceUrl = data.sourceUrl ? `<a href="${data.sourceUrl}" target="_blank" rel="noopener noreferrer">View Job Posting</a>` : 'N/A';
    return `
        <div class="key-info-grid">
            <div class="key-info-item">
                <label>Job ID</label>
                <span id="detail-job-id" contenteditable="true" class="editable-field">${data.jobId || ''}</span>
            </div>
            <div class="key-info-item">
                <label>Location</label>
                <span id="detail-location" contenteditable="true" class="editable-field">${data.location || ''}</span>
            </div>
            <div class="key-info-item">
                <label>Specialty</label>
                <span id="detail-specialty" contenteditable="true" class="editable-field">${data.specialty || ''}</span>
            </div>
            <div class="key-info-item">
                <label>Source</label>
                <span>${sourceUrl}</span>
            </div>
            <div class="key-info-item">
                <label>Contact</label>
                <span id="detail-contact-person" contenteditable="true" class="editable-field">${data.contactPerson || ''}</span>
            </div>
        </div>
    `;
}

function renderDetailOverviewPanel(data) {
    const statusOptions = ['Identified', 'Preparing Application', 'Applied', 'Interview Offered', 'Offer Received', 'Unsuccessful', 'Closed', 'Offer Declined'];
    return `
        <div id="overview-panel" class="detail-panel">
            <h3>Tracker Overview</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="detail-status">Application Status</label>
                    <select id="detail-status">${utils.createSelectOptions(statusOptions, data.status)}</select>
                </div>
                 <div class="form-group">
                    <label for="detail-date-applied">Date Applied</label>
                    <input type="date" id="detail-date-applied" value="${data.dateApplied ? utils.formatDateForInput(data.dateApplied) : ''}">
                </div>
                 <div class="form-group">
                    <label for="detail-closing-date">Closing Date</label>
                    <input type="datetime-local" id="detail-closing-date" value="${data.closingDate ? utils.formatDateForInput(data.closingDate, true) : ''}">
                </div>
                <div class="form-group">
                    <label for="detail-follow-up-date">Follow-Up Date</label>
                    <input type="date" id="detail-follow-up-date" value="${data.followUpDate ? utils.formatDateForInput(data.followUpDate) : ''}">
                </div>
                <div class="form-group">
                    <label for="detail-interview-date">Interview Date</label>
                    <input type="date" id="detail-interview-date" value="${data.interviewDate ? utils.formatDateForInput(data.interviewDate) : ''}">
                </div>
                <div class="form-group checkbox-group">
                    <input type="checkbox" id="detail-follow-up-complete" ${data.followUpComplete ? 'checked' : ''}>
                    <label for="detail-follow-up-complete">Follow-up Complete</label>
                </div>
                 <div class="form-group full-span">
                    <label for="detail-tracker-notes">Your Tracker Notes</label>
                    <textarea id="detail-tracker-notes" rows="6" placeholder="Log calls, emails, and other updates here...">${data.jobTrackerNotes || ''}</textarea>
                </div>
            </div>
        </div>
    `;
}

function renderDetailWorkbenchPanel(criteria = []) {
    const criteriaHtml = criteria.map((item, index) => `
        <div class="workbench-item" data-index="${index}">
            <div class="workbench-header">
                <div class="workbench-criterion" contenteditable="true">${item.criterion}</div>
                <button class="icon-btn remove-criterion-btn" title="Remove Criterion">×</button>
            </div>
            <textarea class="workbench-textarea" rows="6" placeholder="Craft your response here...">${item.response || ''}</textarea>
            <div class="workbench-actions">
                <button class="secondary-btn link-experience-btn"><i class="fa-solid fa-link"></i> Link Experience</button>
            </div>
        </div>
    `).join('');

    return `
        <div id="workbench-panel" class="detail-panel hidden">
            <div class="toolbar">
                <h3>Selection Criteria Workbench</h3>
                <button id="add-criterion-btn" class="primary-action-btn"><i class="fa-solid fa-plus"></i> Add Criterion</button>
            </div>
            <div id="selection-criteria-workbench">${criteriaHtml}</div>
        </div>
    `;
}

function renderDetailDocumentsPanel(documents = []) {
    const officialDocs = documents.filter(d => d.type === 'official');
    const myDocs = documents.filter(d => d.type !== 'official');

    return `
        <div id="documents-panel" class="detail-panel hidden">
            <h3>Attached Documents</h3>
            <div class="documents-container">
                <div class="document-column">
                    <h4>Official Documents</h4>
                    <ul id="official-docs-list" class="file-list">
                        ${officialDocs.map(doc => `<li>${doc.name} <button class="icon-btn remove-doc-btn" data-doc-name="${doc.name}">×</button></li>`).join('')}
                    </ul>
                </div>
                <div class="document-column">
                    <h4>My Submitted Documents</h4>
                    <ul id="my-docs-list" class="file-list">
                         ${myDocs.map(doc => `<li>${doc.name} <button class="icon-btn remove-doc-btn" data-doc-name="${doc.name}">×</button></li>`).join('')}
                    </ul>
                    <button id="attach-from-repo-btn" class="secondary-btn" style="width: 100%; margin-top: 10px;"><i class="fa-solid fa-paperclip"></i> Attach from Repository</button>
                </div>
            </div>
        </div>
    `;
}

export function getApplicationFormData() {
    const getEl = (id) => document.getElementById(id);
    const getText = (id) => getEl(id)?.textContent || '';
    const getValue = (id) => getEl(id)?.value || '';
    const getChecked = (id) => getEl(id)?.checked || false;
    const getDate = (id) => getValue(id) ? new Date(getValue(id)) : null;

    const criteria = Array.from(document.querySelectorAll('.workbench-item')).map(item => ({
        criterion: item.querySelector('.workbench-criterion').textContent,
        response: item.querySelector('.workbench-textarea').value
    }));

    return {
        jobTitle: getText('detail-summary-title'),
        hospital: getText('detail-summary-hospital').replace('@ ', ''),
        jobId: getText('detail-job-id'),
        location: getText('detail-location'),
        specialty: getText('detail-specialty'),
        contactPerson: getText('detail-contact-person'),
        
        status: getValue('detail-status'),
        dateApplied: getDate('detail-date-applied'),
        closingDate: getDate('detail-closing-date'),
        followUpDate: getDate('detail-follow-up-date'),
        interviewDate: getDate('detail-interview-date'),
        followUpComplete: getChecked('detail-follow-up-complete'),
        jobTrackerNotes: getValue('detail-tracker-notes'),

        jobSelectionCriteria: criteria,
        // documents will be handled separately in main.js state
    };
}


// --- OTHER PAGE RENDERERS (Placeholders) ---

export function renderExperienceBook(experiences, filters) {
    const page = document.getElementById('experienceBook');
    // Clear any previous content to prevent SPA rendering bugs
    page.innerHTML = '';

    // --- Create Main Layout Structure ---
    const layout = document.createElement('div');
    layout.className = 'experience-book-layout';

    // 1. Organizational Sidebar
    const sidebar = document.createElement('aside');
    sidebar.id = 'experience-sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-block">
            <h3>Categories</h3>
            <ul id="experience-categories-list" class="category-list">
                <!-- Category links will be rendered here -->
            </ul>
        </div>
    `;

    // 2. Main Content Area
    const mainContent = document.createElement('div');
    mainContent.className = 'experience-main-content';
    mainContent.innerHTML = `
        <div class="toolbar">
            <h2 class="page-title">Experience Book</h2>
            <input type="search" id="experience-search-bar" placeholder="Search experiences..." value="${filters.search || ''}">
        </div>
        <div id="experience-tag-filters" class="tag-filter-bar">
            <!-- Tag filter buttons will be rendered here -->
        </div>
        <div id="experience-cards-container" class="experience-cards-container">
            <!-- Experience cards will be rendered here -->
        </div>
    `;

    // 3. Inspector Panel
    const inspector = document.createElement('aside');
    inspector.id = 'experience-inspector';
    inspector.className = 'inspector-panel collapsed';
    // The inspector's content will be populated when a card is clicked

    // --- Populate Content ---
    // TODO: A proper filtering/sorting utility function will be needed here
    const filteredExperiences = experiences; // For now, render all

    const allTags = [...new Set(experiences.flatMap(exp => exp.tags || []))].sort();
    mainContent.querySelector('#experience-tag-filters').innerHTML = renderTagFilters(allTags, filters.tags);
    mainContent.querySelector('#experience-cards-container').innerHTML = renderExperienceCards(filteredExperiences);
    
    // --- Assemble Page ---
    layout.appendChild(sidebar);
    layout.appendChild(mainContent);
    layout.appendChild(inspector);
    page.appendChild(layout);
}

// --- In ui.js, ADD these new helper functions ---

function renderTagFilters(allTags, activeTags = []) {
    const allButtonClass = activeTags.length === 0 ? 'active' : '';
    let html = `<button class="tag-filter-btn ${allButtonClass}" data-tag="all">All</button>`;
    
    html += allTags.map(tag => {
        const activeButtonClass = activeTags.includes(tag) ? 'active' : '';
        return `<button class="tag-filter-btn ${activeButtonClass}" data-tag="${tag}">${tag}</button>`;
    }).join('');

    return html;
}

function renderExperienceCards(experiences) {
    if (experiences.length === 0) {
        return `<div class="empty-state-container"><i class="fa-solid fa-book-bookmark"></i><h3>No Experiences Found</h3><p>Click the '+' button to add your first professional experience.</p></div>`;
    }
    
    return experiences.map(exp => `
        <div class="experience-card" data-experience-id="${exp.id}">
            <button class="icon-btn favorite-toggle ${exp.isFavorite ? 'favorited' : ''}" title="Toggle Favorite">
                <i class="fa-solid fa-star"></i>
            </button>
            <div class="card-content-wrapper">
                <h4>${exp.title || 'Untitled Experience'}</h4>
                <div class="experience-card-tags">
                    ${(exp.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <p class="experience-card-paragraph">${utils.truncate(exp.paragraph || '', 150)}</p>
                <div class="card-meta">
                    <span title="Times this experience has been linked to an application">
                        <i class="fa-solid fa-paperclip"></i> ${exp.linkedApplications?.length || 0}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Renders the content of the Inspector Panel for a given experience.
 * @param {object|null} exp The experience data, or null for a new experience.
 */
export function renderExperienceInspector(exp) {
    const inspector = document.getElementById('experience-inspector');
    if (!inspector) return;

    const isNew = !exp || !exp.id;
    const data = exp || { title: '', paragraph: '', tags: [] };

    inspector.innerHTML = `
        <div class="inspector-header">
            <h3>${isNew ? 'New Experience' : 'Edit Experience'}</h3>
            <button id="close-experience-inspector-btn" class="icon-btn" aria-label="Close">×</button>
        </div>
        <div class="inspector-content">
            <div class="form-group">
                <label for="exp-title">Title (Question)</label>
                <input type="text" id="exp-title" value="${data.title}">
            </div>
            <div class="form-group">
                <label for="exp-paragraph">Response (Answer)</label>
                <textarea id="exp-paragraph" rows="10">${data.paragraph}</textarea>
            </div>
            <div class="form-group">
                <label for="exp-tags">Tags (comma-separated)</label>
                <input type="text" id="exp-tags" value="${(data.tags || []).join(', ')}">
            </div>
            <div class="form-group ${isNew ? 'hidden' : ''}">
                <h4>Linked Applications</h4>
                <ul id="exp-linked-apps-list" class="linked-items-list">
                    ${(data.linkedApplications || []).map(app => `<li>${app.jobTitle}</li>`).join('') || '<li>Not linked to any applications yet.</li>'}
                </ul>
            </div>
        </div>
        <div class="inspector-footer">
            <button id="delete-exp-btn" class="danger-btn ${isNew ? 'hidden' : ''}">Delete</button>
            <button id="save-exp-btn" class="primary-action-btn">${isNew ? 'Create' : 'Save'}</button>
        </div>
    `;
    inspector.classList.remove('collapsed');
}

export function closeExperienceInspector() {
    const inspector = document.getElementById('experience-inspector');
    if (inspector) {
        inspector.classList.add('collapsed');
    }
}

export function renderDocumentsPage(documents, folders = [], viewMode = 'list') {
    const page = document.getElementById('documents');
    // Clear any previous content to prevent SPA rendering bugs
    page.innerHTML = '';

    // --- Create Main Layout Structure ---
    const layout = document.createElement('div');
    layout.className = 'documents-layout';

    // 1. Organizational Sidebar
    const sidebar = document.createElement('aside');
    sidebar.id = 'document-sidebar';
    sidebar.innerHTML = `
        <h3>Folders</h3>
        <ul id="document-folders-list" class="category-list">
            <li class="active"><a href="#" data-folder-id="all">All Files</a></li>
            ${folders.map(folder => `<li><a href="#" data-folder-id="${folder.id}">${folder.name}</a></li>`).join('')}
        </ul>
        <button id="add-folder-btn" class="secondary-btn" style="width: 100%; margin-top: 15px;"><i class="fa-solid fa-folder-plus"></i> New Folder</button>
    `;

    // 2. Main Content Area
    const mainContent = document.createElement('div');
    mainContent.className = 'document-main-content';
    mainContent.innerHTML = `
        <div class="toolbar">
            <h2 class="page-title">My Documents</h2>
            <div class="view-switcher">
                <button id="doc-list-view-btn" class="view-btn ${viewMode === 'list' ? 'active' : ''}" title="List View"><i class="fa-solid fa-list"></i></button>
                <button id="doc-grid-view-btn" class="view-btn ${viewMode === 'grid' ? 'active' : ''}" title="Grid View"><i class="fa-solid fa-grip"></i></button>
            </div>
        </div>
        <div id="upload-dropzone" class="upload-dropzone">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <p>Drag & drop files here, or click to browse</p>
        </div>
        <div id="document-list-container" class="${viewMode}-view">
            <!-- Document items will be rendered here -->
        </div>
    `;

    // 3. Inspector Panel
    const inspector = document.createElement('aside');
    inspector.id = 'document-inspector';
    inspector.className = 'inspector-panel collapsed';
    // Inspector content will be populated when a document is clicked

    // --- Populate Content ---
    mainContent.querySelector('#document-list-container').innerHTML = renderDocumentItems(documents, viewMode);
    
    // --- Assemble Page ---
    layout.appendChild(sidebar);
    layout.appendChild(mainContent);
    layout.appendChild(inspector);
    page.appendChild(layout);
}

// --- In ui.js, ADD these new helper functions ---

function renderDocumentItems(documents, viewMode) {
    if (documents.length === 0) {
        return `<div class="empty-state-container"><i class="fa-solid fa-folder-open"></i><h3>Repository is Empty</h3><p>Upload your first document by dragging it onto the zone above.</p></div>`;
    }

    if (viewMode === 'grid') {
        return documents.map(doc => renderDocumentGridItem(doc)).join('');
    } else {
        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Date Uploaded</th>
                            <th>Size</th>
                            <th class="actions-col" aria-label="Actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${documents.map(doc => renderDocumentListItem(doc)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

function renderDocumentListItem(doc) {
    const icon = utils.getFileIcon(doc.type);
    const size = utils.formatFileSize(doc.size);
    const date = utils.formatDate(doc.uploadedAt, { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `
        <tr class="interactive-row" data-doc-id="${doc.id}">
            <td><i class="${icon}"></i> ${doc.name}</td>
            <td>${date}</td>
            <td>${size}</td>
            <td class="actions-col">
                <a href="${doc.url}" target="_blank" class="icon-btn" title="Download"><i class="fa-solid fa-download"></i></a>
            </td>
        </tr>
    `;
}

function renderDocumentGridItem(doc) {
    const icon = utils.getFileIcon(doc.type, true); // Get large icon for grid view
    
    return `
        <div class="doc-grid-item" data-doc-id="${doc.id}">
            <div class="doc-grid-icon">${icon}</div>
            <div class="doc-grid-name" title="${doc.name}">${doc.name}</div>
        </div>
    `;
}

/**
 * Renders the content of the Inspector Panel for a given document.
 * @param {object|null} doc The document data.
 */
export function renderDocumentInspector(doc) {
    const inspector = document.getElementById('document-inspector');
    if (!inspector) return;
    if (!doc) {
        inspector.classList.add('collapsed');
        return;
    }

    const size = utils.formatFileSize(doc.size);
    const date = utils.formatDate(doc.uploadedAt, { month: 'long', day: 'numeric', year: 'numeric' });
    const icon = utils.getFileIcon(doc.type);

    inspector.innerHTML = `
        <div class="inspector-header">
            <h3>Document Details</h3>
            <button id="close-document-inspector-btn" class="icon-btn" aria-label="Close">×</button>
        </div>
        <div class="inspector-content">
            <div id="doc-preview" class="doc-preview"><i class="${icon}"></i></div>
            <h4 id="doc-inspector-name">${doc.name}</h4>
            <div id="doc-inspector-details" class="doc-details-grid">
                <span><strong>Date Uploaded:</strong> ${date}</span>
                <span><strong>File Size:</strong> ${size}</span>
            </div>
            <div class="form-group">
                <h4>Linked Applications</h4>
                <ul id="doc-linked-apps-list" class="linked-items-list">
                     ${(doc.linkedApplications || []).map(app => `<li>${app.jobTitle}</li>`).join('') || '<li>Not linked to any applications yet.</li>'}
                </ul>
            </div>
            <div class="form-group">
                <h4>Version History</h4>
                <ul id="doc-version-history-list" class="linked-items-list">
                    <li>Version 1 (Current) - ${date}</li>
                    <!-- Future versions would be listed here -->
                </ul>
            </div>
        </div>
        <div class="inspector-footer">
            <button id="delete-doc-btn" class="danger-btn">Delete</button>
            <button id="rename-doc-btn" class="secondary-btn">Rename</button>
        </div>
    `;
    inspector.classList.remove('collapsed');
}

export function closeDocumentInspector() {
    const inspector = document.getElementById('document-inspector');
    if (inspector) {
        inspector.classList.add('collapsed');
    }
}

// --- UTILITY & TOASTS ---

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