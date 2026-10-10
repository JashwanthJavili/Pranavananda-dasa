import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutDashboard, BookOpen, User, LogOut, Home, CheckCircle2, LifeBuoy } from 'lucide-react';
import BrandLogo from '../BrandLogo';
import {
  onStudentAuthChanged,
  getCurrentStudent,
  isVerificationLink,
  completeVerificationLink,
  getPendingOnboarding,
  getLinkedRegistrationId,
  linkStudentAccount,
  hasCreatedPassword,
  setPendingOnboarding,
  setStudentPassword,
  studentLogout,
  fetchMyProfile,
  fetchMyWhatsAppAccess,
  fetchPublishedQuizzes,
  authErrorMessage,
} from '../../studentPortal';
import PortalAuth from './PortalAuth';
import HelpModal from './HelpModal';
import { OpenHelpContext } from './helpContext';
import { mobileProblem } from '../../utils/mobile';
import { ConfirmLinkEmail, ConfirmMobile, CreatePassword } from './Onboarding';
import { DashboardView, QuizzesView, ProfileView } from './PortalViews';
import { FullScreenLoader, Notice, PortalCard, PrimaryButton } from './ui';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'quizzes', label: 'Quizzes', Icon: BookOpen },
  { key: 'profile', label: 'Profile', Icon: User },
];

const NOT_FOUND_MSG =
  "We couldn't match your verified email and mobile number to a registration. Please use the exact details you registered with, or contact the Gita for Youth team.";
const CLAIMED_MSG =
  'This registration is already linked to another student account. If this is your registration, please contact the Gita for Youth team.';

/**
 * Stages:
 *  loading | signed-out | confirm-link-email | confirm-mobile | create-password | portal
 *  | verified-elsewhere | continued-elsewhere | error
 *
 * Only one tab creates the password: a tab that reaches create-password posts 'claim',
 * and any other tab on create-password steps aside (continued-elsewhere).
 */

// Lets the tab opened from the email link hand the flow back to the tab that requested it.
const CHANNEL_NAME = 'gfy-student-portal';
const openChannel = () => (typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null);
export default function StudentPortal({ onBackToHome }) {
  const [stage, setStage] = useState('loading');
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState(null); // notice shown on the signed-out screen
  const [stepError, setStepError] = useState('');
  const [busy, setBusy] = useState(false);
  const resolving = useRef(false);
  const openedFromLink = useRef(isVerificationLink()); // read before the URL is cleaned
  const channel = useRef(null);
  const handedOffStage = useRef(null);

  /** Ask whether another portal tab of this browser (the one that sent the email) is open. */
  const isOtherTabOpen = useCallback(() => new Promise((resolve) => {
    const ch = channel.current;
    if (!ch) return resolve(false);
    const timer = setTimeout(() => { ch.removeEventListener('message', onPong); resolve(false); }, 600);
    function onPong(e) {
      if (e.data !== 'pong') return;
      clearTimeout(timer);
      ch.removeEventListener('message', onPong);
      resolve(true);
    }
    ch.addEventListener('message', onPong);
    ch.postMessage('ping');
  }), []);

  const signOutWith = useCallback(async (msg) => {
    setMessage(msg ? { type: 'error', text: msg } : null);
    await studentLogout().catch(() => {});
    setStage('signed-out');
  }, []);

  /** Decide what a signed-in user needs next: link the registration, set a password, or the portal. */
  const resolveUser = useCallback(async (u, linkDetails) => {
    if (resolving.current) return;
    resolving.current = true;
    setStepError('');
    try {
      if (!u.emailVerified) {
        await signOutWith('Please verify your email first: use "First-time setup" with your registered mobile number and email.');
        return;
      }

      let linked = await getLinkedRegistrationId(u.uid);
      if (!linked) {
        const pending = getPendingOnboarding();
        const details = linkDetails || (pending && pending.email === u.email?.toLowerCase() ? pending : null);
        if (!details) {
          setStage('confirm-mobile');
          return;
        }
        const res = await linkStudentAccount(u, details);
        if (res.status === 'not_found') {
          if (linkDetails) {
            setStepError(NOT_FOUND_MSG);
            setStage('confirm-mobile');
          } else {
            await signOutWith(NOT_FOUND_MSG);
          }
          return;
        }
        if (res.status === 'claimed_by_other') {
          await signOutWith(CLAIMED_MSG);
          return;
        }
        linked = res.registrationId;
      }
      // Setup is done for this browser; never show "Check your email" again.
      setPendingOnboarding(null);

      const next = (await hasCreatedPassword(u)) ? 'portal' : 'create-password';

      // Opened from the email while the original tab is still open: continue over there.
      if (openedFromLink.current && next === 'create-password' && (await isOtherTabOpen())) {
        openedFromLink.current = false;
        handedOffStage.current = next;
        channel.current?.postMessage('verified');
        setStage('verified-elsewhere');
        return;
      }
      openedFromLink.current = false;
      setStage(next);
    } catch (err) {
      console.warn('Student portal resolve error:', err);
      setStepError('We could not load your account right now. Please check your connection and try again.');
      setStage('error');
    } finally {
      resolving.current = false;
    }
  }, [signOutWith, isOtherTabOpen]);

  // Verification often finishes in another tab or on the phone. When this tab is shown
  // again (switching back, or Back restoring it from history), pick up the signed-in user.
  const stageRef = useRef(stage);
  stageRef.current = stage;
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === 'hidden') return;
      const u = getCurrentStudent();
      if (u && stageRef.current === 'signed-out') {
        setUser(u);
        resolveUser(u);
      }
    };
    window.addEventListener('focus', recheck);
    window.addEventListener('pageshow', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.removeEventListener('focus', recheck);
      window.removeEventListener('pageshow', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [resolveUser]);

  // Talk to other portal tabs: answer "are you open?", and continue when told the email is verified.
  useEffect(() => {
    const ch = openChannel();
    channel.current = ch;
    if (!ch) return undefined;
    ch.onmessage = (e) => {
      if (e.data === 'ping' && !openedFromLink.current) ch.postMessage('pong');
      if (e.data === 'claim' && stageRef.current === 'create-password') setStage('continued-elsewhere');
      if (e.data === 'password-set' && ['create-password', 'continued-elsewhere', 'verified-elsewhere'].includes(stageRef.current)) {
        setStage('portal');
      }
      if (e.data === 'verified') {
        const u = getCurrentStudent();
        // If auth has not synced to this tab yet, onAuthStateChanged continues the flow.
        if (u) {
          setUser(u);
          resolveUser(u);
        }
      }
    };
    return () => {
      ch.close();
      channel.current = null;
    };
  }, [resolveUser]);

  // This tab is now the one creating the password: tell the others to step aside.
  useEffect(() => {
    if (stage === 'create-password') channel.current?.postMessage('claim');
  }, [stage]);

  // Complete a verification link (if this page was opened from one), then follow auth state.
  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;

    const start = async () => {
      if (isVerificationLink()) {
        const pending = getPendingOnboarding();
        if (!pending?.email) {
          setStage('confirm-link-email');
        } else {
          try {
            await completeVerificationLink(pending.email);
          } catch (err) {
            setMessage({ type: 'error', text: authErrorMessage(err) });
          }
        }
      }
      if (cancelled) return;
      unsub = onStudentAuthChanged((u) => {
        setUser(u);
        if (u) resolveUser(u);
        else setStage((s) => (s === 'confirm-link-email' ? s : 'signed-out'));
      });
    };
    start();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [resolveUser]);

  // Link opened on a different device/browser: ask for the registered email + mobile here.
  const handleConfirmLinkEmail = async ({ email, mobile, countryCode }) => {
    if (mobileProblem(mobile, countryCode)) {
      setStepError(mobileProblem(mobile, countryCode));
      return;
    }
    setBusy(true);
    setStepError('');
    try {
      setPendingOnboarding({ email: email.trim().toLowerCase(), mobile, countryCode, sentAt: Date.now() });
      await completeVerificationLink(email);
      // onAuthStateChanged continues the flow.
    } catch (err) {
      setStepError(
        err?.code === 'auth/invalid-email'
          ? 'That email does not match this verification link.'
          : authErrorMessage(err)
      );
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmMobile = async (details) => {
    if (mobileProblem(details.mobile, details.countryCode)) {
      setStepError(mobileProblem(details.mobile, details.countryCode));
      return;
    }
    setBusy(true);
    await resolveUser(user, details);
    setBusy(false);
  };

  const handleCreatePassword = async (password) => {
    setBusy(true);
    setStepError('');
    try {
      await setStudentPassword(user, password);
      channel.current?.postMessage('password-set');
      setStage('portal');
    } catch (err) {
      if (err?.code === 'auth/requires-recent-login') {
        await signOutWith('For your security, please request a new verification email to finish setting up your account.');
      } else {
        setStepError(authErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  let content;
  if (stage === 'loading') content = <FullScreenLoader label="Opening your portal…" />;
  else if (stage === 'signed-out') content = <PortalAuth initialMessage={message} />;
  else if (stage === 'confirm-link-email')
    content = <ConfirmLinkEmail onSubmit={handleConfirmLinkEmail} onCancel={() => signOutWith(null)} error={stepError} loading={busy} />;
  else if (stage === 'confirm-mobile')
    content = <ConfirmMobile email={user?.email} onSubmit={handleConfirmMobile} onCancel={() => signOutWith(null)} error={stepError} loading={busy} />;
  else if (stage === 'create-password')
    content = <CreatePassword email={user?.email} onSubmit={handleCreatePassword} onCancel={() => signOutWith(null)} error={stepError} loading={busy} />;
  else if (stage === 'verified-elsewhere')
    content = (
      <div className="max-w-md mx-auto w-full animate-fadeIn">
        <PortalCard className="space-y-5 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-soft">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-temple-900">✅ Email verified!</h2>
            <p className="text-sm text-temple-600">Please go back to your previous tab to continue.</p>
          </div>
          <button
            type="button"
            onClick={() => setStage(handedOffStage.current || 'create-password')}
            className="text-xs sm:text-sm font-medium text-saffron-700 hover:text-saffron-800 hover:underline underline-offset-4 cursor-pointer"
          >
            or continue here →
          </button>
        </PortalCard>
      </div>
    );
  else if (stage === 'continued-elsewhere')
    content = (
      <div className="max-w-md mx-auto w-full animate-fadeIn">
        <PortalCard className="space-y-5 text-center">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-temple-900">Continuing in your other tab</h2>
            <p className="text-sm text-temple-600">You chose to create your password in the other tab. You can close this tab.</p>
          </div>
          <button
            type="button"
            onClick={() => setStage('create-password')}
            className="text-xs sm:text-sm font-medium text-saffron-700 hover:text-saffron-800 hover:underline underline-offset-4 cursor-pointer"
          >
            Continue here instead →
          </button>
        </PortalCard>
      </div>
    );
  else if (stage === 'error')
    content = (
      <div className="max-w-md mx-auto w-full">
        <PortalCard className="space-y-4">
          <Notice type="error">{stepError}</Notice>
          <PrimaryButton onClick={() => (user ? resolveUser(user) : setStage('signed-out'))}>Try again</PrimaryButton>
        </PortalCard>
      </div>
    );
  else content = null;

  if (stage === 'portal' && user) {
    return <PortalHome user={user} onLogout={() => signOutWith(null)} onBackToHome={onBackToHome} />;
  }

  return (
    <PortalFrame onBackToHome={onBackToHome}>
      <div className="flex-1 flex flex-col justify-start sm:justify-center py-6 sm:py-10 px-4">{content}</div>
    </PortalFrame>
  );
}

// True on narrow phones, where the header needs a slightly smaller title to fit.
function useNarrowScreen(maxWidth = 400) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return narrow;
}

function PortalFrame({ children, onBackToHome, right, helpPrefill }) {
  const narrow = useNarrowScreen();
  const small = useNarrowScreen(370);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpExtra, setHelpExtra] = useState(null); // e.g. a pre-chosen category from a screen
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const openHelp = useCallback((extra) => {
    setHelpExtra(extra && typeof extra === 'object' && !extra.nativeEvent ? extra : null);
    setHelpOpen(true);
  }, []);
  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins text-temple-900 selection:bg-saffron-100 selection:text-saffron-900 overflow-x-hidden">
      <header className="sticky top-0 z-30 bg-cream-50/90 backdrop-blur-md border-b border-gold-200/70 shadow-soft">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-[72px] flex items-center justify-between gap-2">
          <BrandLogo fontScale={small ? 0.9 : narrow ? 1 : 1.3} />
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openHelp()}
              aria-label="Need help?"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full shrink-0 border border-saffron-200 bg-saffron-50 hover:bg-saffron-100 text-saffron-800 font-medium text-xs sm:text-sm whitespace-nowrap shadow-soft cursor-pointer"
            >
              <LifeBuoy className="hidden sm:block w-4 h-4 shrink-0" />
              <span>Need help?</span>
            </button>
            {right}
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                aria-label="Home"
                className="inline-flex items-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full border border-cream-300 bg-white hover:bg-cream-100 text-temple-700 font-medium text-xs sm:text-sm shadow-soft cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <OpenHelpContext.Provider value={openHelp}>{children}</OpenHelpContext.Provider>
      <HelpModal open={helpOpen} onClose={closeHelp} prefill={{ ...helpPrefill, ...helpExtra }} />
    </div>
  );
}

function PortalHome({ user, onLogout, onBackToHome }) {
  const [tab, setTab] = useState('dashboard');
  const [profile, setProfile] = useState(undefined);
  const [whatsapp, setWhatsapp] = useState(undefined);
  const [quizzes, setQuizzes] = useState(undefined);
  const [quizError, setQuizError] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchMyProfile(user)
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        fetchMyWhatsAppAccess(p).then((w) => alive && setWhatsapp(w)).catch(() => alive && setWhatsapp(null));
      })
      .catch(() => alive && setProfile(null));
    fetchPublishedQuizzes()
      .then((q) => alive && setQuizzes(q))
      .catch(() => {
        if (!alive) return;
        setQuizzes([]);
        setQuizError('Quizzes could not be loaded right now.');
      });
    return () => { alive = false; };
  }, [user]);

  const open = (key) => {
    setTab(key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const logoutButton = (
    <button
      type="button"
      onClick={() => setConfirmLogout(true)}
      className="inline-flex items-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full bg-temple-900 hover:bg-temple-800 text-cream-50 font-medium text-xs sm:text-sm shadow-soft cursor-pointer"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Log out</span>
    </button>
  );

  return (
    <PortalFrame
      onBackToHome={onBackToHome}
      right={logoutButton}
      helpPrefill={{
        name: profile?.fullName || '',
        email: profile?.email || user.email || '',
        mobile: profile?.mobileNumberClean || '',
        countryCode: profile?.countryCode || '+91',
        registrationId: profile?.registrationId || '',
      }}
    >
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-28 sm:pb-12 flex-1">
        {/* Desktop tabs */}
        <nav className="hidden sm:flex gap-1 p-1 mb-6 rounded-2xl bg-cream-200/70 border border-cream-300/70 w-fit">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => open(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                tab === key ? 'bg-white text-saffron-700 shadow-soft' : 'text-temple-600 hover:text-temple-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        {profile === undefined ? (
          <FullScreenLoader label="Loading your details…" />
        ) : profile === null ? (
          <div className="max-w-md mx-auto">
            <Notice type="error">
              We couldn't load your registration details. Please try again later, or contact the Gita for Youth team.
            </Notice>
          </div>
        ) : tab === 'dashboard' ? (
          <DashboardView profile={profile} whatsapp={whatsapp} quizzes={quizzes} onOpen={open} />
        ) : tab === 'quizzes' ? (
          <QuizzesView quizzes={quizzes} error={quizError} />
        ) : (
          <ProfileView profile={profile} />
        )}
      </div>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-cream-50/95 backdrop-blur-md border-t border-gold-200/70 grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => open(key)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium cursor-pointer ${
              tab === key ? 'text-saffron-700' : 'text-temple-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </nav>

      {confirmLogout && (
        <div className="fixed inset-0 z-50 bg-temple-900/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xs bg-cream-50 rounded-3xl p-6 text-center space-y-4 shadow-soft-lg border border-cream-200">
            <h3 className="font-display text-2xl font-bold">Log out?</h3>
            <p className="text-sm text-temple-600">You can log back in any time with your email and password.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmLogout(false)} className="w-1/2 py-2.5 rounded-xl border border-cream-300 bg-white text-sm font-medium cursor-pointer">
                Stay
              </button>
              <button type="button" onClick={onLogout} className="w-1/2 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold cursor-pointer">
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalFrame>
  );
}
