// Registration numbers (BG26-100, BG26-101, ...) are given out once and never again.
//
// A deleted registration is only hidden, so its number stays taken. Each new number comes after
// both the highest recent registration and a stored high-water mark (meta/registrationCounter),
// and is claimed in one transaction with the counter, so two people never get the same number
// and an old number is never reused. When the latest number cannot be read, nothing is guessed:
// the registration fails and the student is asked to try again.
import { collection, doc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';

export const FIRST_REGISTRATION_NUMBER = 100;
const RECENT_TO_CHECK = 50;
const MAX_TRIES = 25;

/** 123 from "BG26-123", or NaN. */
export function registrationNumber(id) {
  const m = /^BG26-(\d+)$/i.exec(String(id || '').trim());
  return m ? parseInt(m[1], 10) : NaN;
}

export const registrationsCollection = (db) => collection(db, 'BhagavadGita', 'data', 'registrations');
export const registrationCounterRef = (db) => doc(db, 'BhagavadGita', 'data', 'meta', 'registrationCounter');

export class RegistrationNumberError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'RegistrationNumberError';
    this.cause = cause;
  }
}

/** The highest number among the most recent registrations, hidden (deleted) ones included. */
export async function latestRegistrationNumber(db) {
  const snap = await getDocs(query(registrationsCollection(db), orderBy('createdAt', 'desc'), limit(RECENT_TO_CHECK)));
  let max = FIRST_REGISTRATION_NUMBER - 1;
  snap.forEach((d) => {
    [registrationNumber(d.id), registrationNumber(d.data().registrationId)].forEach((n) => {
      if (n > max) max = n;
    });
  });
  return max;
}

/**
 * Save a new registration under the next unused number. Returns that registration ID.
 * Throws RegistrationNumberError when no number can be given out safely.
 */
export async function createRegistrationWithNewNumber(db, payload) {
  let floor;
  try {
    floor = await latestRegistrationNumber(db);
  } catch (err) {
    throw new RegistrationNumberError('Could not work out the next registration number.', err);
  }
  return runTransaction(db, async (tx) => {
    const counter = await tx.get(registrationCounterRef(db));
    const last = Number(counter.exists() ? counter.data().last : 0);
    let n = Math.max(floor, Number.isFinite(last) ? last : 0, FIRST_REGISTRATION_NUMBER - 1) + 1;
    for (let i = 0; i < MAX_TRIES; i += 1, n += 1) {
      const id = `BG26-${n}`;
      const ref = doc(registrationsCollection(db), id);
      if ((await tx.get(ref)).exists()) continue;
      tx.set(ref, { ...payload, registrationId: id });
      tx.set(registrationCounterRef(db), { last: n, updatedAt: serverTimestamp() }, { merge: true });
      return id;
    }
    throw new RegistrationNumberError('No free registration number was found.');
  }, { maxAttempts: 10 }); // several people registering at the same moment retry, not fail
}
