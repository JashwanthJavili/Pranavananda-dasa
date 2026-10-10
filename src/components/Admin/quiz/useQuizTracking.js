import { useCallback, useEffect, useRef, useState } from 'react';
import { listAllQuizzes, fetchQuizTracking } from '../../../quiz/quizAdmin';

/**
 * All quizzes (drafts included) plus, for every quiz that has ever been published,
 * { [registrationId]: status } — a participant missing from it has Not Attempted.
 * Loaded only while signed in as a quiz manager.
 */
export default function useQuizTracking(enabled) {
  const [state, setState] = useState({ quizzes: null, tracking: {}, loading: false, error: '', loadedAt: null });
  const seq = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const mine = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const quizzes = await listAllQuizzes();
      const tracking = await fetchQuizTracking(quizzes.filter((q) => q.publishedAt));
      if (mine === seq.current) setState({ quizzes, tracking, loading: false, error: '', loadedAt: new Date() });
    } catch (err) {
      console.warn('Quiz tracking could not be loaded:', err?.code || err);
      if (mine === seq.current) setState((s) => ({ ...s, loading: false, error: 'Quiz data could not be loaded. Please try again.' }));
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) reload();
    else setState({ quizzes: null, tracking: {}, loading: false, error: '', loadedAt: null });
  }, [enabled, reload]);

  return { ...state, reload };
}
