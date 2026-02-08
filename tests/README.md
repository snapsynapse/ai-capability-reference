# Link Checker Test Harness (PR-1)

This directory contains the zero-dependency test harness for the link checker replacement.

## Runner

Uses Node's built-in test runner (`node:test`), so no Jest/Mocha dependency is required.

```bash
node --test tests/link-schema.test.js
```

## Structure

- `link-schema.test.js` — contract-level validation tests for canonical output schema
- `fixtures/link-check-fixtures.js` — deterministic fixtures for all result categories and invalid edge cases

## Fixture conventions

1. Keep `checked_at` deterministic in fixtures (`FIXED_TIMESTAMP`) for stable assertions.
2. Include at least one fixture for each canonical category:
   - `ok`
   - `broken`
   - `soft-blocked`
   - `rate-limited`
   - `timeout`
   - `needs-manual-review`
3. Add invalid fixtures when adding schema constraints.
4. Keep HTTP scenario fixtures deterministic and free of live network calls.

## Collaboration note

This harness is shared between Claude (engine behavior) and Codex (integration/reporting).
When adding tests, prefer clear scenario names and one-assertion intent per case for easier cross-review.
