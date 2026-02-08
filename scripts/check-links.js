#!/usr/bin/env node

/**
 * AI Feature Tracker - Dead Link Checker
 *
 * Validates all URLs in feature data:
 * - Platform pricing/status page URLs
 * - Feature URLs
 * - Source URLs
 *
 * Usage:
 *   node scripts/check-links.js                  # Check all links
 *   node scripts/check-links.js --platform claude # Check specific platform
 *   node scripts/check-links.js --broken-only    # Only report broken links
 */

const fs = require('fs');
const path = require('path');
const { loadAllPlatforms, getPlatform } = require('./lib/parser');
const { extractAllUrls } = require('./lib/link-checker');
const { checkUrls, summarize, groupByCategory } = require('./lib/link-engine');

const REPORTS_DIR = path.join(__dirname, '..', '.link-reports');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        platform: null,
        brokenOnly: false,
        verbose: false,
        timeout: 10000,
        concurrency: 5,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--platform':
            case '-p':
                options.platform = args[++i];
                break;
            case '--broken-only':
            case '-b':
                options.brokenOnly = true;
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--timeout':
            case '-t':
                options.timeout = parseInt(args[++i], 10);
                break;
            case '--concurrency':
            case '-c':
                options.concurrency = parseInt(args[++i], 10);
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
AI Feature Tracker - Dead Link Checker

Validates all URLs in feature data including pricing pages, feature URLs, and sources.

USAGE:
    node scripts/check-links.js [OPTIONS]

OPTIONS:
    -p, --platform <name>   Check only a specific platform
    -b, --broken-only       Only report broken/problematic links
    -v, --verbose           Show detailed progress
    -t, --timeout <ms>      Request timeout in milliseconds (default: 10000)
    -c, --concurrency <n>   Number of concurrent requests (default: 5)
    -h, --help              Show this help message

EXAMPLES:
    # Check all links across all platforms
    node scripts/check-links.js

    # Check only Claude links
    node scripts/check-links.js --platform claude

    # Only show broken links
    node scripts/check-links.js --broken-only

    # Verbose output with custom timeout
    node scripts/check-links.js --verbose --timeout 15000
`);
}

function ensureReportsDir() {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
}

function saveReport(content) {
    ensureReportsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `link-check-${timestamp}.md`;
    const filepath = path.join(REPORTS_DIR, filename);
    fs.writeFileSync(filepath, content);
    return filepath;
}

function toLegacyBuckets(categoryGroups = {}) {
    return {
        ok: categoryGroups.ok || [],
        broken: categoryGroups.broken || [],
        blocked: categoryGroups['soft-blocked'] || [],
        rateLimited: categoryGroups['rate-limited'] || [],
        timeout: categoryGroups.timeout || [],
        needsManualReview: categoryGroups['needs-manual-review'] || []
    };
}

function buildEntryResults(urlEntries, linkResults) {
    const resultMap = new Map();
    for (const result of linkResults) {
        resultMap.set(result.url, result);
    }

    return urlEntries.map(entry => ({
        ...entry,
        ...(resultMap.get(entry.url) || {
            category: 'needs-manual-review',
            http_code: null,
            final_url: null,
            evidence: 'missing-result',
            checked_at: new Date().toISOString()
        })
    }));
}

function generateLinkReport(results) {
    const timestamp = new Date().toISOString();
    let report = `# Link Check Report - ${timestamp.split('T')[0]}\n\n`;

    report += `## Summary\n\n`;
    report += `| Status | Count |\n`;
    report += `|--------|-------|\n`;
    report += `| ✅ OK | ${results.summary.ok} |\n`;
    report += `| ❌ Broken | ${results.summary.broken} |\n`;
    report += `| 🚫 Soft-Blocked | ${results.summary.softBlocked} |\n`;
    report += `| 🚦 Rate-Limited | ${results.summary.rateLimited} |\n`;
    report += `| ⏱️ Timeout | ${results.summary.timeout} |\n`;
    report += `| 🧭 Needs Manual Review | ${results.summary.needsManualReview} |\n`;
    report += `| **Total** | ${results.total} |\n\n`;

    if (results.results.broken.length > 0) {
        report += `## ❌ Broken Links\n\n`;
        report += `| Platform | Feature | Type | URL | HTTP | Evidence |\n`;
        report += `|----------|---------|------|-----|------|----------|\n`;
        for (const link of results.results.broken) {
            report += `| ${link.platform} | ${link.feature || '—'} | ${link.type} | ${link.url} | ${link.http_code ?? '—'} | ${link.evidence || '—'} |\n`;
        }
        report += `\n`;
    }

    if (results.results.blocked.length > 0) {
        report += `## 🚫 Soft-Blocked (Not Automatically Broken)\n\n`;
        report += `| Platform | Feature | Type | URL | HTTP | Evidence |\n`;
        report += `|----------|---------|------|-----|------|----------|\n`;
        for (const link of results.results.blocked) {
            report += `| ${link.platform} | ${link.feature || '—'} | ${link.type} | ${link.url} | ${link.http_code ?? '—'} | ${link.evidence || '—'} |\n`;
        }
        report += `\n`;
    }

    if (results.results.rateLimited.length > 0) {
        report += `## 🚦 Rate-Limited\n\n`;
        report += `| Platform | Feature | Type | URL | HTTP | Evidence |\n`;
        report += `|----------|---------|------|-----|------|----------|\n`;
        for (const link of results.results.rateLimited) {
            report += `| ${link.platform} | ${link.feature || '—'} | ${link.type} | ${link.url} | ${link.http_code ?? '—'} | ${link.evidence || '—'} |\n`;
        }
        report += `\n`;
    }

    if (results.results.timeout.length > 0) {
        report += `## ⏱️ Timed Out\n\n`;
        report += `| Platform | Feature | Type | URL | Evidence |\n`;
        report += `|----------|---------|------|-----|----------|\n`;
        for (const link of results.results.timeout) {
            report += `| ${link.platform} | ${link.feature || '—'} | ${link.type} | ${link.url} | ${link.evidence || '—'} |\n`;
        }
        report += `\n`;
    }

    if (results.results.needsManualReview.length > 0) {
        report += `## 🧭 Needs Manual Review\n\n`;
        report += `| Platform | Feature | Type | URL | HTTP | Evidence |\n`;
        report += `|----------|---------|------|-----|------|----------|\n`;
        for (const link of results.results.needsManualReview) {
            report += `| ${link.platform} | ${link.feature || '—'} | ${link.type} | ${link.url} | ${link.http_code ?? '—'} | ${link.evidence || '—'} |\n`;
        }
        report += `\n`;
    }

    return report;
}

function getProblemLinks(results) {
    return [
        ...(results.results.broken || []),
        ...(results.results.timeout || [])
    ];
}

function getExitCode(problemLinks) {
    return problemLinks.length > 0 ? 1 : 0;
}

async function main() {
    const options = parseArgs();

    if (options.help) {
        printHelp();
        process.exit(0);
    }

    console.log('\n🔗 AI Feature Tracker - Link Checker\n');

    // Load platform data
    let platforms;
    if (options.platform) {
        const platform = getPlatform(options.platform);
        if (!platform) {
            console.error(`Platform "${options.platform}" not found`);
            process.exit(1);
        }
        platforms = [platform];
        console.log(`Checking links for: ${platform.name}`);
    } else {
        platforms = loadAllPlatforms();
        console.log(`Checking links across ${platforms.length} platforms`);
    }

    // Run link checks
    console.log('\nChecking URLs...\n');

    const urlEntries = extractAllUrls(platforms);
    const urls = urlEntries.map(entry => entry.url);

    console.log(`Found ${urls.length} URLs to check (${new Set(urls).size} unique)`);

    const linkResults = await checkUrls(urls, {
        concurrency: options.concurrency,
        timeout: options.timeout,
        onProgress: options.verbose ? (progress) => {
            const pct = Math.round((progress.checked / progress.total) * 100);
            process.stdout.write(`\r[${pct}%] ${progress.checked}/${progress.total} URLs checked`);
        } : null
    });

    const combinedResults = buildEntryResults(urlEntries, linkResults);
    const grouped = groupByCategory(combinedResults);
    const summary = summarize(combinedResults);
    const legacyBuckets = toLegacyBuckets(grouped);

    const results = {
        total: urlEntries.length,
        unique: new Set(urls).size,
        summary: {
            ok: summary.ok || 0,
            broken: summary.broken || 0,
            softBlocked: summary['soft-blocked'] || 0,
            rateLimited: summary['rate-limited'] || 0,
            timeout: summary.timeout || 0,
            needsManualReview: summary['needs-manual-review'] || 0
        },
        results: legacyBuckets
    };

    if (options.verbose) {
        console.log('\n');
    }

    // Print summary
    console.log('='.repeat(50));
    console.log('LINK CHECK RESULTS');
    console.log('='.repeat(50));
    console.log(`\nTotal URLs checked: ${results.total} (${results.unique} unique)`);
    console.log(`  ✅ OK: ${results.summary.ok}`);
    console.log(`  ❌ Broken: ${results.summary.broken}`);
    console.log(`  🚫 Soft-blocked: ${results.summary.softBlocked}`);
    console.log(`  🚦 Rate-limited: ${results.summary.rateLimited}`);
    console.log(`  ⏱️  Timeout: ${results.summary.timeout}`);
    console.log(`  🧭 Needs review: ${results.summary.needsManualReview}`);

    // Soft-blocked links (informational only)
    if (results.results.blocked.length > 0) {
        console.log('\n' + '-'.repeat(50));
        console.log('SOFT-BLOCKED (informational):');
        console.log('-'.repeat(50));
        console.log(`  ${results.results.blocked.length} URLs remained blocked after retries/profile rotation`);
    }

    if (results.results.rateLimited.length > 0) {
        console.log('\n' + '-'.repeat(50));
        console.log('RATE-LIMITED (informational):');
        console.log('-'.repeat(50));
        console.log(`  ${results.results.rateLimited.length} URLs returned HTTP 429`);
    }

    if (results.results.needsManualReview.length > 0) {
        console.log('\n' + '-'.repeat(50));
        console.log('NEEDS MANUAL REVIEW:');
        console.log('-'.repeat(50));
        console.log(`  ${results.results.needsManualReview.length} URLs had ambiguous signals`);
    }

    // Problem links (truly broken — excludes bot-blocked)
    const problemLinks = getProblemLinks(results);

    if (problemLinks.length > 0) {
        console.log('\n' + '-'.repeat(50));
        console.log('PROBLEM LINKS:');
        console.log('-'.repeat(50));

        for (const link of problemLinks) {
            const feature = link.feature ? ` → ${link.feature}` : '';
            const reason = link.evidence || (link.http_code ? `HTTP ${link.http_code}` : link.category);
            console.log(`\n  ${link.platform}${feature}`);
            console.log(`  Type: ${link.type}`);
            console.log(`  URL: ${link.url}`);
            console.log(`  Reason: ${reason}`);
        }
    }

    // Generate and save report
    if (!options.brokenOnly || problemLinks.length > 0) {
        const report = generateLinkReport(results);
        const reportPath = saveReport(report);
        console.log(`\nFull report saved to: ${reportPath}`);
    }

    // Exit with error code if broken links found
    if (getExitCode(problemLinks) !== 0) {
        console.log(`\n❌ Found ${problemLinks.length} problematic links`);
        process.exit(1);
    } else {
        console.log('\n✅ All links are valid!');
        process.exit(0);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Link check failed:', error.message);
        process.exit(1);
    });
}

module.exports = {
    toLegacyBuckets,
    buildEntryResults,
    generateLinkReport,
    getProblemLinks,
    getExitCode
};
