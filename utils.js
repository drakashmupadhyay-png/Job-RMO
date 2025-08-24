"use strict";

// ---
// RMO Job-Flow - utils.js (v2.0 - Blueprint Realized)
// Description: A collection of pure, reusable helper functions (the "Toolbox").
// These functions can be used by any module in the application.
// ---


/**
 * Formats a JavaScript Date object into a user-friendly string.
 * This function is the single source of truth for date display.
 * @param {Date} date The Date object to format.
 * @param {object} [options] Intl.DateTimeFormat options.
 * @param {string} [timeZone] The IANA timezone string (e.g., 'Australia/Sydney'). Defaults to the user's browser setting.
 * @returns {string} The formatted date string (e.g., "25 Aug 2025").
 */
export function formatDate(date, options = {}, timeZone) {
    if (!(date instanceof Date) || isNaN(date)) {
        return 'N/A'; // Return 'N/A' for invalid or null dates
    }
    
    const defaultOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options, // User options can override defaults
    };
    
    // Use the provided timezone or fall back to the system's default
    if (timeZone) {
        defaultOptions.timeZone = timeZone;
    }

    try {
        return new Intl.DateTimeFormat('en-GB', defaultOptions).format(date);
    } catch (e) {
        console.error("Error formatting date:", e);
        // Fallback for potentially invalid timezone strings
        return date.toLocaleDateString('en-GB'); 
    }
}

/**
 * Creates HTML <option> elements for a <select> dropdown.
 * @param {Array|object} optionsData The data for the options. Can be an array of strings or an object of key-value pairs.
 * @param {string} [selectedValue] The value that should be pre-selected.
 * @param {object} [firstOption] An optional first option to add (e.g., { all: 'All Items' }).
 * @returns {string} An HTML string of <option> elements.
 */
export function createSelectOptions(optionsData, selectedValue, firstOption = {}) {
    let optionsHtml = Object.entries(firstOption).map(([value, text]) => 
        `<option value="${value}">${text}</option>`
    ).join('');

    const createOption = (value, text) => {
        const selectedAttr = value === selectedValue ? ' selected' : '';
        return `<option value="${value}"${selectedAttr}>${text}</option>`;
    };

    if (Array.isArray(optionsData)) {
        optionsHtml += optionsData.map(option => createOption(option, option)).join('');
    } else if (typeof optionsData === 'object') {
        optionsHtml += Object.entries(optionsData).map(([value, text]) => createOption(value, text)).join('');
    }

    return optionsHtml;
}


/**
 * Converts a string from "Title Case" or "Sentence case" to "kebab-case".
 * Example: "Interview Offered" -> "interview-offered"
 * Useful for creating dynamic, CSS-friendly class names.
 * @param {string} str The string to convert.
 * @returns {string} The kebab-cased string.
 */
export function kebabCase(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
        .map(x => x.toLowerCase())
        .join('-');
}

/**
 * A debounce function that limits the rate at which a function gets called.
 * Crucial for performance on inputs that fire many events (e.g., search bars, window resize).
 * @param {function} func The function to debounce.
 * @param {number} delay The debounce delay in milliseconds.
 * @returns {function} The new debounced function.
 */
export function debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// --- In utils.js, ADD this new function ---

/**
 * Formats a Date object specifically for the value attribute of an <input>.
 * @param {Date} date The Date object.
 * @param {boolean} includeTime Whether to format for 'datetime-local' or just 'date'.
 * @returns {string} A string like 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm'.
 */
export function formatDateForInput(date, includeTime = false) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (includeTime) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    return `${year}-${month}-${day}`;
}


// --- In utils.js, ADD this new function ---

/**
 * Truncates a string to a specified length and adds an ellipsis.
 * @param {string} str The string to truncate.
 * @param {number} maxLength The maximum length of the string.
 * @returns {string} The truncated string.
 */
export function truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...';
}

// --- In utils.js, ADD these new functions ---

/**
 * Formats a file size in bytes into a human-readable string (KB, MB, GB).
 * @param {number} bytes The file size in bytes.
 * @returns {string} The formatted file size.
 */
export function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Returns a Font Awesome icon class based on the file's MIME type.
 * @param {string} mimeType The MIME type of the file.
 * @param {boolean} large Whether to return a large (3x) icon class.
 * @returns {string} The Font Awesome class string.
 */
export function getFileIcon(mimeType, large = false) {
    const sizeClass = large ? ' fa-3x' : '';
    if (!mimeType) return `fa-solid fa-file${sizeClass}`;
    
    if (mimeType.includes('pdf')) return `fa-solid fa-file-pdf${sizeClass}`;
    if (mimeType.includes('word')) return `fa-solid fa-file-word${sizeClass}`;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return `fa-solid fa-file-excel${sizeClass}`;
    if (mimeType.startsWith('image/')) return `fa-solid fa-file-image${sizeClass}`;
    if (mimeType.startsWith('video/')) return `fa-solid fa-file-video${sizeClass}`;
    
    return `fa-solid fa-file-alt${sizeClass}`; // Generic file icon
}