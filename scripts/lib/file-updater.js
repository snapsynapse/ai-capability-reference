/**
 * File updater module for modifying markdown data files
 * Handles updating Checked and Verified dates
 */

const fs = require('fs');
const path = require('path');

/**
 * Get today's date in ISO 8601 format (date only)
 * @returns {string} Date string like "2026-01-29"
 */
function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Update a property value in a feature's property table
 * @param {string} content - Full file content
 * @param {string} featureName - Name of the feature to update
 * @param {string} property - Property name (e.g., "Checked", "Verified")
 * @param {string} newValue - New value for the property
 * @returns {string|null} Updated content, or null if feature/property not found
 */
function updateFeatureProperty(content, featureName, property, newValue) {
    // Find the feature section
    const featureRegex = new RegExp(
        `(## ${escapeRegex(featureName)}\\n[\\s\\S]*?\\| ${property} \\| )([^|\\n]*)(\\s*\\|)`,
        'i'
    );

    const match = content.match(featureRegex);
    if (!match) {
        return null;
    }

    return content.replace(featureRegex, `$1${newValue}$3`);
}

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Update the Checked date for a feature
 * @param {string} filepath - Path to the platform markdown file
 * @param {string} featureName - Name of the feature
 * @param {string} date - Date to set (defaults to today)
 * @returns {boolean} True if updated successfully
 */
function updateCheckedDate(filepath, featureName, date = null) {
    const dateValue = date || getTodayISO();

    try {
        let content = fs.readFileSync(filepath, 'utf-8');
        const updated = updateFeatureProperty(content, featureName, 'Checked', dateValue);

        if (updated) {
            fs.writeFileSync(filepath, updated);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error updating Checked date for ${featureName}:`, error.message);
        return false;
    }
}

/**
 * Update the Verified date for a feature
 * @param {string} filepath - Path to the platform markdown file
 * @param {string} featureName - Name of the feature
 * @param {string} date - Date to set (defaults to today)
 * @returns {boolean} True if updated successfully
 */
function updateVerifiedDate(filepath, featureName, date = null) {
    const dateValue = date || getTodayISO();

    try {
        let content = fs.readFileSync(filepath, 'utf-8');
        const updated = updateFeatureProperty(content, featureName, 'Verified', dateValue);

        if (updated) {
            fs.writeFileSync(filepath, updated);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error updating Verified date for ${featureName}:`, error.message);
        return false;
    }
}

/**
 * Update both Checked and Verified dates for a feature
 * @param {string} filepath - Path to the platform markdown file
 * @param {string} featureName - Name of the feature
 * @param {string} date - Date to set (defaults to today)
 * @returns {boolean} True if both updated successfully
 */
function updateBothDates(filepath, featureName, date = null) {
    const dateValue = date || getTodayISO();

    try {
        let content = fs.readFileSync(filepath, 'utf-8');

        // Update Checked
        let updated = updateFeatureProperty(content, featureName, 'Checked', dateValue);
        if (!updated) {
            console.error(`Could not find Checked property for ${featureName}`);
            return false;
        }

        // Update Verified
        updated = updateFeatureProperty(updated, featureName, 'Verified', dateValue);
        if (!updated) {
            console.error(`Could not find Verified property for ${featureName}`);
            return false;
        }

        fs.writeFileSync(filepath, updated);
        return true;
    } catch (error) {
        console.error(`Error updating dates for ${featureName}:`, error.message);
        return false;
    }
}

/**
 * Batch update Checked dates for multiple features
 * @param {Array<{filepath: string, featureName: string}>} features - Features to update
 * @param {string} date - Date to set (defaults to today)
 * @returns {{success: number, failed: number}} Count of successes and failures
 */
function batchUpdateCheckedDates(features, date = null) {
    const dateValue = date || getTodayISO();
    let success = 0;
    let failed = 0;

    // Group by filepath to minimize file reads/writes
    const byFile = {};
    for (const { filepath, featureName } of features) {
        if (!byFile[filepath]) {
            byFile[filepath] = [];
        }
        byFile[filepath].push(featureName);
    }

    for (const [filepath, featureNames] of Object.entries(byFile)) {
        try {
            let content = fs.readFileSync(filepath, 'utf-8');
            let modified = false;

            for (const featureName of featureNames) {
                const updated = updateFeatureProperty(content, featureName, 'Checked', dateValue);
                if (updated) {
                    content = updated;
                    modified = true;
                    success++;
                } else {
                    failed++;
                }
            }

            if (modified) {
                fs.writeFileSync(filepath, content);
            }
        } catch (error) {
            console.error(`Error processing ${filepath}:`, error.message);
            failed += featureNames.length;
        }
    }

    return { success, failed };
}

/**
 * Batch update both Checked and Verified dates for features with no changes
 * @param {Array<{filepath: string, featureName: string}>} features - Features to update
 * @param {string} date - Date to set (defaults to today)
 * @returns {{success: number, failed: number}} Count of successes and failures
 */
function batchUpdateVerifiedDates(features, date = null) {
    const dateValue = date || getTodayISO();
    let success = 0;
    let failed = 0;

    // Group by filepath
    const byFile = {};
    for (const { filepath, featureName } of features) {
        if (!byFile[filepath]) {
            byFile[filepath] = [];
        }
        byFile[filepath].push(featureName);
    }

    for (const [filepath, featureNames] of Object.entries(byFile)) {
        try {
            let content = fs.readFileSync(filepath, 'utf-8');
            let modified = false;

            for (const featureName of featureNames) {
                // Update both dates
                let updated = updateFeatureProperty(content, featureName, 'Checked', dateValue);
                if (updated) {
                    content = updated;
                    updated = updateFeatureProperty(content, featureName, 'Verified', dateValue);
                    if (updated) {
                        content = updated;
                        modified = true;
                        success++;
                    } else {
                        failed++;
                    }
                } else {
                    failed++;
                }
            }

            if (modified) {
                fs.writeFileSync(filepath, content);
            }
        } catch (error) {
            console.error(`Error processing ${filepath}:`, error.message);
            failed += featureNames.length;
        }
    }

    return { success, failed };
}

module.exports = {
    getTodayISO,
    updateFeatureProperty,
    updateCheckedDate,
    updateVerifiedDate,
    updateBothDates,
    batchUpdateCheckedDates,
    batchUpdateVerifiedDates
};
