'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    toLegacyBuckets,
    buildEntryResults,
    generateLinkReport,
    getProblemLinks,
    getExitCode
} = require('../scripts/check-links');

describe('check-links integration helpers', () => {
    it('maps canonical categories to legacy bucket keys', () => {
        const grouped = {
            ok: [{ id: 1 }],
            broken: [{ id: 2 }],
            'soft-blocked': [{ id: 3 }],
            'rate-limited': [{ id: 4 }],
            timeout: [{ id: 5 }],
            'needs-manual-review': [{ id: 6 }]
        };

        const mapped = toLegacyBuckets(grouped);
        assert.equal(mapped.ok.length, 1);
        assert.equal(mapped.broken.length, 1);
        assert.equal(mapped.blocked.length, 1);
        assert.equal(mapped.rateLimited.length, 1);
        assert.equal(mapped.timeout.length, 1);
        assert.equal(mapped.needsManualReview.length, 1);
    });

    it('buildEntryResults merges URL metadata with link results', () => {
        const entries = [{ url: 'https://a.test', platform: 'X', type: 'source' }];
        const results = [{ url: 'https://a.test', category: 'ok', http_code: 200, evidence: 'HEAD 200' }];

        const merged = buildEntryResults(entries, results);
        assert.equal(merged.length, 1);
        assert.equal(merged[0].platform, 'X');
        assert.equal(merged[0].category, 'ok');
        assert.equal(merged[0].http_code, 200);
    });

    it('buildEntryResults inserts needs-manual-review fallback for missing result', () => {
        const entries = [{ url: 'https://missing.test', platform: 'Y', type: 'feature_url' }];
        const merged = buildEntryResults(entries, []);
        assert.equal(merged[0].category, 'needs-manual-review');
        assert.equal(merged[0].evidence, 'missing-result');
    });

    it('getProblemLinks includes only broken + timeout', () => {
        const results = {
            results: {
                broken: [{ url: 'b1' }],
                timeout: [{ url: 't1' }],
                blocked: [{ url: 's1' }],
                rateLimited: [{ url: 'r1' }],
                needsManualReview: [{ url: 'm1' }]
            }
        };

        const problems = getProblemLinks(results);
        assert.deepStrictEqual(
            problems.map(p => p.url).sort(),
            ['b1', 't1']
        );
    });

    it('getExitCode returns 1 only when actionable problems exist', () => {
        assert.equal(getExitCode([]), 0);
        assert.equal(getExitCode([{ url: 'b1' }]), 1);
    });

    it('generateLinkReport renders canonical category sections', () => {
        const report = generateLinkReport({
            total: 3,
            summary: {
                ok: 1,
                broken: 1,
                softBlocked: 1,
                rateLimited: 0,
                timeout: 0,
                needsManualReview: 0
            },
            results: {
                broken: [{ platform: 'P', feature: 'F', type: 'source', url: 'u', http_code: 404, evidence: '404' }],
                blocked: [{ platform: 'P', feature: 'F', type: 'source', url: 'u2', http_code: 403, evidence: '403' }],
                rateLimited: [],
                timeout: [],
                needsManualReview: []
            }
        });

        assert.ok(report.includes('## ❌ Broken Links'));
        assert.ok(report.includes('## 🚫 Soft-Blocked (Not Automatically Broken)'));
        assert.ok(report.includes('| 🚫 Soft-Blocked | 1 |'));
    });
});
