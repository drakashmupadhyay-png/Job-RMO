"use strict";

// ---
// RMO Job-Flow - ui.js (v2.9 - Filtering Logic)
// Description: The "dumb" renderer. Takes data from main.js and is
// solely responsible for all DOM manipulation and rendering.
// ---

import * as utils from './utils.js';

// --- SELECTORS (Cached for performance) ---
let SELECTORS = {}; 

let calendarInstance = null; // To hold the FullCalendar instance

/**
 * Caches all necessary DOM element selectors.
 */
export function init() {
    SELECTORS = {
        appSidebar: document.getElementById('app-sidebar'),
        pageContainer: document.getElementById('page-content-container'),
        fab: document.getElementById('fab'),
        userName: document.getElementById('nav-user-name'),
        userImg: document.getElementById('nav-user-img'),
        userDropdown: document.getElementById('user-dropdown'),
        remindersDropdown: document.getElementById('reminders-dropdown'),
    };
    console.log("UI Selectors Initialized.");
}

// --- FILTERING LOGIC ---

/**
 * Filters and sorts the jobs for the dashboard view.
 * @param {Array} jobs The array of all job objects.
 * @param {object} filters The filter object from appState.
 * @returns {Array} The filtered and sorted array of jobs.
 */
function applyDashboardFilters(jobs, filters) {
    const searchTerm = filters.search.toLowerCase();
    let filteredJobs = [...jobs];

    // 1. Filter by search term (checks multiple fields)
    if (searchTerm) {
        filteredJobs = filteredJobs.filter(job => 
            (job.jobTitle && job.jobTitle.toLowerCase().includes(searchTerm)) ||
            (job.hospital && job.hospital.toLowerCase().includes(searchTerm)) ||
            (job.location && job.location.toLowerCase().includes(searchTerm)) ||
            (job.specialty && job.specialty.toLowerCase().includes(searchTerm))
        );
    }

    // 2. Filter by state
    if (filters.state !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.state === filters.state);
    }

    // 3. Filter by type
    if (filters.type !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.applicationType === filters.type);
    }

    // 4. Filter by status
    if (filters.status !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.status === filters.status);
    }

    // 5. Apply sorting
    switch (filters.sortBy) {
        case 'closing-asc':
            filteredJobs.sort((a, b) => {
                const dateA = a.closingDate ? a.closingDate.getTime() : Infinity;
                const dateB = b.closingDate ? b.closingDate.getTime() : Infinity;
                return dateA - dateB;
            });
            break;
        case 'follow-up-asc':
            filteredJobs.sort((a, b) => {
                const dateA = a.followUpDate ? a.followUpDate.getTime() : Infinity;
                const dateB = b.followUpDate ? b.followUpDate.getTime() : Infinity;
                return dateA - dateB;
            });
            break;
        case 'default':
        default:
            // The default is createdAt descending, which is handled by the API query.
            // No extra sorting needed unless the original order was lost.
            break;
    }

    return filteredJobs;
}

/**
 * Filters experiences by search term and tags.
 * @param {Array} experiences The array of all experience objects.
 * @param {object} filters The filter object from appState.
 * @returns {Array} The filtered array of experiences.
 */
function applyExperienceBookFilters(experiences, filters) {
    const searchTerm = filters.search.toLowerCase();
    let filteredExperiences = [...experiences];

    // 1. Filter by search term
    if (searchTerm) {
        filteredExperiences = filteredExperiences.filter(exp => 
            (exp.title && exp.title.toLowerCase().includes(searchTerm)) ||
            (exp.paragraph && exp.paragraph.toLowerCase().includes(searchTerm))
        );
    }

    // 2. Filter by tags
    if (filters.tags.length > 0) {
        filteredExperiences = filteredExperiences.filter(exp => 
            exp.tags && exp.tags.some(tag => filters.tags.includes(tag))
        );
    }

    return filteredExperiences;
}


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
    const userNameEl = document.getElementById('nav-user-name');
    const userImgEl = document.getElementById('nav-user-img');
    const userDropdownEl = document.getElementById('user-dropdown');

    if (userNameEl) userNameEl.textContent = profile.fullName?.split(' ')[0] || 'User';
    if (userImgEl) userImgEl.src = profile.photoURL || 'placeholder.jpg';
    
    if (userDropdownEl) {
        let headerEl = userDropdownEl.querySelector('.dropdown-profile-header');
        if (!headerEl) {
            headerEl = document.createElement('div');
            headerEl.className = 'dropdown-profile-header';
            userDropdownEl.prepend(headerEl);
        }
        headerEl.innerHTML = `
            <img src="${profile.photoURL || 'placeholder.jpg'}" alt="User Avatar">
            <strong>${profile.fullName || 'User'}</strong>
            <span>${profile.email || ''}</span>
        `;
    }
}

export function toggleUserDropdown() {
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) userDropdown.classList.toggle('hidden');
}

export function closeUserDropdown() {
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) userDropdown.classList.add('hidden');
}

export function toggleRemindersDropdown(shouldOpen) {
    const remindersDropdown = document.getElementById('reminders-dropdown');
    if (remindersDropdown) remindersDropdown.classList.toggle('hidden', !shouldOpen);
}

export function renderRemindersDropdown(urgentJobs) {
    const container = document.getElementById('reminders-dropdown');
    if (!container) return;

    let content = '<div class="reminders-header">Urgent Reminders</div>';
    if (urgentJobs.length === 0) {
        content += '<div class="reminders-empty">No urgent reminders.</div>';
    } else {
        content += urgentJobs.map(job => {
            const closingToday = job.closingDate && new Date(job.closingDate).toDateString() === new Date().toDateString();
            const followUpDue = job.followUpDate && !job.followUpComplete && new Date(job.followUpDate).toDateString() === new Date().toDateString();
            let reason = '';
            if (closingToday) reason = 'Closes today';
            else if (followUpDue) reason = 'Follow-up due today';

            return `
                <div class="reminder-item">
                    <a href="#applicationDetail/${job.id}">
                        <strong>${job.jobTitle}</strong>
                        <span>${reason}</span>
                    </a>
                </div>
            `;
        }).join('');
    }
    container.innerHTML = content;
}

export function toggleSidebar(isCollapsed) {
    const appSidebar = document.getElementById('app-sidebar');
    if (appSidebar) appSidebar.classList.toggle('collapsed', isCollapsed);
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
    document.querySelectorAll('.page-content').forEach(p => {
        p.classList.add('hidden');
    });

    const elementIdToActivate = pageId === 'applicationDetail' ? 'applicationDetailPage' : pageId;
    const activePage = document.getElementById(elementIdToActivate);

    if (activePage) {
        activePage.classList.remove('hidden');
    } else {
        console.warn(`Page with ID "${elementIdToActivate}" not found. Falling back to dashboard.`);
        const dashboard = document.getElementById('dashboard');
        if (dashboard) dashboard.classList.remove('hidden');
    }
    
    const appSidebar = document.getElementById('app-sidebar');
    if (appSidebar) {
        const pageToHighlight = pageId.split('/')[0];
        appSidebar.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${pageToHighlight}`);
        });
    }
}

export function updateFAB(pageId) {
    const fab = document.getElementById('fab');
    if (!fab) return;
    
    const fabIcon = fab.querySelector('i');
    const pageToShow = pageId.split('/')[0];

    switch (pageToShow) {
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

export function renderDashboard(jobs, filters, viewMode = 'table') {
    const tableView = document.getElementById('table-view-container');
    const calendarView = document.getElementById('calendar-view-container');
    
    document.getElementById('table-view-btn').classList.toggle('active', viewMode === 'table');
    document.getElementById('calendar-view-btn').classList.toggle('active', viewMode === 'calendar');

    if (viewMode === 'calendar') {
        tableView.classList.add('hidden');
        calendarView.classList.remove('hidden');
        renderCalendarView(jobs); // Calendar view doesn't use table filters
    } else {
        calendarView.classList.add('hidden');
        tableView.classList.remove('hidden');
        renderTableView(jobs, filters);
    }
}

function renderTableView(jobs, filters) {
    const jobsTableBody = document.getElementById('jobs-table-body');
    if (!jobsTableBody) return;

    // APPLY THE FILTERS
    const filteredJobs = applyDashboardFilters(jobs, filters); 

    if (filteredJobs.length === 0) {
        jobsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state-cell"><div class="empty-state-container"><i class="fa-solid fa-table-list"></i><h3>No applications match your filters.</h3><p>Try clearing the filters to see all your applications.</p></div></td></tr>`;
    } else {
        jobsTableBody.innerHTML = filteredJobs.map(job => renderJobRow(job)).join('');
    }
    renderDashboardFilters(filters);
}

function renderCalendarView(jobs) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    const events = jobs.flatMap(job => {
        const jobEvents = [];
        if (job.closingDate) {
            jobEvents.push({
                title: `Closes: ${job.jobTitle}`,
                start: job.closingDate,
                id: job.id,
                backgroundColor: '#e74c3c',
                borderColor: '#e74c3c'
            });
        }
        if (job.followUpDate) {
            jobEvents.push({
                title: `Follow-up: ${job.jobTitle}`,
                start: job.followUpDate,
                id: job.id,
                backgroundColor: '#9b59b6',
                borderColor: '#9b59b6'
            });
        }
        if (job.interviewDate) {
            jobEvents.push({
                title: `Interview: ${job.jobTitle}`,
                start: job.interviewDate,
                id: job.id,
                backgroundColor: '#2ecc71',
                borderColor: '#2ecc71'
            });
        }
        return jobEvents;
    });

    if (calendarInstance) {
        calendarInstance.destroy();
    }

    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        events: events,
        eventClick: function(info) {
            info.jsEvent.preventDefault();
            window.location.hash = `#applicationDetail/${info.event.id}`;
        }
    });

    calendarInstance.render();
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
    const sortByOptions = { 'default': 'Recently Added', 'closing-asc': 'Closing Soon', 'follow-up-asc': 'Follow-up Soon' };
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
    const data = jobData || { status: 'Identified', jobTitle: '', hospital: '', state: 'NSW', applicationType: 'Direct Hospital', roleLevel: 'RMO' };
    
    const stateOptions = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
    const typeOptions = ['Statewide Campaign', 'Direct Hospital', 'Proactive EOI'];
    const roleOptions = ['Intern', 'RMO', 'Registrar', 'Fellow', 'Consultant'];
    const statusOptions = ['Identified', 'Preparing Application', 'Applied', 'Interview Offered', 'Offer Received', 'Unsuccessful', 'Closed', 'Offer Declined'];

    page.innerHTML = `
        <header class="detail-summary-header">
            <div>
                <h2 id="detail-jobTitle" contenteditable="true" placeholder="Enter Job Title*">${data.jobTitle}</h2>
                <p id="detail-hospital" contenteditable="true" placeholder="Enter hospital name">@ ${data.hospital}</p>
            </div>
            <div class="summary-status-container">
                <select id="detail-status" class="tag status-${utils.kebabCase(data.status)}">${utils.createSelectOptions(statusOptions, data.status)}</select>
            </div>
        </header>

        <div class="detail-workspace">
            <main class="detail-content-pane">
                <section id="core-info-section" class="detail-section">
                    <h3>Core Job Information & Logistics</h3>
                    <div class="form-grid">
                        <div class="form-group"><label for="detail-healthNetwork">Health Network / LHD</label><input type="text" id="detail-healthNetwork" value="${data.healthNetwork || ''}" placeholder="e.g., SESLHD"></div>
                        <div class="form-group"><label for="detail-state">State/Territory*</label><select id="detail-state">${utils.createSelectOptions(stateOptions, data.state)}</select></div>
                        <div class="form-group"><label for="detail-location">Location (City/Region)</label><input type="text" id="detail-location" value="${data.location || ''}" placeholder="e.g., Sydney"></div>
                        <div class="form-group"><label for="detail-applicationType">Application Type</label><select id="detail-applicationType">${utils.createSelectOptions(typeOptions, data.applicationType)}</select></div>
                        <div class="form-group"><label for="detail-sourceUrl">Application Source URL</label><input type="url" id="detail-sourceUrl" value="${data.sourceUrl || ''}" placeholder="https://jobs.health.nsw.gov.au/..."></div>
                        <div class="form-group"><label for="detail-jobId">Job ID / Requisition Code</label><input type="text" id="detail-jobId" value="${data.jobId || ''}" placeholder="e.g., REQ123456"></div>
                        <div class="form-group"><label for="detail-closingDate">Closing Date & Time</label><input type="datetime-local" id="detail-closingDate" value="${data.closingDate ? utils.formatDateForInput(data.closingDate, true) : ''}"></div>
                        <div class="form-group"><label for="detail-commencementDate">Commencement Date</label><input type="date" id="detail-commencementDate" value="${data.commencementDate ? utils.formatDateForInput(data.commencementDate) : ''}"></div>
                    </div>
                </section>

                <section id="role-details-section" class="detail-section">
                    <h3>Role Details & Requirements</h3>
                    <div class="form-grid">
                        <div class="form-group"><label for="detail-specialty">Medical Specialty / Department</label><input type="text" id="detail-specialty" value="${data.specialty || ''}" placeholder="e.g., Emergency Medicine"></div>
                        <div class="form-group"><label for="detail-roleLevel">Role Level</label><select id="detail-roleLevel">${utils.createSelectOptions(roleOptions, data.roleLevel)}</select></div>
                        <div class="form-group"><label for="detail-salary">Salary / Remuneration</label><input type="text" id="detail-salary" value="${data.salary || ''}" placeholder="e.g., $95,000 - $110,000"></div>
                        <div class="form-group"><label for="detail-experienceLevel">Experience Level Required</label><input type="text" id="detail-experienceLevel" value="${data.experienceLevel || ''}" placeholder="e.g., PGY3+"></div>
                    </div>
                </section>

                <section id="contact-person-section" class="detail-section">
                    <h3>Contact Person</h3>
                    <div class="form-grid">
                        <div class="form-group"><label for="detail-contactPerson">Name</label><input type="text" id="detail-contactPerson" value="${data.contactPerson || ''}" placeholder="Dr. Jane Smith"></div>
                        <div class="form-group"><label for="detail-contactEmail">Email</label><input type="email" id="detail-contactEmail" value="${data.contactEmail || ''}" placeholder="jane.smith@health.gov.au"></div>
                        <div class="form-group"><label for="detail-contactPhone">Phone</label><input type="tel" id="detail-contactPhone" value="${data.contactPhone || ''}" placeholder="02 9123 4567"></div>
                    </div>
                </section>
                 <div class="form-group full-span"><label for="detail-tracker-notes">Your Tracker Notes</label><textarea id="detail-tracker-notes" rows="6" placeholder="Log calls, emails, and other updates here...">${data.jobTrackerNotes || ''}</textarea></div>
            </main>
        </div>

        <footer class="detail-footer">
            <button id="delete-app-btn" class="danger-btn ${isNew ? 'hidden' : ''}">Delete Application</button>
            <div>
                <button id="duplicate-app-btn" class="secondary-btn ${isNew ? 'hidden' : ''}">Duplicate</button>
                <button id="save-app-btn" class="primary-action-btn">${isNew ? 'Create Application' : 'Save Changes'}</button>
            </div>
        </footer>
    `;
    
    const statusSelect = page.querySelector('#detail-status');
    if(statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            e.target.className = `tag status-${utils.kebabCase(e.target.value)}`;
        });
    }
}

export function getApplicationFormData() {
    const getEl = (id) => document.getElementById(id);
    const getText = (id) => getEl(id)?.textContent.trim() || '';
    const getValue = (id) => getEl(id)?.value || '';
    const getDate = (id) => getValue(id) ? new Date(getValue(id)) : null;

    return {
        jobTitle: getText('detail-jobTitle'),
        hospital: getText('detail-hospital').replace('@ ', ''),
        status: getValue('detail-status'),
        healthNetwork: getValue('detail-healthNetwork'),
        state: getValue('detail-state'),
        location: getValue('detail-location'),
        applicationType: getValue('detail-applicationType'),
        sourceUrl: getValue('detail-sourceUrl'),
        jobId: getValue('detail-jobId'),
        closingDate: getDate('detail-closingDate'),
        commencementDate: getDate('detail-commencementDate'),
        specialty: getValue('detail-specialty'),
        roleLevel: getValue('detail-roleLevel'),
        salary: getValue('detail-salary'),
        experienceLevel: getValue('detail-experienceLevel'),
        contactPerson: getValue('detail-contactPerson'),
        contactEmail: getValue('detail-contactEmail'),
        contactPhone: getValue('detail-contactPhone'),
        jobTrackerNotes: getValue('detail-tracker-notes'),
    };
}


// --- EXPERIENCE BOOK & DOCUMENTS ---

export function renderExperienceBook(experiences, filters) {
    const container = document.getElementById('experience-cards-container');
    const tagsContainer = document.getElementById('experience-tag-filters');
    if (!container || !tagsContainer) return;
    
    // APPLY THE FILTERS
    const filteredExperiences = applyExperienceBookFilters(experiences, filters);

    const allTags = [...new Set(experiences.flatMap(exp => exp.tags || []))].sort();
    tagsContainer.innerHTML = renderTagFilters(allTags, filters.tags);
    container.innerHTML = renderExperienceCards(filteredExperiences);
}

function renderTagFilters(allTags, activeTags = []) {
    let html = `<button class="tag-filter-btn ${activeTags.length === 0 ? 'active' : ''}" data-tag="all">All</button>`;
    html += allTags.map(tag => `<button class="tag-filter-btn ${activeTags.includes(tag) ? 'active' : ''}" data-tag="${tag}">${tag}</button>`).join('');
    return html;
}

function renderExperienceCards(experiences) {
    if (experiences.length === 0) return `<div class="empty-state-container"><i class="fa-solid fa-book-bookmark"></i><h3>No Experiences Found</h3><p>Click the '+' button to add your first professional experience, or try a different filter.</p></div>`;
    return experiences.map(exp => `<div class="experience-card" data-experience-id="${exp.id}"><div class="card-content-wrapper"><h4>${exp.title || 'Untitled Experience'}</h4><div class="experience-card-tags">${(exp.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}</div><p class="experience-card-paragraph">${utils.truncate(exp.paragraph || '', 150)}</p></div></div>`).join('');
}

export function renderExperienceInspector(exp) {
    const inspector = document.getElementById('experience-inspector');
    if (!inspector) return;
    const isNew = !exp || !exp.id;
    const data = exp || { title: '', paragraph: '', tags: [] };
    inspector.innerHTML = `<div class="inspector-header"><h3>${isNew ? 'New Experience' : 'Edit Experience'}</h3><button id="close-experience-inspector-btn" class="icon-btn" aria-label="Close">×</button></div><div class="inspector-content"><div class="form-group"><label for="exp-title">Title (Question)</label><input type="text" id="exp-title" value="${data.title || ''}"></div><div class="form-group"><label for="exp-paragraph">Response (Answer)</label><textarea id="exp-paragraph" rows="10">${data.paragraph || ''}</textarea></div><div class="form-group"><label for="exp-tags">Tags (comma-separated)</label><input type="text" id="exp-tags" value="${(data.tags || []).join(', ')}"></div></div><div class="inspector-footer"><button id="delete-exp-btn" class="danger-btn ${isNew ? 'hidden' : ''}">Delete</button><button id="save-exp-btn" class="primary-action-btn">${isNew ? 'Create' : 'Save'}</button></div>`;
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
    if (!page) return;
    const container = document.getElementById('document-list-container');
    
    document.getElementById('doc-list-view-btn').classList.toggle('active', viewMode === 'list');
    document.getElementById('doc-grid-view-btn').classList.toggle('active', viewMode === 'grid');
    container.className = `${viewMode}-view`;
    container.innerHTML = renderDocumentItems(documents, viewMode);
}

function renderDocumentItems(documents, viewMode) {
    if (documents.length === 0) return `<div class="empty-state-container"><i class="fa-solid fa-folder-open"></i><h3>Repository is Empty</h3><p>Upload your first document by dragging it onto the zone above.</p></div>`;
    if (viewMode === 'grid') {
        return documents.map(doc => `<div class="doc-grid-item" data-doc-id="${doc.id}"><div class="doc-grid-icon">${utils.getFileIcon(doc.type, true)}</div><div class="doc-grid-name" title="${doc.name}">${doc.name}</div></div>`).join('');
    }
    return `<div class="table-container"><table><thead><tr><th>Name</th><th>Date Uploaded</th><th>Size</th><th class="actions-col"></th></tr></thead><tbody>${documents.map(doc => `<tr class="interactive-row" data-doc-id="${doc.id}"><td><i class="${utils.getFileIcon(doc.type)}"></i> ${doc.name}</td><td>${utils.formatDate(doc.uploadedAt)}</td><td>${utils.formatFileSize(doc.size)}</td><td class="actions-col"><a href="${doc.url}" target="_blank" class="icon-btn" title="Download"><i class="fa-solid fa-download"></i></a></td></tr>`).join('')}</tbody></table></div>`;
}

export function renderDocumentInspector(doc) {
    const inspector = document.getElementById('document-inspector');
    if (!inspector) return;
    if (!doc) { inspector.classList.add('collapsed'); return; }
    const size = utils.formatFileSize(doc.size);
    const date = doc.uploadedAt ? utils.formatDate(doc.uploadedAt, { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
    const icon = utils.getFileIcon(doc.type, true);
    inspector.innerHTML = `<div class="inspector-header"><h3>Document Details</h3><button id="close-document-inspector-btn" class="icon-btn" aria-label="Close">×</button></div><div class="inspector-content"><div class="doc-preview">${icon}</div><h4 id="doc-inspector-name">${doc.name}</h4><div class="doc-details-grid"><span><strong>Date Uploaded:</strong> ${date}</span><span><strong>File Size:</strong> ${size}</span></div></div><div class="inspector-footer"><button id="delete-doc-btn" class="danger-btn">Delete</button><button id="rename-doc-btn" class="secondary-btn">Rename</button></div>`;
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
    const timezones = {'Asia/Kolkata': 'IST (Asia/Kolkata)', 'UTC': 'UTC', 'Australia/Sydney': 'AEST/AEDT (Australia/Sydney)', 'Australia/Perth': 'AWST (Australia/Perth)'};
    const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.getElementById('preferences-section').innerHTML = `<h3>Preferences</h3><div class="form-group"><label>Appearance</label><div id="theme-selector" class="segmented-control"><button data-theme="light" class="segment-btn">Light</button><button data-theme="dark" class="segment-btn">Dark</button><button data-theme="system" class="segment-btn active">System</button></div></div><div class="form-group"><label for="timezone-selector">Your Timezone</label><select id="timezone-selector">${utils.createSelectOptions(timezones, prefs.timezone || defaultTz)}</select><p class="microcopy">Sets the default display time for dates and reminders.</p></div>`;
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