import React, { useEffect, useState } from 'react';
import { MailCheck, KeyRound, UserPlus } from 'lucide-react';
import FindEmailModal from './FindEmailModal';
import {
  checkSetupDetails,
  createStudentAccount,
  sendVerificationLink,
  studentPasswordLogin,
  studentMobileLogin,
  requestStudentPasswordReset,
  getPendingOnboarding,
  setPendingOnboarding,
  authErrorMessage,
  checkRegistered,
} from '../../studentPortal';
import NotRegistered from './NotRegistered';
import { PortalCard, Heading, Notice, Field, TextInput, PasswordInput, PrimaryButton, LinkButton, MobileInput } from './ui';
import { mobileProblem } from '../../utils/mobile';

const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Login errors that may simply mean "these details are not registered"
const LOGIN_MISS = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'portal/mobile-not-set-up'];

/**
 * Signed-out screens: returning-student login, first-time setup, "check your email",
 * and forgot password. `initialMessage` shows a notice passed down from the portal.
 */
export default function PortalAuth({ initialMessage }) {
  const pending = getPendingOnboarding();
  // "Check your email" is for the older sign-in links only (new setups continue signed in)
  const [mode, setMode] = useState(pending && !pending.method && Date.now() - pending.sentAt < 60 * 60 * 1000 ? 'sent' : 'login');
  const [notice, setNotice] = useState(initialMessage || null);
  const [prefill, setPrefill] = useState(null); // details carried from Forgot password to setup
  const [existing, setExisting] = useState(null); // email that already has an account (from setup)

  const switchTo = (next) => {
    setNotice(null);
    setMode(next);
  };

  return (
    <div className="max-w-md mx-auto w-full animate-fadeIn">
      <PortalCard className="space-y-6">
        {mode !== 'sent' && mode !== 'forgot' && mode !== 'exists' && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-cream-200/70 border border-cream-300/70">
            {[
              { key: 'login', label: 'Sign in', Icon: KeyRound },
              { key: 'setup', label: 'Sign up', Icon: UserPlus },
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
            onLogin={() => switchTo('login')}
            onForgot={() => switchTo('forgot')}
            onAccountExists={(email) => { setExisting(email); switchTo('exists'); }}
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
        {mode === 'exists' && (
          <AccountExists email={existing} onReset={() => switchTo('forgot')} onLogin={() => switchTo('login')} />
        )}
        {mode === 'forgot' && (
          <ForgotPassword
            initialEmail={existing || ''}
            accountExists={Boolean(existing)}
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
  const [notRegistered, setNotRegistered] = useState(null); // 'email' | 'mobile'

  // A failed login with details that belong to no registration: point them to register.
  const unregistered = async (digits) => {
    try {
      if (method === 'email') return (await checkRegistered({ email })).emailRegistered ? null : 'email';
      return (await checkRegistered({ mobile: digits })).mobileRegistered ? null : 'mobile';
    } catch (e) {
      return null;
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotRegistered(null);
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
      const what = LOGIN_MISS.includes(err?.code) ? await unregistered(digits) : null;
      if (what) setNotRegistered(what);
      else setError(authErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Heading title="Welcome Back" subtitle="Gita for Youth Devotee Portal" />
      <div className="flex gap-4 text-xs sm:text-sm" role="radiogroup" aria-label="Sign in with">
        {[['email', 'Email'], ['mobile', 'Mobile number']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={method === key}
            onClick={() => { setMethod(key); setError(''); setNotRegistered(null); }}
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
          <TextInput id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setNotRegistered(null); }} placeholder="Enter your email address" />
        </Field>
      ) : (
        <Field id="login-mobile" label="Mobile number">
          <MobileInput id="login-mobile" countryCode={countryCode} onCountryCodeChange={setCountryCode} value={mobile} onChange={(v) => { setMobile(v); setError(''); setNotRegistered(null); }} />
        </Field>
      )}
      <Field id="login-password" label="Password">
        <PasswordInput id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
      </Field>
      {notRegistered ? (
        <NotRegistered
          what={notRegistered}
          helpPrefill={notRegistered === 'mobile' ? { countryCode, mobile: mobile.replace(/\D/g, '') } : { email: email.trim() }}
        />
      ) : (
        error && <Notice type="error">{error}</Notice>
      )}
      {!notRegistered && <PrimaryButton type="submit" loading={loading}>Sign in</PrimaryButton>}
      <div className="flex items-center justify-between gap-2">
        <LinkButton onClick={onForgot}>Forgot password?</LinkButton>
        <LinkButton onClick={onSetup}>New here? Sign up</LinkButton>
      </div>
    </form>
  );
}

const passwordProblem = (pw) => {
  if (pw.length < 8) return 'Please use at least 8 characters for your password.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Please use a mix of letters and numbers in your password.';
  return '';
};

/**
 * First-time setup: (1) check the registered mobile + email, (2) create a password. The account
 * is then created and Firebase emails a "verify your email" link; the portal continues by itself.
 */
function SetupForm({ onLogin, onForgot, onAccountExists, initial }) {
  const [step, setStep] = useState('details'); // 'details' | 'password'
  const [countryCode, setCountryCode] = useState(initial?.countryCode || '+91');
  const [mobile, setMobile] = useState(initial?.mobile || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alreadySetUp, setAlreadySetUp] = useState(false);
  const [notRegistered, setNotRegistered] = useState(false);
  const [findEmailOpen, setFindEmailOpen] = useState(false);
  const digits = mobile.replace(/\D/g, '');

  const reset = () => { setError(''); setAlreadySetUp(false); setNotRegistered(false); };

  const check = async (e) => {
    e.preventDefault();
    reset();
    if (mobileProblem(digits, countryCode)) return setError(mobileProblem(digits, countryCode));
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter your registered email address.');
    setLoading(true);
    try {
      const res = await checkSetupDetails({ email, mobile: digits, countryCode });
      if (res.status === 'ok') setStep('password');
      else if (res.status === 'already_setup') setAlreadySetUp(true);
      else if (res.status === 'not_registered') setNotRegistered(true);
      else setError("We couldn't find a registration with this mobile number and email together. Please use the exact details you registered with.");
    } catch (err) {
      setError('Something went wrong while checking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError('The two passwords do not match.');
    setLoading(true);
    try {
      const res = await createStudentAccount({ email, mobile: digits, countryCode, password });
      // 'ready': the portal signs the student straight in and continues to the dashboard
      if (res.status === 'account_exists') onAccountExists(email.trim());
    } catch (err) {
      setError(err?.code?.startsWith('auth/') ? authErrorMessage(err) : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (step === 'password') {
    return (
      <form onSubmit={create} className="space-y-4" noValidate>
        <Heading
          title="Create your password"
          subtitle="Your registration is found. Set a password to finish creating your account."
        />
        <Field id="setup-password" label="Create password" hint="At least 8 characters, with letters and numbers.">
          <PasswordInput id="setup-password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="Enter a new password" />
        </Field>
        <Field id="setup-confirm" label="Confirm password">
          <PasswordInput id="setup-confirm" autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(''); }} placeholder="Re-enter your password" />
        </Field>
        {error && <Notice type="error">{error}</Notice>}
        <PrimaryButton type="submit" loading={loading}>Create account</PrimaryButton>
        <div className="text-center">
          <LinkButton onClick={() => { setStep('details'); setError(''); setPassword(''); setConfirm(''); }}>Change mobile or email</LinkButton>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={check} className="space-y-4" noValidate>
      <Heading
        title="Create Your Account"
        subtitle="Already registered? Enter your registered mobile number and email address."
      />
      <Field id="setup-mobile" label="Registered mobile number">
        <MobileInput
            id="setup-mobile"
            countryCode={countryCode}
            onCountryCodeChange={(c) => { setCountryCode(c); reset(); }}
            value={mobile}
            onChange={(v) => { setMobile(v); reset(); }}
          />
      </Field>
      <Field id="setup-email" label="Registered Email Address">
        <LinkButton onClick={() => setFindEmailOpen(true)} className="block text-xs !mt-1 pb-1">
          Forgot your registered email?
        </LinkButton>
        <TextInput id="setup-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); reset(); }} placeholder="Enter your email address" />
      </Field>
      <FindEmailModal open={findEmailOpen} onClose={() => setFindEmailOpen(false)} />
      {error && <Notice type="error">{error}</Notice>}
      {notRegistered && (
        <NotRegistered what="both" helpPrefill={{ countryCode, mobile: digits, email: email.trim() }} />
      )}
      {alreadySetUp ? (
        <AlreadySetUp onLogin={onLogin} onForgot={onForgot} />
      ) : !notRegistered && (
        <PrimaryButton type="submit" loading={loading}>Continue</PrimaryButton>
      )}
      {!alreadySetUp && (
        <div className="text-center">
          <LinkButton onClick={onLogin}>Already have an account? Log in</LinkButton>
        </div>
      )}
    </form>
  );
}

/** Setup found an older sign-in account on this email: set its password by email instead. */
function AccountExists({ email, onReset, onLogin }) {
  return (
    <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 sm:p-5 space-y-3">
      <h3 className="font-semibold text-temple-900 leading-snug">
        Hare Krishna 🙏
        <span className="block">Dear Devotee,</span>
      </h3>
      <p className="text-xs sm:text-sm text-temple-600 leading-relaxed">
        An account already exists for {email}, perhaps from an earlier setup. Kindly set a new password using the link we
        email you, then sign in. Your registration will be linked automatically.
      </p>
      <PrimaryButton type="button" onClick={onReset}>Email me a link to set my password</PrimaryButton>
      <div className="text-center"><LinkButton onClick={onLogin}>I remember my password. Sign in</LinkButton></div>
    </div>
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
        <LinkButton onClick={() => onLogin(null)}>Already verified on another device? Sign in</LinkButton>
        <LinkButton onClick={onStartOver} className="text-temple-500 hover:text-temple-700">Use different details</LinkButton>
      </div>
    </div>
  );
}

function ForgotPassword({ onBack, onSetup, initialEmail = '', accountExists = false }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setStatus({ type: 'error', text: 'Please enter your registered email address.' });

    setLoading(true);
    setStatus(null);
    try {
      const res = await requestStudentPasswordReset({ email, accountExists: accountExists && email.trim().toLowerCase() === initialEmail.toLowerCase() });
      if (res.status === 'no_registration') {
        setStatus({ type: 'not_registered' });
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
        <TextInput id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setStatus(null); }} placeholder="Enter your email address" />
      </Field>
      {status?.type === 'setup' ? (
        <SetupNeeded onSetup={() => onSetup({ email: email.trim() })} />
      ) : status?.type === 'not_registered' ? (
        <NotRegistered what="email" helpPrefill={{ category: 'Forgot password / reset not working', email: email.trim() }} />
      ) : (
        <>
          {status && <Notice type={status.type}>{status.text}</Notice>}
          <PrimaryButton type="submit" loading={loading}>Send reset link</PrimaryButton>
        </>
      )}
      <div className="text-center">
        <LinkButton onClick={onBack}>Back to sign in</LinkButton>
      </div>
    </form>
  );
}

/** Shown on Forgot password when the student has never signed up. */
function SetupNeeded({ onSetup }) {
  return (
    <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 sm:p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold text-temple-900 leading-snug">
          Hare Krishna 🙏
          <span className="block">Dear Devotee,</span>
        </h3>
        <p className="text-xs sm:text-sm text-temple-600 leading-relaxed">
          You are registered with us, but you have not signed up for the portal yet, so there is no password to reset. Kindly sign up first.
        </p>
        <p className="pt-2 text-xs sm:text-sm font-medium text-temple-800">Kindly follow these simple steps:</p>
      </div>
      <ol className="space-y-2 text-xs sm:text-sm text-temple-700">
        {[
          'Click "Complete sign up" below.',
          'Enter your registered mobile number and email address.',
          'Create your password. You will go straight to your dashboard.',
        ].map((step, i) => (
          <li key={step} className="flex items-start gap-2.5">
            <span className="shrink-0 w-5 h-5 rounded-full bg-saffron-500 text-white text-[11px] font-semibold flex items-center justify-center">{i + 1}</span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs sm:text-sm text-temple-600">After this, you can sign in anytime with your email or mobile number. Thank you for your patience.</p>
      <PrimaryButton type="button" onClick={onSetup}>Complete sign up</PrimaryButton>
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
          Your account setup is already complete. Kindly sign in with your email or mobile number and the password you created.
        </p>
      </div>
      <PrimaryButton type="button" onClick={onLogin}>Go to sign in</PrimaryButton>
      <p className="text-xs sm:text-sm text-temple-600 text-center">
        Forgot your password?{' '}
        <LinkButton onClick={onForgot}>Reset it here</LinkButton>
      </p>
    </div>
  );
}
