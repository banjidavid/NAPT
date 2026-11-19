# Optional Firebase cloud saving for NAPT 2.4

Local player profiles, game progress, and online answer verification work WITHOUT Firebase.

1. Create a Firebase project in the Firebase Console (or use a project you own).
2. Under **Authentication > Sign-in method**, enable **Email/Password**.
3. Under **Firestore Database**, create a database in production mode, then deploy the contents of `firestore.rules` as the security rules. **Never** allow unrestricted reads or writes.
4. In **Project settings > General > Your apps**, register a web app and copy the provided `firebaseConfig` object into `firebase-config.js`, replacing `null`. Firebase Web API keys are public identifiers; don't include admin SDK keys, credentials or secrets.
5. In **Authentication > Settings > Authorized domains**, authorize the actual domain you will deploy to. For local testing, add `localhost` if it is not already available.
6. Start the Node server with `node server.js`; open `http://localhost:3000`. Open **Cloud save** on the toolbar, create an account, then use **Save to cloud**. On another device signed into the same Firebase account, use the same local player name and **Load from cloud**.

Cloud saving is manually initiated, not real-time sync. A load asks before replacing local answers. Loaded answers become **unverified** and must be checked again online so old scores are not trusted. Firestore security rules restrict each user to their own game documents. For a public production launch, consider stricter schema validation, abuse controls, email verification, account recovery, and a privacy policy.

The optional cloud client loads Firebase JavaScript modules from Google's CDN and needs an active internet connection. If Firebase is unavailable or unconfigured, game play and local saves still function.
