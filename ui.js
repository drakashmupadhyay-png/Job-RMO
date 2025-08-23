"use strict";

// This module is a "dumb" renderer. It only knows how to display data when
// it is given the data and the HTML elements to draw into.

// --- EXPORTED UI FUNCTIONS ---

export function updateUIAfterLogin(user, userProfileData) {
    const navUserName = document.getElementById('nav-user-name');
    const navUserImg = document.getElementById('nav-user-img');
    const profileNameInput = document.getElementById('profile-name');
    const profileEmailInput = document.getElementById('profile-email');
    const profileImagePreview = document.getElementById('profile-image-preview');

    const displayName = userProfileData.firstName || user.displayName?.split(' ')[0] || "User";
    navUserName.textContent = displayName;
    navUserImg.src = user.photoURL || 'placeholder.jpg';
    profileNameInput.value = userProfileData.fullName || user.displayName || '';
    profileEmailInput.value = user.email || '';
    profileImagePreview.src = user.photoURL || 'placeholder.jpg';
}

export function masterDashboardRender(jobs, filters, isSelectMode, selectedJobIds, calendar) {
    updateMetrics(jobs);
    renderTable(jobs, filters, isSelectMode, selectedJobIds);
    renderCards(jobs, filters);
    if (calendar && !document.getElementById('calendar-view-container').classList.contains('hidden')) {
        renderCalendarEvents(jobs, calendar);
    }
}

export function updateMetrics(jobs) {
    const metricActive = document.getElementById('metric-active');
    const metricClosed = document.getElementById('metric-closed');
    const metricClosingSoon = document.getElementById('metric-closing-soon');
    const metricFollowUps = document.getElementById('metric-follow-ups');
    const closedStatuses = ['Closed', 'Offer Declined', 'Unsuccessful'];
    
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const activeJobs = jobs.filter(job => !closedStatuses.includes(job.status));
    const closedJobs = jobs.filter(job => closedStatuses.includes(job.status));
    const closingSoonJobs = activeJobs.filter(job => job.closingDate && job.closingDate > now && job.closingDate <= sevenDaysFromNow);
    const followUpSoonJobs = activeJobs.filter(job => job.followUpDate && !job.followUpComplete && job.followUpDate > now && job.followUpDate <= sevenDaysFromNow);

    metricActive.textContent = activeJobs.length;
    metricClosed.textContent = closedJobs.length;
    metricClosingSoon.textContent = closingSoonJobs.length;
    metricFollowUps.textContent = followUpSoonJobs.length;
}

export function renderTable(jobs, filters, isSelectMode, selectedJobIds) {
    const jobsTableBody = document.getElementById('jobs-table-body');
    const jobsTableHeader = document.querySelector('#table-view-container thead');
    
    jobsTableBody.innerHTML = '';
    jobsTableHeader.querySelector('.select-col').classList.toggle('hidden', !isSelectMode);
    
    const processedJobs = sortAndFilterJobs(jobs, filters);
    
    if (processedJobs.length === 0) {
        jobsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px;">No applications found matching your criteria.</td></tr>`;
        return;
    }

    processedJobs.forEach(job => {
        const row = document.createElement('tr');
        row.dataset.jobId = job.id;
        row.classList.toggle('selected-row', selectedJobIds.has(job.id));
        if (['Interview Offered', 'Offer Received'].includes(job.status)) row.classList.add('status-row-highlight');
        
        let followUpDisplay = 'N/A';
        if (job.followUpDate) {
             if (job.followUpComplete) followUpDisplay = `<span class="date-completed"><i class="fa-solid fa-check"></i> ${job.followUpDate.toLocaleDateString('en-GB')}</span>`;
             else if (job.followUpDate < new Date()) followUpDisplay = `<span class="date-overdue">${job.followUpDate.toLocaleDateString('en-GB')}</span>`;
             else followUpDisplay = `<span>${job.followUpDate.toLocaleDateString('en-GB')}</span>`;
        }
        row.innerHTML = `
            <td class="select-col ${isSelectMode ? '' : 'hidden'}"><input type="checkbox" class="row-checkbox" data-job-id="${job.id}" ${selectedJobIds.has(job.id) ? 'checked' : ''}></td>
            <td><strong>${job.jobTitle || ''}</strong><br><small>${job.hospital || ''}</small></td>
            <td>${job.state || 'N/A'}</td>
            <td>${formatClosingDateForTable(job) || 'N/A'}</td>
            <td><span class="tag status-${job.status?.toLowerCase().replace(/ /g, '-')}">${job.status || 'N/A'}</span></td>
            <td>${followUpDisplay}</td>
            <td><small>${(job.jobTrackerNotes || '').substring(0, 40)}...</small></td>
            <td>
                <button class="action-btn view-btn" data-job-id="${job.id}" title="View/Edit"><i class="fa-solid fa-eye"></i></button>
                <button class="action-btn duplicate-btn" data-job-id="${job.id}" title="Duplicate"><i class="fa-solid fa-copy"></i></button>
                <button class="action-btn delete-btn" data-job-id="${job.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
            </td>`;
        jobsTableBody.appendChild(row);
    });
}

export function renderCards(jobs, filters) {
    const cardViewContainer = document.getElementById('card-view-container');
    const searchBar = document.getElementById('search-bar');
    
    cardViewContainer.innerHTML = '';
    const processedJobs = sortAndFilterJobs(jobs, filters);
    
    if (processedJobs.length === 0) {
        if (searchBar.value || filters.state !== 'all') {
            cardViewContainer.innerHTML = `<div class="empty-state-container"><i class="fa-solid fa-magnifying-glass"></i><h3>No Matches Found</h3><p>No applications match your current filters.</p></div>`;
        } else {
            cardViewContainer.innerHTML = `<div class="empty-state-container"><i class="fa-solid fa-folder-open"></i><h3>No Applications Yet</h3><p>Click "Add Application" to get started!</p></div>`;
        }
        return;
    }

    processedJobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.dataset.jobId = job.id;
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const isClosingSoon = job.closingDate && job.closingDate > now && job.closingDate <= sevenDaysFromNow;
        card.innerHTML = `
            <div class="job-card-header">
                <div class="job-card-title"><h3>${job.jobTitle || 'No Title'}</h3><p>${job.hospital || 'No Hospital'}, ${job.state || ''}</p></div>
            </div>
            <div class="job-card-status-bar status-${job.status?.toLowerCase().replace(/ /g, '-')}">${job.status || 'N/A'}</div>
            <div class="job-card-body">
                <div class="job-card-critical-dates">
                    <span><i class="fa-solid fa-calendar-xmark"></i> Closes: <strong>${job.closingDate ? job.closingDate.toLocaleDateString('en-GB') : 'N/A'}</strong> ${isClosingSoon ? '<i class="fa-solid fa-bell closing-soon-indicator"></i>' : ''}</span>
                    <span><i class="fa-solid fa-phone"></i> Follow-up: <strong>${job.followUpDate ? job.followUpDate.toLocaleDateString('en-GB') : 'N/A'}</strong></span>
                </div>
            </div>`;
        cardViewContainer.appendChild(card);
    });
}

export function renderExperienceBook(experiences, activeTags) {
    const experienceCardsContainer = document.getElementById('experience-cards-container');
    const experienceSearchBar = document.getElementById('experience-search-bar');
    const searchTerm = experienceSearchBar.value.toLowerCase();
    let filteredExperiences = experiences;
    if (activeTags.length > 0) filteredExperiences = filteredExperiences.filter(exp => exp.tags && activeTags.every(tag => exp.tags.includes(tag)));
    if (searchTerm) filteredExperiences = filteredExperiences.filter(exp => (exp.title && exp.title.toLowerCase().includes(searchTerm)) || (exp.paragraph && exp.paragraph.toLowerCase().includes(searchTerm)) || (exp.tags && exp.tags.some(tag => tag.toLowerCase().includes(searchTerm))));
    const sortedExperiences = [...filteredExperiences].sort((a, b) => (b.isFavorite || false) - (a.isFavorite || false));
    experienceCardsContainer.innerHTML = '';
    if (sortedExperiences.length === 0) {
        experienceCardsContainer.innerHTML = `<div class="empty-state-container" style="grid-column: 1 / -1;"><i class="fa-solid fa-book-bookmark"></i><h3>Experience Book is Empty</h3><p>Add professional experiences to link to applications.</p></div>`;
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
    renderExperienceTagFilters(experiences, activeTags);
}

export function renderMasterDocuments(documents) {
    const masterDocsList = document.getElementById('master-docs-list');
    masterDocsList.innerHTML = '';
    documents.forEach(doc => {
        const li = document.createElement('li');
        li.innerHTML = `<span><a href="${doc.url}" target="_blank" title="View Document">${doc.name}</a></span><button type="button" class="remove-doc-btn" data-doc-id="${doc.id}" title="Delete Document">×</button>`;
        masterDocsList.appendChild(li);
    });
}

export function populateApplicationDetailPage(job, stateOptions, typeOptions, roleLevelOptions, statusOptions) {
    const applicationDetailForm = document.getElementById('application-detail-form');
    applicationDetailForm.reset();
    document.getElementById('detail-job-id-error').classList.add('hidden');
    applicationDetailForm.querySelectorAll('.editable-field, textarea').forEach(el => {
        if(el.isContentEditable) el.textContent = ''; else el.value = '';
        el.classList.remove('input-error');
    });

    if (job && job.id) {
        document.getElementById('summary-job-title').textContent = job.jobTitle || 'New Application';
        document.getElementById('summary-hospital').textContent = `@ ${job.hospital || 'Enter details below'}`;
        const status = job.status || 'Identified';
        document.getElementById('summary-status').textContent = status;
        document.getElementById('summary-status').className = `tag status-${status.toLowerCase().replace(/ /g, '-')}`;
        document.getElementById('summary-closing-date').textContent = job.closingDate ? formatDateTimeWithOriginalTZ(job.closingDate, job.closingDateTimezone) : 'N/A';
        
        for (const key in job) {
            const el = document.getElementById(`detail-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`);
            if (el) {
                if (el.isContentEditable) el.textContent = job[key] || '';
                else if (el.type === 'checkbox') el.checked = job[key] || false;
                else if (el.type === 'datetime-local' || el.type === 'date') {
                    const dateValue = job[key];
                    if (dateValue) el.value = new Date(dateValue.getTime() - (dateValue.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                    else el.value = '';
                } else {
                    el.value = job[key] || '';
                }
            }
        }
    } else {
        document.getElementById('summary-job-title').textContent = 'New Application';
        document.getElementById('summary-hospital').textContent = 'Enter details below';
        document.getElementById('summary-status').textContent = 'Identified';
        document.getElementById('summary-status').className = 'tag status-identified';
        document.getElementById('summary-closing-date').textContent = 'N/A';
        populateSelect(document.getElementById('detail-state'), stateOptions, 'NSW');
        populateSelect(document.getElementById('detail-application-type'), typeOptions, 'Direct Hospital');
        populateSelect(document.getElementById('detail-role-level'), roleLevelOptions, 'RMO');
        populateSelect(document.getElementById('detail-status'), statusOptions, 'Identified');
    }
    
    document.getElementById('delete-app-btn').classList.toggle('hidden', !job.id);
    document.getElementById('duplicate-app-btn').classList.toggle('hidden', !job.id);
    
    const defaultTab = document.querySelector('.tab-switcher .tab-btn');
    if (defaultTab) defaultTab.click();

    renderDocuments(job.documents || []);
    renderWorkbench(job.jobSelectionCriteria || []);
    
    const sourceUrlDiv = document.getElementById('detail-source-url');
    sourceUrlDiv.dispatchEvent(new Event('input', { bubbles: true }));
}

export function populateExperienceDetailPage(exp) { 
    document.getElementById('experience-detail-form').reset();
    const experienceFormTitle = document.getElementById('experience-form-title');
    const titleDiv = document.getElementById('exp-title');
    const deleteExpBtn = document.getElementById('delete-exp-btn');
    const copyExpBtn = document.getElementById('copy-exp-btn');
    if (exp) {
        experienceFormTitle.textContent = 'Edit Experience'; 
        titleDiv.textContent = exp.title; 
        document.getElementById('exp-tags').value = exp.tags ? exp.tags.join(', ') : ''; 
        document.getElementById('exp-paragraph').value = exp.paragraph; 
        deleteExpBtn.classList.remove('hidden'); 
        copyExpBtn.classList.remove('hidden'); 
    } else {
        experienceFormTitle.textContent = 'New Experience'; 
        titleDiv.textContent = ''; 
        deleteExpBtn.classList.add('hidden'); 
        copyExpBtn.classList.add('hidden'); 
    } 
    navigateToPage('experienceDetailPage'); 
}

function renderCalendarEvents(jobs, calendar) { 
    if (!calendar) return; 
    const events = jobs.flatMap(job => { 
        const eventList = []; 
        const today = new Date(); 
        if (job.closingDate) eventList.push({ title: `${job.closingDate < today ? 'Closed:' : 'Closes:'} ${job.jobTitle}`, start: job.closingDate, backgroundColor: 'var(--danger-red)', allDay: true, extendedProps: { jobId: job.id } }); 
        if (job.followUpDate && !job.followUpComplete) eventList.push({ title: `Follow-Up: ${job.jobTitle}`, start: job.followUpDate, backgroundColor: 'var(--warning-orange)', extendedProps: { jobId: job.id } }); 
        if (job.interviewDate) eventList.push({ title: `Interview: ${job.jobTitle}`, start: job.interviewDate, backgroundColor: 'var(--primary-blue)', extendedProps: { jobId: job.id } }); 
        return eventList; 
    }); 
    calendar.removeAllEvents(); 
    calendar.addEventSource(events); 
    calendar.render(); 
}

function renderDocuments(docs) { 
    const officialDocsList = document.getElementById('official-docs-list'), myDocsList = document.getElementById('my-docs-list'); 
    officialDocsList.innerHTML = ''; 
    myDocsList.innerHTML = ''; 
    docs.forEach(doc => { 
        const li = document.createElement('li'); 
        li.innerHTML = `<span>${doc.name}</span><button type="button" class="remove-doc-btn" data-doc-id="${doc.id}">×</button>`; 
        if (doc.type === 'official') officialDocsList.appendChild(li); 
        else myDocsList.appendChild(li); 
    }); 
}

function renderWorkbench(criteria = []) { 
    const workbenchContainer = document.getElementById('selection-criteria-workbench');
    workbenchContainer.innerHTML = ''; 
    if (criteria && criteria.length > 0) { 
        criteria.forEach((item, index) => { 
            const div = document.createElement('div'); 
            div.className = 'workbench-item'; 
            div.innerHTML = `<div class="workbench-header"><div class="workbench-criterion" contenteditable="true" data-index="${index}">${item.criterion}</div><button type="button" class="remove-criterion-btn" data-index="${index}" title="Remove Criterion">×</button></div><div class="workbench-actions"><button type="button" class="secondary-btn link-experience-btn" data-index="${index}"><i class="fa-solid fa-link"></i> Link Experience</button></div><textarea class="workbench-textarea" data-index="${index}" rows="6" placeholder="Craft your response here...">${item.response || ''}</textarea>`; 
            workbenchContainer.appendChild(div); 
        }); 
    } 
}

function renderExperienceTagFilters(experiences, activeTags) { 
    const experienceTagFilters = document.getElementById('experience-tag-filters');
    const allTags = [...new Set(experiences.flatMap(exp => exp.tags || []))].sort(); 
    const allButton = `<button class="tag-filter-btn secondary-btn ${activeTags.length === 0 ? 'active' : ''}" data-tag="all">All</button>`; 
    const tagButtons = allTags.map(tag => `<button class="tag-filter-btn secondary-btn ${activeTags.includes(tag) ? 'active' : ''}" data-tag="${tag}">${tag}</button>`).join(''); 
    experienceTagFilters.innerHTML = allButton + tagButtons; 
}

export function populateLinkExperienceModal(experiences) { 
    const linkExperienceSearch = document.getElementById('link-experience-search');
    const linkExperienceList = document.getElementById('link-experience-list');
    const searchTerm = linkExperienceSearch.value;
    linkExperienceList.innerHTML = ''; 
    const filtered = experiences.filter(exp => exp.title.toLowerCase().includes(searchTerm.toLowerCase())); 
    if (filtered.length === 0) { 
        linkExperienceList.innerHTML = `<li>No experiences found.</li>`; 
        return; 
    } 
    filtered.forEach(exp => { 
        const li = document.createElement('li'); 
        li.textContent = exp.title; 
        li.dataset.experienceId = exp.id; 
        linkExperienceList.appendChild(li); 
    }); 
}

export function populateAttachDocModal(documents) {
    const attachDocList = document.getElementById('attach-document-list');
    attachDocList.innerHTML = '';
    if (documents.length === 0) {
        attachDocList.innerHTML = `<li>No documents in repository. Upload one from the Documents page.</li>`;
        return;
    }
    documents.forEach(doc => {
        const li = document.createElement('li');
        li.textContent = doc.name;
        li.dataset.docName = doc.name;
        li.dataset.docUrl = doc.url;
        attachDocList.appendChild(li);
    });
}

function sortAndFilterJobs(sourceArray, filters) {
    const closedStatuses = ['Closed', 'Offer Declined', 'Unsuccessful'];
    const searchTerm = filters.search.toLowerCase(); 
    let processedJobs = sourceArray.filter(job => { 
        const stateMatch = filters.state === 'all' || job.state === filters.state; 
        const typeMatch = filters.type === 'all' || job.applicationType === filters.type; 
        const statusMatch = filters.status === 'all' || job.status === filters.status; 
        const roleLevelMatch = filters.roleLevel === 'all' || job.roleLevel === filters.roleLevel; 
        const searchMatch = searchTerm === '' ? true : Object.values(job).some(val => val && String(val).toLowerCase().includes(searchTerm)); 
        return searchMatch && stateMatch && typeMatch && statusMatch && roleLevelMatch; 
    }); 
    const sortBy = filters.sortBy; 
    const today = new Date(); today.setHours(0, 0, 0, 0); 
    switch (sortBy) { 
        case 'closing-asc': return processedJobs.filter(j => j.closingDate && j.closingDate >= today).sort((a, b) => a.closingDate - b.closingDate); 
        case 'follow-up-asc': return processedJobs.filter(j => j.followUpDate && !j.followUpComplete && j.followUpDate >= today).sort((a, b) => a.followUpDate - b.followUpDate); 
        case 'closed-desc': return processedJobs.filter(j => closedStatuses.includes(j.status)).sort((a,b) => (b.closingDate || 0) - (a.closingDate || 0));
        default: return processedJobs;
    } 
}

export function navigateToPage(pageKey) { 
    if (document.querySelector('#selection-action-bar:not(.hidden)')) document.getElementById('cancel-selection-btn').click();
    Object.values(document.querySelectorAll('.page-content')).forEach(p => p.classList.add('hidden')); 
    const page = document.getElementById(pageKey);
    if(page) page.classList.remove('hidden'); 
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${pageKey}`)); 
    if (!document.getElementById('user-dropdown').classList.contains('hidden')) document.getElementById('user-dropdown').classList.add('hidden'); 
}

export function showToast(message, type = 'success', duration = 3000) { 
    const container = document.getElementById('toast-container'); 
    const toast = document.createElement('div'); 
    toast.className = `toast ${type}`; 
    toast.textContent = message; 
    container.appendChild(toast); 
    setTimeout(() => toast.classList.add('show'), 10); 
    setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, duration); 
}

export function showDeleteModal(count) { 
    document.getElementById('delete-count').textContent = count; 
    document.getElementById('delete-modal-backdrop').classList.remove('hidden'); 
}

export function hideDeleteModal() { 
    document.getElementById('delete-modal-backdrop').classList.add('hidden'); 
}

export function showAttachDocModal() { document.getElementById('attach-document-modal-backdrop').classList.remove('hidden'); }
export function hideAttachDocModal() { document.getElementById('attach-document-modal-backdrop').classList.add('hidden'); }
export function showLinkExperienceModal() { document.getElementById('link-experience-modal-backdrop').classList.remove('hidden'); }
export function hideLinkExperienceModal() { document.getElementById('link-experience-modal-backdrop').classList.add('hidden'); }
export function updateClock() { try { const now = new Date(); const timeString = now.toLocaleTimeString('en-US', { timeZone: document.getElementById('timezone-selector').value, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }); const dateString = now.toLocaleDateString('en-GB', { timeZone: document.getElementById('timezone-selector').value, weekday: 'short', day: 'numeric', month: 'short' }); document.getElementById('current-time-display').textContent = `${dateString}, ${timeString}`; } catch (e) { document.getElementById('current-time-display').textContent = "Invalid Timezone"; } }

function formatClosingDateForTable(job) { 
    if (!job.closingDate) return 'N/A'; 
    try { 
        const date = job.closingDate; 
        const today = new Date(); 
        const sevenDaysFromNow = new Date(); sevenDaysFromNow.setDate(today.getDate() + 7); 
        const isClosingSoon = date >= today && date < sevenDaysFromNow; 
        const closingSoonIndicator = isClosingSoon ? `<i class="fa-solid fa-bell closing-soon-indicator" title="Closing within 7 days"></i>` : ''; 
        return `${date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}${closingSoonIndicator}`; 
    } catch (e) { 
        return 'Invalid Date'; 
    } 
}

function formatDateTimeWithOriginalTZ(date, timezone) {
    if (!date) return 'N/A';
    try {
        return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: timezone, timeZoneName: 'short' });
    } catch(e) {
        return date.toLocaleString('en-GB');
    }
}

function populateSelect(select, options, selected) { 
    select.innerHTML = ''; 
    options.forEach(o => { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; select.appendChild(opt); }); 
    if (selected) select.value = selected; 
}