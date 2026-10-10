import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MailSearch, LifeBuoy } from 'lucide-react';
import { findMaskedEmailByMobile } from '../../studentPortal';
import { Field, Notice, PrimaryButton, MobileInput } from './ui';
import { mobileProblem } from '../../utils/mobile';
import { useOpenHelp } from './helpContext';

/**
 * "Don't remember which email you used?" — look the registration up by mobile number
 * and show the registered email partly hidden (e.g. ja••••••i7@gmail.com).
 */
export default function FindEmailModal({ open, onClose }) {
  const openHelp = useOpenHelp();
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const latest = useRef({ onClose, loading });
  latest.current = { onClose, loading };

  useEffect(() => {
    if (!open) return undefined;
    setMobile('');
    setResult(null);
    setError('');
    setLoading(false);
    const onKey = (e) => e.key === 'Escape' && !latest.current.loading && latest.current.onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const search = async (e) => {
    e.preventDefault();
    const digits = mobile.replace(/\D/g, '');
    if (mobileProblem(digits, countryCode)) return setError(mobileProblem(digits, countryCode));
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await findMaskedEmailByMobile(countryCode, digits);
      if (res.status === 'limited') setError(`Too many searches. Please try again in ${res.minutes} minute${res.minutes === 1 ? '' : 's'}.`);
      else setResult(res);
    } catch (err) {
      setError('Something went wrong while searching. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const raiseTicket = () => {
    const digits = mobile.replace(/\D/g, '');
    onClose();
    openHelp({
      category: 'Problem with first-time setup',
      countryCode,
      mobile: digits,
      message: 'I do not remember which email address I used when I registered. Kindly help me find it.',
    });
  };

  const HelpNote = () => (
    <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 space-y-3">
      <p className="text-xs sm:text-sm text-temple-700 leading-relaxed">
        <span className="font-semibold block">Hare Krishna 🙏</span>
        <span className="font-semibold block">Dear Devotee,</span>
        If you still do not remember your email, kindly send a request through <strong>Need help</strong>. Our team will help you.
      </p>
      <button
        type="button"
        onClick={raiseTicket}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-saffron-300 bg-white text-saffron-800 text-sm font-semibold hover:bg-saffron-50 cursor-pointer"
      >
        <LifeBuoy className="w-4 h-4" />
        Raise a request in Need help
      </button>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-temple-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 font-poppins"
      onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="find-email-title"
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-cream-50 rounded-t-3xl sm:rounded-3xl border border-cream-200 shadow-soft-lg outline-none animate-fadeIn"
      >
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-cream-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-700">
              <MailSearch className="w-5 h-5" />
            </div>
            <h2 id="find-email-title" className="font-display text-xl sm:text-2xl font-bold text-temple-900">Find your email</h2>
          </div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Close" className="p-2 rounded-full text-temple-500 hover:text-temple-900 hover:bg-cream-200 disabled:opacity-50 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={search} className="px-5 sm:px-6 py-5 space-y-4" noValidate>
          <p className="text-xs sm:text-sm text-temple-600 leading-relaxed">
            Enter the mobile number you registered with. We will show the email you used, partly hidden for your privacy.
          </p>
          <Field id="find-email-mobile" label="Registered mobile number">
            <MobileInput
              id="find-email-mobile"
              countryCode={countryCode}
              onCountryCodeChange={(c) => { setCountryCode(c); setResult(null); setError(''); }}
              value={mobile}
              onChange={(v) => { setMobile(v); setResult(null); setError(''); }}
            />
          </Field>

          {error && <Notice type="error">{error}</Notice>}

          {result?.status === 'found' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center space-y-1">
              <p className="text-xs text-temple-600">Your registered email is</p>
              <p className="text-base sm:text-lg font-bold tracking-wide text-temple-900 break-all">{result.maskedEmail}</p>
              <p className="text-[11px] text-temple-500">Type this email in full on the setup form to continue.</p>
            </div>
          )}
          {result?.status === 'not_found' && (
            <Notice type="error">We could not find a registration with this mobile number. Please check the number and country code.</Notice>
          )}
          {result?.status === 'no_email' && (
            <Notice type="error">Your registration does not have an email address saved.</Notice>
          )}

          {result?.status === 'found' ? (
            <PrimaryButton type="button" onClick={onClose}>Got it, back to setup</PrimaryButton>
          ) : (
            <PrimaryButton type="submit" loading={loading}>{loading ? 'Searching…' : 'Find my email'}</PrimaryButton>
          )}

          {result && <HelpNote />}
        </form>
      </div>
    </div>,
    document.body
  );
}
