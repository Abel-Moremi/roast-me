---
tags: [operations]
---
# Deployment

Two GitHub Actions workflows deploy, both on push to `main` (filtered by path) or by hand (`workflow_dispatch`), to the GCP project `fun-series-gcloud`. A third, `docs-check.yml`, only checks pull requests (see below).

## Backend: `.github/workflows/deploy-cloud-function.yml`
**Triggers on:** `functions/**` or the workflow file.

```bash
gcloud functions deploy roast_me --gen2 --runtime python310 --trigger-http \
  --entry-point roast_me --source functions/ --region us-central1 \
  --memory 2GB --timeout 540 \
  --set-env-vars GEMINI_API_KEY=<secret>,ENABLE_AUDIO_TEST=false
```
- Runs at most one deploy at a time (`concurrency` with `cancel-in-progress`).
- Prints the function URL at the end. That URL is what goes in the `ROAST_API_URL` secret.
- Uploads what `functions/.gcloudignore` allows (no `__pycache__`, `temp/`, `test_*.py`, `.env`, audio files).
- No `--allow-unauthenticated` flag is passed. The function has to be publicly callable for the site to work, so that was set on the service outside this workflow.
- `ALLOWED_ORIGINS` is not set, so CORS allows any origin. To restrict it, gcloud needs a different list separator because the value contains commas, e.g. `--set-env-vars ^;^GEMINI_API_KEY=...;ALLOWED_ORIGINS=https://a,https://b`.

## Frontend: `.github/workflows/deploy-firebase.yml`
**Triggers on:** `app.vue`, `assets/`, `components/`, `composables/`, `pages/`, `public/`, `nuxt.config.ts`, `tailwind.config.js`, `tsconfig.json`, `package.json`, `package-lock.json`, `firebase.json`, or the workflow file.

Steps: Node 20 → `npm ci` → `npm run generate` with `VITE_ROAST_API_URL` from the `ROAST_API_URL` secret → warn if that secret is empty → deploy `dist/` to the Firebase Hosting `live` channel.

`VITE_ROAST_API_URL` is baked in at build time. **Changing the API URL means re-running this workflow.**

## PR check: `.github/workflows/docs-check.yml`
Runs on every pull request (and when its labels change). Two steps:
1. **Code changes include doc changes.** If the PR changes code or config (`app.vue`, `components/`, `composables/`, `functions/`, `public/`, `assets/`, `nuxt.config.ts`, `firebase.json`, `package.json`, `.github/workflows/`) but no `.md` file, it fails. The `docs-not-needed` label skips this step.
2. **No broken wikilinks** in `docs-roast-me/`. Always runs.

This enforces Rule #1 in `AGENTS.md`. It only checks *that* docs changed, not that they're right; the PR template checklist and review cover that. It doesn't block a direct push to `main`. Turn on branch protection requiring this check if you want it enforced there too.

## Secrets
| Secret | Used by | What |
| --- | --- | --- |
| `GCP_SA_KEY` | both | Service-account JSON key for deploying functions and hosting |
| `GEMINI_API_KEY` | backend | Passed to the function as an env var |
| `ROAST_API_URL` | frontend | The Cloud Function URL |

## Order for a change that touches both
Deploy the backend first. The frontend only reads fields the backend already returns, so an old frontend keeps working with a new backend as long as the [[API Contract]] isn't broken.

## Rolling back
Neither workflow keeps versions it can roll back to. Use Firebase Hosting's release history in the console, and for the function, re-deploy an older commit with `workflow_dispatch` on that ref.
