// Optional 1–5 star ratings students give a quiz after submitting it.
//   quizRatings/{quizId}_{registrationId}   one per student per quiz (they may change it)
//   quizFeedback/{quizId}_{registrationId}  their written suggestion (asked for 4 stars or fewer)
// Firestore rules let only the signed-in student write their own rating, and only for a
// quiz they have attempted. Ratings hold nothing private, and every admin can read them.
// Suggestions are free text, so only Super Admins (and the student) can read those.
import { collection, doc, getDoc, getDocs, limit, query, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { progressId } from './quizModel';

export const RATING_LABELS = ['', 'Not helpful', 'Could be better', 'Good', 'Very good', 'Excellent'];

/** The student's rating for a quiz (1–5), or 0 if they have not rated it. */
export async function fetchMyRating(quizId, registrationId) {
  try {
    const snap = await getDoc(doc(db, 'quizRatings', progressId(quizId, registrationId)));
    return snap.exists() ? snap.data().rating || 0 : 0;
  } catch (e) {
    return 0;
  }
}

export async function saveQuizRating({ quiz, registrationId, rating }) {
  const value = Math.round(Number(rating));
  if (!(value >= 1 && value <= 5)) throw new Error('Please choose between 1 and 5 stars.');
  await setDoc(doc(db, 'quizRatings', progressId(quiz.id, registrationId)), {
    quizId: quiz.id,
    registrationId,
    // Copied so admins without quiz access can tell which quiz was rated (rules check they match)
    quizTitle: quiz.title,
    weekNumber: Number.isInteger(quiz.weekNumber) ? quiz.weekNumber : null,
    rating: value,
    ratedAt: serverTimestamp(),
  });
  return value;
}

export const FEEDBACK_MAX = 1000;
/** Ratings at or below this also ask "how can we improve?". */
export const ASK_FEEDBACK_AT = 4;

/** The student's own suggestion for a quiz ('' if none). */
export async function fetchMyFeedback(quizId, registrationId) {
  try {
    const snap = await getDoc(doc(db, 'quizFeedback', progressId(quizId, registrationId)));
    return snap.exists() ? snap.data().comment || '' : '';
  } catch (e) {
    return '';
  }
}

export async function saveQuizFeedback({ quiz, registrationId, comment }) {
  const text = String(comment || '').replace(/[<>]/g, '').trim().slice(0, FEEDBACK_MAX);
  if (!text) throw new Error('Please write a few words.');
  await setDoc(doc(db, 'quizFeedback', progressId(quiz.id, registrationId)), {
    quizId: quiz.id,
    registrationId,
    comment: text,
    updatedAt: serverTimestamp(),
  });
  return text;
}

/** { [registrationId]: comment } for one quiz, or for all quizzes { [quizId_registrationId]: comment }. Super Admins only. */
export async function fetchQuizFeedback(store, quizId = null) {
  const col = collection(store, 'quizFeedback');
  const snap = await getDocs(quizId ? query(col, where('quizId', '==', quizId), limit(10000)) : query(col, limit(10000)));
  return Object.fromEntries(snap.docs.map((d) => [quizId ? d.data().registrationId : d.id, d.data().comment || '']));
}

/** Every rating (admin dashboard), newest first. */
export async function fetchAllQuizRatings() {
  const snap = await getDocs(query(collection(db, 'quizRatings'), limit(10000)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.ratedAt?.toMillis?.() || 0) - (a.ratedAt?.toMillis?.() || 0));
}

/** { [registrationId]: rating } for one quiz (for its Excel export). */
export async function fetchQuizRatings(quizId) {
  const snap = await getDocs(query(collection(db, 'quizRatings'), where('quizId', '==', quizId), limit(10000)));
  return Object.fromEntries(snap.docs.map((d) => [d.data().registrationId, d.data().rating]).filter(([, r]) => r >= 1 && r <= 5));
}

/** { [quizId]: { quizId, title, weekNumber, count, average, counts: [_,1★..5★], ratings } } */
export function summarizeRatings(ratings) {
  const byQuiz = {};
  ratings.forEach((r) => {
    const s = byQuiz[r.quizId] || (byQuiz[r.quizId] = {
      quizId: r.quizId, title: r.quizTitle, weekNumber: r.weekNumber, count: 0, total: 0, counts: [0, 0, 0, 0, 0, 0], ratings: [],
    });
    if (!(r.rating >= 1 && r.rating <= 5)) return;
    s.count += 1;
    s.total += r.rating;
    s.counts[r.rating] += 1;
    s.ratings.push(r);
  });
  Object.values(byQuiz).forEach((s) => { s.average = s.count ? Math.round((s.total / s.count) * 10) / 10 : 0; });
  return byQuiz;
}
