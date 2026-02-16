
# NoKeypedia — Newton Verified Substrate

NoKeypedia is a mobile-first directory of **keyless APIs**, governed by deterministic logic and an immutable audit ledger.

## Core Features
- **Intelligent Routing**: Use the "Ask" tab to describe your intent; Gemini Flash parses and selects the best verified API.
- **Verification Engine**: Built-in test runner that pings endpoints to update real-time reliability stats.
- **Audit-First**: Every query, test, and modification is recorded in an append-only ledger for transparency.
- **Apple-Light UI**: Clean, high-contrast, mobile-first design with a signature "Newton Receipt" for integration results.

## How to Run Locally
1. Ensure your environment has `API_KEY` set for Gemini routing.
2. The app uses `IndexedDB` via a custom wrapper for local-first persistence.
3. Simply serve the `index.html` or use a standard React dev server.

## Adding New ApiCards Safely
To maintain "Truth Axis" alignment (1 == 1):
1. Every new `ApiCard` must have a valid `test_spec`.
2. `requires_key` must strictly be `false`.
3. Preferred: Use APIs with `cors: "yes"` to avoid proxy overhead.

## Deployment
- **Frontend**: Deploy to Vercel, Netlify, or Cloudflare Pages.
- **Proxy**: Deploy the optional Cloudflare Worker if you need to bypass CORS for specific `cors: "no"` APIs (ensure they are in the `allowlist`).
