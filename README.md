# Kotzebue Track Finder

A phone app for identifying animal and bird tracks on trails around Kotzebue, Alaska.

- **Identify from a photo** (needs signal): the photo goes to a small server (`api/`) that asks Claude to identify the track and describe the animal.
- **Answer a few taps** (works offline): picture questions narrow it down to the most likely local animals.
- **Save photo, check later**: with no signal, save the photo and identify it from the log when back in signal.
- **Field guide** and **on-screen ruler**, both offline.

Add it to your phone's home screen and it works offline.

## Photo server (`api/`)
Runs on Render as a Node web service (root directory `api`, start command `node server.js`).
Environment variables: `GEMINI_API_KEY` (free, from aistudio.google.com) or `ANTHROPIC_API_KEY`, `APP_CODE` (required, the access code the app asks for), `MODEL` (optional).
