# DataWipe (Phase 1)

DataWipe is a local-first, browser-only guide for opting out of data brokers. Phase 1 avoids accounts and server-side storage to keep compliance scope minimal while still giving users a clear, user-initiated removal workflow.

## What Phase 1 does
- Local-only workspace for your info (state + optional localStorage)
- Guided broker list with opt-out page search links
- Prefilled request templates you copy/paste into broker flows
- Local progress tracking per broker
- Export/import to JSON for backups

## What Phase 1 does not do
- No automatic submissions or background scraping
- No server-side storage or user accounts
- No email collection inside the app

## Run locally
**Prereqs:** Node.js 20+, Yarn

```bash
cd frontend
yarn install
yarn start
```

The backend is not required for Phase 1. All data stays in the browser unless a user exports it.

## GitHub Pages deployment
This repo uses a GitHub Actions workflow at `.github/workflows/deploy.yml` to build and publish the React app from `frontend/build`.

Checklist:
1) Ensure GitHub Pages is configured to **Deploy from GitHub Actions**.
2) `frontend/package.json` contains the `homepage` field: `https://Armpit-symphony.github.io/datawipe`.
3) The router uses `process.env.PUBLIC_URL` for correct base paths in production builds.

## Privacy notes
- Data is stored in the browser’s localStorage only.
- Users can export or clear data at any time from the workspace.
- Requests are always user-initiated and visible.

## Roadmap
Phase 2 will introduce optional accounts, server-side storage, verification handling, and compliance workflows when the product is ready to handle PII.
