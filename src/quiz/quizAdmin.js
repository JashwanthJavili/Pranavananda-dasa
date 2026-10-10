// Quiz management for super admins.
//
// The admin dashboard login is not a Firebase Auth identity, so Firestore rules cannot
// trust it. Quiz managers therefore also sign in to Firebase Auth with a verified email
// that is listed in quizManagers/{email} (editable only in the Firebase Console).
// This uses its own named Firebase app, so the quiz-manager session never mixes with a
// student portal session in the same browser.
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updatePassword,
} from 'firebase/auth';
import {
  getFirestore, collection, doc, getDoc, getDocs, query, where, limit, writeBatch, updateDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { firebaseConfig } from '../config/firebaseConfig';
import { withEmulatorConfig, connectToEmulators } from '../config/emulators';
import { fromDraft, scoreAnswers, countedAttempt } from './quizModel';
import { clearAllEditorCaches, setEditorCacheEnabled } from './editorCache';

const APP_NAME = 'quiz-admin';
const existing = getApps().find((a) => a.name === APP_NAME);
const adminApp = existing || initializeApp(withEmulatorConfig(firebaseConfig), APP_NAME);
const adminAuth = getAuth(adminApp);
const adb = getFirestore(adminApp);
if (!existing) connectToEmulators(adminAuth, adb);

const cleanEmail = (e) => String(e || '').trim().toLowerCase();

/**
 * The quiz-access sign-in for a Super Admin: its own account named after the admin record
 * (e.g. testing_dev_com@gfy-quiz.invalid). It never clashes with a student portal account or
 * an older Firebase account on the real email. The .invalid domain never receives email.
 */
export const quizAccountEmail = (adminEmail) => `${cleanEmail(adminEmail).replace(/[^a-z0-9]/g, '_')}@gfy-quiz.invalid`;

// ---------------------------------------------------------------------------
// Quiz manager session
// ---------------------------------------------------------------------------

/**
 * Resolve a Firebase user to a manager state:
 * { status: 'signed-out' } | { status: 'unverified', user } | { status: 'not-manager', user } | { status: 'manager', user }
 */
async function resolveManager(user) {
  if (!user) return { status: 'signed-out' };
  try {
    // A read only quiz managers may make (active Super Admins, or the quizManagers list)
    await getDocs(query(collection(adb, 'portalQuizKeys'), limit(1)));
    return { status: 'manager', user };
  } catch (err) {
    if (err?.code === 'permission-denied') return { status: 'not-manager', user };
    return { status: 'error', user, error: err };
  }
}

export function onQuizManagerChanged(callback) {
  return onAuthStateChanged(adminAuth, async (user) => {
    const state = await resolveManager(user);
    if (state.status === 'manager') setEditorCacheEnabled(true);
    callback(state);
  });
}

export async function refreshQuizManager() {
  const user = adminAuth.currentUser;
  if (user) {
    await user.reload();
    await user.getIdToken(true);
  }
  return resolveManager(adminAuth.currentUser);
}

// Why the last automatic link failed (shown on the Quizzes tab), kept for this browser tab.
const LINK_ISSUE_KEY = 'gfy_quiz_link_issue';
export function getQuizLinkIssue() {
  try { return sessionStorage.getItem(LINK_ISSUE_KEY) || ''; } catch (e) { return ''; }
}
function setQuizLinkIssue(issue) {
  try {
    if (issue) sessionStorage.setItem(LINK_ISSUE_KEY, issue);
    else sessionStorage.removeItem(LINK_ISSUE_KEY);
  } catch (e) {}
}

/**
 * Called after a Super Admin logs in to the dashboard: signs the quiz-manager session in
 * with the same email + password, so there is no second password or verification step.
 * The first time, the Firebase account is created with that password.
 */
export async function linkQuizManagerSession(email, password) {
  if (!cleanEmail(email) || !password) return;
  const e = quizAccountEmail(email);
  const current = adminAuth.currentUser;
  if (current && cleanEmail(current.email) === e) {
    setQuizLinkIssue('');
    return;
  }
  if (current) await signOut(adminAuth);
  try {
    await signInWithEmailAndPassword(adminAuth, e, password);
    setQuizLinkIssue('');
    return;
  } catch (err) {
    if (!['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(err?.code)) {
      setQuizLinkIssue('error');
      throw err;
    }
  }
  try {
    await createUserWithEmailAndPassword(adminAuth, e, password);
    setQuizLinkIssue('');
  } catch (err) {
    // The account exists with a different password (e.g. the admin password was changed elsewhere)
    setQuizLinkIssue(err?.code === 'auth/email-already-in-use' ? 'mismatch' : err?.code === 'auth/weak-password' ? 'weak' : 'error');
    throw err;
  }
}

/** Keep the quiz-manager password in step when a Super Admin changes their admin password. */
export async function syncQuizManagerPassword(email, currentPassword, newPassword) {
  const e = quizAccountEmail(email);
  await signInWithEmailAndPassword(adminAuth, e, currentPassword);
  await updatePassword(adminAuth.currentUser, newPassword);
  setQuizLinkIssue('');
}

export const quizManagerSignOut = () => {
  setQuizLinkIssue('');
  // Nothing with answers or results stays in this browser after logging out
  clearTrackingCache();
  clearAllEditorCaches();
  return signOut(adminAuth);
};

/**
 * Firestore signed in as the Super Admin (null when not linked). Changes to Super Admin
 * records must go through it: the rules only accept them from a signed-in Super Admin.
 */
export const managerFirestore = () => (adminAuth.currentUser ? adb : null);

export function quizManagerAuthError(err) {
  switch (err?.code) {
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed': return 'Network error. Please check your connection and try again.';
    case 'auth/operation-not-allowed': return 'Email/password sign-in is not enabled for this Firebase project.';
    default: return 'Something went wrong. Please try again.';
  }
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

const toMillis = (v) => (v?.toMillis ? v.toMillis() : 0);

export async function listAllQuizzes() {
  const snap = await getDocs(collection(adb, 'portalQuizzes'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (Number(b.weekNumber) || 0) - (Number(a.weekNumber) || 0) || toMillis(b.createdAt) - toMillis(a.createdAt));
}

export async function getQuizKey(quizId) {
  const snap = await getDoc(doc(adb, 'portalQuizKeys', quizId));
  return snap.exists() ? snap.data() : { answers: {}, explanations: {} };
}

/**
 * Create or update a quiz and its answer key together.
 * `publish`: true publishes, false keeps / makes it a draft, undefined keeps the current state.
 * Returns the quiz ID.
 */
export async function saveQuiz({ existingQuiz, draft, publish }) {
  const me = cleanEmail(adminAuth.currentUser?.email);
  const { quiz, key } = fromDraft(draft);
  const ref = existingQuiz ? doc(adb, 'portalQuizzes', existingQuiz.id) : doc(collection(adb, 'portalQuizzes'));
  const published = publish === undefined ? Boolean(existingQuiz?.published) : publish;

  const batch = writeBatch(adb);
  batch.set(ref, {
    ...quiz,
    published,
    // First publish time; kept forever once set (the rules enforce this)
    publishedAt: existingQuiz?.publishedAt || (published ? serverTimestamp() : null),
    createdAt: existingQuiz ? existingQuiz.createdAt : serverTimestamp(),
    createdBy: existingQuiz ? existingQuiz.createdBy : me,
    updatedAt: serverTimestamp(),
    updatedBy: me,
  });
  batch.set(doc(adb, 'portalQuizKeys', ref.id), { ...key, updatedAt: serverTimestamp() });
  await batch.commit();
  return ref.id;
}

export function setQuizPublished(quiz, published) {
  return updateDoc(doc(adb, 'portalQuizzes', quiz.id), {
    published,
    publishedAt: quiz.publishedAt || (published ? serverTimestamp() : null),
    updatedAt: serverTimestamp(),
    updatedBy: cleanEmail(adminAuth.currentUser?.email),
  });
}

/** Only drafts that were never published can be deleted (the rules enforce this too). */
export async function deleteDraftQuiz(quizId) {
  const batch = writeBatch(adb);
  batch.delete(doc(adb, 'portalQuizKeys', quizId));
  batch.delete(doc(adb, 'portalQuizzes', quizId));
  await batch.commit();
}

// ---------------------------------------------------------------------------
// Tracking: per participant, per quiz
// ---------------------------------------------------------------------------

/**
 * For each quiz: { [registrationId]: { attempts, finished, firstSubmittedAt, lastSubmittedAt, score } }.
 * A participant missing from the map has Not Attempted, so publishing a quiz needs no writes
 * per participant. `score` follows the quiz's policy (best / latest attempt).
 */
// Tracking is cached in this browser (IndexedDB) and then only what changed is read:
// attempts are create-only and progress is never deleted, so "everything submitted since
// the newest record we have" keeps the cache complete. A full re-read happens once a day
// (or on request) to pick up anything else. The cache is wiped when the Super Admin logs out.
const IDB_NAME = 'gfy-quiz-admin';
const IDB_STORE = 'kv';
const TRACKING_KEY = `tracking_v1_${firebaseConfig.projectId}`;
const FULL_REFRESH_MS = 24 * 60 * 60 * 1000;

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  try {
    const dbh = await openIdb();
    return await new Promise((resolve) => {
      const r = dbh.transaction(IDB_STORE).objectStore(IDB_STORE).get(key);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function idbSet(key, value) {
  try {
    const dbh = await openIdb();
    await new Promise((resolve) => {
      const tx = dbh.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch (e) { /* the cache is optional */ }
}

export function clearTrackingCache() {
  try { indexedDB.deleteDatabase(IDB_NAME); } catch (e) { /* ignore */ }
}

const ms = (t) => (t?.toMillis ? t.toMillis() : 0);
const ts = (m) => (m ? Timestamp.fromMillis(m) : null);

/**
 * { tracking: { [quizId]: { [registrationId]: status } }, keys: { [quizId]: key } }
 * for the given (published) quizzes. A participant missing from a quiz has Not Attempted.
 *  force: re-read everything instead of only what changed
 */
export async function fetchQuizTracking(quizzes, { force = false } = {}) {
  const owner = adminAuth.currentUser?.uid || '';
  let cache = await idbGet(TRACKING_KEY);
  const full = force || !cache || cache.owner !== owner || Date.now() - (cache.fullAt || 0) > FULL_REFRESH_MS;
  if (full) cache = { owner, fullAt: Date.now(), since: 0, progress: {}, attempts: {} };

  const since = Timestamp.fromMillis(cache.since || 0);
  const [progressSnap, attemptSnap, keyList] = await Promise.all([
    getDocs(full ? collection(adb, 'quizProgress') : query(collection(adb, 'quizProgress'), where('lastSubmittedAt', '>=', since))),
    getDocs(full ? collection(adb, 'quizAttempts') : query(collection(adb, 'quizAttempts'), where('submittedAt', '>=', since))),
    Promise.all(quizzes.map((q) => getQuizKey(q.id))),
  ]);

  let newest = cache.since || 0;
  progressSnap.docs.forEach((d) => {
    const p = d.data();
    cache.progress[d.id] = {
      quizId: p.quizId, registrationId: p.registrationId, attempts: p.attempts, finished: Boolean(p.finished),
      first: ms(p.firstSubmittedAt), last: ms(p.lastSubmittedAt),
    };
    newest = Math.max(newest, ms(p.lastSubmittedAt));
  });
  attemptSnap.docs.forEach((d) => {
    const a = d.data();
    cache.attempts[d.id] = {
      quizId: a.quizId, registrationId: a.registrationId, n: a.attemptNumber, t: ms(a.submittedAt),
      answers: a.answers || {}, time: Number.isFinite(a.timeTakenSec) ? a.timeTakenSec : null,
    };
    newest = Math.max(newest, ms(a.submittedAt));
  });
  cache.since = newest;
  await idbSet(TRACKING_KEY, cache);

  // Build the per-quiz maps from the cache (scores always use the current answer keys)
  const keys = {};
  const tracking = {};
  const byQuiz = {};
  Object.values(cache.attempts).forEach((a) => {
    ((byQuiz[a.quizId] ||= {})[a.registrationId] ||= []).push(a);
  });
  quizzes.forEach((quiz, i) => {
    const key = keyList[i];
    keys[quiz.id] = key;
    const map = {};
    Object.values(cache.progress).filter((p) => p.quizId === quiz.id).forEach((p) => {
      const history = (byQuiz[quiz.id]?.[p.registrationId] || [])
        .map((a) => ({
          attemptNumber: a.n,
          submittedAt: ts(a.t),
          answers: a.answers,
          timeTakenSec: a.time,
          score: scoreAnswers(quiz.questions, a.answers, key.answers),
        }))
        .sort((x, y) => x.attemptNumber - y.attemptNumber);
      map[p.registrationId] = {
        attempts: p.attempts,
        finished: p.finished,
        firstSubmittedAt: ts(p.first),
        lastSubmittedAt: ts(p.last),
        history,
        score: countedAttempt(history, quiz.scorePolicy)?.score || null,
      };
    });
    tracking[quiz.id] = map;
  });
  return { tracking, keys, full };
}
