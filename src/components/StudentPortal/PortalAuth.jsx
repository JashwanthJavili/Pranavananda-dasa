import React, { useEffect, useState } from 'react';
import { MailCheck, KeyRound, UserPlus } from 'lucide-react';
import CountryCodeSelector from '../Registration/CountryCodeSelector';
import {
  startStudentVerification,
  sendVerificationLink,
  studentPasswordLogin,
  studentMobileLogin,
  sendStudentPasswordReset,
  getPendingOnboarding,
  authErrorMessage,
} from '../../studentPortal';
import {
  PortalCard, Heading, Notice, Field, TextInput, PasswordInput, PrimaryButton, LinkButton,
} from './ui';

const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Signed-out screens: returning-student login, first-time setup, "check your email",
 * and forgot password. `initialMessage` shows a notice passed down from the portal.
 */
export default function PortalAuth({ initialMessage }) {
  const pending = getPendingOnboarding();
  const [mode, setMode] = useState(pending && Date.now() - pending.sentAt < 60 * 60 * 1000 ? 'sent' : 'login');
  const [notice, setNotice] = useState(initialMessage || null);

  const switchTo = (next) => {
    setNotice(null);
    setMode(next);
  };

  return (
    <div className="max-w-md mx-auto w-full animate-fadeIn">
      <PortalCard className="space-y-6">
        {mode !== 'sent' && mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-cream-200/70 border border-cream-300/70">
            {[
              { key: 'login', label: 'Log in', Icon: KeyRound },
              { key: 'setup', label: 'First-time setup', Icon: UserPlus },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => switchTo(key)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
                  mode === key ? 'bg-white text-saffron-700 shadow-soft' : 'text-temple-600 hover:text-temple-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {notice && <Notice type={notice.type}>{notice.text}</Notice>}

        {mode === 'login' && <LoginForm onForgot={() => switchTo('forgot')} onSetup={() => switchTo('setup')} />}
        {mode === 'setup' && <SetupForm onSent={() => switchTo('sent')} />}
        {mode === 'sent' && <CheckEmail onStartOver={() => switchTo('setup')} />}
        {mode === 'forgot' && <ForgotPassword onBack={() => switchTo('login')} />}
      </PortalCard>
    </div>
  );
}

function LoginForm({ onForgot, onSetup }) {
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const digits = mobile.replace(/\D/g, '');
    if (method === 'email' ? !EMAIL_RE.test(email.trim()) : digits.length < 6) {
      setError(method === 'email' ? 'Please enter your email address.' : 'Please enter your mobile number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (method === 'email') await studentPasswordLogin(email, password);
      else await studentMobileLogin(countryCode, digits, password);
      // The portal reacts to the auth state change.
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Heading title="Welcome back" subtitle="Log in to your Gita for Youth student portal." />
      <div className="flex gap-4 text-xs sm:text-sm" role="radiogroup" aria-label="Log in with">
        {[['email', 'Email'], ['mobile', 'Mobile number']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={method === key}
            onClick={() => { setMethod(key); setError(''); }}
            className={`pb-1 border-b-2 font-medium transition cursor-pointer ${
              method === key ? 'border-saffron-500 text-saffron-700' : 'border-transparent text-temple-500 hover:text-temple-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {method === 'email' ? (
        <Field id="login-email" label="Email address">
          <TextInput id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
      ) : (
        <Field id="login-mobile" label="Mobile number">
          <div className="flex gap-2 items-center">
            <CountryCodeSelector value={countryCode} onChange={setCountryCode} />
            <TextInput
              id="login-mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/[^\d\s]/g, ''))}
              placeholder="Mobile number"
              className="flex-1"
            />
          </div>
        </Field>
      )}
      <Field id="login-password" label="Password">
        <PasswordInput id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
      </Field>
      {error && <Notice type="error">{error}</Notice>}
      <PrimaryButton type="submit" loading={loading}>Log in</PrimaryButton>
      <div className="flex items-center justify-between gap-2">
        <LinkButton onClick={onForgot}>Forgot password?</LinkButton>
        <LinkButton onClick={onSetup}>First time here?</LinkButton>
      </div>
    </form>
  );
}

function SetupForm({ onSent }) {
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const digits = mobile.replace(/\D/g, '');
    if (digits.length < 6) return setError('Please enter your registered mobile number.');
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter your registered email address.');

    setLoading(true);
    setError('');
    try {
      const res = await startStudentVerification({ email, mobile: digits, countryCode });
      if (res.status === 'sent') onSent();
      else setError("We couldn't find a registration with this mobile number and email together. Please use the exact details you registered with.");
    } catch (err) {
      setError(err?.code?.startsWith('auth/') ? authErrorMessage(err) : 'Something went wrong while checking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Heading
        title="Set up your account"
        subtitle="Already registered for Gita for Youth? Enter the mobile number and email you registered with. We'll send a verification link to that email."
      />
      <Field id="setup-mobile" label="Registered mobile number">
        <div className="flex gap-2 items-center">
          <CountryCodeSelector value={countryCode} onChange={(c) => { setCountryCode(c); setError(''); }} />
          <TextInput
            id="setup-mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={mobile}
            onChange={(e) => { setMobile(e.target.value.replace(/[^\d\s]/g, '')); setError(''); }}
            placeholder="Mobile number"
            className="flex-1"
          />
        </div>
      </Field>
      <Field id="setup-email" label="Registered email address">
        <TextInput id="setup-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" />
      </Field>
      {error && <Notice type="error">{error}</Notice>}
      <PrimaryButton type="submit" loading={loading}>Send verification email</PrimaryButton>
    </form>
  );
}

function CheckEmail({ onStartOver }) {
  const pending = getPendingOnboarding();
  const [cooldown, setCooldown] = useState(() => {
    const elapsed = pending ? Math.floor((Date.now() - pending.sentAt) / 1000) : RESEND_COOLDOWN_SECONDS;
    return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);
  });
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    if (!pending) return onStartOver();
    setSending(true);
    setStatus(null);
    try {
      await sendVerificationLink(pending.email);
      setStatus({ type: 'success', text: 'A new verification email is on its way.' });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setStatus({ type: 'error', text: authErrorMessage(err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-700 shadow-soft">
        <MailCheck className="w-8 h-8" />
      </div>
      <Heading
        title="Check your email"
        subtitle={
          pending
            ? `We've sent a verification link to ${pending.email}. Open it on this device to continue setting up your account.`
            : 'Open the verification link we emailed you to continue.'
        }
      />
      <Notice type="info">The link expires after a while. Can't find it? Check your Spam or Promotions folder.</Notice>
      {status && <Notice type={status.type}>{status.text}</Notice>}
      <div className="flex flex-col items-center gap-3">
        <LinkButton onClick={resend} disabled={sending || cooldown > 0}>
          {sending ? 'Sending…' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
        </LinkButton>
        <LinkButton onClick={onStartOver} className="text-temple-500 hover:text-temple-700">Use different details</LinkButton>
      </div>
    </div>
  );
}

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setStatus({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await sendStudentPasswordReset(email);
    } catch (err) {
      if (err?.code !== 'auth/user-not-found') {
        setStatus({ type: 'error', text: authErrorMessage(err) });
        setLoading(false);
        return;
      }
    }
    // Same message whether or not an account exists, so this can't be used to probe emails.
    setStatus({ type: 'success', text: 'If an account exists for this email, a password reset link has been sent.' });
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Heading title="Reset your password" subtitle="Enter the email you use for the student portal." />
      <Field id="forgot-email" label="Email address">
        <TextInput id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </Field>
      {status && <Notice type={status.type}>{status.text}</Notice>}
      <PrimaryButton type="submit" loading={loading}>Send reset link</PrimaryButton>
      <div className="text-center">
        <LinkButton onClick={onBack}>Back to log in</LinkButton>
      </div>
    </form>
  );
}
