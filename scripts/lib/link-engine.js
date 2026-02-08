/**
 * Link Engine — fetch / retry / classify pipeline
 *
 * Replaces the classification logic in link-checker.js with the
 * canonical schema from COLLAB_PROTOCOL.md §3 and the 403 handling
 * policy from §4.
 *
 * Design goals:
 *   1. Zero external dependencies (Node.js built-ins only)
 *   2. Deterministic classification — same inputs → same category
 *   3. Never auto-classify a single 403 as "broken"
 *   4. Request profile rotation to reduce false positives
 *   5. Machine-readable evidence strings
 *
 * Owner: Claude (Anthropic) per COLLAB_PROTOCOL.md §2
 */

'use strict';

const https = require('https');
const http  = require('http');
const { URL } = require('url');
const { Category, createResult } = require('./link-schema');

// ===================================================================
// Request profiles — rotate to reduce bot-detection false positives
// ===================================================================

/**
 * Each profile simulates a different browser/platform combination.
 * The engine tries the default profile first, then rotates through
 * alternates on 403 responses.
 */
const REQUEST_PROFILES = {
    'default': {
        'User-Agent':                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language':           'en-US,en;q=0.9',
        'Accept-Encoding':          'gzip, deflate, br',
        'Sec-Fetch-Dest':           'document',
        'Sec-Fetch-Mode':           'navigate',
        'Sec-Fetch-Site':           'none',
        'Sec-Fetch-User':           '?1',
        'Upgrade-Insecure-Requests': '1'
    },

    'chrome-win': {
        'User-Agent':                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language':           'en-US,en;q=0.5',
        'Accept-Encoding':          'gzip, deflate, br',
        'Sec-Fetch-Dest':           'document',
        'Sec-Fetch-Mode':           'navigate',
        'Sec-Fetch-Site':           'none',
        'Upgrade-Insecure-Requests': '1'
    },

    'firefox-linux': {
        'User-Agent':       'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
        'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language':  'en-US,en;q=0.5',
        'Accept-Encoding':  'gzip, deflate, br',
        'Sec-Fetch-Dest':   'document',
        'Sec-Fetch-Mode':   'navigate',
        'Sec-Fetch-Site':   'none',
        'Upgrade-Insecure-Requests': '1'
    }
};

const PROFILE_NAMES = Object.keys(REQUEST_PROFILES);

// ===================================================================
// Challenge page detection — identifies bot-gate pages that return 200
// ===================================================================

/** Max bytes of response body to capture for challenge detection */
const BODY_CAPTURE_LIMIT = 4096;

/**
 * Patterns that indicate a response body is a challenge/interstitial page
 * rather than real content. These are checked case-insensitively against
 * the first ~4KB of the response body.
 *
 * Each pattern has a name (for evidence) and a regex.
 */
const CHALLENGE_PATTERNS = [
    // Cloudflare
    { name: 'cloudflare-challenge',    pattern: /cf-browser-verification|cf_chl_opt|cf-challenge-running/i },
    { name: 'cloudflare-ray',          pattern: /<title>Just a moment\.\.\.<\/title>/i },
    { name: 'cloudflare-turnstile',    pattern: /challenges\.cloudflare\.com/i },

    // Generic bot gates
    { name: 'captcha-generic',         pattern: /captcha|recaptcha|hcaptcha/i },
    { name: 'bot-detection',           pattern: /bot[\s-]?detect|human[\s-]?verification|verify you are human/i },
    { name: 'browser-check',           pattern: /checking your browser|please wait while we verify/i },

    // Akamai Bot Manager
    { name: 'akamai-bot-manager',      pattern: /akam\/13\/|_abck/i },

    // PerimeterX / HUMAN Security
    { name: 'perimeterx',             pattern: /px-captcha|perimeterx|human challenge/i },

    // DataDome
    { name: 'datadome',               pattern: /datadome|dd\.js/i },

    // JavaScript-required interstitials
    { name: 'js-required',            pattern: /enable javascript|javascript is required|javascript must be enabled/i }
];

/**
 * Detect whether a response body snippet is a challenge/interstitial page.
 * Pure function — no I/O, fully deterministic.
 *
 * @param {string} bodySnippet - First ~4KB of response body
 * @returns {{ isChallenge: boolean, matchedPattern: string|null }}
 */
function detectChallengePage(bodySnippet) {
    if (!bodySnippet || typeof bodySnippet !== 'string') {
        return { isChallenge: false, matchedPattern: null };
    }

    for (const { name, pattern } of CHALLENGE_PATTERNS) {
        if (pattern.test(bodySnippet)) {
            return { isChallenge: true, matchedPattern: name };
        }
    }

    return { isChallenge: false, matchedPattern: null };
}

// ===================================================================
// Low-level HTTP request
// ===================================================================

/**
 * @typedef {Object} RawResponse
 * @property {number|null} statusCode
 * @property {Object}      headers
 * @property {string|null} error      - Error code/message if request failed
 * @property {string|null} redirectUrl - Location header for 3xx responses
 * @property {number}      latency_ms
 */

/**
 * Make a single HTTP(S) request. Never throws — all outcomes are
 * returned as structured objects.
 *
 * @param {string} url
 * @param {string} method - 'HEAD' or 'GET'
 * @param {Object} headers
 * @param {number} timeout - milliseconds
 * @param {Object} [opts]
 * @param {boolean} [opts.captureBody=false] - If true, capture first ~4KB of body for challenge detection
 * @returns {Promise<RawResponse>}
 */
function makeRequest(url, method, headers, timeout, opts = {}) {
    const { captureBody = false } = opts;
    const start = Date.now();
    return new Promise((resolve) => {
        try {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const req = protocol.request(url, { method, timeout, headers }, (res) => {
                const elapsed = Date.now() - start;
                const redirectUrl = (res.statusCode >= 300 && res.statusCode < 400)
                    ? res.headers.location || null
                    : null;

                if (captureBody && method === 'GET') {
                    // Capture up to BODY_CAPTURE_LIMIT bytes for challenge detection
                    const chunks = [];
                    let bytesRead = 0;
                    res.on('data', (chunk) => {
                        if (bytesRead < BODY_CAPTURE_LIMIT) {
                            chunks.push(chunk);
                            bytesRead += chunk.length;
                        }
                    });
                    res.on('end', () => {
                        const bodySnippet = Buffer.concat(chunks).toString('utf-8').slice(0, BODY_CAPTURE_LIMIT);
                        resolve({
                            statusCode:  res.statusCode,
                            headers:     res.headers,
                            error:       null,
                            redirectUrl,
                            latency_ms:  Date.now() - start,
                            bodySnippet
                        });
                    });
                    res.on('error', () => {
                        resolve({
                            statusCode:  res.statusCode,
                            headers:     res.headers,
                            error:       null,
                            redirectUrl,
                            latency_ms:  Date.now() - start,
                            bodySnippet: ''
                        });
                    });
                } else {
                    res.resume(); // consume body to free socket
                    resolve({
                        statusCode:  res.statusCode,
                        headers:     res.headers,
                        error:       null,
                        redirectUrl,
                        latency_ms:  elapsed
                    });
                }
            });

            req.on('error', (err) => {
                resolve({
                    statusCode:  null,
                    headers:     {},
                    error:       err.code || err.message,
                    redirectUrl: null,
                    latency_ms:  Date.now() - start
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    statusCode:  null,
                    headers:     {},
                    error:       'ETIMEDOUT',
                    redirectUrl: null,
                    latency_ms:  Date.now() - start
                });
            });

            req.end();
        } catch (err) {
            resolve({
                statusCode:  null,
                headers:     {},
                error:       err.code || err.message,
                redirectUrl: null,
                latency_ms:  Date.now() - start
            });
        }
    });
}

// ===================================================================
// Classification logic (§4 403 policy + general heuristics)
// ===================================================================

/**
 * Evidence trail — accumulates human-/machine-readable breadcrumbs
 * as the engine works through its retry strategy.
 */
class EvidenceTrail {
    constructor() { this._parts = []; }
    add(part)     { this._parts.push(part); }
    toString()    { return this._parts.join('; '); }
}

/**
 * Classify a raw response (or error) into a category.
 * This is a pure function — no I/O, fully deterministic.
 *
 * @param {RawResponse} response
 * @returns {{ category: string, evidence: string }}
 */
function classifySingleResponse(response) {
    // Network-level failures
    if (response.error) {
        if (response.error === 'ETIMEDOUT' || response.error === 'ESOCKETTIMEDOUT') {
            return { category: Category.TIMEOUT, evidence: `timeout: ${response.error}` };
        }
        if (response.error === 'ENOTFOUND') {
            return { category: Category.BROKEN, evidence: `DNS resolution failed: ${response.error}` };
        }
        if (response.error === 'ECONNREFUSED') {
            return { category: Category.BROKEN, evidence: `connection refused: ${response.error}` };
        }
        if (response.error === 'ECONNRESET') {
            return { category: Category.BROKEN, evidence: `connection reset: ${response.error}` };
        }
        // Other network errors → broken
        return { category: Category.BROKEN, evidence: `network error: ${response.error}` };
    }

    const code = response.statusCode;

    // Successful responses
    if (code >= 200 && code < 300) {
        return { category: Category.OK, evidence: `${code}` };
    }

    // Redirects — treated as OK when checking links (the URL resolves)
    if (code >= 300 && code < 400) {
        return { category: Category.OK, evidence: `redirect ${code}` };
    }

    // Rate limiting
    if (code === 429) {
        const retryAfter = response.headers['retry-after'] || null;
        const extra = retryAfter ? `; retry-after: ${retryAfter}` : '';
        return { category: Category.RATE_LIMITED, evidence: `${code}${extra}` };
    }

    // 403 — needs multi-step handling (caller orchestrates)
    if (code === 403) {
        return { category: Category.SOFT_BLOCKED, evidence: `${code}` };
    }

    // 405 Method Not Allowed — not broken, need to try GET
    if (code === 405) {
        return { category: null, evidence: `${code} method not allowed` };  // signal: retry with GET
    }

    // Other 4xx — broken
    if (code >= 400 && code < 500) {
        return { category: Category.BROKEN, evidence: `${code}` };
    }

    // 5xx — server errors are broken
    if (code >= 500) {
        return { category: Category.BROKEN, evidence: `${code}` };
    }

    // Catch-all
    return { category: Category.NEEDS_MANUAL_REVIEW, evidence: `unexpected status ${code}` };
}

// ===================================================================
// Engine — orchestrates the full check pipeline for one URL
// ===================================================================

/**
 * Default engine options
 */
const DEFAULT_OPTIONS = {
    timeout:          10000,   // per-request timeout (ms)
    maxAttempts:      3,       // max total requests (across methods + profiles)
    backoffMs:        500,     // base delay between retries
    followRedirects:  true     // whether to follow 3xx redirects
};

/**
 * Check a single URL through the full fetch/retry/classify pipeline.
 *
 * Strategy (implements §4):
 *   1. HEAD with default profile
 *   2. If 403 or 405 → GET with default profile
 *   3. If still 403 → rotate through alternate profiles with GET
 *   4. If still 403 after all profiles → classify as soft-blocked
 *   5. If signals are conflicting → needs-manual-review
 *
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise<import('./link-schema').LinkCheckResult>}
 */
async function checkUrl(url, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const trail = new EvidenceTrail();
    const startTime = Date.now();
    let attempts = 0;
    let lastProfileUsed = 'default';
    let finalUrl = null;

    // --- Step 1: HEAD with default profile ---
    attempts++;
    const headRes = await makeRequest(url, 'HEAD', REQUEST_PROFILES['default'], opts.timeout);
    const headClass = classifySingleResponse(headRes);
    trail.add(`HEAD ${headClass.evidence}`);

    // Handle redirects
    if (headRes.redirectUrl) {
        finalUrl = headRes.redirectUrl;
    }

    // If HEAD is clean (ok, broken, rate-limited, timeout) → done
    if (headClass.category === Category.OK) {
        return createResult({
            url, category: Category.OK, http_code: headRes.statusCode,
            final_url: finalUrl, evidence: trail.toString(),
            checked_at: new Date().toISOString(),
            attempts, method_used: 'HEAD', request_profile: 'default',
            latency_ms: Date.now() - startTime
        });
    }

    if (headClass.category === Category.BROKEN) {
        return createResult({
            url, category: Category.BROKEN, http_code: headRes.statusCode,
            final_url: null, evidence: trail.toString(),
            checked_at: new Date().toISOString(),
            attempts, method_used: 'HEAD', request_profile: 'default',
            latency_ms: Date.now() - startTime
        });
    }

    if (headClass.category === Category.RATE_LIMITED) {
        return createResult({
            url, category: Category.RATE_LIMITED, http_code: headRes.statusCode,
            final_url: null, evidence: trail.toString(),
            checked_at: new Date().toISOString(),
            attempts, method_used: 'HEAD', request_profile: 'default',
            latency_ms: Date.now() - startTime
        });
    }

    if (headClass.category === Category.TIMEOUT) {
        // Retry once with GET before giving up on timeout
        attempts++;
        const getRetry = await makeRequest(url, 'GET', REQUEST_PROFILES['default'], opts.timeout);
        const getRetryClass = classifySingleResponse(getRetry);
        trail.add(`GET ${getRetryClass.evidence}`);

        if (getRetryClass.category === Category.OK) {
            return createResult({
                url, category: Category.OK, http_code: getRetry.statusCode,
                final_url: getRetry.redirectUrl || null, evidence: trail.toString(),
                checked_at: new Date().toISOString(),
                attempts, method_used: 'GET', request_profile: 'default',
                latency_ms: Date.now() - startTime
            });
        }

        return createResult({
            url, category: getRetryClass.category || Category.TIMEOUT,
            http_code: getRetry.statusCode, final_url: null,
            evidence: trail.toString(),
            checked_at: new Date().toISOString(),
            attempts, method_used: 'GET', request_profile: 'default',
            latency_ms: Date.now() - startTime
        });
    }

    // --- Step 2: HEAD returned 403 or 405 → try GET with default profile ---
    //     Capture body to detect challenge pages (§4 conflicting signals)
    attempts++;
    await delay(opts.backoffMs);
    const getRes = await makeRequest(url, 'GET', REQUEST_PROFILES['default'], opts.timeout, { captureBody: true });
    const getClass = classifySingleResponse(getRes);
    trail.add(`GET ${getClass.evidence}`);

    if (getRes.redirectUrl) {
        finalUrl = getRes.redirectUrl;
    }

    // GET succeeded — but check for challenge page (HEAD 403 + GET 200 with challenge body)
    if (getClass.category === Category.OK) {
        const challenge = detectChallengePage(getRes.bodySnippet);
        if (challenge.isChallenge) {
            trail.add(`challenge-detected: ${challenge.matchedPattern}`);
            return createResult({
                url, category: Category.NEEDS_MANUAL_REVIEW, http_code: getRes.statusCode,
                final_url: finalUrl, evidence: trail.toString(),
                checked_at: new Date().toISOString(),
                attempts, method_used: 'GET', request_profile: 'default',
                latency_ms: Date.now() - startTime
            });
        }

        // Genuine 200 — url is reachable
        return createResult({
            url, category: Category.OK, http_code: getRes.statusCode,
            final_url: finalUrl, evidence: trail.toString(),
            checked_at: new Date().toISOString(),
            attempts, method_used: 'GET', request_profile: 'default',
            latency_ms: Date.now() - startTime
        });
    }

    // GET returned non-403 definitive answer
    if (getClass.category !== Category.SOFT_BLOCKED && getClass.category !== null) {
        return createResult({
            url, category: getClass.category, http_code: getRes.statusCode,
            final_url: null, evidence: trail.toString(),
            checked_at: new Date().toISOString(),
            attempts, method_used: 'GET', request_profile: 'default',
            latency_ms: Date.now() - startTime
        });
    }

    // --- Step 3: Still 403 → rotate through alternate profiles ---
    //     Continue with body capture for challenge detection
    const alternateProfiles = PROFILE_NAMES.filter(p => p !== 'default');

    for (const profileName of alternateProfiles) {
        if (attempts >= opts.maxAttempts) break;

        attempts++;
        await delay(opts.backoffMs * attempts); // escalating backoff
        lastProfileUsed = profileName;

        const profileRes = await makeRequest(url, 'GET', REQUEST_PROFILES[profileName], opts.timeout, { captureBody: true });
        const profileClass = classifySingleResponse(profileRes);
        trail.add(`GET[${profileName}] ${profileClass.evidence}`);

        if (profileRes.redirectUrl) {
            finalUrl = profileRes.redirectUrl;
        }

        // Profile succeeded — check for challenge page
        if (profileClass.category === Category.OK) {
            const challenge = detectChallengePage(profileRes.bodySnippet);
            if (challenge.isChallenge) {
                trail.add(`challenge-detected: ${challenge.matchedPattern}`);
                return createResult({
                    url, category: Category.NEEDS_MANUAL_REVIEW, http_code: profileRes.statusCode,
                    final_url: finalUrl, evidence: trail.toString(),
                    checked_at: new Date().toISOString(),
                    attempts, method_used: 'GET', request_profile: profileName,
                    latency_ms: Date.now() - startTime
                });
            }

            return createResult({
                url, category: Category.OK, http_code: profileRes.statusCode,
                final_url: finalUrl, evidence: trail.toString(),
                checked_at: new Date().toISOString(),
                attempts, method_used: 'GET', request_profile: profileName,
                latency_ms: Date.now() - startTime
            });
        }

        // Profile got a definitive non-403 answer
        if (profileClass.category !== Category.SOFT_BLOCKED && profileClass.category !== null) {
            return createResult({
                url, category: profileClass.category, http_code: profileRes.statusCode,
                final_url: null, evidence: trail.toString(),
                checked_at: new Date().toISOString(),
                attempts, method_used: 'GET', request_profile: profileName,
                latency_ms: Date.now() - startTime
            });
        }
    }

    // --- Step 4: All attempts returned 403 → soft-blocked ---
    trail.add('all profiles exhausted');
    return createResult({
        url, category: Category.SOFT_BLOCKED, http_code: 403,
        final_url: null, evidence: trail.toString(),
        checked_at: new Date().toISOString(),
        attempts, method_used: 'GET', request_profile: lastProfileUsed,
        latency_ms: Date.now() - startTime
    });
}

// ===================================================================
// Batch checking with concurrency control
// ===================================================================

/**
 * Check multiple URLs with concurrency control and rate limiting.
 *
 * @param {string[]} urls
 * @param {Object}   [options]
 * @param {number}   [options.concurrency=5]
 * @param {number}   [options.delayBetweenBatches=1000]
 * @param {number}   [options.timeout=10000]
 * @param {Function} [options.onProgress]
 * @returns {Promise<import('./link-schema').LinkCheckResult[]>}
 */
async function checkUrls(urls, options = {}) {
    const {
        concurrency         = 5,
        delayBetweenBatches = 1000,
        timeout             = 10000,
        onProgress          = null
    } = options;

    const uniqueUrls = [...new Set(urls)];
    const results = [];

    for (let i = 0; i < uniqueUrls.length; i += concurrency) {
        const batch = uniqueUrls.slice(i, i + concurrency);

        const batchResults = await Promise.all(
            batch.map(url => checkUrl(url, { timeout }))
        );

        results.push(...batchResults);

        if (onProgress) {
            onProgress({
                checked:   results.length,
                total:     uniqueUrls.length,
                lastBatch: batchResults
            });
        }

        // Delay between batches
        if (i + concurrency < uniqueUrls.length) {
            await delay(delayBetweenBatches);
        }
    }

    return results;
}

// ===================================================================
// Result aggregation
// ===================================================================

/**
 * Group an array of results by category.
 *
 * @param {import('./link-schema').LinkCheckResult[]} results
 * @returns {Object<string, import('./link-schema').LinkCheckResult[]>}
 */
function groupByCategory(results) {
    const groups = {};
    for (const cat of Object.values(Category)) {
        groups[cat] = [];
    }
    for (const result of results) {
        if (groups[result.category]) {
            groups[result.category].push(result);
        }
    }
    return groups;
}

/**
 * Produce a summary object with counts per category.
 *
 * @param {import('./link-schema').LinkCheckResult[]} results
 * @returns {Object<string, number>}
 */
function summarize(results) {
    const groups = groupByCategory(results);
    const summary = {};
    for (const [cat, items] of Object.entries(groups)) {
        summary[cat] = items.length;
    }
    summary.total = results.length;
    return summary;
}

// ===================================================================
// Helpers
// ===================================================================

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===================================================================
// Exports
// ===================================================================

module.exports = {
    // Core
    checkUrl,
    checkUrls,

    // Classification (exported for testing)
    classifySingleResponse,

    // Challenge detection (exported for testing)
    detectChallengePage,
    CHALLENGE_PATTERNS,
    BODY_CAPTURE_LIMIT,

    // Aggregation
    groupByCategory,
    summarize,

    // Config (exported for testing / extension)
    REQUEST_PROFILES,
    PROFILE_NAMES,
    DEFAULT_OPTIONS,

    // Low-level (exported for testing)
    makeRequest
};
