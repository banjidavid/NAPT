# Host NAPT Single Player on Render

## Before you start

This package includes the game interface, Node.js answer-verification service, optional Firebase browser client, and Render configuration. The game works without Firebase; player progress is then saved only in the current browser/device.

## Step 1 — Upload to GitHub

1. Create a new GitHub repository named `napt-single-player`.
2. Extract this ZIP. Upload the **contents** of the `napt-single-player` folder (not the enclosing folder) to the repository root. Keep `server.js`, `index.html`, `validator.js`, `package.json`, and `render.yaml` at the repository root.
3. Commit the files. Never upload Firebase service-account keys, passwords or other private credentials.

## Step 2 — Deploy on Render

1. Visit https://dashboard.render.com/ and sign in.
2. Click **New > Web Service**, connect GitHub, then choose your `napt-single-player` repository.
3. Configure the service as:
   - Language/runtime: **Node**
   - Branch: **main** (or your repository's default branch)
   - Root directory: **leave blank** if the files are in the repo root
   - Build command: `echo "No build step required"`
   - Start command: `node server.js`
   - Instance type: Free (for an initial trial)
4. Deploy. Render sets the `PORT` environment variable automatically and assigns a public HTTPS `.onrender.com` URL. The `server.js` included in this package reads `process.env.PORT`.
5. Visit your public URL and test the game. Visit `https://YOUR-SERVICE.onrender.com/api/health` to check that the Node backend is up.

`render.yaml` also provides equivalent settings if you prefer Render Blueprint deployment.

## Step 3 — Smoke test

- Welcome screen loads in desktop and mobile browsers.
- Create a local player; enter Name, Animal, Place, Thing answers for A and B.
- Verify at least one obvious correct and one clearly wrong answer, checking for online verification responses.
- Reload; local progress remains on the same browser and device.
- Check score and results dashboard.
- Test an uncertain answer and the dispute form.
- In the Render dashboard, inspect logs for any server or external API errors.

## Optional Firebase account/cloud saving

`firebase-config.js` is **not configured**. The app will function without it, but cloud backups/accounts will not work until you follow `FIREBASE_SETUP.md` and publish the resulting config. After the public website is live, add the specific Render domain in Firebase Authentication authorized domains. Deploy user-scoped Firestore security rules before enabling cloud backup. Note that browser-local profiles are not authenticated accounts.

## Notes and limitations

- The validator uses external Wikidata and dictionary lookups; its classifications are not guaranteed accurate for every word or language. 'Needs review' remains worth zero until independently confirmed.
- Render Free web services may spin down after 15 minutes of inactivity; the first visit afterward may be slow.
- No server-side user database is included: local progress is stored on each browser, and dispute reports are exported locally.
- This is a public prototype, not a fully security-reviewed production launch; add monitoring, better abuse controls, end-to-end browser testing, and a privacy policy before promoting it widely.
