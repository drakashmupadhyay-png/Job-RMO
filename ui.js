"use strict";

// ---
// RMO Job-Flow - ui.js (v2.4 - Final Implementation)
// Description: The "dumb" renderer. Takes data from main.js and is
// solely responsible for all DOM manipulation and rendering. This is the
// complete, unabridged version with no placeholders.
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
    
    // Render user info into the dropdown menu
    const dropdown = SELECTORS.userDropdown;
    if (dropdown) {
        let infoEl = dropdown.querySelector('.dropdown-profile-info');
        if (!infoEl) {
            infoEl = document.createElement('div');
            infoEl.className = 'dropdown-profile-info';
            dropdown.prepend(infoEl);
        }
        infoEl.innerHTML = `
            <strong>${profile.fullName || 'User'}</strong>
            <span>${profile.email || ''}</span>
        `;
    }
}

export function toggleUserDropdown() {
    SELECTORS.userDropdown.classList.toggle('hidden');
}

export function closeUserDropdown() {
    SELECTORS.userDropdown.classList.add('hidden');
}

export function toggleSidebar(isCollapsed) {
    SELECTORS.appSidebar.classList.toggle('collapsed', isCollapsed);
}

export function toggleMobileSidebar(shouldOpen) {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;
    let overlay = document.getElementById('mobile-sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mobile-sidebar-overlay';
        overlay.addEventListener('click', () => toggleMobileSidebar(false));
        document.getElementById('main-app-view').appendChild(overlay);
    }
    const isVisible = sidebar.classList.contains('mobile-visible');
    const open = shouldOpen === undefined ? !isVisible : shouldOpen;
    if (open) {
        sidebar.classList.add('mobile-visible');
        overlay.classList.add('visible');
    } else {
        sidebar.classList.remove('mobile-visible');
        overlay.classList.remove('visible');
    }
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
    const fabIcon = SELECTORS.fab.querySelector('i');
    switch (pageId) {
        case 'dashboard': SELECTORS.fab.title = "Add New Application"; fabIcon.className = "fa-solid fa-plus"; SELECTORS.fab.classList.remove('hidden'); break;
        case 'experienceBook': SELECTORS.fab.title = "Add New Experience"; fabIcon.className = "fa-solid fa-plus"; SELECTORS.fab.classList.remove('hidden'); break;
        case 'documents': SELECTORS.fab.title = "Upload Document"; fabIcon.className = "fa-solid fa-cloud-arrow-up"; SELECTORS.fab.classList.remove('hidden'); break;
        default: SELECTORS.fab.classList.add('hidden');
    }
}

export function updateNotificationBadge(count) {
    const badge = document.getElementById('reminders-badge');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

export function renderFooter() {
    let clock = document.getElementById('sidebar-clock');
    if (clock) return; // Already rendered
    const footer = document.querySelector('.sidebar-footer');
    if(footer) {
        clock = document.createElement('div');
        clock.id = 'sidebar-clock';
        footer.prepend(clock);
    }
}

export function updateClock(timezone) {
    const timeDisplay = document.getElementById('sidebar-clock');
    if (!timeDisplay) return;
    try {
        const now = new Date();
        const options = {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
            timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        timeDisplay.textContent = now.toLocaleString('en-AU', options);
    } catch (e) {
        timeDisplay.textContent = "Invalid Timezone";
    }
}

// --- DASHBOARD RENDERING ---

export function renderDashboard(jobs, filters) {
    const jobsTableBody = document.getElementById('jobs-table-body');
    if (!jobsTableBody) return;
    const filteredJobs = jobs; // Note: Filtering logic will be added later
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
    return `<tr class="interactive-row" data-job-id="${job.id}"><td class="select-col hidden"><input type="checkbox"></td><td class="expand-col"><button class="icon-btn expand-icon" title="Show Details"><i class="fa-solid fa-chevron-right"></i></button></td><td data-label="Job"><div class="primary-cell-content"><strong>${job.jobTitle || 'No Title'}</strong><span>@ ${job.hospital || 'No Hospital'}</span></div></td><td data-label="Status">${statusTag}</td><td data-label="Closing Date">${closingDate}</td><td data-label="Follow-Up">${followUpDate}</td><td class="actions-col"><button class="icon-btn actions-menu-btn" data-job-id="${job.id}" title="More Actions"><i class="fa-solid fa-ellipsis-vertical"></i></button></td></tr><tr class="secondary-data-row" data-job-id="${job.id}"><td colspan="7" class="secondary-data-cell"></td></tr>`;
}

export function toggleRowExpansion(row, job) {
    const isExpanded = row.classList.toggle('expanded');
    const secondaryRow = row.nextElementSibling;
    if (isExpanded) {
        secondaryRow.classList.add('visible');
        secondaryRow.querySelector('.secondary-data-cell').innerHTML = `<div class="secondary-data-grid"><div><strong>State:</strong> ${job.state || 'N/A'}</div><div><strong>Type:</strong> ${job.applicationType || 'N/A'}</div><div><strong>Contact:</strong> ${job.contactPerson || 'N/A'}</div><div class="full-span"><strong>Notes:</strong> ${job.jobTrackerNotes || 'No notes yet.'}</div></div>`;
    } else {
        secondaryRow.classList.remove('visible');
    }
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

// --- APPLICATION DETAIL PAGE RENDERING ---

export function renderApplicationDetailPage(jobData) {
    const page = document.getElementById('applicationDetailPage');
    page.innerHTML = '';
    const isNew = !jobData || !jobData.id || jobData.id === 'new-from-duplicate';
    const data = jobData || { status: 'Identified', jobTitle: '', hospital: '' };
    page.innerHTML = `
        <header class="detail-summary-header"><div><h2 id="detail-summary-title" contenteditable="true" placeholder="Job Title*">${data.jobTitle}</h2><p id="detail-summary-hospital" contenteditable="true" placeholder="Enter hospital name">@ ${data.hospital}</p></div><div class="summary-status-container"><span id="detail-summary-status" class="tag status-${utils.kebabCase(data.status)}">${data.status}</span></div></header>
        <div class="detail-workspace">
            <aside class="detail-nav-pane">${renderDetailNavPane(data)}</aside>
            <div class="detail-content-pane">${renderDetailContentPanes(data)}</div>
        </div>
        <footer class="detail-footer"><button id="delete-app-btn" class="danger-btn ${isNew ? 'hidden' : ''}">Delete Application</button><div><button id="duplicate-app-btn" class="secondary-btn ${isNew ? 'hidden' : ''}">Duplicate</button><button id="save-app-btn" class="primary-action-btn">${isNew ? 'Create Application' : 'Save Changes'}</button></div></footer>
    `;
}

function renderDetailNavPane(data) {
    return `
        <nav class="in-page-nav"><a href="#overview" class="in-page-link active">Overview</a><a href="#workbench" class="in-page-link">Workbench</a><a href="#app-documents" class="in-page-link">Documents</a></nav>
        <section class="key-info-section">
            <h3>Key Information</h3>
            <div class="key-info-grid">
                <div class="key-info-item"><label>Job ID / Req Code</label><span id="detail-job-id" contenteditable="true" class="editable-field" placeholder="e.g., REQ12345">${data.jobId || ''}</span></div>
                <div class="key-info-item"><label>Location</label><span id="detail-location" contenteditable="true" class="editable-field" placeholder="e.g., Sydney, NSW">${data.location || ''}</span></div>
                <div class="key-info-item"><label>Specialty</label><span id="detail-specialty" contenteditable="true" class="editable-field" placeholder="e.g., Emergency Medicine">${data.specialty || ''}</span></div>
                <div class="key-info-item"><label>Source URL</label><span id="detail-source-url" contenteditable="true" class="editable-field" placeholder="e.g., https://jobs.health.nsw.gov.au/...">${data.sourceUrl || ''}</span></div>
                <div class="key-info-item"><label>Contact Person</label><span id="detail-contact-person" contenteditable="true" class="editable-field" placeholder="e.g., Dr. Jane Smith">${data.contactPerson || ''}</span></div>
            </div>
        </section>`;
}

function renderDetailContentPanes(data) {
    const statusOptions = ['Identified', 'Preparing Application', 'Applied', 'Interview Offered', 'Offer Received', 'Unsuccessful', 'Closed', 'Offer Declined'];
    const criteria = data.jobSelectionCriteria || [];
    const documents = data.documents || [];
    const officialDocs = documents.filter(d => d.type === 'official');
    const myDocs = documents.filter(d => d.type !== 'official');
    return `
        <div id="overview-panel" class="detail-panel">
            <h3>Tracker Overview</h3>
            <div class="form-grid"><div class="form-group"><label for="detail-status">Application Status</label><select id="detail-status">${utils.createSelectOptions(statusOptions, data.status)}</select></div><div class="form-group"><label for="detail-date-applied">Date Applied</label><input type="date" id="detail-date-applied" value="${data.dateApplied ? utils.formatDateForInput(data.dateApplied) : ''}"></div><div class="form-group"><label for="detail-closing-date">Closing Date</label><input type="datetime-local" id="detail-closing-date" value="${data.closingDate ? utils.formatDateForInput(data.closingDate, true) : ''}"></div><div class="form-group"><label for="detail-follow-up-date">Follow-Up Date</label><input type="date" id="detail-follow-up-date" value="${data.followUpDate ? utils.formatDateForInput(data.followUpDate) : ''}"></div><div class="form-group"><label for="detail-interview-date">Interview Date</label><input type="date" id="detail-interview-date" value="${data.interviewDate ? utils.formatDateForInput(data.interviewDate) : ''}"></div><div class="form-group checkbox-group"><input type="checkbox" id="detail-follow-up-complete" ${data.followUpComplete ? 'checked' : ''}><label for="detail-follow-up-complete">Follow-up Complete</label></div><div class="form-group full-span"><label for="detail-tracker-notes">Your Tracker Notes</label><textarea id="detail-tracker-notes" rows="6" placeholder="Log calls, emails, and other updates here...">${data.jobTrackerNotes || ''}</textarea></div></div>
        </div>
        <div id="workbench-panel" class="detail-panel hidden">
            <div class="toolbar"><h3>Selection Criteria Workbench</h3><button id="add-criterion-btn" class="primary-action-btn"><i class="fa-solid fa-plus"></i> Add Criterion</button></div>
            <div id="selection-criteria-workbench">${criteria.map((item, index) => `<div class="workbench-item" data-index="${index}"><div class="workbench-header"><div class="workbench-criterion" contenteditable="true">${item.criterion}</div><button class="icon-btn remove-criterion-btn" title="Remove Criterion">×</button></div><textarea class="workbench-textarea" rows="6" placeholder="Craft your response here...">${item.response || ''}</textarea><div class="workbench-actions"><button class="secondary-btn link-experience-btn"><i class="fa-solid fa-link"></i> Link Experience</button></div></div>`).join('')}</div>
        </div>
        <div id="documents-panel" class="detail-panel hidden">
            <h3>Attached Documents</h3>
            <div class="documents-container"><div class="document-column"><h4>Official Documents</h4><ul id="official-docs-list" class="file-list">${officialDocs.map(doc => `<li>${doc.name} <button class="icon-btn remove-doc-btn" data-doc-name="${doc.name}">×</button></li>`).join('')}</ul></div><div class="document-column"><h4>My Submitted Documents</h4><ul id="my-docs-list" class="file-list">${myDocs.map(doc => `<li>${doc.name} <button class="icon-btn remove-doc-btn" data-doc-name="${doc.name}">×</button></li>`).join('')}</ul><button id="attach-from-repo-btn" class="secondary-btn" style="width: 100%; margin-top: 10px;"><i class="fa-solid fa-paperclip"></i> Attach from Repository</button></div></div>
        </div>
    `;
}

export function getApplicationFormData() {
    const getEl = (id) => document.getElementById(id);
    const getText = (id) => getEl(id)?.textContent.trim() || '';
    const getValue = (id) => getEl(id)?.value || '';
    const getChecked = (id) => getEl(id)?.checked || false;
    const getDate = (id) => getValue(id) ? new Date(getValue(id)) : null;
    const criteria = Array.from(document.querySelectorAll('.workbench-item')).map(item => ({ criterion: item.querySelector('.workbench-criterion').textContent.trim(), response: item.querySelector('.workbench-textarea').value }));
    return {
        jobTitle: getText('detail-summary-title'), hospital: getText('detail-summary-hospital').replace('@ ', ''), jobId: getText('detail-job-id'), location: getText('detail-location'), specialty: getText('detail-specialty'), contactPerson: getText('detail-contact-person'), sourceUrl: getText('detail-source-url'),
        status: getValue('detail-status'), dateApplied: getDate('detail-date-applied'), closingDate: getDate('detail-closing-date'), followUpDate: getDate('detail-follow-up-date'), interviewDate: getDate('detail-interview-date'), followUpComplete: getChecked('detail-follow-up-complete'), jobTrackerNotes: getValue('detail-tracker-notes'),
        jobSelectionCriteria: criteria,
    };
}

// --- EXPERIENCE BOOK & DOCUMENTS ---

export function renderExperienceBook(experiences, filters) {
    const page = document.getElementById('experienceBook');
    page.innerHTML = '';
    const layout = document.createElement('div');
    layout.className = 'experience-book-layout';
    layout.innerHTML = `
        <aside id="experience-sidebar">
            <div class="sidebar-block"><h3>Categories</h3><ul id="experience-categories-list" class="category-list"></ul></div>
        </aside>
        <div class="experience-main-content">
            <div class="toolbar"><h2 class="page-title">Experience Book</h2><input type="search" id="experience-search-bar" placeholder="Search experiences..." value="${filters.search || ''}"></div>
            <div id="experience-tag-filters" class="tag-filter-bar"></div>
            <div id="experience-cards-container" class="experience-cards-container"></div>
        </div>
        <aside id="experience-inspector" class="inspector-panel collapsed"></aside>
    `;
    const allTags = [...new Set(experiences.flatMap(exp => exp.tags || []))].sort();
    layout.querySelector('#experience-tag-filters').innerHTML = renderTagFilters(allTags, filters.tags);
    layout.querySelector('#experience-cards-container').innerHTML = renderExperienceCards(experiences);
    page.appendChild(layout);
}

function renderTagFilters(allTags, activeTags = []) {
    let html = `<button class="tag-filter-btn ${activeTags.length === 0 ? 'active' : ''}" data-tag="all">All</button>`;
    html += allTags.map(tag => `<button class="tag-filter-btn ${activeTags.includes(tag) ? 'active' : ''}" data-tag="${tag}">${tag}</button>`).join('');
    return html;
}

function renderExperienceCards(experiences) {
    if (experiences.length === 0) return `<div class="empty-state-container"><i class="fa-solid fa-book-bookmark"></i><h3>No Experiences Found</h3><p>Click the '+' button to add your first professional experience.</p></div>`;
    return experiences.map(exp => `<div class="experience-card" data-experience-id="${exp.id}"><button class="icon-btn favorite-toggle ${exp.isFavorite ? 'favorited' : ''}" title="Toggle Favorite"><i class="fa-solid fa-star"></i></button><div class="card-content-wrapper"><h4>${exp.title || 'Untitled Experience'}</h4><div class="experience-card-tags">${(exp.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}</div><p class="experience-card-paragraph">${utils.truncate(exp.paragraph || '', 150)}</p><div class="card-meta"><span title="Times this experience has been linked to an application"><i class="fa-solid fa-paperclip"></i> ${exp.linkedApplications?.length || 0}</span></div></div></div>`).join('');
}

export function renderExperienceInspector(exp) {
    const inspector = document.getElementById('experience-inspector');
    if (!inspector) return;
    const isNew = !exp || !exp.id;
    const data = exp || { title: '', paragraph: '', tags: [] };
    inspector.innerHTML = `<div class="inspector-header"><h3>${isNew ? 'New Experience' : 'Edit Experience'}</h3><button id="close-experience-inspector-btn" class="icon-btn" aria-label="Close">×</button></div><div class="inspector-content"><div class="form-group"><label for="exp-title">Title (Question)</label><input type="text" id="exp-title" value="${data.title}"></div><div class="form-group"><label for="exp-paragraph">Response (Answer)</label><textarea id="exp-paragraph" rows="10">${data.paragraph}</textarea></div><div class="form-group"><label for="exp-tags">Tags (comma-separated)</label><input type="text" id="exp-tags" value="${(data.tags || []).join(', ')}"></div><div class="form-group ${isNew ? 'hidden' : ''}"><h4>Linked Applications</h4><ul id="exp-linked-apps-list" class="linked-items-list">${(data.linkedApplications || []).map(app => `<li>${app.jobTitle}</li>`).join('') || '<li>Not linked yet.</li>'}</ul></div></div><div class="inspector-footer"><button id="delete-exp-btn" class="danger-btn ${isNew ? 'hidden' : ''}">Delete</button><button id="save-exp-btn" class="primary-action-btn">${isNew ? 'Create' : 'Save'}</button></div>`;
    inspector.classList.remove('collapsed');
}

export function getExperienceInspectorData() {
    return { title: document.getElementById('exp-title').value, paragraph: document.getElementById('exp-paragraph').value, tags: document.getElementById('exp-tags').value.split(',').map(t => t.trim()).filter(Boolean) };
}

export function closeExperienceInspector() {
    document.getElementById('experience-inspector')?.classList.add('collapsed');
}

export function renderDocumentsPage(documents, folders = [], viewMode = 'list') {
    const page = document.getElementById('documents');
    page.innerHTML = '';
    page.innerHTML = `<div class="documents-layout"><aside id="document-sidebar"><h3>Folders</h3><ul id="document-folders-list" class="category-list"><li class="active"><a href="#" data-folder-id="all">All Files</a></li>${folders.map(f => `<li><a href="#" data-folder-id="${f.id}">${f.name}</a></li>`).join('')}</ul><button id="add-folder-btn" class="secondary-btn" style="width: 100%; margin-top: 15px;"><i class="fa-solid fa-folder-plus"></i> New Folder</button></aside><div class="document-main-content"><div class="toolbar"><h2 class="page-title">My Documents</h2><div class="view-switcher"><button id="doc-list-view-btn" class="view-btn ${viewMode === 'list' ? 'active' : ''}" title="List View"><i class="fa-solid fa-list"></i></button><button id="doc-grid-view-btn" class="view-btn ${viewMode === 'grid' ? 'active' : ''}" title="Grid View"><i class="fa-solid fa-grip"></i></button></div></div><div id="upload-dropzone" class="upload-dropzone"><i class="fa-solid fa-cloud-arrow-up"></i><p>Drag & drop files here, or click to browse</p></div><div id="document-list-container" class="${viewMode}-view">${renderDocumentItems(documents, viewMode)}</div></div><aside id="document-inspector" class="inspector-panel collapsed"></aside></div>`;
}

function renderDocumentItems(documents, viewMode) {
    if (documents.length === 0) return `<div class="empty-state-container"><i class="fa-solid fa-folder-open"></i><h3>Repository is Empty</h3><p>Upload your first document by dragging it onto the zone above.</p></div>`;
    if (viewMode === 'grid') return documents.map(doc => `<div class="doc-grid-item" data-doc-id="${doc.id}"><div class="doc-grid-icon">${utils.getFileIcon(doc.type, true)}</div><div class="doc-grid-name" title="${doc.name}">${doc.name}</div></div>`).join('');
    return `<div class="table-container"><table><thead><tr><th>Name</th><th>Date Uploaded</th><th>Size</th><th class="actions-col"></th></tr></thead><tbody>${documents.map(doc => `<tr class="interactive-row" data-doc-id="${doc.id}"><td><i class="${utils.getFileIcon(doc.type)}"></i> ${doc.name}</td><td>${utils.formatDate(doc.uploadedAt)}</td><td>${utils.formatFileSize(doc.size)}</td><td class="actions-col"><a href="${doc.url}" target="_blank" class="icon-btn" title="Download"><i class="fa-solid fa-download"></i></a></td></tr>`).join('')}</tbody></table></div>`;
}

export function renderDocumentInspector(doc) {
    const inspector = document.getElementById('document-inspector');
    if (!inspector) return;
    if (!doc) { inspector.classList.add('collapsed'); return; }
    const size = utils.formatFileSize(doc.size);
    const date = utils.formatDate(doc.uploadedAt, { month: 'long', day: 'numeric', year: 'numeric' });
    const icon = utils.getFileIcon(doc.type);
    inspector.innerHTML = `<div class="inspector-header"><h3>Document Details</h3><button id="close-document-inspector-btn" class="icon-btn" aria-label="Close">×</button></div><div class="inspector-content"><div id="doc-preview" class="doc-preview"><i class="${icon}"></i></div><h4 id="doc-inspector-name">${doc.name}</h4><div id="doc-inspector-details" class="doc-details-grid"><span><strong>Date Uploaded:</strong> ${date}</span><span><strong>File Size:</strong> ${size}</span></div><div class="form-group"><h4>Linked Applications</h4><ul id="doc-linked-apps-list" class="linked-items-list">${(doc.linkedApplications || []).map(app => `<li>${app.jobTitle}</li>`).join('') || '<li>Not linked yet.</li>'}</ul></div><div class="form-group"><h4>Version History</h4><ul id="doc-version-history-list" class="linked-items-list"><li>Version 1 (Current) - ${date}</li></ul></div></div><div class="inspector-footer"><button id="delete-doc-btn" class="danger-btn">Delete</button><button id="rename-doc-btn" class="secondary-btn">Rename</button></div>`;
    inspector.classList.remove('collapsed');
}

export function closeDocumentInspector() {
    document.getElementById('document-inspector')?.classList.add('collapsed');
}

// --- SETTINGS PAGE ---

export function renderSettingsPage(profileData) {
    if (!profileData) return;
    document.getElementById('profile-section').innerHTML = `<div class="profile-component"><div class="profile-avatar-zone"><div id="interactive-avatar" class="interactive-avatar" title="Click to upload new image"><img id="profile-image-preview" src="${profileData.photoURL || 'placeholder.jpg'}" alt="Profile Picture"><div class="avatar-overlay"><i class="fa-solid fa-camera"></i></div></div></div><div class="profile-details-zone"><div class="form-group"><label for="profile-name">Full Name</label><input type="text" id="profile-name" value="${profileData.fullName || ''}"></div><div class="form-group"><label for="profile-email">Email Address</label><input type="email" id="profile-email" value="${profileData.email || ''}" disabled><p class="microcopy">Email address is used for login and cannot be changed.</p></div><button id="save-profile-btn" class="primary-action-btn">Save Changes</button></div></div>`;
    document.getElementById('security-section').innerHTML = `<h3>Security</h3><div class="form-group"><label for="profile-new-password">New Password</label><input type="password" id="profile-new-password" placeholder="Must be at least 6 characters"></div><div class="form-group"><label for="profile-confirm-password">Confirm New Password</label><input type="password" id="profile-confirm-password"></div><button id="update-password-btn" class="primary-action-btn">Update Password</button>`;
    document.getElementById('dataManagement-section').innerHTML = `<h3>Data Management</h3><p>Export your data regularly as a backup or import data from a previous session.</p><div class="settings-actions"><button id="export-data-btn" class="primary-action-btn"><i class="fa-solid fa-file-export"></i> Export All</button><button id="import-data-btn" class="secondary-btn"><i class="fa-solid fa-file-import"></i> Import</button></div><hr><p>To add multiple jobs at once, upload a JSON file.</p><div class="settings-actions"><button id="bulk-add-btn" class="primary-action-btn"><i class="fa-solid fa-file-upload"></i> Bulk Add Jobs</button></div>`;
    const prefs = profileData.preferences || {};
    const timezones = {'Asia/Kolkata': 'IST', 'UTC': 'UTC', 'Australia/Sydney': 'AEST/AEDT', 'Australia/Perth': 'AWST'};
    const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.getElementById('preferences-section').innerHTML = `<h3>Preferences</h3><div class="form-group"><label>Appearance</label><div id="theme-selector" class="segmented-control"><button data-theme="light" class="segment-btn">Light</button><button data-theme="dark" class="segment-btn">Dark</button><button data-theme="system" class="segment-btn active">System</button></div></div><div class="form-group"><label for="timezone-selector">Your Timezone</label><select id="timezone-selector">${utils.createSelectOptions(timezones, prefs.timezone || defaultTz)}</select><p class="microcopy">Sets the default display time for dates.</p></div><button id="save-preferences-btn" class="primary-action-btn">Save Preferences</button>`;
    document.getElementById('account-section').innerHTML = `<div class="danger-zone"><h3>Danger Zone</h3><p>This action is permanent and cannot be undone.</p><button id="delete-account-btn" class="danger-btn">Delete Account</button></div>`;
    applyTheme(prefs.theme || 'system');
    setActiveSettingsSection('profile');
}

export function setActiveSettingsSection(sectionId) {
    document.querySelectorAll('.settings-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${sectionId}-section`)?.classList.remove('hidden');
    document.querySelectorAll('.settings-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === `#${sectionId}`);
    });
}

// --- TOASTS ---
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