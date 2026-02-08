/**
 * Baseline tests for the canonical link-check result schema
 *
 * Uses Node.js built-in test runner (node:test) to maintain the project's
 * zero-dependency constraint. Requires Node 20+ (already in CI).
 *
 * Run:  node --test tests/link-schema.test.js
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    Category,
    VALID_CATEGORIES,
    createResult,
    validate,
    isValid
} = require('../scripts/lib/link-schema');

const fixtures = require('./fixtures/link-check-fixtures');

// ===================================================================
// Category enum
// ===================================================================

describe('Category enum', () => {

    it('has exactly 6 categories matching the protocol contract', () => {
        const expected = ['ok', 'broken', 'soft-blocked', 'rate-limited', 'timeout', 'needs-manual-review'];
        assert.deepStrictEqual(
            Object.values(Category).sort(),
            expected.sort()
        );
    });

    it('is frozen (immutable)', () => {
        assert.ok(Object.isFrozen(Category));
    });

    it('VALID_CATEGORIES set matches Category enum values', () => {
        for (const value of Object.values(Category)) {
            assert.ok(VALID_CATEGORIES.has(value), `VALID_CATEGORIES should contain "${value}"`);
        }
        assert.equal(VALID_CATEGORIES.size, Object.values(Category).length);
    });
});

// ===================================================================
// createResult factory
// ===================================================================

describe('createResult', () => {

    it('sets required fields from input', () => {
        const result = createResult({
            url:      'https://example.com',
            category: Category.OK,
            evidence: 'HEAD 200'
        });
        assert.equal(result.url, 'https://example.com');
        assert.equal(result.category, 'ok');
        assert.equal(result.evidence, 'HEAD 200');
    });

    it('defaults http_code and final_url to null', () => {
        const result = createResult({
            url:      'https://example.com',
            category: Category.OK
        });
        assert.equal(result.http_code, null);
        assert.equal(result.final_url, null);
    });

    it('defaults evidence to empty string', () => {
        const result = createResult({
            url:      'https://example.com',
            category: Category.OK
        });
        assert.equal(result.evidence, '');
    });

    it('auto-generates checked_at when not provided', () => {
        const before = new Date().toISOString();
        const result = createResult({
            url:      'https://example.com',
            category: Category.OK
        });
        const after = new Date().toISOString();

        assert.ok(result.checked_at >= before, 'checked_at should be >= test start');
        assert.ok(result.checked_at <= after,  'checked_at should be <= test end');
    });

    it('uses provided checked_at instead of auto-generating', () => {
        const result = createResult({
            url:        'https://example.com',
            category:   Category.OK,
            checked_at: fixtures.FIXED_TIMESTAMP
        });
        assert.equal(result.checked_at, fixtures.FIXED_TIMESTAMP);
    });

    it('includes optional fields only when provided', () => {
        const minimal = createResult({
            url:      'https://example.com',
            category: Category.OK
        });
        assert.ok(!('attempts'        in minimal));
        assert.ok(!('method_used'     in minimal));
        assert.ok(!('request_profile' in minimal));
        assert.ok(!('latency_ms'      in minimal));

        const full = createResult({
            url:             'https://example.com',
            category:        Category.OK,
            attempts:        2,
            method_used:     'GET',
            request_profile: 'chrome-mac',
            latency_ms:      500
        });
        assert.equal(full.attempts, 2);
        assert.equal(full.method_used, 'GET');
        assert.equal(full.request_profile, 'chrome-mac');
        assert.equal(full.latency_ms, 500);
    });

    it('produces valid results for every category', () => {
        for (const cat of Object.values(Category)) {
            const result = createResult({
                url:        'https://example.com',
                category:   cat,
                evidence:   `test ${cat}`,
                checked_at: fixtures.FIXED_TIMESTAMP
            });
            assert.ok(isValid(result), `createResult for category "${cat}" should be valid`);
        }
    });
});

// ===================================================================
// validate / isValid
// ===================================================================

describe('validate', () => {

    describe('valid fixtures pass validation', () => {
        for (const [name, fixture] of Object.entries(fixtures.valid)) {
            it(`fixture "${name}" is valid`, () => {
                const errors = validate(fixture);
                assert.deepStrictEqual(errors, [], `Expected no errors for "${name}", got: ${errors.join('; ')}`);
                assert.ok(isValid(fixture));
            });
        }
    });

    describe('invalid fixtures fail validation', () => {

        it('rejects missing url', () => {
            const errors = validate(fixtures.invalid.invalidMissingUrl);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('url')));
        });

        it('rejects unknown category', () => {
            const errors = validate(fixtures.invalid.invalidBadCategory);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('category')));
        });

        it('rejects string http_code', () => {
            const errors = validate(fixtures.invalid.invalidHttpCodeType);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('http_code')));
        });

        it('rejects missing checked_at', () => {
            const errors = validate(fixtures.invalid.invalidMissingCheckedAt);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('checked_at')));
        });

        it('rejects invalid timestamp', () => {
            const errors = validate(fixtures.invalid.invalidBadTimestamp);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('checked_at')));
        });

        it('rejects negative attempts', () => {
            const errors = validate(fixtures.invalid.invalidNegativeAttempts);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('attempts')));
        });

        it('rejects null input', () => {
            const errors = validate(null);
            assert.ok(errors.length > 0);
        });

        it('rejects non-object input', () => {
            const errors = validate('not an object');
            assert.ok(errors.length > 0);
        });
    });
});

// ===================================================================
// Schema completeness — ensure contract fields are present
// ===================================================================

describe('schema completeness', () => {

    const REQUIRED_FIELDS = ['url', 'category', 'http_code', 'final_url', 'evidence', 'checked_at'];
    const OPTIONAL_FIELDS = ['attempts', 'method_used', 'request_profile', 'latency_ms'];

    it('every valid fixture has all required fields', () => {
        for (const [name, fixture] of Object.entries(fixtures.valid)) {
            for (const field of REQUIRED_FIELDS) {
                assert.ok(
                    field in fixture,
                    `Fixture "${name}" is missing required field "${field}"`
                );
            }
        }
    });

    it('at least one fixture demonstrates every optional field', () => {
        const allFixtureValues = Object.values(fixtures.valid);
        for (const field of OPTIONAL_FIELDS) {
            const found = allFixtureValues.some(f => field in f);
            assert.ok(found, `No fixture demonstrates optional field "${field}"`);
        }
    });

    it('every category has at least one fixture', () => {
        const fixtureCategories = new Set(
            Object.values(fixtures.valid).map(f => f.category)
        );
        for (const cat of Object.values(Category)) {
            assert.ok(
                fixtureCategories.has(cat),
                `No fixture for category "${cat}"`
            );
        }
    });
});

// ===================================================================
// HTTP scenario fixtures — structural validation
// ===================================================================

describe('httpScenarios fixtures', () => {

    it('every scenario has a description and expectedCategory', () => {
        for (const [name, scenario] of Object.entries(fixtures.httpScenarios)) {
            assert.ok(
                typeof scenario.description === 'string',
                `Scenario "${name}" needs a description`
            );
            assert.ok(
                VALID_CATEGORIES.has(scenario.expectedCategory),
                `Scenario "${name}" expectedCategory "${scenario.expectedCategory}" is not a valid category`
            );
        }
    });

    it('covers all six categories', () => {
        const covered = new Set(
            Object.values(fixtures.httpScenarios).map(s => s.expectedCategory)
        );
        for (const cat of Object.values(Category)) {
            assert.ok(
                covered.has(cat),
                `No httpScenario covers category "${cat}"`
            );
        }
    });
});
