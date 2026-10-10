import React, { useState } from 'react';
import { Search, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import CountryCodeSelector from './CountryCodeSelector';
import { fetchRegistrationByMobile } from '../../firebase';

export default function FindRegistration({ onFound, onBack }) {
  const [countryCode, setCountryCode] = useState('+91');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const digits = value.replace(/\D/g, '');
    if (countryCode === '+91' ? digits.length !== 10 : digits.length < 6 || digits.length > 15) {
      setError(countryCode === '+91' ? 'Please enter a valid 10-digit mobile number.' : 'Please enter a valid mobile number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const reg = await fetchRegistrationByMobile(digits, countryCode);
      if (reg) {
        onFound(reg);
      } else {
        setError('We could not find a registration with this mobile number. Please check it and try again.');
      }
    } catch (err) {
      setError('Something went wrong while checking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-cream-50 rounded-3xl p-5 sm:p-8 border border-cream-200/90 shadow-soft-lg text-center space-y-5 animate-fadeIn">
      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-saffron-100 border border-saffron-200/80 flex items-center justify-center text-saffron-700 shadow-soft">
        <Search className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2]" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-bold text-temple-900 tracking-tight">
          Check Your Registration
        </h2>
        <p className="text-xs sm:text-sm text-temple-600 leading-relaxed">
          Enter your registered mobile number to confirm your registration and get your community link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-left" noValidate>
        <label htmlFor="reg-mobile" className="block text-xs font-medium text-temple-600">
          Mobile Number
        </label>
        <div className="flex gap-2 items-center">
          <CountryCodeSelector value={countryCode} onChange={(c) => { setCountryCode(c); setError(''); }} />
          <input
            id="reg-mobile"
            type="tel"
            inputMode="numeric"
            value={value}
            onChange={(e) => { setValue(e.target.value.replace(/[^\d\s]/g, '')); setError(''); }}
            placeholder="Enter mobile number"
            autoComplete="tel-national"
            className={`flex-1 min-w-0 px-4 py-3 rounded-xl bg-white border text-sm text-temple-900 placeholder:text-temple-400 focus:outline-none focus:ring-2 focus:ring-saffron-400/50 ${
              error ? 'border-red-300' : 'border-cream-300'
            }`}
          />
        </div>
        {error && (
          <p className="flex items-start gap-1.5 text-xs text-red-600" role="alert">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 disabled:opacity-70 text-white font-semibold text-xs sm:text-sm shadow-soft hover:shadow-soft-md transition-all cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>{loading ? 'Checking...' : 'Check Registration'}</span>
        </button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-temple-600 hover:text-temple-900 font-medium cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to registration
      </button>
    </div>
  );
}
