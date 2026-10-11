import React, { useEffect, useRef, useState } from 'react';
import { applyActionCode } from 'firebase/auth';
import { AlertTriangle } from 'lucide-react';
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

// Applied once even if React starts the page twice (the code is single-use)
let applying = null;
const applyOnce = (code) => (applying ||= applyActionCode(auth, code));

export default function EmailAction() {
  const action = useRef(emailActionFromUrl()).current;
  const [state, setState] = useState('working'); // working | failed (success goes straight on)

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
          const ch = new BroadcastChannel('gfy-student-portal');
          ch.postMessage('verified');
          ch.close();
        } catch (e) {}
        // Straight on to the portal: the dashboard when signed in on this browser, else login
        openPortal();
      })
      .catch(async () => {
        // Used already (e.g. opened twice) but the email is verified: still a success
        await auth.currentUser?.reload().catch(() => {});
        if (auth.currentUser?.emailVerified) openPortal();
        else setState('failed');
      });
  }, [action]);

  const forwarding = action && FIREBASE_MODES.includes(action.mode);

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins text-temple-900">
      <header className="bg-cream-50/90 border-b border-gold-200/70 shadow-soft">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-[72px] flex items-center">
          <BrandLogo />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full animate-fadeIn">
          <PortalCard className="space-y-5 text-center">
            {state === 'working' || forwarding ? (
              <div className="py-6 flex flex-col items-center gap-3 text-temple-600">
                <Spinner className="w-7 h-7 text-saffron-600" />
                <p className="text-sm">{forwarding ? 'Opening…' : 'Verifying your email…'}</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-soft">
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
              </>
            )}
          </PortalCard>
        </div>
      </main>
    </div>
  );
}
