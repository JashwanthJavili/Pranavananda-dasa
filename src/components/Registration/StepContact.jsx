import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, AlertCircle, LogIn } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', label: 'IN (+91)' },
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+65', label: 'SG (+65)' },
  { code: '+61', label: 'AU (+61)' },
];

export default function StepContact({ 
  data, 
  onChange, 
  onNext, 
  onBack, 
  errors, 
  duplicateWarning,
  onClearDuplicateWarning,
  onGoToLogin
}) {
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);
    await onNext();
    setChecking(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 animate-fadeIn text-left">
      {/* Step Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Contact &amp; Location
        </h2>
        <p className="text-sm text-temple-600 font-normal">
          Provide your contact details so we can share program updates and batch links.
        </p>
      </div>

      {/* Duplicate Caution Alert */}
      {duplicateWarning && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2 shadow-soft animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <strong className="font-semibold block text-amber-900">
                Already Registered
              </strong>
              {duplicateWarning}
            </div>
          </div>
          {onGoToLogin && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onGoToLogin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 font-semibold text-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Go to Student Login</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Field: Mobile Number with Country Code */}
      <div className="space-y-1.5">
        <label 
          htmlFor="mobile"
          className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
        >
          Mobile Number <span className="text-saffron-600">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={data.countryCode || '+91'}
            onChange={(e) => {
              onChange('countryCode', e.target.value);
              if (onClearDuplicateWarning) onClearDuplicateWarning();
            }}
            className="w-28 px-2.5 py-3 rounded-xl border border-cream-300 bg-cream-50 text-temple-900 text-xs sm:text-sm focus:outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 transition-all cursor-pointer font-medium"
          >
            {COUNTRY_CODES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>

          <input
            id="mobile"
            type="tel"
            placeholder="e.g. 98765 43210"
            value={data.mobile || ''}
            onChange={(e) => {
              onChange('mobile', e.target.value);
              if (onClearDuplicateWarning) onClearDuplicateWarning();
            }}
            className={`flex-1 px-4 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
              errors.mobile
                ? 'border-red-400 focus:ring-red-400/40'
                : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
            }`}
          />
        </div>
        {errors.mobile && (
          <p className="text-xs text-red-600 font-medium pt-0.5">{errors.mobile}</p>
        )}
      </div>

      {/* Field: Email Address (MANDATORY) */}
      <div className="space-y-1.5">
        <label 
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
        >
          Email Address <span className="text-saffron-600">*</span>
        </label>
        <input
          id="email"
          type="email"
          placeholder="e.g. yourname@example.com"
          value={data.email || ''}
          onChange={(e) => {
            onChange('email', e.target.value);
            if (onClearDuplicateWarning) onClearDuplicateWarning();
          }}
          className={`w-full px-4 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
            errors.email
              ? 'border-red-400 focus:ring-red-400/40'
              : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
          }`}
        />
        {errors.email && (
          <p className="text-xs text-red-600 font-medium pt-0.5">{errors.email}</p>
        )}
      </div>

      {/* Fields: City & Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* City */}
        <div className="space-y-1.5">
          <label 
            htmlFor="city"
            className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
          >
            City / Town <span className="text-saffron-600">*</span>
          </label>
          <input
            id="city"
            type="text"
            placeholder="e.g. Adilabad"
            value={data.city || ''}
            onChange={(e) => onChange('city', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
              errors.city
                ? 'border-red-400 focus:ring-red-400/40'
                : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
            }`}
          />
          {errors.city && (
            <p className="text-xs text-red-600 font-medium pt-0.5">{errors.city}</p>
          )}
        </div>

        {/* Area */}
        <div className="space-y-1.5">
          <label 
            htmlFor="area"
            className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
          >
            Area / Locality <span className="text-saffron-600">*</span>
          </label>
          <input
            id="area"
            type="text"
            placeholder="e.g. Edulapuram"
            value={data.area || ''}
            onChange={(e) => onChange('area', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
              errors.area
                ? 'border-red-400 focus:ring-red-400/40'
                : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
            }`}
          />
          {errors.area && (
            <p className="text-xs text-red-600 font-medium pt-0.5">{errors.area}</p>
          )}
        </div>
      </div>

      {/* Back & Continue Actions */}
      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="w-1/3 flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-temple-700 font-medium text-sm sm:text-base transition-colors focus:outline-none focus:ring-2 focus:ring-saffron-500/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="submit"
          disabled={checking}
          className="w-2/3 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-sm sm:text-base shadow-soft hover:shadow-soft-md transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
        >
          <span>{checking ? 'Verifying...' : 'Continue'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
