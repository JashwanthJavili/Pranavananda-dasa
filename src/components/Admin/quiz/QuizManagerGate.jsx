import React, { useEffect, useState } from 'react';
import { ShieldAlert, Loader2, RefreshCw, LogOut, KeyRound } from 'lucide-react';
import { quizManagerAuthError, getQuizLinkIssue, quizAccountEmail } from '../../../quiz/quizAdmin';

function Shell({ icon: Icon, tone = 'saffron', title, children }) {
  const toneCls = tone === 'red' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-saffron-50 border-saffron-200 text-saffron-700';
  return (
    <div className="max-w-md mx-auto bg-cream-50 rounded-3xl border border-cream-200 shadow-soft-md p-6 sm:p-7 space-y-4 text-left animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${toneCls}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-temple-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const btn = 'w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 cursor-pointer';

/**
 * Quiz access is linked automatically when a Super Admin logs in (same email + password).
 * This screen only appears while that is being set up, or if the email is not on the
 * quiz manager list.
 */
export default function QuizManagerGate({ manager, adminEmail, onLogout }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  // Linking runs right after login; give it a moment before showing the fallback.
  const [settling, setSettling] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setSettling(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await fn();
    } catch (err) {
      setError(quizManagerAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  if (manager.status === 'loading' || (manager.status === 'signed-out' && settling && !getQuizLinkIssue())) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-temple-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Setting up quiz access…
      </div>
    );
  }

  const messages = (
    <>
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      {info && <p className="text-xs text-emerald-700" role="status">{info}</p>}
    </>
  );

  if (manager.status === 'not-manager' || manager.status === 'error') {
    return (
      <Shell icon={ShieldAlert} tone="red" title={manager.status === 'error' ? 'Could not check quiz access' : 'Quiz access not enabled for this account'}>
        {manager.status === 'error' ? (
          <p className="text-sm text-temple-600">Please check your connection and try again.</p>
        ) : (
          <div className="text-sm text-temple-600 leading-relaxed space-y-2">
            <p>Quizzes can be managed by Super Admins only. <strong className="text-temple-900 break-all">{adminEmail}</strong> is not an active Super Admin.</p>
          </div>
        )}
        {messages}
        <button type="button" disabled={busy} onClick={() => run(() => manager.refresh())} className={`${btn} border border-cream-300 bg-white text-temple-800 font-medium`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Check again
        </button>
      </Shell>
    );
  }

  // Signed out: the automatic link did not happen in this session
  const issue = getQuizLinkIssue();
  if (issue === 'mismatch') {
    return (
      <Shell icon={KeyRound} title="Quiz access needs a quick fix">
        <p className="text-sm text-temple-600 leading-relaxed">
          Your quiz access was set up with an older admin password (for example, before your password was reset by another Super Admin).
          Please ask the project owner to remove the quiz access account <code className="font-mono text-xs break-all">{quizAccountEmail(adminEmail)}</code> in
          Firebase Console → Authentication, then log out and log in again.
        </p>
        {onLogout && (
          <button type="button" onClick={onLogout} className={`${btn} border border-cream-300 bg-white text-temple-800 font-medium`}>
            <LogOut className="w-4 h-4" /> Log out
          </button>
        )}
      </Shell>
    );
  }

  return (
    <Shell icon={KeyRound} title="Please log in again once">
      <p className="text-sm text-temple-600 leading-relaxed">
        {issue === 'weak'
          ? 'Quiz access needs an admin password of at least 6 characters. Please change your password (Password button at the top), then log out and log in again.'
          : 'Quiz access is set up automatically when you log in. This session started before that, so please log out and log in again. You will not need any extra password.'}
      </p>
      {onLogout && (
        <button type="button" onClick={onLogout} className={`${btn} bg-saffron-500 hover:bg-saffron-600 text-white`}>
          <LogOut className="w-4 h-4" /> Log out
        </button>
      )}
    </Shell>
  );
}
