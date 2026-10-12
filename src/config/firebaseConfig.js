// Firebase web configs are public identifiers (not secrets); access is enforced by Firestore rules.
const production = {
  apiKey: "AIzaSyCEtSN7OkVg2M9uB7-HPNNZf-UI23OpzhI",
  authDomain: "forseva-21d12.firebaseapp.com",
  projectId: "forseva-21d12",
  storageBucket: "forseva-21d12.firebasestorage.app",
  messagingSenderId: "137497887223",
  appId: "1:137497887223:web:218ce234523691e1c76ef2"
};

const staging = {
  apiKey: "AIzaSyB_uNZtOaPaX7sf8H_DlBCouuX622M2HxI",
  authDomain: "gitaforyouth-stg.firebaseapp.com",
  projectId: "gitaforyouth-stg",
  storageBucket: "gitaforyouth-stg.firebasestorage.app",
  messagingSenderId: "380604461588",
  appId: "1:380604461588:web:d129835e201178636cad01"
};

// Vite mode decides the environment: only `--mode staging` uses the staging project.
// Everything else (`npm run dev`, `npm run build`) uses production, as before.
// Both configs, for Node scripts (e.g. scripts/backfill-email-hints.mjs).
export const firebaseConfigs = { staging, production };

// Safety net: the website address decides the database, whatever version is loaded.
//  - the staging site always uses the staging database
//  - every other site (the live site and its addresses) always uses the live database
//  - only on this computer (or the local network, for phone testing) does the build mode decide
// So a version deployed to the wrong site can never send students to the wrong database.
const STAGING_SITES = ['gitaforyouth-stg.web.app', 'gitaforyouth-stg.firebaseapp.com'];
const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocal = !host || host === 'localhost' || host === '127.0.0.1'
  || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
const modeEnv = import.meta.env?.MODE === 'staging' ? 'staging' : 'production';

/** The database this address must use. */
export const expectedEnvForThisAddress = () => (STAGING_SITES.includes(host) ? 'staging' : isLocal ? modeEnv : 'production');

export const APP_ENV = expectedEnvForThisAddress();
export const firebaseConfig = APP_ENV === 'staging' ? staging : production;
