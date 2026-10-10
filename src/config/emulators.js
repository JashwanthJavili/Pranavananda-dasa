// Local testing only: `VITE_USE_EMULATORS=1` points the app at the Firebase Auth and
// Firestore emulators under the offline demo project, so no real project is touched.
// Normal dev and every build leave this off.
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

export const USE_EMULATORS = import.meta.env?.VITE_USE_EMULATORS === '1';
const AUTH_HOST = import.meta.env?.VITE_EMULATOR_AUTH || 'http://127.0.0.1:9199';
const FIRESTORE_PORT = Number(import.meta.env?.VITE_EMULATOR_FIRESTORE_PORT || 8180);

export function withEmulatorConfig(config) {
  return USE_EMULATORS ? { ...config, projectId: 'demo-gfy', authDomain: 'localhost' } : config;
}

export function connectToEmulators(auth, db) {
  if (!USE_EMULATORS) return;
  try {
    connectAuthEmulator(auth, AUTH_HOST, { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', FIRESTORE_PORT);
  } catch (e) {
    // Already connected (hot reload)
  }
}
