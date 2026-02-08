/**
 * Canonical Link Check Result Schema
 *
 * Shared contract between engine (Claude), integration layer (Codex),
 * and reporting. All link-check runs MUST emit records conforming to
 * this schema.
 *
 * Reference: docs/COLLAB_PROTOCOL.md §3
 */

'use strict';

// ---------------------------------------------------------------------------
// Category enum — the six possible outcomes of checking a URL
// ---------------------------------------------------------------------------

/** @enum {string} */
const Category = Object.freeze({
    OK:                  'ok',
    BROKEN:              'broken',
    SOFT_BLOCKED:        'soft-blocked',
    RATE_LIMITED:        'rate-limited',
    TIMEOUT:             'timeout',
    NEEDS_MANUAL_REVIEW: 'needs-manual-review'
});

/** Set of all valid category values for quick membership checks */
const VALID_CATEGORIES = new Set(Object.values(Category));

// ---------------------------------------------------------------------------
// JSDoc type definitions (serve as the contract for consumers)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} LinkCheckResult
 *
 * Required fields:
 * @property {string}      url         - The URL that was checked
 * @property {string}      category    - One of Category enum values
 * @property {number|null} http_code   - HTTP status code, or null if no response
 * @property {string|null} final_url   - Final URL after redirects, or null
 * @property {string}      evidence    - Short machine-readable reason string
 * @property {string}      checked_at  - ISO 8601 timestamp of the check
 *
 * Optional fields:
 * @property {number}      [attempts]        - Number of request attempts made
 * @property {string}      [method_used]     - Last HTTP method used ('HEAD'|'GET')
 * @property {string}      [request_profile] - Which request profile was used
 * @property {number}      [latency_ms]      - Total elapsed time in milliseconds
 */

// ---------------------------------------------------------------------------
// Factory — create a well-formed result object
// ---------------------------------------------------------------------------

/**
 * Create a LinkCheckResult with defaults for optional fields.
 *
 * @param {Object} fields
 * @param {string}      fields.url
 * @param {string}      fields.category
 * @param {number|null} [fields.http_code=null]
 * @param {string|null} [fields.final_url=null]
 * @param {string}      [fields.evidence='']
 * @param {string}      [fields.checked_at]      - Defaults to now
 * @param {number}      [fields.attempts]
 * @param {string}      [fields.method_used]
 * @param {string}      [fields.request_profile]
 * @param {number}      [fields.latency_ms]
 * @returns {LinkCheckResult}
 */
function createResult(fields) {
    const result = {
        url:        fields.url,
        category:   fields.category,
        http_code:  fields.http_code   ?? null,
        final_url:  fields.final_url   ?? null,
        evidence:   fields.evidence    ?? '',
        checked_at: fields.checked_at  ?? new Date().toISOString()
    };

    // Attach optional fields only when provided
    if (fields.attempts        !== undefined) result.attempts        = fields.attempts;
    if (fields.method_used     !== undefined) result.method_used     = fields.method_used;
    if (fields.request_profile !== undefined) result.request_profile = fields.request_profile;
    if (fields.latency_ms      !== undefined) result.latency_ms      = fields.latency_ms;

    return result;
}

// ---------------------------------------------------------------------------
// Validation — check that an object conforms to the schema
// ---------------------------------------------------------------------------

/**
 * Validate a LinkCheckResult object. Returns an array of error strings.
 * An empty array means the object is valid.
 *
 * @param {*} obj - Object to validate
 * @returns {string[]} Array of validation error messages (empty = valid)
 */
function validate(obj) {
    const errors = [];

    if (obj === null || typeof obj !== 'object') {
        return ['Result must be a non-null object'];
    }

    // Required string fields
    if (typeof obj.url !== 'string' || obj.url.length === 0) {
        errors.push('url must be a non-empty string');
    }

    if (!VALID_CATEGORIES.has(obj.category)) {
        errors.push(`category must be one of: ${[...VALID_CATEGORIES].join(', ')}; got "${obj.category}"`);
    }

    if (obj.http_code !== null && (typeof obj.http_code !== 'number' || !Number.isInteger(obj.http_code))) {
        errors.push('http_code must be an integer or null');
    }

    if (obj.final_url !== null && typeof obj.final_url !== 'string') {
        errors.push('final_url must be a string or null');
    }

    if (typeof obj.evidence !== 'string') {
        errors.push('evidence must be a string');
    }

    if (typeof obj.checked_at !== 'string' || obj.checked_at.length === 0) {
        errors.push('checked_at must be a non-empty ISO 8601 string');
    } else if (isNaN(Date.parse(obj.checked_at))) {
        errors.push('checked_at must be a valid ISO 8601 date');
    }

    // Optional fields — validate types only when present
    if (obj.attempts !== undefined && (typeof obj.attempts !== 'number' || !Number.isInteger(obj.attempts) || obj.attempts < 0)) {
        errors.push('attempts must be a non-negative integer');
    }

    if (obj.method_used !== undefined && typeof obj.method_used !== 'string') {
        errors.push('method_used must be a string');
    }

    if (obj.request_profile !== undefined && typeof obj.request_profile !== 'string') {
        errors.push('request_profile must be a string');
    }

    if (obj.latency_ms !== undefined && (typeof obj.latency_ms !== 'number' || obj.latency_ms < 0)) {
        errors.push('latency_ms must be a non-negative number');
    }

    return errors;
}

/**
 * Returns true if the object is a valid LinkCheckResult.
 * @param {*} obj
 * @returns {boolean}
 */
function isValid(obj) {
    return validate(obj).length === 0;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    Category,
    VALID_CATEGORIES,
    createResult,
    validate,
    isValid
};
