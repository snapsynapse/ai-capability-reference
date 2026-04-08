/**
 * Cascade logic for multi-model verification
 * Implements the consensus-based verification flow
 */

const { getCascadeClients } = require('./ai-clients');
const { serializeFeature } = require('./parser');

/**
 * Result types from verification
 */
const ResultType = {
    NEGATIVE: 'negative',      // No change detected
    POSITIVE: 'positive',      // Change detected
    ERROR: 'error',            // Query failed
    SKIPPED: 'skipped'         // Model skipped (same provider)
};

/**
 * Outcome types from cascade
 */
const CascadeOutcome = {
    NO_CHANGE: 'no_change',           // First model confirmed no change
    CONFIRMED: 'confirmed',            // 3+ models agree on change
    CONTRADICTION: 'contradiction',    // Models disagree
    INCONCLUSIVE: 'inconclusive',      // Cascade exhausted without consensus
    ERROR: 'error'                     // All models failed
};

/**
 * Parse AI response to determine if change was detected
 * @param {string} response - AI model response text
 * @param {Object} storedFeature - Current stored feature data
 * @returns {{hasChange: boolean, changes: Array<Object>, confidence: number}}
 */
function parseResponse(response, storedFeature) {
    const changes = [];
    const responseLower = response.toLowerCase();

    // Detect empty or boilerplate responses that contain no actual analysis
    const BOILERPLATE_PREFIXES = [
        'okay, i will check',
        'okay, i will verify',
        'okay, let me check',
        'okay, let me verify',
        'i will check',
        'i will verify',
        'let me check',
        'let me verify',
        'sure, i will',
        'sure, let me'
    ];

    const isBoilerplate = response.trim().length < 30 ||
        (BOILERPLATE_PREFIXES.some(prefix => responseLower.startsWith(prefix)) &&
         response.trim().length < 500);

    if (isBoilerplate) {
        return { hasChange: false, changes: [], confidence: 0, isEmpty: true };
    }

    // Check for explicit "no change" indicators
    const noChangeIndicators = [
        'no changes',
        'no recent changes',
        'remains the same',
        'unchanged',
        'still available',
        'as before',
        'no updates',
        'nothing has changed'
    ];

    const hasNoChangeIndicator = noChangeIndicators.some(ind =>
        responseLower.includes(ind)
    );

    // Check for change indicators — split into strong (unambiguous) and weak
    // (can appear in historical descriptions). Weak indicators only count if
    // they appear near recency markers like "recently", "now", "just", date
    // references, etc., to avoid false positives from historical context.
    const strongChangeIndicators = [
        'now available',
        'recently added',
        'has been updated',
        'changed to',
        'no longer available',
        'removed from',
        'rolled out'
    ];

    const weakChangeIndicators = [
        'deprecated',
        'announced',
        'launched',
        'new feature',
        'expanded to',
        'limited to',
        'restricted to'
    ];

    const recencyPatterns = [
        /(?:recently|just|now|newly|as of|starting|beginning|since)\s+\w*\s*(?:deprecated|announced|launched|expanded|limited|restricted)/i,
        /(?:in|since|as of)\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+202[5-9]/i,
        /(?:this|last)\s+(?:week|month)\s+\w*\s*(?:deprecated|announced|launched)/i,
        /(?:202[5-9])\s*[-:]\s*(?:deprecated|announced|launched)/i
    ];

    const hasStrongChangeIndicator = strongChangeIndicators.some(ind =>
        responseLower.includes(ind)
    );

    const hasWeakChangeWithRecency = weakChangeIndicators.some(ind =>
        responseLower.includes(ind)
    ) && recencyPatterns.some(pat => pat.test(response));

    const hasChangeIndicator = hasStrongChangeIndicator || hasWeakChangeWithRecency;

    // Extract specific changes mentioned
    // Look for availability changes
    const availPatterns = [
        /(?:now|no longer) available (?:on|for) (free|plus|pro|team|enterprise)/gi,
        /(free|plus|pro|team|enterprise) (?:tier|plan|users?) (?:now )?(?:have|has|get|can) access/gi,
        /(free|plus|pro|team|enterprise) (?:tier|plan) (?:no longer|cannot|can't) access/gi
    ];

    for (const pattern of availPatterns) {
        let match;
        while ((match = pattern.exec(response)) !== null) {
            changes.push({
                type: 'availability',
                detail: match[0],
                plan: match[1]
            });
        }
    }

    // Look for platform changes
    const platformPatterns = [
        /(?:now|no longer) available on (windows|macos|linux|ios|android|web|api|terminal)/gi,
        /(windows|macos|linux|ios|android|web|api|terminal) (?:support|app|version) (?:added|removed|launched)/gi
    ];

    for (const pattern of platformPatterns) {
        let match;
        while ((match = pattern.exec(response)) !== null) {
            changes.push({
                type: 'platform',
                detail: match[0],
                platform: match[1]
            });
        }
    }

    // Look for status changes
    const statusPatterns = [
        /(?:moved to|now in|entered|exited) (ga|beta|preview|deprecated)/gi,
        /(?:generally available|ga|beta|preview|deprecated) (?:status|release)/gi
    ];

    for (const pattern of statusPatterns) {
        let match;
        while ((match = pattern.exec(response)) !== null) {
            changes.push({
                type: 'status',
                detail: match[0]
            });
        }
    }

    // Calculate confidence based on specificity
    let confidence = 0.5; // Default medium confidence

    if (changes.length > 0) {
        confidence = Math.min(0.9, 0.5 + (changes.length * 0.1));
    }

    if (hasNoChangeIndicator && !hasChangeIndicator && changes.length === 0) {
        return { hasChange: false, changes: [], confidence: 0.8 };
    }

    if (hasChangeIndicator || changes.length > 0) {
        return { hasChange: true, changes, confidence };
    }

    // Ambiguous - consider it as no change with low confidence
    return { hasChange: false, changes: [], confidence: 0.3 };
}

/**
 * Compare two parsed responses for contradiction
 * @param {Object} result1 - First model result
 * @param {Object} result2 - Second model result
 * @returns {boolean} True if results contradict each other
 */
function detectContradiction(result1, result2) {
    // If one says change and other says no change, it's a contradiction
    if (result1.hasChange !== result2.hasChange) {
        return true;
    }

    // If both say change but report different changes, might be contradiction
    // For now, we'll allow different changes as complementary info
    return false;
}

/**
 * Run verification cascade for a single feature
 * @param {Object} platform - Platform object
 * @param {Object} feature - Feature object
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Cascade result
 */
async function runCascade(platform, feature, options = {}) {
    const {
        requiredConfirmations = 3,
        delayBetweenQueries = 1000,
        verbose = false
    } = options;

    const clients = getCascadeClients(platform.vendor);
    const storedData = serializeFeature(feature);

    const results = [];
    let confirmations = 0;
    let outcome = CascadeOutcome.INCONCLUSIVE;
    let proposedChanges = [];

    const log = verbose ? console.log : () => {};

    log(`\nBuilding cascade for ${platform.name} → ${feature.name}`);
    log(`Clients: [${clients.map(c => c.displayName).join(', ')}]`);
    log(`(Skipped: ${platform.vendor} provider model)`);

    for (const client of clients) {
        log(`\n[${results.length + 1}/${clients.length}] Querying ${client.displayName}...`);

        try {
            // Query the model
            const response = await client.verify(platform, feature);

            // Parse the response for changes
            const parsed = parseResponse(response.response, storedData);

            // Treat empty/boilerplate responses as errors — don't count them
            if (parsed.isEmpty) {
                log(`  Empty/boilerplate response (${response.response.length} chars). Treating as ERROR.`);
                results.push({
                    model: client.displayName,
                    modelName: client.name,
                    response: response.response,
                    type: ResultType.ERROR,
                    error: 'Empty or boilerplate response',
                    isEmpty: true
                });
                if (results.length < clients.length) {
                    await new Promise(resolve => setTimeout(resolve, delayBetweenQueries));
                }
                continue;
            }

            const result = {
                model: client.displayName,
                modelName: client.name,
                response: response.response,
                sources: response.sources,
                hasChange: parsed.hasChange,
                changes: parsed.changes,
                confidence: parsed.confidence,
                type: parsed.hasChange ? ResultType.POSITIVE : ResultType.NEGATIVE
            };

            results.push(result);

            log(`  Result: ${result.type.toUpperCase()}`);
            if (parsed.hasChange) {
                log(`  Changes detected: ${parsed.changes.length}`);
                log(`  Confidence: ${(parsed.confidence * 100).toFixed(0)}%`);
            }

            // Two models agree on no change - stop cascade
            // (Previously stopped after just 1 model, which meant a single
            // false negative would kill the entire verification)
            const noChangeCount = results.filter(r => !r.hasChange && r.type !== ResultType.ERROR).length;
            if (noChangeCount >= 2 && !parsed.hasChange) {
                log(`\n✓ ${noChangeCount} models confirm no change. Stopping cascade.`);
                outcome = CascadeOutcome.NO_CHANGE;
                break;
            }

            // Check for contradictions with previous non-error results
            const prevSubstantive = results.slice(0, -1).filter(r => r.type !== ResultType.ERROR && r.type !== ResultType.SKIPPED).pop();
            if (prevSubstantive) {
                if (detectContradiction(prevSubstantive, result)) {
                    log(`\n⚠ Contradiction detected between ${prevSubstantive.model} and ${result.model}`);
                    outcome = CascadeOutcome.CONTRADICTION;
                    break;
                }
            }

            // Count confirmations
            if (parsed.hasChange) {
                confirmations++;
                proposedChanges.push(...parsed.changes);

                if (confirmations >= requiredConfirmations) {
                    log(`\n✓ ${confirmations} models confirm change. Consensus reached.`);
                    outcome = CascadeOutcome.CONFIRMED;
                    break;
                }
            }

            // Delay between queries to avoid rate limits
            if (results.length < clients.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenQueries));
            }

        } catch (error) {
            log(`  Error: ${error.message}`);
            results.push({
                model: client.displayName,
                modelName: client.name,
                type: ResultType.ERROR,
                error: error.message
            });
        }
    }

    // Minimum evidence threshold: require at least 2 substantive results
    // to create an issue. Otherwise downgrade INCONCLUSIVE to NO_CHANGE.
    const substantiveResults = results.filter(r =>
        r.type !== ResultType.ERROR && r.type !== ResultType.SKIPPED
    );
    if (substantiveResults.length < 2 && outcome === CascadeOutcome.INCONCLUSIVE) {
        log(`\n⚠ Only ${substantiveResults.length} substantive result(s). ` +
            `Downgrading INCONCLUSIVE to NO_CHANGE (insufficient evidence).`);
        outcome = CascadeOutcome.NO_CHANGE;
    }

    // Check if all models errored
    if (results.every(r => r.type === ResultType.ERROR)) {
        outcome = CascadeOutcome.ERROR;
    }

    // Deduplicate proposed changes
    const uniqueChanges = [];
    const seen = new Set();
    for (const change of proposedChanges) {
        const key = `${change.type}:${change.detail}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueChanges.push(change);
        }
    }

    return {
        platform: platform.name,
        feature: feature.name,
        vendor: platform.vendor,
        outcome,
        confirmations,
        requiredConfirmations,
        results,
        proposedChanges: uniqueChanges,
        storedData,
        timestamp: new Date().toISOString()
    };
}

/**
 * Run cascade verification for multiple features
 * @param {Array<{platform: Object, feature: Object}>} features - Features to verify
 * @param {Object} options - Configuration options
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} { results: Array, providerHealth: Object }
 */
async function runBatchCascade(features, options = {}, onProgress = null) {
    const {
        maxFeatures = 100,
        delayBetweenFeatures = 2000
    } = options;

    const toVerify = features.slice(0, maxFeatures);
    const results = [];
    const providerHealth = {};

    for (let i = 0; i < toVerify.length; i++) {
        const { platform, feature } = toVerify[i];

        if (onProgress) {
            onProgress({
                current: i + 1,
                total: toVerify.length,
                platform: platform.name,
                feature: feature.name
            });
        }

        const result = await runCascade(platform, feature, options);
        results.push(result);

        // Track per-provider health from individual model results
        for (const modelResult of result.results) {
            const provider = modelResult.modelName || modelResult.model;
            if (!providerHealth[provider]) {
                providerHealth[provider] = { total: 0, errors: 0, skipped: 0, lastError: null };
            }
            providerHealth[provider].total++;
            if (modelResult.type === ResultType.ERROR) {
                providerHealth[provider].errors++;
                providerHealth[provider].lastError = modelResult.error;
            } else if (modelResult.type === ResultType.SKIPPED) {
                providerHealth[provider].skipped++;
            }
        }

        // Delay between features
        if (i < toVerify.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenFeatures));
        }
    }

    return { results, providerHealth };
}

/**
 * Summarize cascade results
 * @param {Array<Object>} results - Array of cascade results
 * @returns {Object} Summary statistics
 */
function summarizeResults(results) {
    const summary = {
        total: results.length,
        noChange: 0,
        confirmed: 0,
        contradiction: 0,
        inconclusive: 0,
        error: 0,
        byPlatform: {}
    };

    for (const result of results) {
        switch (result.outcome) {
            case CascadeOutcome.NO_CHANGE:
                summary.noChange++;
                break;
            case CascadeOutcome.CONFIRMED:
                summary.confirmed++;
                break;
            case CascadeOutcome.CONTRADICTION:
                summary.contradiction++;
                break;
            case CascadeOutcome.INCONCLUSIVE:
                summary.inconclusive++;
                break;
            case CascadeOutcome.ERROR:
                summary.error++;
                break;
        }

        if (!summary.byPlatform[result.platform]) {
            summary.byPlatform[result.platform] = {
                total: 0,
                noChange: 0,
                confirmed: 0,
                contradiction: 0,
                inconclusive: 0,
                error: 0
            };
        }

        summary.byPlatform[result.platform].total++;
        summary.byPlatform[result.platform][result.outcome]++;
    }

    return summary;
}

module.exports = {
    ResultType,
    CascadeOutcome,
    parseResponse,
    detectContradiction,
    runCascade,
    runBatchCascade,
    summarizeResults
};
