import { useCallback, useEffect, useState } from 'react';
import { onQuizManagerChanged, refreshQuizManager, quizManagerSignOut, isQuizAccountOf } from '../../../quiz/quizAdmin';

/**
 * The quiz-manager Firebase session, linked automatically when a Super Admin logs in:
 * { status: 'loading' | 'signed-out' | 'not-manager' | 'manager' | 'error', user? }, plus refresh().
 * A session that belongs to a different admin than the one logged in is signed out.
 */
export default function useQuizManager(enabled = true, adminEmail = '') {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'signed-out' });
  const me = String(adminEmail || '').trim().toLowerCase();

  useEffect(() => {
    if (!enabled) return undefined;
    return onQuizManagerChanged((next) => {
      if (next.user && me && !isQuizAccountOf(me, next.user.email)) {
        quizManagerSignOut();
        return;
      }
      setState(next);
    });
  }, [enabled, me]);

  const refresh = useCallback(async () => {
    const next = await refreshQuizManager();
    setState(next);
    return next;
  }, []);

  return { ...state, isManager: state.status === 'manager', refresh, setState };
}
