import React, { useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
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
