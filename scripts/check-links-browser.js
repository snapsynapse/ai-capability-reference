#!/usr/bin/env node

/**
 * Browser-based link checker using Chrome DevTools Protocol.
 *
 * Connects to a running Chrome instance to check URLs through a real browser,
 * bypassing Cloudflare and other bot-protection that blocks automated HTTP requests.
 * Also captures page titles for content verification.
 *
 * Prerequisites — start Chrome with remote debugging:
 *
 *   # macOS
 *   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
 *
 *   # Linux
 *   google-chrome --remote-debugging-port=9222
 *
 * Usage:
 *   node scripts/check-links-browser.js
 *   node scripts/check-links-browser.js --platform claude
 *   node scripts/check-links-browser.js --timeout 20000 --delay 1000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { CDPClient } = require('./lib/cdp-client');
const { loadAllPlatforms, getPlatform } = require('./lib/parser');
const { extractAllUrls } = require('./lib/link-checker');

const CDP_PORT = 9222;
const REPORTS_DIR = path.join(__dirname, '..', '.link-reports');
const DEFAULT_TIMEOUT = 15000;
const DEFAULT_DELAY = 500;

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        platform: null,
        timeout: DEFAULT_TIMEOUT,
        delay: DEFAULT_DELAY,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--platform': case '-p': options.platform = args[++i]; break;
            case '--timeout': case '-t': options.timeout = parseInt(args[++i], 10); break;
            case '--delay': case '-d': options.delay = parseInt(args[++i], 10); break;
            case '--help': case '-h': options.help = true; break;
        }
    }
    return options;
}

function printHelp() {
    console.log(`
Browser-Based Link Checker (CDP)

Checks URLs through a real Chrome browser, bypassing bot protection.
Captures HTTP status codes, final URLs (after redirects), and page titles.

PREREQUISITES:
  Start Chrome with remote debugging enabled:

    # macOS
    /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\
      --remote-debugging-port=9222

    # Linux
    google-chrome --remote-debugging-port=9222

OPTIONS:
    -p, --platform <name>   Check only a specific platform
    -t, --timeout <ms>      Navigation timeout (default: ${DEFAULT_TIMEOUT}ms)
    -d, --delay <ms>        Delay between requests (default: ${DEFAULT_DELAY}ms)
    -h, --help              Show this help

EXAMPLES:
    node scripts/check-links-browser.js
    node scripts/check-links-browser.js --platform claude
    node scripts/check-links-browser.js --timeout 20000
`);
}

// --- Chrome HTTP endpoints ---

function cdpGet(urlPath) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${CDP_PORT}${urlPath}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve(data); }
            });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('Chrome HTTP timeout')); });
    });
}

async function verifyChrome() {
    try {
        const info = await cdpGet('/json/version');
        return info.webSocketDebuggerUrl;
    } catch (e) {
        throw new Error(
            'Cannot connect to Chrome on port 9222.\n\n' +
            '  Start it with remote debugging:\n\n' +
            '    # macOS\n' +
            '    /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\\n' +
            '      --remote-debugging-port=9222\n\n' +
            '    # Linux\n' +
            '    google-chrome --remote-debugging-port=9222'
        );
    }
}

async function createTab() {
    return cdpGet('/json/new');
}

async function closeTab(targetId) {
    try { await cdpGet(`/json/close/${targetId}`); } catch (e) { /* ignore */ }
}

// --- URL checking ---

async function checkUrlInBrowser(url, timeout) {
    const target = await createTab();
    const client = new CDPClient();

    try {
        await client.connect(target.webSocketDebuggerUrl);

        await client.send('Page.enable');
        await client.send('Network.enable');

        // Track the main document response
        let docResponse = null;
        const frameId = (await client.send('Page.getFrameTree')).frameTree.frame.id;

        client.on('Network.responseReceived', (params) => {
            if (params.type === 'Document' && params.frameId === frameId) {
                docResponse = {
                    statusCode: params.response.status,
                    url: params.response.url
                };
            }
        });

        // Navigate
        const nav = await client.send('Page.navigate', { url });

        if (nav.errorText) {
            return {
                url,
                status: 'error',
                statusCode: null,
                finalUrl: url,
                title: '',
                error: nav.errorText
            };
        }

        // Wait for page load or timeout
        await Promise.race([
            new Promise(resolve => client.on('Page.loadEventFired', resolve)),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), timeout)
            )
        ]);

        // Brief settle for late network events
        await new Promise(r => setTimeout(r, 300));

        // Get page title
        let title = '';
        try {
            const eval_ = await client.send('Runtime.evaluate', { expression: 'document.title' });
            title = (eval_.result && eval_.result.value) || '';
        } catch (e) { /* page may have crashed */ }

        const statusCode = docResponse ? docResponse.statusCode : null;
        const finalUrl = docResponse ? docResponse.url : url;
        const ok = statusCode && statusCode >= 200 && statusCode < 400;

        return {
            url,
            status: ok ? 'ok' : 'error',
            statusCode,
            finalUrl,
            title,
            error: ok ? null : (statusCode ? `HTTP ${statusCode}` : 'No response')
        };

    } catch (err) {
        return {
            url,
            status: err.message === 'timeout' ? 'timeout' : 'error',
            statusCode: null,
            finalUrl: url,
            title: '',
            error: err.message === 'timeout' ? 'Navigation timed out' : err.message
        };
    } finally {
        client.close();
        await closeTab(target.id);
    }
}

// --- Report generation ---

function generateReport(results) {
    const ok = results.filter(r => r.status === 'ok');
    const broken = results.filter(r => r.status === 'error');
    const timeouts = results.filter(r => r.status === 'timeout');
    const redirected = results.filter(r => r.status === 'ok' && r.finalUrl !== r.url);

    let report = `# Browser Link Check — ${new Date().toISOString().split('T')[0]}\n\n`;
    report += `Checked ${results.length} unique URLs through Chrome.\n\n`;
    report += `| Status | Count |\n|--------|-------|\n`;
    report += `| OK | ${ok.length} |\n`;
    report += `| Broken | ${broken.length} |\n`;
    report += `| Timeout | ${timeouts.length} |\n`;
    report += `| Redirected | ${redirected.length} |\n\n`;

    if (broken.length > 0) {
        report += `## Broken Links\n\n`;
        report += `| Platform | Feature | URL | Status | Error |\n`;
        report += `|----------|---------|-----|--------|-------|\n`;
        for (const r of broken) {
            report += `| ${r.platform} | ${r.feature || r.type} | ${r.url} | ${r.statusCode || '—'} | ${r.error} |\n`;
        }
        report += '\n';
    }

    if (redirected.length > 0) {
        report += `## Redirected (verify destination)\n\n`;
        report += `| Platform | Feature | From | To | Title |\n`;
        report += `|----------|---------|------|----|-------|\n`;
        for (const r of redirected) {
            report += `| ${r.platform} | ${r.feature || '—'} | ${r.url} | ${r.finalUrl} | ${r.title} |\n`;
        }
        report += '\n';
    }

    report += `## All Results\n\n`;
    report += `| Status | Platform | Feature | URL | Title |\n`;
    report += `|--------|----------|---------|-----|-------|\n`;
    for (const r of results) {
        const icon = r.status === 'ok' ? 'OK' : r.status === 'timeout' ? 'TIMEOUT' : 'BROKEN';
        report += `| ${icon} | ${r.platform} | ${r.feature || r.type} | ${r.url} | ${r.title || '—'} |\n`;
    }

    return report;
}

// --- Main ---

async function main() {
    const options = parseArgs();
    if (options.help) { printHelp(); process.exit(0); }

    console.log('\n🌐 Browser-Based Link Checker (CDP)\n');

    await verifyChrome();
    console.log('Connected to Chrome on port 9222\n');

    // Load URLs from platform data
    let platforms;
    if (options.platform) {
        const platform = getPlatform(options.platform);
        if (!platform) { console.error(`Platform "${options.platform}" not found`); process.exit(1); }
        platforms = [platform];
    } else {
        platforms = loadAllPlatforms();
    }

    const allEntries = extractAllUrls(platforms);
    // Deduplicate by URL, keep first occurrence's metadata
    const seen = new Map();
    for (const entry of allEntries) {
        if (!seen.has(entry.url)) seen.set(entry.url, entry);
    }
    const entries = [...seen.values()];

    console.log(`Checking ${entries.length} unique URLs...\n`);

    const results = [];

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const label = entry.feature || entry.type;
        const pct = Math.round(((i + 1) / entries.length) * 100);
        process.stdout.write(`\r  [${String(pct).padStart(3)}%] ${entry.platform} — ${label}`.padEnd(70));

        const result = await checkUrlInBrowser(entry.url, options.timeout);
        results.push({ ...entry, ...result });

        if (i < entries.length - 1) {
            await new Promise(r => setTimeout(r, options.delay));
        }
    }

    process.stdout.write('\r' + ' '.repeat(70) + '\r');

    // --- Console output ---
    const ok = results.filter(r => r.status === 'ok');
    const broken = results.filter(r => r.status === 'error');
    const timeouts = results.filter(r => r.status === 'timeout');
    const redirected = results.filter(r => r.status === 'ok' && r.finalUrl !== r.url);

    console.log('='.repeat(60));
    console.log('BROWSER LINK CHECK RESULTS');
    console.log('='.repeat(60));
    console.log(`\n  OK:         ${ok.length}`);
    console.log(`  Broken:     ${broken.length}`);
    console.log(`  Timeout:    ${timeouts.length}`);
    console.log(`  Redirected: ${redirected.length}`);

    if (broken.length > 0) {
        console.log('\n' + '-'.repeat(60));
        console.log('BROKEN:');
        console.log('-'.repeat(60));
        for (const r of broken) {
            console.log(`\n  ${r.platform} — ${r.feature || r.type}`);
            console.log(`    URL:   ${r.url}`);
            console.log(`    Error: ${r.error}`);
            if (r.title) console.log(`    Title: ${r.title}`);
            if (r.finalUrl !== r.url) console.log(`    Ended up at: ${r.finalUrl}`);
        }
    }

    if (redirected.length > 0) {
        console.log('\n' + '-'.repeat(60));
        console.log('REDIRECTED (verify destinations):');
        console.log('-'.repeat(60));
        for (const r of redirected) {
            console.log(`\n  ${r.platform} — ${r.feature || r.type}`);
            console.log(`    From:  ${r.url}`);
            console.log(`    To:    ${r.finalUrl}`);
            console.log(`    Title: ${r.title}`);
        }
    }

    // --- Save report ---
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(REPORTS_DIR, `browser-check-${timestamp}.md`);
    fs.writeFileSync(reportPath, generateReport(results));
    console.log(`\nReport saved to: ${reportPath}`);

    if (broken.length > 0) {
        console.log(`\n${broken.length} broken link(s) found.`);
        process.exit(1);
    } else {
        console.log('\nAll links verified!');
        process.exit(0);
    }
}

main().catch(err => {
    console.error(`\n${err.message}`);
    process.exit(1);
});
