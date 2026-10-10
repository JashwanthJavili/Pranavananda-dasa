import React, { useEffect, useState } from 'react';
import { MailCheck, KeyRound, UserPlus } from 'lucide-react';
import FindEmailModal from './FindEmailModal';
import {
  startStudentVerification,
  sendVerificationLink,
  studentPasswordLogin,
  studentMobileLogin,
  requestStudentPasswordReset,
  getPendingOnboarding,
  setPendingOnboarding,
  authErrorMessage,
} from '../../studentPortal';
import { PortalCard, Heading, Notice, Field, TextInput, PasswordInput, PrimaryButton, LinkButton, MobileInput } from './ui';
import { mobileProblem } from '../../utils/mobile';

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
  const [prefill, setPrefill] = useState(null); // details carried from Forgot password to setup

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
        {mode === 'setup' && (
          <SetupForm
            initial={prefill}
            onSent={() => switchTo('sent')}
            onLogin={() => switchTo('login')}
            onForgot={() => switchTo('forgot')}
          />
        )}
        {mode === 'sent' && (
          <CheckEmail
            onStartOver={() => switchTo('setup')}
            onLogin={(text) => {
              setPendingOnboarding(null);
              setMode('login');
              setNotice(text ? { type: 'success', text } : null);
            }}
          />
        )}
        {mode === 'forgot' && (
          <ForgotPassword
            onBack={() => switchTo('login')}
            onSetup={(details) => {
              setPrefill(details);
              switchTo('setup');
            }}
          />
        )}
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
    if (method === 'email' && !EMAIL_RE.test(email.trim())) return setError('Please enter your email address.');
    if (method === 'mobile' && mobileProblem(digits, countryCode)) return setError(mobileProblem(digits, countryCode));
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
          <MobileInput id="login-mobile" countryCode={countryCode} onCountryCodeChange={setCountryCode} value={mobile} onChange={(v) => { setMobile(v); setError(''); }} />
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

function SetupForm({ onSent, onLogin, onForgot, initial }) {
  const [countryCode, setCountryCode] = useState(initial?.countryCode || '+91');
  const [mobile, setMobile] = useState(initial?.mobile || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alreadySetUp, setAlreadySetUp] = useState(false);
  const [findEmailOpen, setFindEmailOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setAlreadySetUp(false);
    const digits = mobile.replace(/\D/g, '');
    if (mobileProblem(digits, countryCode)) return setError(mobileProblem(digits, countryCode));
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter your registered email address.');

    setLoading(true);
    setError('');
    try {
      const res = await startStudentVerification({ email, mobile: digits, countryCode });
      if (res.status === 'sent') onSent();
      else if (res.status === 'already_setup') setAlreadySetUp(true);
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
        <MobileInput
            id="setup-mobile"
            countryCode={countryCode}
            onCountryCodeChange={(c) => { setCountryCode(c); setError(''); }}
            value={mobile}
            onChange={(v) => { setMobile(v); setError(''); setAlreadySetUp(false); }}
          />
      </Field>
      <Field id="setup-email" label="Registered email address">
        <LinkButton onClick={() => setFindEmailOpen(true)} className="block text-xs !mt-1 pb-1">
          Don't remember which email you used?
        </LinkButton>
        <TextInput id="setup-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); setAlreadySetUp(false); }} placeholder="you@example.com" />
      </Field>
      <FindEmailModal open={findEmailOpen} onClose={() => setFindEmailOpen(false)} />
      {error && <Notice type="error">{error}</Notice>}
      {alreadySetUp ? (
        <AlreadySetUp onLogin={onLogin} onForgot={onForgot} />
      ) : (
        <PrimaryButton type="submit" loading={loading}>Send verification email</PrimaryButton>
      )}
    </form>
  );
}

function CheckEmail({ onStartOver, onLogin }) {
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
        <LinkButton onClick={() => onLogin(null)}>Already verified on another device? Log in</LinkButton>
        <LinkButton onClick={onStartOver} className="text-temple-500 hover:text-temple-700">Use different details</LinkButton>
      </div>
    </div>
  );
}

function ForgotPassword({ onBack, onSetup }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setStatus({ type: 'error', text: 'Please enter your registered email address.' });

    setLoading(true);
    setStatus(null);
    try {
      const res = await requestStudentPasswordReset({ email });
      if (res.status === 'no_registration') {
        setStatus({ type: 'error', text: 'No account found with this email. Please check the email, or register for Gita for Youth first.' });
      } else if (res.status === 'setup_incomplete') {
        setStatus({ type: 'setup' });
      } else {
        setStatus({ type: 'success', text: `A password reset link has been sent to ${email.trim()}. Check your Spam folder if you don't see it in a few minutes.` });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err?.code?.startsWith('auth/') ? authErrorMessage(err) : 'Something went wrong. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Heading title="Reset your password" subtitle="Enter the email you registered with." />
      <Field id="forgot-email" label="Registered email address">
        <TextInput id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setStatus(null); }} placeholder="you@example.com" />
      </Field>
      {status?.type === 'setup' ? (
        <SetupNeeded onSetup={() => onSetup({ email: email.trim() })} />
      ) : (
        <>
          {status && <Notice type={status.type}>{status.text}</Notice>}
          <PrimaryButton type="submit" loading={loading}>Send reset link</PrimaryButton>
        </>
      )}
      <div className="text-center">
        <LinkButton onClick={onBack}>Back to log in</LinkButton>
      </div>
    </form>
  );
}

/** Shown on Forgot password when the student has never set up their account. */
function SetupNeeded({ onSetup }) {
  return (
    <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 sm:p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold text-temple-900 leading-snug">
          Hare Krishna 🙏
          <span className="block">Dear Devotee,</span>
        </h3>
        <p className="text-xs sm:text-sm text-temple-600 leading-relaxed">
          You are registered with us, but your login has not been created yet, so there is no password to reset. We humbly request you to set up your account first.
        </p>
        <p className="pt-2 text-xs sm:text-sm font-medium text-temple-800">Kindly follow these simple steps:</p>
      </div>
      <ol className="space-y-2 text-xs sm:text-sm text-temple-700">
        {[
          'Click "Complete first-time setup" below.',
          'Enter your registered mobile number and email.',
          'Open the link we send to your email and create your password.',
        ].map((step, i) => (
          <li key={step} className="flex items-start gap-2.5">
            <span className="shrink-0 w-5 h-5 rounded-full bg-saffron-500 text-white text-[11px] font-semibold flex items-center justify-center">{i + 1}</span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs sm:text-sm text-temple-600">After this, you can log in anytime with your email or mobile number. Thank you for your patience.</p>
      <PrimaryButton type="button" onClick={onSetup}>Complete first-time setup</PrimaryButton>
    </div>
  );
}

/** Shown on First-time setup when this mobile + email has already completed setup. */
function AlreadySetUp({ onLogin, onForgot }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold text-temple-900 leading-snug">
          Hare Krishna 🙏
          <span className="block">Dear Devotee,</span>
        </h3>
        <p className="text-xs sm:text-sm text-temple-600 leading-relaxed">
          Your account setup is already completed. We humbly request you to log in with your email or mobile number and the password you created.
        </p>
      </div>
      <PrimaryButton type="button" onClick={onLogin}>Go to log in</PrimaryButton>
      <p className="text-xs sm:text-sm text-temple-600 text-center">
        Forgot your password?{' '}
        <LinkButton onClick={onForgot}>Reset it here</LinkButton>
      </p>
    </div>
  );
}
