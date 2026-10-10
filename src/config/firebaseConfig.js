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

// Vite mode decides the environment: only `vite build --mode production` uses production.
// `npm run dev` and `--mode staging` use staging, so local work can never touch production data.
export const APP_ENV = import.meta.env.MODE === 'production' ? 'production' : 'staging';
export const firebaseConfig = APP_ENV === 'production' ? production : staging;
