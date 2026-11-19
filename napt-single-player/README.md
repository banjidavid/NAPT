# NAPT 2.4 — Welcome screen, local profiles, optional cloud saving

NAPT is a responsive **single-player Name · Animal · Place · Thing** game. Complete the full **A–Z table**: four categories × 26 letters = 104 entries. Every online-verified answer scores five points, up to 520.

## Run the game

1. Install Node.js **20 or later**.
2. Extract the ZIP and open a terminal in `napt-single-player`.
3. Run `node server.js`.
4. Visit **http://localhost:3000**.
5. Enter a player name on the welcome screen, or select an existing local player.

No npm install is required for the base game. The verification server needs internet to query Wikidata and Free Dictionary API. Local answers save even when offline. Firebase cloud saving is **optional** and **not enabled by default**; see [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md).

## New in 2.4

- Welcome screen with a start button and player selection.
- Separate, browser-local saved games for different player names; switching profiles reloads the correct game.
- Preserves earlier 2.3 local progress when creating the very first player profile (best-effort migration).
- Optional Firebase Authentication email/password accounts and manually triggered Firestore **Save to cloud** / **Load from cloud** actions.
- Both cloud save and cloud load require confirmation. Cloud loading resets answers to **unverified** so old results do not automatically earn points. The player must check the answers again.
- Firestore rules template scoped to the authenticated user. **Deploy the rules** before using cloud saves.

## Gameplay retained from 2.3

- All letters A–Z and all four editable categories, in any order.
- Enter-key and per-answer check controls, plus Check All.
- Verified, invalid, and needs-review feedback with available source links.
- Responsive card-style mobile table, navy-and-mint interface, progress bar, score, letter search and filters.
- Category result breakdown, saved player dispute notes, dispute JSON export, progress JSON export and reset.

## Verification caveat

The validator relies on incomplete external datasets. It avoids claiming an unfamiliar name or place is false simply because it cannot find it. When uncertain it returns **Needs review**, worth zero points. Live API availability and some edge-case classifications still need evaluation before production. The 11 offline automated tests use controlled mock data.

## Development checks

```bash
node --test tests/*.test.js
node --check server.js
node --check cloud.js
```

## Production checklist

Configure Firebase only if using cloud saving; enable secure hosting (HTTPS), Firebase sign-in and deployed least-privilege Firestore rules. Test verification with real internet access and regional names, verify registration and email recovery, add privacy terms and production abuse protection, and complete mobile-browser testing. Multiplayer is intentionally out of scope for 2.4.
