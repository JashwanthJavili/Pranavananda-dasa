import React from 'react';
import { UserPlus } from 'lucide-react';
import { LinkButton, PrimaryButton } from './ui';
import { useOpenHelp } from './helpContext';

/** Leave the portal for the registration form (drops ?portal=1 so a refresh stays there). */
export function goToRegistration() {
  try {
    window.history.replaceState(null, '', window.location.pathname);
  } catch (e) {}
  window.location.hash = 'register';
  window.scrollTo({ top: 0 });
}

const WHAT = {
  email: 'this email address',
  mobile: 'this mobile number',
  both: 'this mobile number or email address',
};

/**
 * Shown when the details a student entered do not belong to any registration:
 * a gentle pointer to the registration form, and to Need help if they did register.
 *  what: 'email' | 'mobile' | 'both' · onNavigate(): called before leaving (e.g. close a modal)
 */
export default function NotRegistered({ what = 'both', onNavigate, helpPrefill }) {
  const openHelp = useOpenHelp();
  return (
    <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 sm:p-5 space-y-4 text-left" role="status">
      <div className="space-y-1">
        <h3 className="font-semibold text-temple-900 leading-snug">
          Hare Krishna 🙏
        </h3>
        <p className="text-xs sm:text-sm text-temple-600 leading-relaxed">
          We couldn't find your registration. Please check your mobile number and email address.
        </p>
        <p className="text-xs sm:text-sm text-temple-600 leading-relaxed">
          If you haven't registered for Gita for Youth yet, please register first and then create your account.
        </p>
      </div>
      <PrimaryButton type="button" onClick={() => { onNavigate?.(); goToRegistration(); }}>
        <UserPlus className="w-4 h-4" />
        Register for Gita for Youth
      </PrimaryButton>
      <p className="text-xs text-temple-600 text-center leading-relaxed">
        Already registered? Please check your details or click{' '}
        <LinkButton
          className="!text-xs"
          onClick={() => {
            onNavigate?.();
            openHelp({ category: 'Problem with first-time setup', ...helpPrefill });
          }}
        >
          Need Help
        </LinkButton>
        {' '}for assistance.
      </p>
    </div>
  );
}
