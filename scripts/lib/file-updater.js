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
 * Batch update Verified dates for features with no changes
 * Note: Only updates Verified date. Checked date should be updated separately
 * via batchUpdateCheckedDates for all checked features.
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
                // Only update Verified date
                const updated = updateFeatureProperty(content, featureName, 'Verified', dateValue);
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
 * Get today's date/time in ISO 8601 format
 * @returns {string} DateTime string like "2026-01-29T12:00Z"
 */
function getTodayISOWithTime() {
    const now = new Date();
    return now.toISOString().replace(/:\d{2}\.\d{3}Z$/, 'Z').replace(/:\d{2}Z$/, ':00Z');
}

/**
 * Add a changelog entry to a feature's changelog table
 * @param {string} filepath - Path to the platform markdown file
 * @param {string} featureName - Name of the feature
 * @param {string} changeDescription - Description of the change
 * @param {string} date - Date to use (defaults to now in ISO format)
 * @returns {boolean} True if added successfully
 */
function addChangelogEntry(filepath, featureName, changeDescription, date = null) {
    const dateValue = date || getTodayISOWithTime();

    try {
        let content = fs.readFileSync(filepath, 'utf-8');

        // Find the feature section and its changelog table
        // Pattern: ## Feature Name ... ### Changelog ... | Date | Change | ... |------|--------| ... (entries)
        const featureStart = content.indexOf(`## ${featureName}\n`);
        if (featureStart === -1) {
            console.error(`Feature "${featureName}" not found in ${filepath}`);
            return false;
        }

        // Find the next feature section to limit our search
        const nextFeatureMatch = content.slice(featureStart + 1).match(/\n## [^#]/);
        const featureEnd = nextFeatureMatch
            ? featureStart + 1 + nextFeatureMatch.index
            : content.length;

        const featureSection = content.slice(featureStart, featureEnd);

        // Find the changelog table header row
        const changelogMatch = featureSection.match(/### Changelog\s*\n\s*\| Date \| Change \|\s*\n\s*\|[-]+\|[-]+\|/);
        if (!changelogMatch) {
            // No changelog section found - add one
            const insertPoint = featureSection.search(/\n### Sources|\n---|\n## /);
            if (insertPoint === -1) {
                console.error(`Could not find insertion point for changelog in ${featureName}`);
                return false;
            }

            const newChangelog = `\n### Changelog\n\n| Date | Change |\n|------|--------|\n| ${dateValue} | ${changeDescription} |\n`;
            const beforeInsert = content.slice(0, featureStart + insertPoint);
            const afterInsert = content.slice(featureStart + insertPoint);
            content = beforeInsert + newChangelog + afterInsert;

        } else {
            // Changelog exists - add entry after header
            const headerEnd = featureStart + changelogMatch.index + changelogMatch[0].length;
            const newEntry = `\n| ${dateValue} | ${changeDescription} |`;

            content = content.slice(0, headerEnd) + newEntry + content.slice(headerEnd);
        }

        fs.writeFileSync(filepath, content);
        return true;
    } catch (error) {
        console.error(`Error adding changelog entry for ${featureName}:`, error.message);
        return false;
    }
}

/**
 * Batch add changelog entries for multiple features
 * @param {Array<{filepath: string, featureName: string, change: string}>} entries - Entries to add
 * @param {string} date - Date to use (defaults to now)
 * @returns {{success: number, failed: number}} Count of successes and failures
 */
function batchAddChangelogEntries(entries, date = null) {
    const dateValue = date || getTodayISOWithTime();
    let success = 0;
    let failed = 0;

    // Group by filepath to minimize file reads/writes
    const byFile = {};
    for (const { filepath, featureName, change } of entries) {
        if (!byFile[filepath]) {
            byFile[filepath] = [];
        }
        byFile[filepath].push({ featureName, change });
    }

    for (const [filepath, featureEntries] of Object.entries(byFile)) {
        try {
            let content = fs.readFileSync(filepath, 'utf-8');

            for (const { featureName, change } of featureEntries) {
                // Find the feature section
                const featureStart = content.indexOf(`## ${featureName}\n`);
                if (featureStart === -1) {
                    failed++;
                    continue;
                }

                // Find the next feature section to limit our search
                const nextFeatureMatch = content.slice(featureStart + 1).match(/\n## [^#]/);
                const featureEnd = nextFeatureMatch
                    ? featureStart + 1 + nextFeatureMatch.index
                    : content.length;

                const featureSection = content.slice(featureStart, featureEnd);

                // Find the changelog table header row
                const changelogMatch = featureSection.match(/### Changelog\s*\n\s*\| Date \| Change \|\s*\n\s*\|[-]+\|[-]+\|/);

                if (!changelogMatch) {
                    // No changelog section found - add one before Sources
                    const insertPoint = featureSection.search(/\n### Sources|\n---|\n## /);
                    if (insertPoint === -1) {
                        failed++;
                        continue;
                    }

                    const newChangelog = `\n### Changelog\n\n| Date | Change |\n|------|--------|\n| ${dateValue} | ${change} |\n`;
                    const beforeInsert = content.slice(0, featureStart + insertPoint);
                    const afterInsert = content.slice(featureStart + insertPoint);
                    content = beforeInsert + newChangelog + afterInsert;

                } else {
                    // Changelog exists - add entry after header
                    const headerEnd = featureStart + changelogMatch.index + changelogMatch[0].length;
                    const newEntry = `\n| ${dateValue} | ${change} |`;

                    content = content.slice(0, headerEnd) + newEntry + content.slice(headerEnd);
                }

                success++;
            }

            fs.writeFileSync(filepath, content);
        } catch (error) {
            console.error(`Error processing ${filepath}:`, error.message);
            failed += featureEntries.length;
        }
    }

    return { success, failed };
}

module.exports = {
    getTodayISO,
    getTodayISOWithTime,
    updateFeatureProperty,
    updateCheckedDate,
    updateVerifiedDate,
    updateBothDates,
    batchUpdateCheckedDates,
    batchUpdateVerifiedDates,
    addChangelogEntry,
    batchAddChangelogEntries
};
