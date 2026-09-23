import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff, Lock, ChevronDown } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (IN)' },
  { code: '+1', label: '+1 (US)' },
  { code: '+971', label: '+971 (UAE)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+65', label: '+65 (SG)' },
  { code: '+61', label: '+61 (AU)' },
];

export default function StepContact({ 
  data, 
  onChange, 
  onNext, 
  onBack, 
  errors, 
  duplicateWarning,
  onClearDuplicateWarning
}) {
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Focus handler to smoothly bring active inputs into center view on mobile keyboard pop-up
  const handleInputFocus = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const handleMobileChange = (e) => {
    let raw = e.target.value.replace(/\D/g, ''); // only numbers
    raw = raw.replace(/^0+/, ''); // ignore / strip leading zero(s)
    raw = raw.slice(0, 10); // strictly maximum 10 digits
    onChange('mobile', raw);
    if (onClearDuplicateWarning) onClearDuplicateWarning();
  };

  const handlePincodeChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
    onChange('pincode', raw);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);
    await onNext();
    setChecking(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 animate-fadeIn text-left w-full overflow-hidden">
      {/* Step Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Contact &amp; Address
        </h2>
        <p className="text-xs sm:text-sm text-temple-600 font-normal">
          Enter your contact information, residential address, and account password.
        </p>
      </div>

      {/* Duplicate Caution Alert */}
      {duplicateWarning && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 shadow-soft animate-fadeIn">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <strong className="font-semibold block text-amber-900">
                Already Registered
              </strong>
              {duplicateWarning}
            </div>
          </div>
        </div>
      )}

      {/* Field: Mobile Number (10 Digits, Ignores 0 as First Digit) */}
      <div className="space-y-1.5 scroll-mt-24 scroll-mb-36 w-full">
        <label 
          htmlFor="mobile"
          className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
        >
          Mobile Number <span className="text-saffron-600">*</span>
        </label>
        <div className="flex gap-2 items-center w-full">
          <div className="relative flex-shrink-0 w-24 sm:w-28">
            <select
              value={data.countryCode || '+91'}
              onChange={(e) => {
                onChange('countryCode', e.target.value);
                if (onClearDuplicateWarning) onClearDuplicateWarning();
              }}
              className="w-full appearance-none pl-2.5 sm:pl-3 pr-7 sm:pr-8 py-2.5 sm:py-3 rounded-xl border border-cream-300 bg-cream-50 text-temple-900 text-xs sm:text-sm focus:outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 transition-all duration-200 cursor-pointer font-medium"
            >
              {COUNTRY_CODES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 sm:pr-3 text-temple-500">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          <input
            id="mobile"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile number"
            value={data.mobile || ''}
            onFocus={handleInputFocus}
            onChange={handleMobileChange}
            className={`flex-1 min-w-0 w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-xs sm:text-base focus:outline-none focus:ring-2 transition-all ${
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

      {/* Field: Email Address */}
      <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
        <label 
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
        >
          Email Address <span className="text-saffron-600">*</span>
        </label>
        <input
          id="email"
          type="email"
          placeholder="Enter email address"
          value={data.email || ''}
          onFocus={handleInputFocus}
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

      {/* Address Sequence: 1. Current Residence, 2. Address, 3. Pincode */}
      <div className="space-y-3.5 pt-1 border-t border-cream-200">
        
        {/* 1. Current Residence */}
        <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
          <label 
            htmlFor="currentResidence"
            className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
          >
            Current Residence <span className="text-saffron-600">*</span>
          </label>
          <input
            id="currentResidence"
            type="text"
            placeholder="Enter current city / town"
            value={data.currentResidence || ''}
            onFocus={handleInputFocus}
            onChange={(e) => onChange('currentResidence', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
              errors.currentResidence
                ? 'border-red-400 focus:ring-red-400/40'
                : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
            }`}
          />
          {errors.currentResidence && (
            <p className="text-xs text-red-600 font-medium pt-0.5">{errors.currentResidence}</p>
          )}
        </div>

        {/* 2. Their Address (Full Address) */}
        <div className="space-y-1.5 scroll-mt-24 scroll-mb-36 w-full">
          <div className="flex flex-col gap-0.5">
            <label 
              htmlFor="fullAddress"
              className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
            >
              Full Address <span className="text-saffron-600">*</span>
            </label>
            <span className="text-[10px] sm:text-[11px] text-saffron-700 font-medium leading-tight">
              (For physical certificate dispatch upon course completion)
            </span>
          </div>
          <textarea
            id="fullAddress"
            rows={2}
            placeholder="House/Flat No., Street, Landmark, Area"
            value={data.fullAddress || ''}
            onFocus={handleInputFocus}
            onChange={(e) => onChange('fullAddress', e.target.value)}
            className={`w-full px-4 py-2.5 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all resize-none ${
              errors.fullAddress
                ? 'border-red-400 focus:ring-red-400/40'
                : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
            }`}
          />
          {errors.fullAddress && (
            <p className="text-xs text-red-600 font-medium pt-0.5">{errors.fullAddress}</p>
          )}
        </div>

        {/* 3. Pincode */}
        <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
          <label 
            htmlFor="pincode"
            className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
          >
            Pincode <span className="text-saffron-600">*</span>
          </label>
          <input
            id="pincode"
            type="tel"
            maxLength={6}
            placeholder="Enter 6-digit pincode"
            value={data.pincode || ''}
            onFocus={handleInputFocus}
            onChange={handlePincodeChange}
            className={`w-full px-4 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
              errors.pincode
                ? 'border-red-400 focus:ring-red-400/40'
                : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
            }`}
          />
          {errors.pincode && (
            <p className="text-xs text-red-600 font-medium pt-0.5">{errors.pincode}</p>
          )}
        </div>

      </div>

      {/* Fields: Password & Confirm Password */}
      <div className="space-y-3 pt-1 border-t border-cream-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Create Password */}
          <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
            <label 
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
            >
              Create Password <span className="text-saffron-600">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
                value={data.password || ''}
                onFocus={handleInputFocus}
                onChange={(e) => onChange('password', e.target.value)}
                className={`w-full pl-4 pr-10 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
                  errors.password
                    ? 'border-red-400 focus:ring-red-400/40'
                    : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 cursor-pointer p-1"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 font-medium pt-0.5">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
            <label 
              htmlFor="confirmPassword"
              className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
            >
              Confirm Password <span className="text-saffron-600">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={data.confirmPassword || ''}
                onFocus={handleInputFocus}
                onChange={(e) => onChange('confirmPassword', e.target.value)}
                className={`w-full pl-4 pr-10 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
                  errors.confirmPassword
                    ? 'border-red-400 focus:ring-red-400/40'
                    : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 cursor-pointer p-1"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 font-medium pt-0.5">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
      </div>

      {/* Back & Continue Actions */}
      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="w-1/3 flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-temple-700 font-medium text-xs sm:text-sm transition-colors focus:outline-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="submit"
          disabled={checking}
          className="w-2/3 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-medium text-xs sm:text-sm shadow-soft hover:shadow-soft-md transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 cursor-pointer"
        >
          <span>{checking ? 'Verifying...' : 'Review & Confirm'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
