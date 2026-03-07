/**
 * Reporter module for generating verification reports, PRs, and issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { CascadeOutcome } = require('./cascade');

const REPORTS_DIR = path.join(__dirname, '..', '..', '.verification-reports');

/**
 * Ensure reports directory exists
 */
function ensureReportsDir() {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
}

/**
 * Generate a markdown report from cascade results
 * @param {Array<Object>} results - Cascade results
 * @param {Object} summary - Summary statistics
 * @returns {string} Markdown report content
 */
function generateMarkdownReport(results, summary) {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];

    let report = `# Verification Report - ${dateStr}\n\n`;
    report += `Generated: ${timestamp}\n\n`;

    // Summary section
    report += `## Summary\n\n`;
    report += `| Metric | Count |\n`;
    report += `|--------|-------|\n`;
    report += `| Total features checked | ${summary.total} |\n`;
    report += `| No change (verified current) | ${summary.noChange} |\n`;
    report += `| Confirmed changes | ${summary.confirmed} |\n`;
    report += `| Contradictions (needs review) | ${summary.contradiction} |\n`;
    report += `| Inconclusive | ${summary.inconclusive} |\n`;
    report += `| Errors | ${summary.error} |\n\n`;

    // Platform breakdown
    report += `## By Platform\n\n`;
    for (const [platform, stats] of Object.entries(summary.byPlatform)) {
        report += `### ${platform}\n\n`;
        report += `- Checked: ${stats.total}\n`;
        report += `- No change: ${stats.noChange}\n`;
        report += `- Confirmed: ${stats.confirmed}\n`;
        report += `- Contradictions: ${stats.contradiction}\n`;
        report += `- Inconclusive: ${stats.inconclusive}\n`;
        report += `- Errors: ${stats.error}\n\n`;
    }

    // Confirmed changes
    const confirmed = results.filter(r => r.outcome === CascadeOutcome.CONFIRMED);
    if (confirmed.length > 0) {
        report += `## Confirmed Changes\n\n`;
        for (const result of confirmed) {
            report += `### ${result.platform} - ${result.feature}\n\n`;
            report += `**Confirmations:** ${result.confirmations}/${result.requiredConfirmations}\n\n`;

            if (result.proposedChanges.length > 0) {
                report += `**Detected changes:**\n`;
                for (const change of result.proposedChanges) {
                    report += `- [${change.type}] ${change.detail}\n`;
                }
                report += `\n`;
            }

            report += `**Model responses:**\n\n`;
            for (const modelResult of result.results) {
                if (modelResult.type === 'error') continue;
                report += `<details>\n<summary>${modelResult.model}</summary>\n\n`;
                report += `${modelResult.response}\n\n`;
                if (modelResult.sources && modelResult.sources.length > 0) {
                    report += `Sources: ${modelResult.sources.join(', ')}\n\n`;
                }
                report += `</details>\n\n`;
            }
        }
    }

    // Contradictions
    const contradictions = results.filter(r => r.outcome === CascadeOutcome.CONTRADICTION);
    if (contradictions.length > 0) {
        report += `## Contradictions (Manual Review Required)\n\n`;
        for (const result of contradictions) {
            report += `### ${result.platform} - ${result.feature}\n\n`;
            report += `Models disagreed on whether changes occurred.\n\n`;

            report += `**Model responses:**\n\n`;
            for (const modelResult of result.results) {
                if (modelResult.type === 'error') continue;
                const changeStatus = modelResult.hasChange ? 'CHANGE' : 'NO CHANGE';
                report += `<details>\n<summary>${modelResult.model} - ${changeStatus}</summary>\n\n`;
                report += `${modelResult.response}\n\n`;
                report += `</details>\n\n`;
            }
        }
    }

    // Errors
    const errors = results.filter(r => r.outcome === CascadeOutcome.ERROR);
    if (errors.length > 0) {
        report += `## Errors\n\n`;
        for (const result of errors) {
            report += `### ${result.platform} - ${result.feature}\n\n`;
            for (const modelResult of result.results) {
                if (modelResult.type === 'error') {
                    report += `- ${modelResult.model}: ${modelResult.error}\n`;
                }
            }
            report += `\n`;
        }
    }

    return report;
}

/**
 * Save report to file
 * @param {string} content - Report content
 * @param {string} suffix - Optional filename suffix
 * @returns {string} Path to saved report
 */
function saveReport(content, suffix = '') {
    ensureReportsDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `verification-${timestamp}${suffix ? '-' + suffix : ''}.md`;
    const filepath = path.join(REPORTS_DIR, filename);

    fs.writeFileSync(filepath, content);
    return filepath;
}

/**
 * Generate PR body for confirmed changes
 * @param {Array<Object>} confirmedResults - Results with confirmed changes
 * @returns {string} PR body markdown
 */
function generatePRBody(confirmedResults) {
    let body = `## Summary\n\n`;
    body += `Automated verification detected the following changes:\n\n`;

    for (const result of confirmedResults) {
        body += `### ${result.platform} - ${result.feature}\n\n`;

        if (result.proposedChanges.length > 0) {
            for (const change of result.proposedChanges) {
                body += `- **${change.type}**: ${change.detail}\n`;
            }
        } else {
            body += `- Changes detected by ${result.confirmations} models\n`;
        }
        body += `\n`;
    }

    body += `## Verification Details\n\n`;
    body += `- Models consulted: Up to 4 (Gemini Flash, Perplexity, Grok, Claude)\n`;
    body += `- Required confirmations: 3\n`;
    body += `- Provider bias prevention: Same-provider models skipped\n\n`;

    body += `## Sources\n\n`;
    const allSources = new Set();
    for (const result of confirmedResults) {
        for (const modelResult of result.results) {
            if (modelResult.sources) {
                modelResult.sources.forEach(s => allSources.add(s));
            }
        }
    }

    if (allSources.size > 0) {
        for (const source of allSources) {
            body += `- ${source}\n`;
        }
    } else {
        body += `See model responses in verification report for cited sources.\n`;
    }

    body += `\n---\n`;
    body += `*This PR was automatically generated by the pricing verification system.*\n`;

    return body;
}

/**
 * Generate issue body for contradictions
 * @param {Object} result - Contradiction result
 * @returns {string} Issue body markdown
 */
function generateContradictionIssue(result) {
    let body = `## Verification Conflict\n\n`;
    body += `Automated verification found conflicting information about:\n\n`;
    body += `**Platform:** ${result.platform}\n`;
    body += `**Feature:** ${result.feature}\n\n`;

    body += `## Model Responses\n\n`;

    for (const modelResult of result.results) {
        if (modelResult.type === 'error') continue;

        const status = modelResult.hasChange ? 'Detected change' : 'No change detected';
        body += `### ${modelResult.model}\n\n`;
        body += `**Result:** ${status}\n\n`;
        body += `<details>\n<summary>Full response</summary>\n\n`;
        body += `${modelResult.response}\n\n`;
        body += `</details>\n\n`;
    }

    body += `## Action Required\n\n`;
    body += `Please manually verify this feature's current status:\n\n`;
    body += `1. Check the official pricing page\n`;
    body += `2. Verify platform availability\n`;
    body += `3. Update the data file if needed\n`;
    body += `4. Close this issue with findings\n\n`;

    body += `---\n`;
    body += `*This issue was automatically generated by the pricing verification system.*\n`;

    return body;
}

/**
 * Generate issue body for inconclusive results
 * @param {Object} result - Inconclusive result
 * @returns {string} Issue body markdown
 */
function generateInconclusiveIssue(result) {
    let body = `## Unconfirmed Change\n\n`;
    body += `Automated verification found a potential change but couldn't reach consensus:\n\n`;
    body += `**Platform:** ${result.platform}\n`;
    body += `**Feature:** ${result.feature}\n`;
    body += `**Confirmations:** ${result.confirmations}/${result.requiredConfirmations}\n\n`;

    if (result.proposedChanges.length > 0) {
        body += `## Potential Changes\n\n`;
        for (const change of result.proposedChanges) {
            body += `- [${change.type}] ${change.detail}\n`;
        }
        body += `\n`;
    }

    body += `## Model Responses\n\n`;

    for (const modelResult of result.results) {
        if (modelResult.type === 'error') continue;

        body += `### ${modelResult.model}\n\n`;
        body += `<details>\n<summary>Response</summary>\n\n`;
        body += `${modelResult.response}\n\n`;
        body += `</details>\n\n`;
    }

    body += `## Action Required\n\n`;
    body += `Please manually verify if this feature has changed.\n\n`;

    body += `---\n`;
    body += `*This issue was automatically generated by the pricing verification system.*\n`;

    return body;
}

/**
 * Label colors for auto-created labels
 */
const LABEL_COLORS = {
    'verification-conflict': 'd73a4a',
    'verification-inconclusive': 'fbca04',
    'needs-review': 'fbca04',
    'broken-links': 'd73a4a',
    'verification-needed': '0e8a16'
};

/**
 * Check if an open issue with the same title already exists
 * @param {string} title - Issue title to search for
 * @returns {string|null} Existing issue URL if found, null otherwise
 */
function findExistingIssue(title) {
    try {
        const searchTitle = title.replace(/"/g, '\\"');
        const result = execSync(
            `gh issue list --state open --search "${searchTitle}" --json number,title,url --limit 20`,
            { encoding: 'utf-8' }
        );
        const issues = JSON.parse(result);
        const match = issues.find(i => i.title === title);
        return match ? match.url : null;
    } catch (error) {
        // If search fails, allow creation to proceed
        return null;
    }
}

/**
 * Create a GitHub issue using gh CLI
 * Skips creation if an open issue with the same title already exists
 * @param {string} title - Issue title
 * @param {string} body - Issue body
 * @param {Array<string>} labels - Issue labels
 * @returns {string|null} Issue URL (new or existing) or null if failed
 */
function createGitHubIssue(title, body, labels = []) {
    try {
        // Check for existing open issue with the same title
        const existingUrl = findExistingIssue(title);
        if (existingUrl) {
            console.log(`  Skipped (duplicate): ${existingUrl}`);
            return existingUrl;
        }

        // Create labels if they don't exist (ignore errors)
        for (const label of labels) {
            const color = LABEL_COLORS[label] || 'ededed';
            try {
                execSync(`gh label create "${label}" --color "${color}" 2>/dev/null`, { encoding: 'utf-8' });
            } catch (e) {
                // Label already exists, ignore
            }
        }

        const labelArgs = labels.map(l => `-l "${l}"`).join(' ');
        const cmd = `gh issue create --title "${title}" --body "${body.replace(/"/g, '\\"')}" ${labelArgs}`;

        const result = execSync(cmd, { encoding: 'utf-8' });
        return result.trim();
    } catch (error) {
        console.error('Failed to create GitHub issue:', error.message);
        return null;
    }
}

/**
 * Create a GitHub PR using gh CLI
 * @param {string} branch - Branch name
 * @param {string} title - PR title
 * @param {string} body - PR body
 * @returns {string|null} PR URL or null if failed
 */
function createGitHubPR(branch, title, body) {
    try {
        const cmd = `gh pr create --head "${branch}" --title "${title}" --body "${body.replace(/"/g, '\\"')}"`;

        const result = execSync(cmd, { encoding: 'utf-8' });
        return result.trim();
    } catch (error) {
        console.error('Failed to create GitHub PR:', error.message);
        return null;
    }
}

/**
 * Generate staleness report
 * @param {Array<Object>} staleFeatures - Array of stale features
 * @returns {string} Markdown report
 */
function generateStalenessReport(staleFeatures) {
    const timestamp = new Date().toISOString();

    let report = `# Staleness Report - ${timestamp.split('T')[0]}\n\n`;
    report += `Found ${staleFeatures.length} features that haven't been checked in over 7 days.\n\n`;

    // Group by platform
    const byPlatform = {};
    for (const { platform, feature, daysSinceChecked } of staleFeatures) {
        if (!byPlatform[platform.name]) {
            byPlatform[platform.name] = [];
        }
        byPlatform[platform.name].push({ feature, daysSinceChecked });
    }

    for (const [platformName, features] of Object.entries(byPlatform)) {
        report += `## ${platformName}\n\n`;
        report += `| Feature | Days Since Checked | Last Checked |\n`;
        report += `|---------|-------------------|---------------|\n`;

        for (const { feature, daysSinceChecked } of features) {
            const lastChecked = feature.checked || 'Never';
            const days = daysSinceChecked === Infinity ? 'Never' : daysSinceChecked;
            report += `| ${feature.name} | ${days} | ${lastChecked} |\n`;
        }
        report += `\n`;
    }

    return report;
}

/**
 * Print results to console
 * @param {Array<Object>} results - Cascade results
 * @param {Object} summary - Summary statistics
 */
function printResults(results, summary) {
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(60));

    console.log(`\nTotal features checked: ${summary.total}`);
    console.log(`  ✓ No change (verified): ${summary.noChange}`);
    console.log(`  ✓ Confirmed changes: ${summary.confirmed}`);
    console.log(`  ⚠ Contradictions: ${summary.contradiction}`);
    console.log(`  ? Inconclusive: ${summary.inconclusive}`);
    console.log(`  ✗ Errors: ${summary.error}`);

    // List confirmed changes
    const confirmed = results.filter(r => r.outcome === CascadeOutcome.CONFIRMED);
    if (confirmed.length > 0) {
        console.log('\n' + '-'.repeat(40));
        console.log('CONFIRMED CHANGES:');
        for (const result of confirmed) {
            console.log(`  • ${result.platform} → ${result.feature}`);
            for (const change of result.proposedChanges) {
                console.log(`    - [${change.type}] ${change.detail}`);
            }
        }
    }

    // List contradictions
    const contradictions = results.filter(r => r.outcome === CascadeOutcome.CONTRADICTION);
    if (contradictions.length > 0) {
        console.log('\n' + '-'.repeat(40));
        console.log('CONTRADICTIONS (manual review needed):');
        for (const result of contradictions) {
            console.log(`  • ${result.platform} → ${result.feature}`);
        }
    }

    console.log('\n' + '='.repeat(60));
}

module.exports = {
    ensureReportsDir,
    generateMarkdownReport,
    saveReport,
    generatePRBody,
    generateContradictionIssue,
    generateInconclusiveIssue,
    findExistingIssue,
    createGitHubIssue,
    createGitHubPR,
    generateStalenessReport,
    printResults,
    REPORTS_DIR
};
