# Progress — Workout Tracker

A small, dependency-free progressive-overload PWA designed for iPhone.

## What it does

- Push / Pull / Legs workouts with the supplied starting weights and reps.
- Dumbbell movements use an 8–12 progression and add 5 lb **per dumbbell** after 3×12.
- Most barbell / EZ-bar movements use 8–10 and add 5 lb **total** after 3×10.
- Romanian deadlifts use 6–8 and add 5 lb total after 3×8.
- Bar exercises show total weight plus the plates required on **each side**.
- The reverse-fly / EZ-bar-shrug slot alternates each completed Pull session.
- Ski machine and planks are manual time-based progressions.
- Every rep change and every completed exercise is written to local storage immediately.
- A workout progress bar tracks logged exercises, and completed exercises can be reviewed and updated without duplicating their history entries.
- Each exercise has an illustration beside its counter; tap it to view a larger reference image.
- The chart icon opens a separate Progress view for weight, total reps, or timed-set progress. The line connects logged workouts; skipped days create no point.
- Add or edit a past exercise result with its actual date. You can choose whether a latest backfilled result updates the next workout target.
- Finishing the last exercise keeps the completed workout in view until you explicitly start the next session.
- PWA/service worker support allows the app to run offline after the first successful load.
- Export/import a JSON backup and export workout history as CSV.

## Important first setting

The app defaults the EZ bar to **25 lb** because EZ bars vary. Open Settings and change the EZ-bar weight to the actual weight of your bar. All EZ-bar totals update automatically.

## Run locally on your Mac

From this folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your Mac browser.

To test from your iPhone on the same Wi‑Fi network, use your Mac's local IP address, for example `http://192.168.1.20:8080`. iPhone PWA installation/offline behavior is best tested from an HTTPS deployment rather than a local HTTP address.

## Free hosting: GitHub Pages

1. Create a new GitHub repository, e.g. `progress-workout`.
2. Upload all files/folders in this project to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. GitHub will show the public HTTPS URL after deployment.

No database or server is required. Your workout data stays in browser storage on each device, not in GitHub.

## Install on iPhone

1. Open the deployed HTTPS URL in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Open the new **Progress** icon from your Home Screen.

It launches as a standalone app and works offline after it has loaded successfully at least once.

## Data / backup model

Your data lives in `localStorage` under the deployed site's web origin. That means:

- Every button tap saves immediately.
- Closing or crashing the app should not lose completed work or rep edits already tapped in.
- If you clear Safari/site data, change to a different domain, or lose the device, local-only data can be lost.
- Use **Settings → Export backup** periodically. The JSON file can be stored in iCloud Drive and imported later.
- Use **History → Export CSV** for a spreadsheet-friendly history.

## Plate assumptions

Plate calculations use common pairs of 45, 25, 10, 5 and 2.5 lb plates. The app shows the required plates **per side**.
