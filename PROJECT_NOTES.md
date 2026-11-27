# Kotzebue Track Finder: project notes

Notes for whoever (or whichever Claude chat) works on this app next. No secrets are stored here.

## What it is
A phone web app (installable to the home screen, works offline) for identifying animal and bird tracks on trails around Kotzebue, Alaska. Personal use by Savio Dias.

- Live app: https://kotzebue-track-finder-5frq.onrender.com
- Photo server: https://kotzebue-track-finder-api-bm27.onrender.com (`/health` shows status)
- Code: this repository (GitHub `sdias876/kotzebue-track-finder`), branch `main`

## Where things run
| Part | Where | Notes |
|---|---|---|
| App (`index.html`, `sw.js`, icons, manifest) | Render static site `kotzebue-track-finder` in the savio.a.dias@gmail.com Render workspace | Auto-deploys on push to `main` |
| Photo server (`api/server.js`, no dependencies, Node 18+) | Render web service `kotzebue-track-finder-api`, same workspace, free plan | Start command `node api/server.js`. Free plan sleeps after ~15 min idle; the app pings `/health` to keep it awake while open |
| Photo identification | Google Gemini free plan, key from aistudio.google.com (savio.a.dias@gmail.com) | Model `gemini-3.5-flash` (about 2–3 s per photo), backup `gemini-3.1-flash-lite`. Free plan: Google may use photos to improve its products |

Old copies of both services also exist in a separate savio.dias@live.com Render account. They are outdated and can be deleted.

## Photo server environment variables (set in Render, never in code)
- `GEMINI_API_KEY`: Google Gemini key (used first if set)
- `ANTHROPIC_API_KEY`: optional, paid alternative if no Gemini key
- `APP_CODE`: access code the app asks for once per phone
- `ALLOWED_ORIGIN`: the app's address (CORS), currently https://kotzebue-track-finder-5frq.onrender.com
- `GEMINI_MODEL`, `GEMINI_BACKUP_MODEL`, `MODEL`: optional model overrides

Server protections: access code check, 30 photo checks per hour per connection, 4 MB request limit, 25 s Gemini time limit with automatic backup model.

## App features (all in `index.html`)
- Identify from photo (needs signal) with details: what gives it away, about, what it was doing, track age, around Kotzebue, safety, fun fact
- Tap questions (offline): kind, toes or foot shape, size by hand comparison, trail pattern, habitat, plus month
- Save photo and identify later from the log
- Field guide: 30 local species with front/hind track drawings (SVG drawn in code), Iñupiaq names (to be checked locally), your own saved photos per species
- Trail patterns guide and how to measure; 10-question track quiz
- On-screen ruler calibrated with a bank card (3.37 in)
- Track age helper (track look, last snowfall, wind, temperature)
- Log stored on the phone: localStorage (`ktf-log`) plus photos in IndexedDB (`ktf` / `photos`); GPS saved with each find; map of finds via Leaflet 1.9.4 + OpenStreetMap (needs signal)
- Backup and export: CSV spreadsheet, full JSON backup with photos, restore
- Offline: `sw.js` caches the app; bump the `CACHE` version in `sw.js` when changing files so phones pick up updates

## Design
Snow white, deep spruce `#1d4a3e`, blaze orange `#e2561d`; Barlow Condensed headings, Inter text; light and dark themes. Phone-first, actions docked at the bottom.

## Ideas not done yet
- Shared map of everyone's finds
- Separate access codes per person; daily usage counts
- Check Iñupiaq names with a local elder or district language staff
- Measure real-world accuracy with known tracks and tune the Gemini prompt for common mix-ups (red vs arctic fox, wolf vs dog, ptarmigan species)
