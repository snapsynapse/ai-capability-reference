# Security Policy

## Architecture

This project is a **static site** served from GitHub Pages. There is no server, no database, no authentication system, and no user data collection.

- The site is generated HTML and CSS from `scripts/build.js`
- The API (`docs/api/v1/`) is pre-generated JSON files, not a live service
- The MCP layer (when added) will be a read-only interface over those same JSON files
- No user input is processed server-side; all filtering and search runs client-side in the browser

## Attack Surface

Because there is no server-side execution, traditional web vulnerabilities (SQL injection, authentication bypass, SSRF, RCE) do not apply. The actual risks are:

### Data integrity

The primary risk is **stale or inaccurate data being cited as current**. Mitigations:

- Every record includes `verified` and `checked` dates so consumers can assess freshness
- A multi-model verification cascade runs weekly with human review before merging
- Features not re-verified within 30 days are flagged as stale
- The generation timestamp in every JSON export shows when the data was built

### Client-side code

The site includes JavaScript for search, filtering, comparison, and export. All scripts:

- Run entirely in the user's browser
- Do not make external API calls (only fetch local JSON files)
- Do not use `eval()`, `innerHTML` with user input, or dynamic script loading
- Use `document.createTextNode()` for all user-visible text insertion (XSS prevention)

### Supply chain

The build has **zero npm dependencies**. `scripts/build.js` uses only Node.js built-in modules (`fs`, `path`). There is no `package.json`, no `node_modules`, and no third-party code in the build pipeline.

### Secrets

- A GitHub Actions workflow (`scan-secrets.yml`) scans every push for accidentally committed credentials
- FTP deployment credentials are stored in GitHub Actions secrets, never in the repository
- No API keys, tokens, or credentials are used by the static site or JSON exports

## Reporting Vulnerabilities

If you find a security issue, please open a GitHub issue or email the maintainer at the address listed in the repository profile. Given the static nature of the site, most issues will relate to data accuracy rather than traditional security vulnerabilities.

## What This Policy Does Not Cover

This project does not handle payments, personal data, authentication, or any form of user accounts. There is no privacy policy because there is no data collection. The site uses no analytics, cookies, or tracking scripts.
