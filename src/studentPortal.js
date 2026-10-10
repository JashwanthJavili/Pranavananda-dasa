// Student Portal data layer: Firebase Auth (email link + password) and the
// account <-> registration link. Security is enforced by firestore.rules:
//   portalLinks/{registrationId}  one claim per registration, create-only
//   portalAccounts/{uid}          the student's own pointer to their registration
// A student can only claim a registration whose email equals their *verified*
// Firebase Auth email AND whose mobile number they supply correctly.
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, verifyAndGetWhatsAppAccess, emailHintKey } from './firebase';

const PENDING_KEY = 'gfy_portal_pending';
export const PORTAL_HASH = 'student-portal';

const cleanEmail = (email) => String(email || '').trim().toLowerCase();
const cleanMobile = (mobile) => String(mobile || '').replace(/\D/g, '').slice(-10);
const regRef = (id) => doc(db, 'BhagavadGita', 'data', 'registrations', id);

// ---------------------------------------------------------------------------
// Pending onboarding (survives the round trip through the email link)
// ---------------------------------------------------------------------------
export function getPendingOnboarding() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setPendingOnboarding(value) {
  try {
    if (value) localStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else localStorage.removeItem(PENDING_KEY);
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// Registration matching
// ---------------------------------------------------------------------------

/**
 * Find active registrations whose email AND mobile both match.
 * Returns the matching registrations sorted by registration ID (oldest first),
 * so duplicate records always resolve to the same one.
 */
/** Active registrations with this email, oldest registration ID first. */
async function findRegistrationsByEmail(email) {
  const e = cleanEmail(email);
  const col = collection(db, 'BhagavadGita', 'data', 'registrations');

  const snaps = await Promise.all([
    getDocs(query(col, where('emailLower', '==', e), limit(10))),
    getDocs(query(col, where('email', '==', e), limit(10))),
  ]);

  const seen = new Map();
  snaps.forEach((snap) => snap.docs.forEach((d) => seen.set(d.id, d)));

  return [...seen.values()]
    .filter((d) => !d.data().isDeleted)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

async function findMatchingRegistrations(email, mobile, countryCode) {
  const m = cleanMobile(mobile);
  return (await findRegistrationsByEmail(email)).filter((d) => {
    const data = d.data();
    return data.mobileNumberClean === m && (data.countryCode || '+91') === countryCode;
  });
}

/**
 * Step 1 of onboarding: confirm that the email + mobile belong to one registration,
 * and only then send the Firebase sign-in link to that registered email.
 * Returns { status: 'sent' | 'not_found' | 'already_setup' }.
 */
export async function startStudentVerification({ email, mobile, countryCode = '+91' }) {
  const e = cleanEmail(email);
  const matches = await findMatchingRegistrations(e, mobile, countryCode);
  if (matches.length === 0) return { status: 'not_found' };

  // portalLogins/{phone} exists once the student has finished setup and created a password.
  const login = await getDoc(doc(db, 'portalLogins', phoneKey(countryCode, mobile)));
  if (login.exists()) return { status: 'already_setup' };

  await sendVerificationLink(e);
  setPendingOnboarding({ email: e, mobile: cleanMobile(mobile), countryCode, sentAt: Date.now() });
  return { status: 'sent' };
}

/** (Re)send the Firebase email sign-in link. */
export async function sendVerificationLink(email) {
  await sendSignInLinkToEmail(auth, cleanEmail(email), {
    url: `${window.location.origin}/?portal=1`,
    handleCodeInApp: true,
  });
}

export function isVerificationLink(href = window.location.href) {
  return isSignInWithEmailLink(auth, href);
}

/** Step 2: the student clicked the link in their inbox. Signs them in with a verified email. */
// The link's code is single-use. If the page starts twice (React StrictMode in dev, a
// remount), share the first attempt instead of spending the code again and failing.
let linkCompletion = null;

export function completeVerificationLink(email, href = window.location.href) {
  if (linkCompletion?.href === href) return linkCompletion.promise;
  const promise = signInWithEmailLink(auth, cleanEmail(email), href).then((cred) => {
    // Remove the one-time code from the address bar.
    try {
      window.history.replaceState(null, '', `${window.location.pathname}#${PORTAL_HASH}`);
    } catch (e) {}
    return cred.user;
  });
  linkCompletion = { href, promise };
  // A failed attempt (e.g. wrong email typed) may be retried with the same link.
  promise.catch(() => { if (linkCompletion?.promise === promise) linkCompletion = null; });
  return promise;
}

// ---------------------------------------------------------------------------
// Account <-> registration link
// ---------------------------------------------------------------------------

/** The registration ID linked to this account, or null. */
export async function getLinkedRegistrationId(uid) {
  const snap = await getDoc(doc(db, 'portalAccounts', uid));
  return snap.exists() ? snap.data().registrationId : null;
}

/**
 * Step 3: link the signed-in (verified) account to the registration.
 * Firestore rules re-check the email, mobile and that the registration is unclaimed.
 * Returns { status: 'linked' | 'already_linked_self' | 'claimed_by_other' | 'not_found' }.
 */
export async function linkStudentAccount(user, { mobile, countryCode = '+91' }) {
  if (!user?.emailVerified) throw new Error('Email is not verified.');

  const existing = await getLinkedRegistrationId(user.uid);
  if (existing) {
    setPendingOnboarding(null);
    return { status: 'already_linked_self', registrationId: existing };
  }

  const matches = await findMatchingRegistrations(user.email, mobile, countryCode);
  if (matches.length === 0) return { status: 'not_found' };

  // Try each matching record (duplicates) until one is unclaimed.
  for (const match of matches) {
    const registrationId = match.id;
    const batch = writeBatch(db);
    batch.set(doc(db, 'portalLinks', registrationId), {
      uid: user.uid,
      email: cleanEmail(user.email),
      mobileClean: cleanMobile(mobile),
      countryCode,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'portalAccounts', user.uid), {
      registrationId,
      email: cleanEmail(user.email),
      createdAt: serverTimestamp(),
    });
    try {
      await batch.commit();
      setPendingOnboarding(null);
      return { status: 'linked', registrationId };
    } catch (err) {
      // permission-denied here means the registration is already claimed by another account.
      if (err?.code !== 'permission-denied') throw err;
    }
  }
  // Another tab of this same student may have linked it a moment ago.
  const linkedMeanwhile = await getLinkedRegistrationId(user.uid);
  if (linkedMeanwhile) {
    setPendingOnboarding(null);
    return { status: 'already_linked_self', registrationId: linkedMeanwhile };
  }
  return { status: 'claimed_by_other' };
}

/**
 * True once the student has created a password. Firebase reports email-link accounts
 * with the 'password' provider too, so this is tracked explicitly on the account.
 */
export async function hasCreatedPassword(user) {
  const snap = await getDoc(doc(db, 'portalAccounts', user.uid));
  return Boolean(snap.exists() && snap.data().passwordSetAt);
}

/** Step 4: create the password used for future email / mobile + password logins. */
export async function setStudentPassword(user, password) {
  await updatePassword(user, password);
  await updateDoc(doc(db, 'portalAccounts', user.uid), { passwordSetAt: serverTimestamp() });
  await saveMobileLogin(user, password).catch((err) => console.warn('Mobile login not saved:', err));
}

// ---------------------------------------------------------------------------
// Mobile number + password login
//
// Firebase passwords belong to the email, so a mobile login must first find the
// email. A public mobile -> email lookup would let anyone turn a phone number into
// an email address, so portalLogins/{+countrycode+mobile} stores the email
// ENCRYPTED with a key derived from the student's own password (PBKDF2 + AES-GCM).
// Only someone who knows the password can recover the email and then sign in.
// ---------------------------------------------------------------------------
const PBKDF2_ITERATIONS = 310000;
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const phoneKey = (countryCode, mobile) => `${countryCode || '+91'}${cleanMobile(mobile)}`;

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** (Re)write the encrypted mobile login for the signed-in student. Needs the plain password. */
export async function saveMobileLogin(user, password) {
  const account = await getDoc(doc(db, 'portalAccounts', user.uid));
  if (!account.exists()) return;
  const link = await getDoc(doc(db, 'portalLinks', account.data().registrationId));
  if (!link.exists()) return;
  const { countryCode, mobileClean } = link.data();

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(cleanEmail(user.email)));

  await setDoc(doc(db, 'portalLogins', `${countryCode}${mobileClean}`), {
    uid: user.uid,
    salt: toB64(salt),
    iv: toB64(iv),
    data: toB64(data),
    updatedAt: serverTimestamp(),
  });
}

/** Log in with mobile number + password. Throws auth-style errors for the UI. */
export async function studentMobileLogin(countryCode, mobile, password) {
  const snap = await getDoc(doc(db, 'portalLogins', phoneKey(countryCode, mobile)));
  if (!snap.exists()) {
    const err = new Error('No portal account for this mobile number.');
    err.code = 'portal/mobile-not-set-up';
    throw err;
  }
  const { salt, iv, data } = snap.data();
  let email;
  try {
    const key = await deriveKey(password, fromB64(salt));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(data));
    email = new TextDecoder().decode(plain);
  } catch (e) {
    // Wrong password (or the password was reset by email since the last login).
    const err = new Error('Incorrect mobile number or password.');
    err.code = 'auth/invalid-credential';
    throw err;
  }
  return studentPasswordLogin(email, password);
}

// ---------------------------------------------------------------------------
// Returning students
// ---------------------------------------------------------------------------
export async function studentPasswordLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, cleanEmail(email), password);
  // Keep the mobile login in step with the current password (e.g. after a reset by email).
  saveMobileLogin(cred.user, password).catch(() => {});
  return cred.user;
}

/**
 * Forgot password. Firebase hides whether an account exists (and sends nothing if it
 * doesn't), so first tell the student which case they are in.
 * Returns { status: 'sent' | 'no_registration' | 'setup_incomplete' }.
 */
export async function requestStudentPasswordReset({ email }) {
  const registrations = await findRegistrationsByEmail(email);
  if (registrations.length === 0) return { status: 'no_registration' };

  // portalLogins/{phone} is created when the student finishes first-time setup.
  const logins = await Promise.all(
    registrations.map((d) => {
      const r = d.data();
      return r.mobileNumberClean
        ? getDoc(doc(db, 'portalLogins', phoneKey(r.countryCode, r.mobileNumberClean)))
        : null;
    })
  );
  if (!logins.some((snap) => snap?.exists())) return { status: 'setup_incomplete' };

  await sendPasswordResetEmail(auth, cleanEmail(email), {
    url: `${window.location.origin}/?portal=1`,
  });
  return { status: 'sent' };
}

export const getCurrentStudent = () => auth.currentUser;

export function onStudentAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

export function studentLogout() {
  return signOut(auth);
}

// ---------------------------------------------------------------------------
// Portal data (only for the signed-in student's own registration)
// ---------------------------------------------------------------------------
export async function fetchMyProfile(user) {
  const registrationId = await getLinkedRegistrationId(user.uid);
  if (!registrationId) return null;
  const snap = await getDoc(regRef(registrationId));
  if (!snap.exists()) return null;
  const data = snap.data();
  // Never hand sensitive internals to the UI.
  const { passwordHash, password, authUid, ...safe } = data;
  return { ...safe, registrationId: data.registrationId || snap.id };
}

export async function fetchMyWhatsAppAccess(profile) {
  if (!profile) return { eligible: false };
  return verifyAndGetWhatsAppAccess({
    registrationId: profile.registrationId,
    sourceOfDiscovery: profile.sourceOfDiscovery,
  });
}

export async function fetchPublishedQuizzes() {
  const snap = await getDocs(query(collection(db, 'portalQuizzes'), where('published', '==', true), limit(50)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------------------------------------------------------------------------
// "Don't remember which email you used?" (first-time setup)
// ---------------------------------------------------------------------------

const LOOKUP_KEY = 'gfy_email_lookup';
const LOOKUP_MAX = 5;
const LOOKUP_WINDOW_MS = 15 * 60 * 1000;

/** Minutes until another lookup is allowed in this browser (0 = allowed now). */
function lookupWaitMinutes() {
  try {
    const { start = 0, count = 0 } = JSON.parse(localStorage.getItem(LOOKUP_KEY) || '{}');
    if (Date.now() - start > LOOKUP_WINDOW_MS) return 0;
    return count >= LOOKUP_MAX ? Math.ceil((start + LOOKUP_WINDOW_MS - Date.now()) / 60000) : 0;
  } catch (e) {
    return 0;
  }
}

function recordLookup() {
  try {
    const now = Date.now();
    const prev = JSON.parse(localStorage.getItem(LOOKUP_KEY) || '{}');
    const fresh = !prev.start || now - prev.start > LOOKUP_WINDOW_MS;
    localStorage.setItem(LOOKUP_KEY, JSON.stringify({ start: fresh ? now : prev.start, count: fresh ? 1 : (prev.count || 0) + 1 }));
  } catch (e) {}
}

/**
 * Find the registered email for a mobile number, already masked (from emailHints).
 * Returns { status: 'found', maskedEmail } | { status: 'not_found' } | { status: 'limited', minutes }.
 */
export async function findMaskedEmailByMobile(countryCode, mobile) {
  const minutes = lookupWaitMinutes();
  if (minutes > 0) return { status: 'limited', minutes };
  recordLookup();

  // Only the pre-masked hint is read; the full email never reaches the browser.
  const hint = await getDoc(doc(db, 'emailHints', emailHintKey(countryCode, cleanMobile(mobile))));
  if (!hint.exists() || !hint.data().maskedEmail) return { status: 'not_found' };
  return { status: 'found', maskedEmail: hint.data().maskedEmail };
}

/** Map Firebase Auth error codes to friendly messages. */
export function authErrorMessage(err) {
  switch (err?.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'portal/mobile-not-set-up':
      return 'No portal account uses this mobile number yet. Log in with your email, or use First-time setup.';
    case 'auth/quota-exceeded':
      return 'We are unable to send verification emails right now because today\'s limit has been reached. Please try again tomorrow, or contact the Gita for Youth team.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return 'This verification link has expired or was already used. Please request a new one.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 8 characters).';
    case 'auth/requires-recent-login':
      return 'For security, please verify your email again before setting a password.';
    case 'auth/operation-not-allowed':
      return 'Student sign-in is not enabled yet. Please contact the Gita for Youth team.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/unauthorized-continue-uri':
    case 'auth/unauthorized-domain':
      return 'This website is not authorised for sign-in yet. Please contact the Gita for Youth team.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
