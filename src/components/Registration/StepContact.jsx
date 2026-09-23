import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff, Lock, ChevronDown, Sparkles } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (IN)' },
  { code: '+1', label: '+1 (US)' },
  { code: '+971', label: '+971 (UAE)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+65', label: '+65 (SG)' },
  { code: '+61', label: '+61 (AU)' },
];

const DISCOVERY_SOURCES = [
  'Yuva Setu',
  'Friends / Devotees',
  'Instagram / Social Media',
  'Other',
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
    <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn text-left w-full overflow-hidden">
      {/* Step Header */}
      <div className="space-y-1 text-center sm:text-left border-b border-cream-200/80 pb-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-temple-900">
          Contact Details
        </h2>
        <p className="text-xs sm:text-sm text-temple-600 font-normal">
          Enter your contact information, residence, and participant login password.
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

      {/* SECTION 1: Communication Info */}
      <div className="space-y-4">
        {/* Field: Mobile Number */}
        <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
          <label
            htmlFor="mobile"
            className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
          >
            Mobile Number <span className="text-saffron-600">*</span>
          </label>
          <div className="flex gap-2 items-center">
            <div className="relative flex-shrink-0">
              <select
                value={data.countryCode || '+91'}
                onChange={(e) => {
                  onChange('countryCode', e.target.value);
                  if (onClearDuplicateWarning) onClearDuplicateWarning();
                }}
                className="appearance-none pl-3 pr-7 py-3 rounded-xl border border-cream-300 bg-white text-temple-900 text-sm sm:text-base focus:outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 transition-all duration-200 cursor-pointer font-medium min-w-[72px] shadow-2xs"
              >
                {COUNTRY_CODES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} ({item.label.split('(')[1] || ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-temple-500">
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
              className={`flex-1 min-w-0 px-4 py-3 rounded-xl border bg-white text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all shadow-2xs ${errors.mobile
                ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
                }`}
            />
          </div>
          {errors.mobile && (
            <p className="text-[11px] text-red-500 font-normal pt-0.5">{errors.mobile}</p>
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
            placeholder="Enter your email address"
            value={data.email || ''}
            onFocus={handleInputFocus}
            onChange={(e) => {
              onChange('email', e.target.value);
              if (onClearDuplicateWarning) onClearDuplicateWarning();
            }}
            className={`w-full px-4 py-3 rounded-xl border bg-white text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all shadow-2xs ${errors.email
              ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
              : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
              }`}
          />
          {errors.email && (
            <p className="text-[11px] text-red-500 font-normal pt-0.5">{errors.email}</p>
          )}
        </div>
      </div>

      {/* SECTION 2: Location Information */}
      <div className="space-y-3.5 pt-2 border-t border-cream-200/80">
        {/* 1. Current Residence */}
        <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
          <label
            htmlFor="currentResidence"
            className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
          >
            Current City / Town <span className="text-saffron-600">*</span>
          </label>
          <input
            id="currentResidence"
            type="text"
            placeholder="Enter your current city / town"
            value={data.currentResidence || ''}
            onFocus={handleInputFocus}
            onChange={(e) => onChange('currentResidence', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border bg-white text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all shadow-2xs ${errors.currentResidence
              ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
              : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
              }`}
          />
          {errors.currentResidence && (
            <p className="text-[11px] text-red-500 font-normal pt-0.5">{errors.currentResidence}</p>
          )}
        </div>

        {/* 2. Full Address & Pincode (Optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5 scroll-mt-24 scroll-mb-36">
            <label
              htmlFor="fullAddress"
              className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
            >
              Full Address <span className="text-[10px] text-temple-400 font-normal lowercase">(optional)</span>
            </label>
            <p className="text-[11px] text-temple-500 font-normal -mt-0.5">
              Used for sending course certificates after course completion
            </p>
            <input
              id="fullAddress"
              type="text"
              placeholder="Flat/House No., Street, Area"
              value={data.fullAddress || ''}
              onFocus={handleInputFocus}
              onChange={(e) => onChange('fullAddress', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 transition-all shadow-2xs"
            />
          </div>

          <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
            <label
              htmlFor="pincode"
              className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
            >
              Pincode <span className="text-[10px] text-temple-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="pincode"
              type="tel"
              maxLength={6}
              placeholder="6-digit pincode"
              value={data.pincode || ''}
              onFocus={handleInputFocus}
              onChange={handlePincodeChange}
              className={`w-full px-4 py-3 rounded-xl border bg-white text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all shadow-2xs ${errors.pincode
                ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
                }`}
            />
            {errors.pincode && (
              <p className="text-[11px] text-red-500 font-normal pt-0.5">{errors.pincode}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Account Security */}
      <div className="space-y-3 pt-2 border-t border-cream-200/80">
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
                className={`w-full pl-4 pr-10 py-3 rounded-xl border bg-white text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all shadow-2xs ${errors.password
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
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
              <p className="text-[11px] text-red-500 font-normal pt-0.5">{errors.password}</p>
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
                className={`w-full pl-4 pr-10 py-3 rounded-xl border bg-white text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all shadow-2xs ${errors.confirmPassword
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
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
              <p className="text-[11px] text-red-500 font-normal pt-0.5">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
      </div>

      {/* Back & Continue Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="w-1/3 flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-temple-700 font-semibold text-xs sm:text-sm shadow-2xs transition-colors focus:outline-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="submit"
          disabled={checking}
          className="w-2/3 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-xs sm:text-sm shadow-soft hover:shadow-soft-md transition-all disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-saffron-500/20 cursor-pointer transform hover:-translate-y-0.5"
        >
          <span>{checking ? 'Verifying...' : 'Continue'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
