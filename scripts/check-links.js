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
const { checkAllLinks, generateLinkReport } = require('./lib/link-checker');

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

    const results = await checkAllLinks(platforms, {
        concurrency: options.concurrency,
        timeout: options.timeout,
        onProgress: options.verbose ? (progress) => {
            const pct = Math.round((progress.checked / progress.total) * 100);
            process.stdout.write(`\r[${pct}%] ${progress.checked}/${progress.total} URLs checked`);
        } : null
    });

    if (options.verbose) {
        console.log('\n');
    }

    // Print summary
    console.log('='.repeat(50));
    console.log('LINK CHECK RESULTS');
    console.log('='.repeat(50));
    console.log(`\nTotal URLs checked: ${results.total} (${results.unique} unique)`);
    console.log(`  ✅ OK: ${results.summary.ok}`);
    console.log(`  ↪️  Redirect: ${results.summary.redirect}`);
    console.log(`  ❌ Broken: ${results.summary.broken}`);
    console.log(`  🚫 Bot-blocked: ${results.summary.blocked}`);
    console.log(`  ⏱️  Timeout: ${results.summary.timeout}`);
    console.log(`  ⚠️  Invalid: ${results.summary.invalid}`);

    // Bot-blocked links (informational only)
    if (results.results.blocked.length > 0) {
        console.log('\n' + '-'.repeat(50));
        console.log('BOT-BLOCKED (not actionable):');
        console.log('-'.repeat(50));
        console.log(`  ${results.results.blocked.length} URLs returned 403 (likely Cloudflare/bot protection)`);
    }

    // Problem links (truly broken — excludes bot-blocked)
    const problemLinks = [
        ...results.results.broken,
        ...results.results.timeout,
        ...results.results.invalid
    ];

    if (problemLinks.length > 0) {
        console.log('\n' + '-'.repeat(50));
        console.log('PROBLEM LINKS:');
        console.log('-'.repeat(50));

        for (const link of problemLinks) {
            const feature = link.feature ? ` → ${link.feature}` : '';
            console.log(`\n  ${link.platform}${feature}`);
            console.log(`  Type: ${link.type}`);
            console.log(`  URL: ${link.url}`);
            console.log(`  Error: ${link.error || link.status}`);
        }
    }

    // Generate and save report
    if (!options.brokenOnly || problemLinks.length > 0) {
        const report = generateLinkReport(results);
        const reportPath = saveReport(report);
        console.log(`\nFull report saved to: ${reportPath}`);
    }

    // Exit with error code if broken links found
    if (problemLinks.length > 0) {
        console.log(`\n❌ Found ${problemLinks.length} problematic links`);
        process.exit(1);
    } else {
        console.log('\n✅ All links are valid!');
        process.exit(0);
    }
}

main().catch(error => {
    console.error('\n❌ Link check failed:', error.message);
    process.exit(1);
});
