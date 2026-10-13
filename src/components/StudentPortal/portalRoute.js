// Addresses inside the student portal, so a refresh, the back button or a shared link
// opens the same page:
//   #student-portal                                  dashboard
//   #student-portal/dashboard | /quizzes | /profile
//   #student-portal/quizzes/{quizId}/{step}          confirm | instructions | play | submitted | results
import { useCallback, useEffect, useState } from 'react';
import { PORTAL_HASH } from '../../studentPortal';

export const PORTAL_TABS = ['dashboard', 'quizzes', 'profile'];
export const QUIZ_STEPS = ['confirm', 'instructions', 'play', 'submitted', 'results'];
// Set to true to ask students to confirm their details before each quiz again.
export const ASK_CONFIRM_DETAILS = false;
export const FIRST_QUIZ_STEP = ASK_CONFIRM_DETAILS ? 'confirm' : 'instructions';

/** { tab, quizId, step } from a location hash (anything unknown falls back to the dashboard). */
export function parsePortalHash(hash = window.location.hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const parts = raw.split('/').map((p) => {
    try { return decodeURIComponent(p); } catch (e) { return p; }
  });
  if (parts[0].toLowerCase() !== PORTAL_HASH) return { tab: 'dashboard', quizId: null, step: null };
  const tab = PORTAL_TABS.includes((parts[1] || '').toLowerCase()) ? parts[1].toLowerCase() : 'dashboard';
  if (tab !== 'quizzes' || !parts[2]) return { tab, quizId: null, step: null };
  const step = QUIZ_STEPS.includes((parts[3] || '').toLowerCase()) ? parts[3].toLowerCase() : FIRST_QUIZ_STEP;
  return { tab, quizId: parts[2], step };
}

// Signed-out links straight to one screen: #student-portal/login or #student-portal/create-account
export const AUTH_HASH = { login: 'login', setup: 'create-account' };

/** Which signed-out screen the address asks for: 'setup' (Create Your Account) or 'login'. */
export function authModeFromHash(hash = window.location.hash) {
  const part = String(hash || '').replace(/^#/, '').split('/')[1] || '';
  return part.toLowerCase() === AUTH_HASH.setup ? 'setup' : 'login';
}

/** The hash for a route, e.g. portalHash('quizzes', 'abc', 'results'). */
export function portalHash(tab = 'dashboard', quizId = null, step = null) {
  if (tab === 'dashboard' && !quizId) return `#${PORTAL_HASH}`;
  const path = [PORTAL_HASH, tab];
  if (tab === 'quizzes' && quizId) path.push(encodeURIComponent(quizId), step || FIRST_QUIZ_STEP);
  return `#${path.join('/')}`;
}

/**
 * The current portal route and navigate(tab, quizId?, step?, { replace }).
 * New pages are added to the browser history (so Back works); `replace` swaps the current
 * entry instead (e.g. after submitting, Back should not return to the quiz being answered).
 */
export function usePortalRoute() {
  const [route, setRoute] = useState(() => parsePortalHash());

  useEffect(() => {
    const onChange = () => setRoute(parsePortalHash());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);

  const navigate = useCallback((tab, quizId = null, step = null, { replace = false } = {}) => {
    const next = portalHash(tab, quizId, step);
    if (window.location.hash !== next) {
      try {
        // pushState / replaceState do not fire hashchange, so the state is set directly
        window.history[replace ? 'replaceState' : 'pushState'](null, '', `${window.location.pathname}${window.location.search}${next}`);
      } catch (e) {
        window.location.hash = next;
      }
    }
    setRoute(parsePortalHash(next));
  }, []);

  return [route, navigate];
}
