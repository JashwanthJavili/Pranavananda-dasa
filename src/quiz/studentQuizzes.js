// Weekly quizzes for the signed-in student (student portal). Firestore rules make sure a
// student can only read published quizzes, submit their own answers within the attempt
// limit and quiz window, and see correct answers only once their results are due.
import {
  collection, doc, getDoc, getDocs, query, where, limit, writeBatch, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  progressId, attemptId, scoreAnswers, countedAttempt, availability, toDate, cleanAnswers,
} from './quizModel';

const sortQuizzes = (list) =>
  [...list].sort((a, b) => (toDate(b.opensAt)?.getTime() || 0) - (toDate(a.opensAt)?.getTime() || 0));

export async function fetchPublishedQuizzes() {
  const snap = await getDocs(query(collection(db, 'portalQuizzes'), where('published', '==', true), limit(100)));
  return sortQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

/** { [quizId]: progress } for the signed-in student. */
export async function fetchMyQuizProgress(uid) {
  const snap = await getDocs(query(collection(db, 'quizProgress'), where('uid', '==', uid), limit(500)));
  const map = {};
  snap.docs.forEach((d) => { map[d.data().quizId] = { id: d.id, ...d.data() }; });
  return map;
}

export async function fetchMyAttempts(uid, quizId) {
  const snap = await getDocs(query(collection(db, 'quizAttempts'), where('uid', '==', uid), where('quizId', '==', quizId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.attemptNumber - b.attemptNumber);
}

/** True once the student may see scores and correct answers for this quiz. */
export function resultsDue(quiz, progress, now = new Date()) {
  if (!progress) return false;
  return Boolean(progress.finished) || progress.attempts >= (quiz.maxAttempts || 1) || availability(quiz, now) === 'closed';
}

/** The answer key, or null if results are not due yet (rules refuse it). */
export async function fetchQuizKey(quizId) {
  try {
    const snap = await getDoc(doc(db, 'portalQuizKeys', quizId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    if (err?.code === 'permission-denied') return null;
    throw err;
  }
}

/**
 * Load everything the results screen needs: attempts, the key, and each attempt's score.
 * Returns { attempts, key, counted } (key / counted are null while results are not due).
 */
export async function fetchMyResults(uid, quiz) {
  const [attempts, key] = await Promise.all([fetchMyAttempts(uid, quiz.id), fetchQuizKey(quiz.id)]);
  if (!key) return { attempts, key: null, counted: null };
  const scored = attempts.map((a) => ({ ...a, score: scoreAnswers(quiz.questions, a.answers, key.answers) }));
  return { attempts: scored, key, counted: countedAttempt(scored, quiz.scorePolicy) };
}

/**
 * Submit an attempt. The attempt and the progress counter are written together; the rules
 * refuse duplicates, extra attempts, closed or unpublished quizzes and anyone else's record.
 */
export async function submitQuizAttempt({ uid, registrationId, quiz, answers, progress, timeTakenSec }) {
  const n = (progress?.attempts || 0) + 1;
  const pid = progressId(quiz.id, registrationId);
  const finalAnswers = cleanAnswers(quiz.questions, answers);

  const batch = writeBatch(db);
  batch.set(doc(db, 'quizAttempts', attemptId(quiz.id, registrationId, n)), {
    quizId: quiz.id,
    registrationId,
    uid,
    attemptNumber: n,
    answers: finalAnswers,
    submittedAt: serverTimestamp(),
    ...(Number.isFinite(timeTakenSec) ? { timeTakenSec: Math.min(2592000, Math.max(0, Math.round(timeTakenSec))) } : {}),
  });
  if (n === 1) {
    batch.set(doc(db, 'quizProgress', pid), {
      quizId: quiz.id,
      registrationId,
      uid,
      attempts: 1,
      finished: false,
      firstSubmittedAt: serverTimestamp(),
      lastSubmittedAt: serverTimestamp(),
    });
  } else {
    batch.update(doc(db, 'quizProgress', pid), { attempts: n, lastSubmittedAt: serverTimestamp() });
  }
  await batch.commit();
  return n;
}

/** Give up remaining attempts to see the results now. */
export function finishQuizEarly(quizId, registrationId) {
  return updateDoc(doc(db, 'quizProgress', progressId(quizId, registrationId)), { finished: true });
}

// Answers in progress are kept on this device, so a refresh does not lose them.
const draftKey = (quizId, registrationId, n) => `gfy_quiz_draft_${quizId}_${registrationId}_${n}`;

export function loadAnswerDraft(quizId, registrationId, n) {
  try {
    return JSON.parse(localStorage.getItem(draftKey(quizId, registrationId, n)) || 'null') || {};
  } catch (e) {
    return {};
  }
}

export function saveAnswerDraft(quizId, registrationId, n, answers) {
  try {
    localStorage.setItem(draftKey(quizId, registrationId, n), JSON.stringify(answers));
  } catch (e) {}
}

export function clearAnswerDraft(quizId, registrationId, n) {
  try {
    localStorage.removeItem(draftKey(quizId, registrationId, n));
    localStorage.removeItem(timeKey(quizId, registrationId, n));
  } catch (e) {}
}

// Seconds spent on an attempt so far (the timer continues after "Save & exit").
const timeKey = (quizId, registrationId, n) => `gfy_quiz_time_${quizId}_${registrationId}_${n}`;

export function loadElapsed(quizId, registrationId, n) {
  try {
    const v = Number(localStorage.getItem(timeKey(quizId, registrationId, n)));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch (e) {
    return 0;
  }
}

export function saveElapsed(quizId, registrationId, n, seconds) {
  try {
    localStorage.setItem(timeKey(quizId, registrationId, n), String(Math.floor(seconds)));
  } catch (e) {}
}

/**
 * A submission was refused: find out why, so the student sees the real reason
 * (already submitted, closed, unpublished) instead of a guess.
 */
export async function explainSubmitFailure(err, { quiz, registrationId, n }) {
  if (err?.code !== 'permission-denied') return quizErrorMessage(err);
  const safe = 'Your answers are safe on this device.';
  try {
    const [attempt, progress, live] = await Promise.all([
      getDoc(doc(db, 'quizAttempts', attemptId(quiz.id, registrationId, n))).catch(() => null),
      getDoc(doc(db, 'quizProgress', progressId(quiz.id, registrationId))).catch(() => null),
      getDoc(doc(db, 'portalQuizzes', quiz.id)).catch(() => null),
    ]);
    if (attempt?.exists() || (progress?.exists() && progress.data().attempts >= n)) {
      return 'This attempt has already been submitted (perhaps from another tab or device). Please go back to the quizzes to see your status.';
    }
    if (progress?.exists() && progress.data().finished) return 'You have already finished this quiz. Please go back to see your results.';
    if (!live || !live.exists() || !live.data().published) return `This quiz is no longer available. ${safe}`;
    if (availability(live.data()) === 'closed') return `This quiz has closed, so new answers cannot be submitted. ${safe}`;
  } catch (e) { /* fall through */ }
  return `We could not submit your answers just now. ${safe} Please refresh the page and press Submit again.`;
}

export function quizErrorMessage(err) {
  if (err?.code === 'permission-denied') {
    return 'This quiz could not be submitted. It may have closed, or this attempt was already submitted. Please refresh to see your latest status.';
  }
  if (err?.code === 'unavailable' || err?.code === 'network-request-failed') {
    return 'Network error. Your answers are saved on this device, so please check your connection and try again.';
  }
  return 'Something went wrong. Your answers are saved on this device, so please try again.';
}
