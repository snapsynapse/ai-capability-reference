/**
 * Link checker module for validating URLs in feature data
 * Checks Source URLs and feature URLs for accessibility
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Browser-like User-Agent to avoid bot-blocking false positives
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Make a single HTTP request
 * @param {string} url - URL to check
 * @param {string} method - HTTP method (HEAD or GET)
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<{url: string, status: string, statusCode: number|null, error: string|null, redirectUrl: string|null}>}
 */
function makeRequest(url, method, timeout) {
    return new Promise((resolve) => {
        try {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const request = protocol.request(
                url,
                {
                    method,
                    timeout,
                    headers: {
                        'User-Agent': BROWSER_UA,
                        'Accept': 'text/html,application/xhtml+xml,*/*'
                    }
                },
                (response) => {
                    // Consume response body to free resources
                    response.resume();

                    if (response.statusCode >= 300 && response.statusCode < 400) {
                        resolve({
                            url,
                            status: 'redirect',
                            statusCode: response.statusCode,
                            error: null,
                            redirectUrl: response.headers.location || null
                        });
                        return;
                    }

                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        resolve({
                            url,
                            status: 'ok',
                            statusCode: response.statusCode,
                            error: null,
                            redirectUrl: null
                        });
                        return;
                    }

                    resolve({
                        url,
                        status: 'error',
                        statusCode: response.statusCode,
                        error: `HTTP ${response.statusCode}`,
                        redirectUrl: null
                    });
                }
            );

            request.on('error', (err) => {
                resolve({
                    url,
                    status: 'error',
                    statusCode: null,
                    error: err.message,
                    redirectUrl: null
                });
            });

            request.on('timeout', () => {
                request.destroy();
                resolve({
                    url,
                    status: 'timeout',
                    statusCode: null,
                    error: 'Request timed out',
                    redirectUrl: null
                });
            });

            request.end();
        } catch (err) {
            resolve({
                url,
                status: 'invalid',
                statusCode: null,
                error: err.message,
                redirectUrl: null
            });
        }
    });
}

/**
 * Check if a URL is accessible
 * Tries HEAD first, falls back to GET if the server returns 403 or 405
 * (many servers block HEAD requests but serve GET normally)
 * @param {string} url - URL to check
 * @param {number} timeout - Timeout in ms (default 10000)
 * @returns {Promise<{url: string, status: string, statusCode: number|null, error: string|null, redirectUrl: string|null}>}
 */
async function checkUrl(url, timeout = 10000) {
    const headResult = await makeRequest(url, 'HEAD', timeout);

    // If HEAD was blocked, retry with GET before reporting as broken
    if (headResult.statusCode === 403 || headResult.statusCode === 405) {
        return makeRequest(url, 'GET', timeout);
    }

    return headResult;
}

/**
 * Check multiple URLs with rate limiting
 * @param {Array<string>} urls - URLs to check
 * @param {Object} options - Options
 * @returns {Promise<Array<Object>>} Results for each URL
 */
async function checkUrls(urls, options = {}) {
    const {
        concurrency = 5,
        delayBetweenBatches = 1000,
        timeout = 10000,
        onProgress = null
    } = options;

    const results = [];
    const uniqueUrls = [...new Set(urls)];

    for (let i = 0; i < uniqueUrls.length; i += concurrency) {
        const batch = uniqueUrls.slice(i, i + concurrency);

        const batchResults = await Promise.all(
            batch.map(url => checkUrl(url, timeout))
        );

        results.push(...batchResults);

        if (onProgress) {
            onProgress({
                checked: results.length,
                total: uniqueUrls.length,
                lastBatch: batchResults
            });
        }

        // Delay between batches to avoid overwhelming servers
        if (i + concurrency < uniqueUrls.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }

    return results;
}

/**
 * Extract all URLs from platform data
 * @param {Array<Object>} platforms - Parsed platform data
 * @returns {Array<{url: string, platform: string, feature: string|null, type: string}>}
 */
function extractAllUrls(platforms) {
    const urls = [];

    for (const platform of platforms) {
        // Platform-level URLs
        if (platform.pricing_page) {
            urls.push({
                url: platform.pricing_page,
                platform: platform.name,
                feature: null,
                type: 'pricing_page'
            });
        }

        if (platform.status_page) {
            urls.push({
                url: platform.status_page,
                platform: platform.name,
                feature: null,
                type: 'status_page'
            });
        }

        // Feature-level URLs
        for (const feature of platform.features) {
            if (feature.url) {
                urls.push({
                    url: feature.url,
                    platform: platform.name,
                    feature: feature.name,
                    type: 'feature_url'
                });
            }

            // Source URLs
            for (const source of feature.sources || []) {
                if (source.url) {
                    urls.push({
                        url: source.url,
                        platform: platform.name,
                        feature: feature.name,
                        type: 'source',
                        sourceTitle: source.title
                    });
                }
            }
        }
    }

    return urls;
}

/**
 * Check all links in platform data
 * @param {Array<Object>} platforms - Parsed platform data
 * @param {Object} options - Options for checking
 * @returns {Promise<Object>} Results categorized by status
 */
async function checkAllLinks(platforms, options = {}) {
    const urlEntries = extractAllUrls(platforms);
    const urls = urlEntries.map(e => e.url);

    console.log(`Found ${urls.length} URLs to check (${new Set(urls).size} unique)`);

    const results = await checkUrls(urls, options);

    // Create a map for quick lookup
    const resultMap = new Map();
    for (const result of results) {
        resultMap.set(result.url, result);
    }

    // Categorize results
    const categorized = {
        ok: [],
        redirect: [],
        broken: [],
        timeout: [],
        invalid: []
    };

    for (const entry of urlEntries) {
        const result = resultMap.get(entry.url);
        const combined = { ...entry, ...result };

        switch (result.status) {
            case 'ok':
                categorized.ok.push(combined);
                break;
            case 'redirect':
                categorized.redirect.push(combined);
                break;
            case 'error':
                categorized.broken.push(combined);
                break;
            case 'timeout':
                categorized.timeout.push(combined);
                break;
            case 'invalid':
                categorized.invalid.push(combined);
                break;
        }
    }

    return {
        total: urlEntries.length,
        unique: new Set(urls).size,
        summary: {
            ok: categorized.ok.length,
            redirect: categorized.redirect.length,
            broken: categorized.broken.length,
            timeout: categorized.timeout.length,
            invalid: categorized.invalid.length
        },
        results: categorized
    };
}

/**
 * Generate markdown report for link check results
 * @param {Object} results - Results from checkAllLinks
 * @returns {string} Markdown report
 */
function generateLinkReport(results) {
    const timestamp = new Date().toISOString();
    let report = `# Link Check Report - ${timestamp.split('T')[0]}\n\n`;

    report += `## Summary\n\n`;
    report += `| Status | Count |\n`;
    report += `|--------|-------|\n`;
    report += `| ✅ OK | ${results.summary.ok} |\n`;
    report += `| ↪️ Redirect | ${results.summary.redirect} |\n`;
    report += `| ❌ Broken | ${results.summary.broken} |\n`;
    report += `| ⏱️ Timeout | ${results.summary.timeout} |\n`;
    report += `| ⚠️ Invalid | ${results.summary.invalid} |\n`;
    report += `| **Total** | ${results.total} |\n\n`;

    // Broken links (most important)
    if (results.results.broken.length > 0) {
        report += `## ❌ Broken Links\n\n`;
        report += `| Platform | Feature | Type | URL | Error |\n`;
        report += `|----------|---------|------|-----|-------|\n`;
        for (const link of results.results.broken) {
            const feature = link.feature || '—';
            report += `| ${link.platform} | ${feature} | ${link.type} | ${link.url} | ${link.error} |\n`;
        }
        report += `\n`;
    }

    // Timeouts
    if (results.results.timeout.length > 0) {
        report += `## ⏱️ Timed Out\n\n`;
        report += `| Platform | Feature | Type | URL |\n`;
        report += `|----------|---------|------|-----|\n`;
        for (const link of results.results.timeout) {
            const feature = link.feature || '—';
            report += `| ${link.platform} | ${feature} | ${link.type} | ${link.url} |\n`;
        }
        report += `\n`;
    }

    // Redirects (informational)
    if (results.results.redirect.length > 0) {
        report += `## ↪️ Redirects\n\n`;
        report += `| Platform | Feature | Original URL | Redirects To |\n`;
        report += `|----------|---------|--------------|---------------|\n`;
        for (const link of results.results.redirect) {
            const feature = link.feature || '—';
            report += `| ${link.platform} | ${feature} | ${link.url} | ${link.redirectUrl || 'Unknown'} |\n`;
        }
        report += `\n`;
    }

    // Invalid URLs
    if (results.results.invalid.length > 0) {
        report += `## ⚠️ Invalid URLs\n\n`;
        report += `| Platform | Feature | URL | Error |\n`;
        report += `|----------|---------|-----|-------|\n`;
        for (const link of results.results.invalid) {
            const feature = link.feature || '—';
            report += `| ${link.platform} | ${feature} | ${link.url} | ${link.error} |\n`;
        }
        report += `\n`;
    }

    return report;
}

module.exports = {
    checkUrl,
    checkUrls,
    extractAllUrls,
    checkAllLinks,
    generateLinkReport
};
