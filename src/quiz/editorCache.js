// Unsaved quiz-editor work, kept on this device so nothing is lost if the
// admin stops midway (closes the tab, loses the connection, logs out...).
// One entry per quiz ('new' for a quiz that was never saved).

const PREFIX = 'gfy_quiz_editor_v1_';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // forget copies older than 30 days

const keyFor = (quizId) => `${PREFIX}${quizId || 'new'}`;
const millis = (t) => (t?.toMillis ? t.toMillis() : t instanceof Date ? t.getTime() : null);

/** Save the draft. baseUpdatedAt: the quiz's updatedAt when editing began (to spot newer server edits). */
export function saveEditorCache(quizId, draft, baseUpdatedAt) {
  try {
    localStorage.setItem(keyFor(quizId), JSON.stringify({
      draft: {
        ...draft,
        opensAt: draft.opensAt ? draft.opensAt.toISOString() : null,
        closesAt: draft.closesAt ? draft.closesAt.toISOString() : null,
      },
      base: millis(baseUpdatedAt),
      savedAt: Date.now(),
    }));
    return true;
  } catch {
    return false; // storage full or blocked: editing still works
  }
}

/** Returns { draft, savedAt: Date, base } or null. */
export function loadEditorCache(quizId) {
  try {
    const raw = localStorage.getItem(keyFor(quizId));
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c?.draft || !Array.isArray(c.draft.questions) || Date.now() - c.savedAt > MAX_AGE_MS) {
      clearEditorCache(quizId);
      return null;
    }
    return {
      draft: {
        ...c.draft,
        opensAt: c.draft.opensAt ? new Date(c.draft.opensAt) : null,
        closesAt: c.draft.closesAt ? new Date(c.draft.closesAt) : null,
      },
      savedAt: new Date(c.savedAt),
      base: c.base ?? null,
    };
  } catch {
    return null;
  }
}

export function clearEditorCache(quizId) {
  try {
    localStorage.removeItem(keyFor(quizId));
  } catch { /* ignore */ }
}

export const hasEditorCache = (quizId) => Boolean(loadEditorCache(quizId));

/** True when the quiz was saved (from anywhere) after the cached copy was started. */
export const cacheIsStale = (cache, quiz) => Boolean(cache && quiz && cache.base && millis(quiz.updatedAt) && millis(quiz.updatedAt) > cache.base);
