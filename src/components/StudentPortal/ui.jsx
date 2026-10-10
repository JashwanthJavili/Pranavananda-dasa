import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Eye, EyeOff, Loader2 } from 'lucide-react';
import CountryCodeSelector from '../Registration/CountryCodeSelector';
import { sanitizeMobileInput } from '../../utils/mobile';

export function Spinner({ className = 'w-4 h-4' }) {
  return <Loader2 className={`${className} animate-spin`} />;
}

export function PortalCard({ children, className = '' }) {
  return (
    <div className={`bg-cream-50 rounded-3xl border border-cream-200/90 shadow-soft-lg p-5 sm:p-8 ${className}`}>
      {children}
    </div>
  );
}

export function Heading({ title, subtitle }) {
  return (
    <div className="space-y-1.5">
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-temple-900 leading-tight">{title}</h2>
      {subtitle && <p className="text-xs sm:text-sm text-temple-600 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

const NOTICE_STYLES = {
  error: { box: 'bg-red-50 border-red-200 text-red-700', Icon: AlertCircle },
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-800', Icon: CheckCircle2 },
  info: { box: 'bg-gold-50 border-gold-200 text-temple-700', Icon: Info },
};

export function Notice({ type = 'info', children }) {
  if (!children) return null;
  const { box, Icon } = NOTICE_STYLES[type];
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs sm:text-sm ${box}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

const inputClass =
  'w-full min-w-0 px-4 py-3 rounded-xl bg-white border border-cream-300 text-sm text-temple-900 placeholder:text-temple-400 focus:outline-none focus:ring-2 focus:ring-saffron-400/50 focus:border-saffron-300 transition';

export function Field({ id, label, hint, children }) {
  return (
    <div className="space-y-1.5 text-left">
      <label id={`${id}-label`} htmlFor={id} className="block text-xs font-medium text-temple-600">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-temple-500">{hint}</p>}
    </div>
  );
}

export function TextInput(props) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />;
}

/**
 * Country code + mobile number. Typing and pasting are cleaned as you go: digits only,
 * no leading 0, and at most 10 digits for India (+91). (No maxLength attribute: it would
 * cut a pasted "0 98765 43210" before the spaces and 0 are removed.)
 */
export function MobileInput({ id, countryCode, onCountryCodeChange, value, onChange, autoComplete = 'tel-national' }) {
  return (
    <div className="flex gap-2 items-center">
      <CountryCodeSelector
        value={countryCode}
        onChange={(code) => {
          onCountryCodeChange(code);
          const trimmed = sanitizeMobileInput(value, code);
          if (trimmed !== value) onChange(trimmed);
        }}
      />
      <TextInput
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(sanitizeMobileInput(e.target.value, countryCode))}
        placeholder={countryCode === '+91' ? '10-digit mobile number' : 'Mobile number'}
        className="flex-1"
      />
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete = 'current-password', placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 px-3.5 flex items-center text-temple-400 hover:text-temple-700 cursor-pointer"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function PrimaryButton({ loading, children, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-soft hover:shadow-soft-md transition-all cursor-pointer ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function LinkButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`text-xs sm:text-sm font-medium text-saffron-700 hover:text-saffron-800 underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

export function FullScreenLoader({ label = 'Loading…' }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-temple-600">
      <div className="w-10 h-10 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
