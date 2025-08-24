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