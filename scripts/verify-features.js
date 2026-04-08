#!/usr/bin/env node

/**
 * AI Tool Watch - Automated Feature Verification
 *
 * Multi-model AI cascade for verifying feature data including:
 * pricing tiers, platform availability, status, gating, regional availability, and URLs.
 *
 * Usage:
 *   node scripts/verify-features.js                     # Verify all features
 *   node scripts/verify-features.js --platform claude   # Verify specific platform
 *   node scripts/verify-features.js --stale-only        # Only check stale features
 *   node scripts/verify-features.js --dry-run           # Don't create PRs/issues
 *
 * Environment variables:
 *   GEMINI_API_KEY       - Google AI Studio API key
 *   PERPLEXITY_API_KEY   - Perplexity API key
 *   XAI_API_KEY          - xAI API key for Grok
 *   ANTHROPIC_API_KEY    - Anthropic API key
 */

const path = require('path');
const fs = require('fs');

// Load modules
const {
    loadAllPlatforms,
    getPlatform,
    getFeature,
    getAllFeatures,
    findStaleFeatures
} = require('./lib/parser');

const {
    runCascade,
    runBatchCascade,
    summarizeResults,
    CascadeOutcome
} = require('./lib/cascade');

const {
    generateMarkdownReport,
    saveReport,
    generatePRBody,
    generateContradictionIssue,
    generateInconclusiveIssue,
    generateConsistencyIssue,
    generateStalenessReport,
    printResults,
    createGitHubIssue,
    generateCascadeHealthIssue
} = require('./lib/reporter');

const { checkConsistency } = require('./lib/consistency');

const {
    batchUpdateCheckedDates,
    batchUpdateVerifiedDates,
    batchAddChangelogEntries
} = require('./lib/file-updater');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        platform: null,
        feature: null,
        staleOnly: false,
        staleThreshold: 7,
        dryRun: false,
        verbose: false,
        maxFeatures: 100,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--platform':
            case '-p':
                options.platform = args[++i];
                break;
            case '--feature':
            case '-f':
                options.feature = args[++i];
                break;
            case '--stale-only':
            case '-s':
                options.staleOnly = true;
                break;
            case '--stale-threshold':
                options.staleThreshold = parseInt(args[++i], 10);
                break;
            case '--dry-run':
            case '-d':
                options.dryRun = true;
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--max':
            case '-m':
                options.maxFeatures = parseInt(args[++i], 10);
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
        }
    }

    return options;
}

function printHelp() {
    console.log(`
AI Tool Watch - Automated Feature Verification

Verifies: pricing tiers, platforms, status, gating, regional availability, URLs

USAGE:
    node scripts/verify-features.js [OPTIONS]

OPTIONS:
    -p, --platform <name>      Verify only a specific platform (e.g., claude, chatgpt)
    -f, --feature <name>       Verify only a specific feature (requires --platform)
    -s, --stale-only           Only check features with Checked date > threshold
        --stale-threshold <n>  Days threshold for staleness (default: 7)
    -d, --dry-run              Don't create PRs or issues, just report
    -v, --verbose              Show detailed output during verification
    -m, --max <n>              Maximum features to verify (default: 100)
    -h, --help                 Show this help message

ENVIRONMENT VARIABLES:
    GEMINI_API_KEY       Google AI Studio API key (required)
    PERPLEXITY_API_KEY   Perplexity API key (required)
    XAI_API_KEY          xAI API key for Grok (required)
    ANTHROPIC_API_KEY    Anthropic API key (required)

EXAMPLES:
    # Verify all features across all platforms
    node scripts/verify-features.js

    # Verify only Claude features
    node scripts/verify-features.js --platform claude

    # Verify a specific feature
    node scripts/verify-features.js --platform chatgpt --feature "Agent Mode"

    # Check only stale features (not checked in 7+ days)
    node scripts/verify-features.js --stale-only

    # Dry run with verbose output
    node scripts/verify-features.js --dry-run --verbose
`);
}

function checkApiKeys() {
    const required = [
        'GEMINI_API_KEY',
        'PERPLEXITY_API_KEY',
        'XAI_API_KEY',
        'ANTHROPIC_API_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('\n⚠️  Missing required API keys:');
        for (const key of missing) {
            console.error(`   - ${key}`);
        }
        console.error('\nSet these environment variables before running verification.');
        console.error('See VERIFICATION.md for details.\n');
        return false;
    }

    return true;
}

async function main() {
    const options = parseArgs();

    if (options.help) {
        printHelp();
        process.exit(0);
    }

    console.log('\n🔍 AI Tool Watch - Feature Verification\n');

    // Check API keys
    if (!checkApiKeys()) {
        process.exit(1);
    }

    // Determine what to verify
    let featuresToVerify = [];

    if (options.platform && options.feature) {
        // Single feature
        const result = getFeature(options.platform, options.feature);
        if (!result) {
            console.error(`Feature "${options.feature}" not found in platform "${options.platform}"`);
            process.exit(1);
        }
        featuresToVerify = [result];
        console.log(`Verifying: ${result.platform.name} → ${result.feature.name}`);

    } else if (options.platform) {
        // All features for a platform
        const platform = getPlatform(options.platform);
        if (!platform) {
            console.error(`Platform "${options.platform}" not found`);
            process.exit(1);
        }
        featuresToVerify = platform.features.map(feature => ({ platform, feature }));
        console.log(`Verifying ${featuresToVerify.length} features for ${platform.name}`);

    } else if (options.staleOnly) {
        // Only stale features
        const stale = findStaleFeatures(options.staleThreshold);
        featuresToVerify = stale.map(({ platform, feature }) => ({ platform, feature }));
        console.log(`Found ${featuresToVerify.length} stale features (>${options.staleThreshold} days)`);

        if (featuresToVerify.length === 0) {
            console.log('\n✓ No stale features found. All features are up to date!\n');
            process.exit(0);
        }

        // Generate staleness report
        const staleReport = generateStalenessReport(stale);
        const reportPath = saveReport(staleReport, 'staleness');
        console.log(`Staleness report saved to: ${reportPath}`);

    } else {
        // All features
        featuresToVerify = getAllFeatures();
        console.log(`Verifying ${featuresToVerify.length} features across all platforms`);
    }

    // Apply max limit — prioritize most-stale features so nothing gets permanently skipped
    if (featuresToVerify.length > options.maxFeatures) {
        const now = new Date();
        featuresToVerify.sort((a, b) => {
            const aDate = a.feature.checked ? new Date(a.feature.checked) : new Date(0);
            const bDate = b.feature.checked ? new Date(b.feature.checked) : new Date(0);
            return aDate - bDate; // oldest Checked date first
        });
        console.log(`Limiting to ${options.maxFeatures} of ${featuresToVerify.length} features (most stale first)`);
        featuresToVerify = featuresToVerify.slice(0, options.maxFeatures);
    }

    // Pre-cascade: check internal consistency of all features
    const consistencyErrors = [];
    for (const { platform, feature } of featuresToVerify) {
        const result = checkConsistency(feature);
        if (result.hasErrors) {
            consistencyErrors.push({ platform, feature, issues: result.issues });
            console.log(`⚠ Consistency error: ${platform.name} → ${feature.name}`);
            for (const issue of result.issues.filter(i => i.severity === 'error')) {
                console.log(`  🔴 ${issue.message}`);
            }
        } else if (result.hasWarnings && options.verbose) {
            for (const issue of result.issues.filter(i => i.severity === 'warning')) {
                console.log(`  🟡 ${platform.name} → ${feature.name}: ${issue.message}`);
            }
        }
    }

    if (consistencyErrors.length > 0) {
        console.log(`\n${consistencyErrors.length} feature(s) with consistency errors (removed from cascade)`);

        if (!options.dryRun) {
            for (const { platform, feature, issues } of consistencyErrors) {
                const title = `[Data Inconsistency] ${platform.name} - ${feature.name}`;
                const body = generateConsistencyIssue({
                    platform: platform.name,
                    feature: feature.name,
                    issues
                });
                console.log(`Creating consistency issue: ${platform.name} → ${feature.name}`);
                const issueUrl = createGitHubIssue(title, body, ['data-inconsistency', 'needs-review']);
                if (issueUrl) {
                    console.log(`  Issue created: ${issueUrl}`);
                }
            }
        }

        // Remove features with consistency errors from cascade
        const errorKeys = new Set(consistencyErrors.map(e =>
            `${e.platform.name}:${e.feature.name}`
        ));
        featuresToVerify = featuresToVerify.filter(f =>
            !errorKeys.has(`${f.platform.name}:${f.feature.name}`)
        );
    }

    if (options.dryRun) {
        console.log('\n📋 DRY RUN MODE - No PRs or issues will be created\n');
    }

    // Run verification
    console.log('\nStarting verification cascade...\n');

    const { results, providerHealth } = await runBatchCascade(
        featuresToVerify,
        {
            verbose: options.verbose,
            maxFeatures: options.maxFeatures,
            delayBetweenFeatures: 2000,
            delayBetweenQueries: 1000,
            requiredConfirmations: 3
        },
        (progress) => {
            const pct = Math.round((progress.current / progress.total) * 100);
            process.stdout.write(`\r[${pct}%] ${progress.current}/${progress.total}: ${progress.platform} → ${progress.feature}     `);
        }
    );

    console.log('\n');

    // Check provider health and alert on degraded providers
    const degradedProviders = [];
    console.log('\nProvider health:');
    for (const [name, stats] of Object.entries(providerHealth)) {
        const queriesUsed = stats.total - stats.skipped;
        if (queriesUsed === 0) continue;
        const errorRate = stats.errors / queriesUsed;
        const pct = (errorRate * 100).toFixed(0);
        const status = errorRate > 0.8 ? '✗' : errorRate > 0 ? '~' : '✓';
        console.log(`  ${status} ${name}: ${stats.errors}/${queriesUsed} errors (${pct}%)`);
        if (errorRate > 0.8) {
            degradedProviders.push(name);
        }
    }

    if (degradedProviders.length > 0) {
        const names = degradedProviders.join(', ');
        console.log(`\n⚠ DEGRADED PROVIDERS: ${names}`);
        // Emit GitHub Actions warning annotation
        console.log(`::warning::Cascade health degraded — providers failing at >80%: ${names}`);

        if (!options.dryRun) {
            const title = `[Cascade Health] Degraded providers: ${names}`;
            const body = generateCascadeHealthIssue(providerHealth, results.length);
            const issueUrl = createGitHubIssue(title, body, ['cascade-health']);
            if (issueUrl) {
                console.log(`  Health issue: ${issueUrl}`);
            }
        }
    }

    // Summarize results
    const summary = summarizeResults(results);
    printResults(results, summary);

    // Generate full report
    const report = generateMarkdownReport(results, summary);
    const reportPath = saveReport(report);
    console.log(`\nFull report saved to: ${reportPath}`);

    // Update dates in markdown files (unless dry run)
    if (!options.dryRun) {
        console.log('\nUpdating dates in data files...');

        // Collect all features that were checked (for Checked date update)
        const allChecked = results.map(r => ({
            filepath: featuresToVerify.find(f =>
                f.platform.name === r.platform && f.feature.name === r.feature
            )?.platform._filepath,
            featureName: r.feature
        })).filter(f => f.filepath);

        // Collect features with no changes (for Verified date update)
        const noChangeFeatures = results
            .filter(r => r.outcome === CascadeOutcome.NO_CHANGE)
            .map(r => ({
                filepath: featuresToVerify.find(f =>
                    f.platform.name === r.platform && f.feature.name === r.feature
                )?.platform._filepath,
                featureName: r.feature
            })).filter(f => f.filepath);

        // Update Checked date for ALL features that were checked
        if (allChecked.length > 0) {
            const checkedResult = batchUpdateCheckedDates(allChecked);
            console.log(`  Checked dates updated: ${checkedResult.success} success, ${checkedResult.failed} failed`);
        }

        // Update Verified date ONLY for features with no changes
        if (noChangeFeatures.length > 0) {
            const verifiedResult = batchUpdateVerifiedDates(noChangeFeatures);
            console.log(`  Verified dates updated: ${verifiedResult.success} success, ${verifiedResult.failed} failed`);
        }
    }

    // Handle outputs (unless dry run)
    if (!options.dryRun) {
        // Create issues for contradictions
        const contradictions = results.filter(r => r.outcome === CascadeOutcome.CONTRADICTION);
        for (const result of contradictions) {
            const title = `[Verification Conflict] ${result.platform} - ${result.feature}`;
            const body = generateContradictionIssue(result);

            console.log(`\nCreating issue for contradiction: ${result.platform} → ${result.feature}`);
            const issueUrl = createGitHubIssue(title, body, ['verification-conflict', 'needs-review']);
            if (issueUrl) {
                console.log(`  Issue created: ${issueUrl}`);
            }
        }

        // Create issues for inconclusive results
        const inconclusive = results.filter(r => r.outcome === CascadeOutcome.INCONCLUSIVE);
        for (const result of inconclusive) {
            const title = `[Unconfirmed Change] ${result.platform} - ${result.feature}`;
            const body = generateInconclusiveIssue(result);

            console.log(`\nCreating issue for inconclusive: ${result.platform} → ${result.feature}`);
            const issueUrl = createGitHubIssue(title, body, ['verification-inconclusive', 'needs-review']);
            if (issueUrl) {
                console.log(`  Issue created: ${issueUrl}`);
            }
        }

        // Handle confirmed changes - add changelog entries
        const confirmed = results.filter(r => r.outcome === CascadeOutcome.CONFIRMED);
        if (confirmed.length > 0) {
            console.log('\n' + '-'.repeat(40));
            console.log('CONFIRMED CHANGES:');
            console.log('-'.repeat(40));

            // Prepare changelog entries
            const changelogEntries = [];

            for (const result of confirmed) {
                console.log(`\n${result.platform} → ${result.feature}`);

                const platformData = featuresToVerify.find(f =>
                    f.platform.name === result.platform && f.feature.name === result.feature
                )?.platform;

                if (platformData?._filepath && result.proposedChanges?.length > 0) {
                    // Combine all changes into a single changelog entry
                    const changesSummary = result.proposedChanges
                        .map(c => `${c.type}: ${c.detail}`)
                        .join('; ');

                    changelogEntries.push({
                        filepath: platformData._filepath,
                        featureName: result.feature,
                        change: `[Verified] ${changesSummary}`
                    });

                    for (const change of result.proposedChanges) {
                        console.log(`  • [${change.type}] ${change.detail}`);
                    }
                }
            }

            // Add changelog entries
            if (changelogEntries.length > 0) {
                console.log('\nAdding changelog entries...');
                const changelogResult = batchAddChangelogEntries(changelogEntries);
                console.log(`  Changelog entries added: ${changelogResult.success} success, ${changelogResult.failed} failed`);
            }

            console.log('\nPlease review the report and create a PR with the necessary updates.');
            console.log(`Report: ${reportPath}`);
        }
    }

    // Exit with appropriate code
    const hasIssues = summary.confirmed > 0 || summary.contradiction > 0;
    process.exit(hasIssues ? 1 : 0);
}

// Run main
main().catch(error => {
    console.error('\n❌ Verification failed:', error.message);
    if (process.env.DEBUG) {
        console.error(error.stack);
    }
    process.exit(1);
});
