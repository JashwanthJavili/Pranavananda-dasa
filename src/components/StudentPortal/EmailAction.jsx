import React, { useEffect, useRef, useState } from 'react';
import { applyActionCode } from 'firebase/auth';
import { AlertTriangle, Check } from 'lucide-react';
import { auth } from '../../firebase';
import { PORTAL_HASH } from '../../studentPortal';
import BrandLogo from '../BrandLogo';
import { PortalCard, PrimaryButton, Spinner } from './ui';

// Firebase email links come here once the project's "action URL" (Firebase console ->
// Authentication -> Templates) points at this site. "Verify your email" is finished here, in
// the portal's own look; the other link types still use Firebase's page.
const OWN_MODES = ['verifyEmail'];
const FIREBASE_MODES = ['resetPassword', 'recoverEmail', 'verifyAndChangeEmail', 'revertSecondFactorAddition'];
// Read once by the portal: shows "Email verified" on the dashboard (or the login page)
export const JUST_VERIFIED_KEY = 'gfy-email-verified';

/** The email action in this page's address, or null. */
export function emailActionFromUrl() {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search);
  const mode = p.get('mode');
  const code = p.get('oobCode');
  if (!code || ![...OWN_MODES, ...FIREBASE_MODES].includes(mode)) return null;
  return { mode, code };
}

const portalUrl = () => `${window.location.origin}/#${PORTAL_HASH}`;
const openPortal = () => {
  try { sessionStorage.setItem(JUST_VERIFIED_KEY, '1'); } catch (e) {}
  window.location.replace(portalUrl());
};

const CHANNEL = 'gfy-student-portal';

// Applied once even if React starts the page twice (the code is single-use)
let applying = null;
const applyOnce = (code) => (applying ||= applyActionCode(auth, code));

export default function EmailAction() {
  const action = useRef(emailActionFromUrl()).current;
  const [state, setState] = useState('working'); // working | done | failed

  useEffect(() => {
    if (!action) return;
    if (FIREBASE_MODES.includes(action.mode)) {
      // Password reset etc.: Firebase's own page handles these
      window.location.replace(`https://${auth.config.authDomain}/__/auth/action${window.location.search}`);
      return;
    }
    applyOnce(action.code)
      .then(async () => {
        // Same browser as the setup: refresh the sign-in and tell the setup tab to continue
        const user = auth.currentUser;
        if (user) {
          await user.reload().catch(() => {});
          await user.getIdToken(true).catch(() => {});
        }
        try {
          const ch = new BroadcastChannel(CHANNEL);
          ch.postMessage('verified');
          ch.close();
        } catch (e) {}
        setState('done');
      })
      .catch(async () => {
        // Used already (e.g. opened twice) but the email is verified: still a success
        await auth.currentUser?.reload().catch(() => {});
        if (auth.currentUser?.emailVerified) {
          setState('done');
        } else setState('failed');
      });
  }, [action]);

  const forwarding = action && FIREBASE_MODES.includes(action.mode);

  // Continue: only closes this tab, so the student is back on the setup tab. Browsers do not
  // let every tab close itself (e.g. inside an email app): then just say so.
  const [closeBlocked, setCloseBlocked] = useState(false);
  const onContinue = () => {
    window.close();
    setTimeout(() => setCloseBlocked(true), 300);
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins text-temple-900">
      <header className="bg-cream-50/90 border-b border-gold-200/70 shadow-soft">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-[72px] flex items-center">
          <BrandLogo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-sm w-full animate-fadeIn">
          {state === 'working' || forwarding ? (
            <div className="flex flex-col items-center gap-3 text-temple-600">
              <Spinner className="w-8 h-8 text-saffron-600" />
              <p className="text-sm">{forwarding ? 'Opening…' : 'Verifying your email…'}</p>
            </div>
          ) : state === 'done' ? (
            <section className="rounded-3xl bg-cream-50 border border-gold-200/80 shadow-soft-lg overflow-hidden text-center">
              <div className="bg-gradient-to-b from-emerald-50 to-cream-50 px-6 pt-8 pb-5">
                <div className="relative w-20 h-20 mx-auto">
                  <span aria-hidden className="absolute inset-0 rounded-full bg-emerald-200/60 animate-ping [animation-iteration-count:2]" />
                  <span className="relative w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-soft-md ring-8 ring-emerald-100">
                    <Check className="w-10 h-10" strokeWidth={3} />
                  </span>
                </div>
                <p className="mt-5 text-[11px] font-semibold tracking-[0.18em] uppercase text-emerald-700">Email verified</p>
                <h1 className="mt-1 font-display text-3xl font-bold text-temple-900 leading-tight">Verification completed</h1>
              </div>
              <div className="px-6 pb-7 space-y-4">
                <p className="text-sm text-temple-600 leading-relaxed">
                  Hare Krishna 🙏 Thank you. Your Gita for Youth account is ready.
                </p>
                {closeBlocked ? (
                  <p className="text-sm font-medium text-temple-700">You can close this tab now.</p>
                ) : (
                  <PrimaryButton type="button" onClick={onContinue}>Continue</PrimaryButton>
                )}
              </div>
            </section>
          ) : (
            <PortalCard className="space-y-5 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-bold text-temple-900">This link has expired</h1>
                <p className="text-sm text-temple-600">
                  It may be old or already used. Kindly open the student portal and log in; if your email still needs
                  verifying, you can send a new link from there.
                </p>
              </div>
              <PrimaryButton type="button" onClick={() => window.location.replace(portalUrl())}>
                Go to the student portal
              </PrimaryButton>
            </PortalCard>
          )}
        </div>
      </main>

      <footer className="border-t border-cream-200 bg-cream-50/50 py-5 text-center text-xs space-y-0.5">
        <p className="font-medium text-temple-700">&copy; 2026 Pranavananda Das</p>
        <p className="text-temple-500">Built with devotion for spreading Krishna consciousness</p>
      </footer>
    </div>
  );
}
