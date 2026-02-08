/**
 * Live smoke tests — validates the engine against real URLs
 *
 * These tests hit the network and are NOT run in CI. They exist for
 * local validation that the engine produces sensible results against
 * real-world servers.
 *
 * Run:  node --test tests/smoke-live.test.js
 *
 * Note: External services can be flaky. These tests focus on:
 *   1. Result shape validity (always)
 *   2. Category correctness (when the service cooperates)
 *
 * Expected runtime: ~10-30 seconds (network-bound)
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { checkUrl } = require('../scripts/lib/link-engine');
const { VALID_CATEGORIES, isValid } = require('../scripts/lib/link-schema');

// Helper: check a URL and validate the result shape
async function checkAndValidate(url, timeout = 15000) {
    const result = await checkUrl(url, { timeout });
    const errors = [];
    if (!isValid(result)) errors.push(`Invalid result shape for ${url}`);
    if (!VALID_CATEGORIES.has(result.category)) errors.push(`Invalid category "${result.category}" for ${url}`);
    return { result, errors };
}

// ===================================================================
// Smoke tests — real URLs, real network
// ===================================================================

describe('live smoke tests', { timeout: 120000 }, () => {

    // --- Reliable endpoints ---

    it('https://example.com → ok', async () => {
        const { result, errors } = await checkAndValidate('https://example.com');
        assert.deepStrictEqual(errors, []);
        assert.equal(result.category, 'ok');
        assert.equal(result.http_code, 200);
    });

    it('nonexistent domain → broken (DNS failure)', async () => {
        const { result, errors } = await checkAndValidate('https://this-domain-does-not-exist-xyz123.invalid');
        assert.deepStrictEqual(errors, []);
        assert.equal(result.category, 'broken');
        assert.ok(result.evidence.includes('ENOTFOUND') || result.evidence.includes('DNS'));
    });

    it('https://www.google.com → ok', async () => {
        const { result, errors } = await checkAndValidate('https://www.google.com');
        assert.deepStrictEqual(errors, []);
        assert.equal(result.category, 'ok');
    });

    // --- Shape validation (valid regardless of category) ---

    it('every result has all required fields', async () => {
        const { result } = await checkAndValidate('https://example.com');
        assert.ok(result.url);
        assert.ok(VALID_CATEGORIES.has(result.category));
        assert.ok('http_code' in result);
        assert.ok('final_url' in result);
        assert.ok(typeof result.evidence === 'string');
        assert.ok(result.checked_at);
    });

    it('every result has a valid checked_at timestamp', async () => {
        const { result } = await checkAndValidate('https://example.com');
        assert.ok(result.checked_at);
        assert.ok(!isNaN(Date.parse(result.checked_at)));
    });

    it('every result has evidence', async () => {
        const { result } = await checkAndValidate('https://example.com');
        assert.ok(typeof result.evidence === 'string');
        assert.ok(result.evidence.length > 0);
    });

    it('results include latency_ms', async () => {
        const { result } = await checkAndValidate('https://example.com');
        assert.ok(typeof result.latency_ms === 'number');
        assert.ok(result.latency_ms > 0);
    });

    it('results include attempts count', async () => {
        const { result } = await checkAndValidate('https://example.com');
        assert.ok(typeof result.attempts === 'number');
        assert.ok(result.attempts >= 1);
    });

    // --- Real-world project URLs (from our own platform data) ---

    it('GitHub URL → ok or soft-blocked (not broken)', async () => {
        const { result, errors } = await checkAndValidate('https://github.com');
        assert.deepStrictEqual(errors, []);
        // GitHub should be reachable but may sometimes block bots
        assert.ok(
            result.category === 'ok' || result.category === 'soft-blocked',
            `Expected ok or soft-blocked, got "${result.category}": ${result.evidence}`
        );
    });

    it('Anthropic status page → ok or soft-blocked', async () => {
        const { result, errors } = await checkAndValidate('https://status.anthropic.com');
        assert.deepStrictEqual(errors, []);
        assert.ok(
            result.category === 'ok' || result.category === 'soft-blocked',
            `Expected ok or soft-blocked, got "${result.category}": ${result.evidence}`
        );
    });

    // --- Edge cases ---

    it('HTTP (non-HTTPS) URL works', async () => {
        const { result, errors } = await checkAndValidate('http://example.com');
        assert.deepStrictEqual(errors, []);
        assert.equal(result.category, 'ok');
    });

    it('URL with path → ok', async () => {
        const { result, errors } = await checkAndValidate('https://example.com/does-not-exist-12345');
        assert.deepStrictEqual(errors, []);
        // example.com returns 404 for unknown paths (but may still return 200)
        assert.ok(VALID_CATEGORIES.has(result.category));
    });
});
