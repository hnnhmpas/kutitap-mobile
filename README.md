# Kutitap Mobile

iPhone-optimised web app version of the Kutitap finance tracker (designed for iPhone 12 / 390×844, works on any phone browser).
Tabs: **Home** (dashboard), **Money** (income, utilities, expenses), **Loans**, **Savings**.
This is a separate project with its own Firebase database; the original tracker is untouched.

## Set up
1. Create a NEW Firebase project. Enable **Authentication > Email/Password** (add your one account, turn sign-up off) and **Firestore**.
2. Publish `firestore.rules` to Firestore (signed-in users only; you can lock it to your UID).
3. `cp .env.example .env` and fill in the web-app config values.
4. `npm install` then `npm run dev` (phone on same Wi-Fi: open the printed Network URL) or `npm run build` and deploy `dist/` (Firebase Hosting, Netlify, Vercel...).

## On the iPhone
Open the site in Safari > Share > **Add to Home Screen** for a full-screen app (no browser bars).

## Customise
`src/config.js`: your name, the fixed utility bills, loan categories.
Data lives in one Firestore doc: `financeTracker/user_data` (same keys as the original app).
