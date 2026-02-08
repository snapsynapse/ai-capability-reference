/**
 * Test fixtures for link check results
 *
 * One canonical fixture per category defined in COLLAB_PROTOCOL.md §3.
 * Each fixture is a valid LinkCheckResult that tests can assert against.
 *
 * Fixtures also include invalid / edge-case objects for validation tests.
 */

'use strict';

const FIXED_TIMESTAMP = '2026-02-07T17:00:00.000Z';

// ---------------------------------------------------------------------------
// Valid fixtures — one per category
// ---------------------------------------------------------------------------

const ok = {
    url:             'https://claude.ai/pricing',
    category:        'ok',
    http_code:       200,
    final_url:       null,
    evidence:        'HEAD 200',
    checked_at:      FIXED_TIMESTAMP,
    attempts:        1,
    method_used:     'HEAD',
    request_profile: 'default',
    latency_ms:      342
};

const okWithRedirect = {
    url:             'https://openai.com/chatgpt',
    category:        'ok',
    http_code:       200,
    final_url:       'https://chatgpt.com/',
    evidence:        'GET 200 after redirect from 301',
    checked_at:      FIXED_TIMESTAMP,
    attempts:        1,
    method_used:     'GET',
    request_profile: 'default',
    latency_ms:      891
};

const broken = {
    url:             'https://example.com/deleted-page',
    category:        'broken',
    http_code:       404,
    final_url:       null,
    evidence:        'GET 404; HEAD 404',
    checked_at:      FIXED_TIMESTAMP,
    attempts:        2,
    method_used:     'GET',
    request_profile: 'default',
    latency_ms:      210
};

const brokenDnsFailure = {
    url:             'https://nonexistent-domain-xyz.invalid/page',
    category:        'broken',
    http_code:       null,
    final_url:       null,
    evidence:        'DNS resolution failed: ENOTFOUND',
    checked_at:      FIXED_TIMESTAMP,
    attempts:        1,
    method_used:     'HEAD',
    request_profile: 'default',
    latency_ms:      45
};

const softBlocked = {
    url:             'https://www.cloudflare-protected-site.example/features',
    category:        'soft-blocked',
    http_code:       403,
    final_url:       null,
    evidence:        'HEAD 403; GET 403; profile-rotate 403; likely bot protection',
    checked_at:      FIXED_TIMESTAMP,
    attempts:        3,
    method_used:     'GET',
    request_profile: 'chrome-win',
    latency_ms:      4520
};

const rateLimited = {
    url:             'https://api.github.com/repos/example/repo',
    category:        'rate-limited',
    http_code:       429,
    final_url:       null,
    evidence:        'GET 429; retry-after: 60',
    checked_at:      FIXED_TIMESTAMP,
    attempts:        2,
    method_used:     'GET',
    request_profile: 'default',
    latency_ms:      1203
};

const timeout = {
    url:             'https://extremely-slow-server.example/page',
    category:        'timeout',
    http_code:       null,
    final_url:       null,
    evidence:        'timeout after 10000ms; 2 attempts',
    checked_at:      FIXED_TIMESTAMP,
    attempts:        2,
    method_used:     'HEAD',
    request_profile: 'default',
    latency_ms:      20000
};

const needsManualReview = {
    url:             'https://ambiguous-site.example/maybe-down',
    category:        'needs-manual-review',
    http_code:       403,
    final_url:       null,
    evidence:        'HEAD 403; GET 200 with challenge page; conflicting signals',
    checked_at:      FIXED_TIMESTAMP,
    attempts:        3,
    method_used:     'GET',
    request_profile: 'chrome-mac',
    latency_ms:      6750
};

// ---------------------------------------------------------------------------
// Invalid fixtures — for validation error tests
// ---------------------------------------------------------------------------

const invalidMissingUrl = {
    category:   'ok',
    http_code:  200,
    final_url:  null,
    evidence:   'HEAD 200',
    checked_at: FIXED_TIMESTAMP
};

const invalidBadCategory = {
    url:        'https://example.com',
    category:   'maybe-broken',      // not in enum
    http_code:  200,
    final_url:  null,
    evidence:   'HEAD 200',
    checked_at: FIXED_TIMESTAMP
};

const invalidHttpCodeType = {
    url:        'https://example.com',
    category:   'ok',
    http_code:  '200',               // should be number or null
    final_url:  null,
    evidence:   'HEAD 200',
    checked_at: FIXED_TIMESTAMP
};

const invalidMissingCheckedAt = {
    url:       'https://example.com',
    category:  'ok',
    http_code: 200,
    final_url: null,
    evidence:  'HEAD 200'
    // checked_at missing
};

const invalidBadTimestamp = {
    url:        'https://example.com',
    category:   'ok',
    http_code:  200,
    final_url:  null,
    evidence:   'HEAD 200',
    checked_at: 'not-a-date'
};

const invalidNegativeAttempts = {
    url:        'https://example.com',
    category:   'ok',
    http_code:  200,
    final_url:  null,
    evidence:   'HEAD 200',
    checked_at: FIXED_TIMESTAMP,
    attempts:   -1
};

// ---------------------------------------------------------------------------
// Simulated HTTP response fixtures (for engine classification tests)
// ---------------------------------------------------------------------------

/**
 * Simulated server behaviors for deterministic classification testing.
 * Each fixture describes what the engine should "see" from the network
 * and what category it should produce.
 */
const httpScenarios = {
    clean200: {
        description: 'Simple 200 OK response',
        headResponse:  { statusCode: 200, headers: {} },
        getResponse:   null,   // HEAD succeeded, no GET needed
        expectedCategory: 'ok'
    },

    clean404: {
        description: 'Clean 404 on both HEAD and GET',
        headResponse:  { statusCode: 404, headers: {} },
        getResponse:   { statusCode: 404, headers: {} },
        expectedCategory: 'broken'
    },

    clean500: {
        description: 'Server error 500',
        headResponse:  { statusCode: 500, headers: {} },
        getResponse:   { statusCode: 500, headers: {} },
        expectedCategory: 'broken'
    },

    head403_get200: {
        description: 'HEAD blocked but GET succeeds (common anti-bot)',
        headResponse:  { statusCode: 403, headers: {} },
        getResponse:   { statusCode: 200, headers: {} },
        expectedCategory: 'ok'
    },

    head403_get403: {
        description: 'Both HEAD and GET return 403 (bot protection)',
        headResponse:  { statusCode: 403, headers: {} },
        getResponse:   { statusCode: 403, headers: {} },
        expectedCategory: 'soft-blocked'
    },

    head405_get200: {
        description: 'HEAD not allowed but GET works',
        headResponse:  { statusCode: 405, headers: {} },
        getResponse:   { statusCode: 200, headers: {} },
        expectedCategory: 'ok'
    },

    http429: {
        description: 'Rate limited with Retry-After',
        headResponse:  { statusCode: 429, headers: { 'retry-after': '60' } },
        getResponse:   null,
        expectedCategory: 'rate-limited'
    },

    http429NoRetryAfter: {
        description: 'Rate limited without Retry-After header',
        headResponse:  { statusCode: 429, headers: {} },
        getResponse:   null,
        expectedCategory: 'rate-limited'
    },

    redirect301: {
        description: 'Permanent redirect to new URL',
        headResponse:  { statusCode: 301, headers: { location: 'https://example.com/new' } },
        getResponse:   null,
        expectedCategory: 'ok',    // Redirects that resolve are OK
        expectedFinalUrl: 'https://example.com/new'
    },

    timeoutNoResponse: {
        description: 'Connection timeout, no response at all',
        headResponse:  null,       // timeout
        getResponse:   null,       // timeout
        error:         'ETIMEDOUT',
        expectedCategory: 'timeout'
    },

    dnsFailure: {
        description: 'DNS lookup failure',
        headResponse:  null,
        getResponse:   null,
        error:         'ENOTFOUND',
        expectedCategory: 'broken'
    },

    connectionRefused: {
        description: 'Connection refused (server down)',
        headResponse:  null,
        getResponse:   null,
        error:         'ECONNREFUSED',
        expectedCategory: 'broken'
    },

    head403_getChallengeBody: {
        description: 'GET returns 200 but body is a challenge/captcha page',
        headResponse:  { statusCode: 403, headers: {} },
        getResponse:   { statusCode: 200, headers: { 'content-type': 'text/html' }, bodyHint: 'challenge-page' },
        expectedCategory: 'needs-manual-review'
    },

    head403_get403_allProfiles: {
        description: 'All request profiles return 403',
        headResponse:  { statusCode: 403, headers: {} },
        getResponse:   { statusCode: 403, headers: {} },
        profileRotationExhausted: true,
        expectedCategory: 'soft-blocked'
    }
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    FIXED_TIMESTAMP,

    // Valid per-category fixtures
    valid: {
        ok,
        okWithRedirect,
        broken,
        brokenDnsFailure,
        softBlocked,
        rateLimited,
        timeout,
        needsManualReview
    },

    // Invalid fixtures for validation tests
    invalid: {
        invalidMissingUrl,
        invalidBadCategory,
        invalidHttpCodeType,
        invalidMissingCheckedAt,
        invalidBadTimestamp,
        invalidNegativeAttempts
    },

    // HTTP scenario fixtures for engine classification tests
    httpScenarios
};
