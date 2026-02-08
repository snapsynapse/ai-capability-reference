/**
 * Tests for challenge page detection heuristics
 *
 * These tests validate detectChallengePage() — the pure function that
 * identifies bot-gate/interstitial pages from response body snippets.
 *
 * Run:  node --test tests/challenge-detection.test.js
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    detectChallengePage,
    CHALLENGE_PATTERNS,
    BODY_CAPTURE_LIMIT
} = require('../scripts/lib/link-engine');

// ===================================================================
// detectChallengePage — positive matches
// ===================================================================

describe('detectChallengePage — positive matches', () => {

    it('detects Cloudflare "Just a moment" challenge', () => {
        const body = '<html><head><title>Just a moment...</title></head><body>Checking your browser</body></html>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.ok(result.matchedPattern.includes('cloudflare'));
    });

    it('detects Cloudflare browser verification', () => {
        const body = '<div id="cf-browser-verification">Please wait...</div>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'cloudflare-challenge');
    });

    it('detects Cloudflare Turnstile challenge', () => {
        const body = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'cloudflare-turnstile');
    });

    it('detects cf_chl_opt variable', () => {
        const body = '<script>var cf_chl_opt = { cvId: "123" };</script>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'cloudflare-challenge');
    });

    it('detects generic CAPTCHA', () => {
        const body = '<div class="g-recaptcha" data-sitekey="abc123"></div>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'captcha-generic');
    });

    it('detects hCaptcha', () => {
        const body = '<div class="h-captcha" data-sitekey="abc123"></div>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'captcha-generic');
    });

    it('detects "verify you are human" text', () => {
        const body = '<h1>Please verify you are human to continue</h1>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'bot-detection');
    });

    it('detects "checking your browser" text', () => {
        const body = '<p>Checking your browser before accessing the site...</p>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'browser-check');
    });

    it('detects Akamai Bot Manager', () => {
        const body = '<script src="/akam/13/pixel_abc.js"></script>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'akamai-bot-manager');
    });

    it('detects PerimeterX challenge', () => {
        // Use a PerimeterX-specific marker (px-captcha also matches generic captcha first)
        const body = '<script>window._pxAppId = "PX12345"; /* perimeterx */</script>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'perimeterx');
    });

    it('detects DataDome', () => {
        const body = '<script src="https://js.datadome.co/dd.js"></script>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'datadome');
    });

    it('detects JavaScript-required interstitials', () => {
        const body = '<noscript>You need to enable JavaScript to run this app.</noscript>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'js-required');
    });

    it('detects "JavaScript must be enabled"', () => {
        const body = '<p>JavaScript must be enabled to view this page</p>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        assert.equal(result.matchedPattern, 'js-required');
    });
});

// ===================================================================
// detectChallengePage — negative matches (real content)
// ===================================================================

describe('detectChallengePage — negative matches', () => {

    it('does not flag normal HTML page', () => {
        const body = '<html><head><title>Welcome to Our Site</title></head><body><h1>Hello World</h1></body></html>';
        const result = detectChallengePage(body);
        assert.ok(!result.isChallenge);
        assert.equal(result.matchedPattern, null);
    });

    it('does not flag a pricing page', () => {
        const body = '<html><head><title>Pricing - Example.com</title></head><body><div class="plans"><h2>Pro Plan - $20/mo</h2></div></body></html>';
        const result = detectChallengePage(body);
        assert.ok(!result.isChallenge);
    });

    it('does not flag a blog post about Cloudflare', () => {
        // A page that *mentions* Cloudflare but is not itself a challenge
        const body = '<article><h1>How We Use Cloudflare for CDN</h1><p>We configured our DNS through Cloudflare\'s dashboard.</p></article>';
        const result = detectChallengePage(body);
        assert.ok(!result.isChallenge);
    });

    it('does not flag a page about JavaScript tutorials', () => {
        const body = '<h1>Learn JavaScript</h1><p>JavaScript is a programming language used for web development.</p>';
        const result = detectChallengePage(body);
        assert.ok(!result.isChallenge);
    });

    it('does not flag an API documentation page', () => {
        const body = '<html><body><h1>API Reference</h1><p>GET /api/v1/users - Returns a list of users</p></body></html>';
        const result = detectChallengePage(body);
        assert.ok(!result.isChallenge);
    });

    it('does not flag a page discussing bot protection in general', () => {
        // Contains the word "bot" but not the challenge-specific patterns
        const body = '<p>Chatbots are revolutionizing customer service. Our chatbot uses natural language processing.</p>';
        const result = detectChallengePage(body);
        assert.ok(!result.isChallenge);
    });
});

// ===================================================================
// Edge cases
// ===================================================================

describe('detectChallengePage — edge cases', () => {

    it('handles null input', () => {
        const result = detectChallengePage(null);
        assert.ok(!result.isChallenge);
        assert.equal(result.matchedPattern, null);
    });

    it('handles undefined input', () => {
        const result = detectChallengePage(undefined);
        assert.ok(!result.isChallenge);
    });

    it('handles empty string', () => {
        const result = detectChallengePage('');
        assert.ok(!result.isChallenge);
    });

    it('handles non-string input', () => {
        const result = detectChallengePage(42);
        assert.ok(!result.isChallenge);
    });

    it('is case-insensitive', () => {
        const body = '<TITLE>JUST A MOMENT...</TITLE>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
    });

    it('returns the first matching pattern when multiple match', () => {
        // Body contains both Cloudflare and CAPTCHA signals
        const body = '<title>Just a moment...</title><div class="g-recaptcha"></div>';
        const result = detectChallengePage(body);
        assert.ok(result.isChallenge);
        // Should match cloudflare-ray first (earlier in pattern list)
        assert.equal(result.matchedPattern, 'cloudflare-ray');
    });
});

// ===================================================================
// Configuration
// ===================================================================

describe('challenge detection configuration', () => {

    it('BODY_CAPTURE_LIMIT is a reasonable size', () => {
        assert.ok(BODY_CAPTURE_LIMIT >= 2048, 'Should capture at least 2KB');
        assert.ok(BODY_CAPTURE_LIMIT <= 16384, 'Should not capture more than 16KB');
    });

    it('every pattern has a name and a regex', () => {
        for (const p of CHALLENGE_PATTERNS) {
            assert.ok(typeof p.name === 'string' && p.name.length > 0, `Pattern needs a name`);
            assert.ok(p.pattern instanceof RegExp, `Pattern "${p.name}" needs a regex`);
        }
    });

    it('all patterns are case-insensitive', () => {
        for (const p of CHALLENGE_PATTERNS) {
            assert.ok(p.pattern.flags.includes('i'),
                `Pattern "${p.name}" should have /i flag for case-insensitive matching`);
        }
    });
});
