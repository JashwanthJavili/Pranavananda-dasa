import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, MailCheck, Hourglass } from 'lucide-react';
import { PortalCard, Heading, Notice, Field, TextInput, PasswordInput, PrimaryButton, LinkButton, MobileInput } from './ui';

/**
 * The verification link was opened on a different device/browser than the one that
 * requested it: ask for the registered email + mobile here so setup can continue.
 */
export function ConfirmLinkEmail({ onSubmit, onCancel, error, loading }) {
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  return (
    <div className="max-w-md mx-auto w-full animate-fadeIn">
      <PortalCard>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit({ email, mobile: mobile.replace(/\D/g, ''), countryCode }); }}
          className="space-y-4"
          noValidate
        >
          <Heading
            title="Confirm your details"
            subtitle="Looks like you opened the link on a different device. For your security, please enter the registered email this link was sent to and your registered mobile number."
          />
          <Field id="confirm-email" label="Registered email address">
            <TextInput id="confirm-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field id="confirm-link-mobile" label="Registered mobile number">
            <MobileInput id="confirm-link-mobile" countryCode={countryCode} onCountryCodeChange={setCountryCode} value={mobile} onChange={setMobile} />
          </Field>
          {error && <Notice type="error">{error}</Notice>}
          <PrimaryButton type="submit" loading={loading}>Verify and continue</PrimaryButton>
          <div className="text-center"><LinkButton onClick={onCancel}>Cancel</LinkButton></div>
        </form>
      </PortalCard>
    </div>
  );
}

/** Email is verified but we don't know which mobile to match (e.g. different device). */
export function ConfirmMobile({ email, onSubmit, onCancel, error, loading }) {
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  return (
    <div className="max-w-md mx-auto w-full animate-fadeIn">
      <PortalCard>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit({ mobile: mobile.replace(/\D/g, ''), countryCode }); }}
          className="space-y-4"
          noValidate
        >
          <Heading title="One more step" subtitle={`Your email ${email} is verified. Enter the mobile number you registered with to find your registration.`} />
          <Field id="confirm-mobile" label="Registered mobile number">
            <MobileInput id="confirm-mobile" countryCode={countryCode} onCountryCodeChange={setCountryCode} value={mobile} onChange={setMobile} />
          </Field>
          {error && <Notice type="error">{error}</Notice>}
          <PrimaryButton type="submit" loading={loading}>Continue</PrimaryButton>
          <div className="text-center"><LinkButton onClick={onCancel}>Cancel and sign out</LinkButton></div>
        </form>
      </PortalCard>
    </div>
  );
}

const passwordProblem = (pw) => {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use a mix of letters and numbers.';
  return '';
};

/** Final onboarding step: create the password used for future logins. */
export function CreatePassword({ email, onSubmit, onCancel, error, loading }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setLocalError(problem);
    if (password !== confirm) return setLocalError('The two passwords do not match.');
    setLocalError('');
    onSubmit(password);
  };

  return (
    <div className="max-w-md mx-auto w-full animate-fadeIn">
      <PortalCard>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <Heading title="Email verified" subtitle={`Create a password for ${email}. Next time, log in with your email or mobile number and this password.`} />
          <Field id="new-password" label="Create password" hint="At least 8 characters, with letters and numbers.">
            <PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
          </Field>
          <Field id="confirm-password" label="Confirm password">
            <PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
          </Field>
          {(localError || error) && <Notice type="error">{localError || error}</Notice>}
          <PrimaryButton type="submit" loading={loading}>
            <Lock className="w-4 h-4" />
            Create password and enter portal
          </PrimaryButton>
          <div className="text-center"><LinkButton onClick={onCancel}>Cancel and sign out</LinkButton></div>
        </form>
      </PortalCard>
    </div>
  );
}

const RESEND_SECONDS = 60;

/**
 * After setup: the account exists but the email is not verified yet. Checks by itself every
 * few seconds (and when the student comes back to this tab) and continues once it is.
 */
export function VerifyEmail({ email, onVerified, onResend, onCancel }) {
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Quietly look for the verification while this screen is open
  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && onVerified(true);
    const id = setInterval(tick, 5000);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, [onVerified]);

  const check = async () => {
    setChecking(true);
    setNotYet(false);
    const ok = await onVerified(false);
    if (!ok) setNotYet(true);
    setChecking(false);
  };

  const resend = async () => {
    setSending(true);
    setStatus(null);
    try {
      await onResend();
      setStatus({ type: 'success', text: 'A new verification email is on its way.' });
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setStatus({ type: 'error', text: err?.message || 'The email could not be sent. Please try again in a little while.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full animate-fadeIn">
      <PortalCard className="space-y-5 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-700 shadow-soft">
          <MailCheck className="w-8 h-8" />
        </div>
        <Heading
          title="Verify your email"
          subtitle={`We have sent a verification link to ${email}. Kindly open it and tap the link, then come back here. This page will continue by itself.`}
        />
        <Notice type="info">Can't find it? Please check your Spam or Promotions folder.</Notice>
        {notYet && (
          <p className="inline-flex items-center justify-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 animate-fadeIn" role="status">
            <Hourglass className="w-3.5 h-3.5 shrink-0 text-amber-600" /> Not verified yet. Kindly tap the link in your email.
          </p>
        )}
        {status && <Notice type={status.type}>{status.text}</Notice>}
        <PrimaryButton onClick={check} loading={checking}>I have verified my email</PrimaryButton>
        <div className="flex flex-col items-center gap-3">
          <LinkButton onClick={resend} disabled={sending || cooldown > 0}>
            {sending ? 'Sending…' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
          </LinkButton>
          <LinkButton onClick={onCancel} className="text-temple-500 hover:text-temple-700">Cancel and sign out</LinkButton>
        </div>
      </PortalCard>
    </div>
  );
}
