import React, { useState, useEffect } from 'react';
import { Copy, Check, UserPlus, CheckCircle2 } from 'lucide-react';
import { Logo, KRISHNA_ICON_SRC } from '../BrandLogo';
import { subscribeToProgramSettings } from '../../firebase';

export default function StepSuccess({
  registrationId,
  formData = {},
  onRegisterAnother,
  initialSettings
}) {
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState(() => {
    if (initialSettings) return initialSettings;
    try {
      const cached = localStorage.getItem('gita_amrita_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      courseName: 'Gita Amrita',
      successLogoType: 'tick',
      successLogoWidth: 80,
      successLogoHeight: 80
    };
  });

  useEffect(() => {
    const unsub = subscribeToProgramSettings((latest) => {
      if (latest) setSettings(latest);
    });
    return () => unsub();
  }, []);

  const logoType = settings?.successLogoType || 'tick';
  const logoWidth = Number(settings?.successLogoWidth) || 80;
  const logoHeight = Number(settings?.successLogoHeight) || 80;
  const courseName = settings?.courseName || 'Bhagavad Gita';

  const handleCopyId = () => {
    if (registrationId && navigator.clipboard) {
      navigator.clipboard.writeText(registrationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="text-center space-y-4 sm:space-y-5 animate-fadeIn py-1 sm:py-3 max-w-lg mx-auto">
      {/* Devotional Checkmark Badge / Logo */}
      <div className="flex justify-center -mb-1 items-center">
        {logoType === 'krishna' ? (
          <Logo
            src={KRISHNA_ICON_SRC}
            alt="Krishna"
            style={{ width: `${logoWidth}px`, height: `${logoHeight}px` }}
            className="object-contain drop-shadow-sm transition-all"
          />
        ) : (
          <div 
            style={{ width: `${logoWidth}px`, height: `${logoHeight}px` }}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-soft ring-8 ring-emerald-500/10 transition-all"
          >
            <CheckCircle2 
              style={{ width: `${Math.round(logoWidth * 0.55)}px`, height: `${Math.round(logoHeight * 0.55)}px` }}
              className="stroke-[2.2]" 
            />
          </div>
        )}
      </div>

      {/* Headings & Devotional Message */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Registration Successful
        </h2>
        <p className="text-base sm:text-lg font-semibold text-saffron-700">
          Hare Krishna
        </p>
        <p className="text-xs sm:text-sm text-temple-600 font-normal max-w-md mx-auto px-2 leading-relaxed">
          Thank you for registering for the {courseName} Course. Further updates will be shared on your registered mobile number.
        </p>
      </div>

      {/* Participant Summary (with Registration ID placed above Name) */}
      <div className="bg-cream-100/60 rounded-2xl p-4 sm:p-5 border border-cream-200/90 max-w-sm mx-auto text-left text-xs space-y-2.5 shadow-soft">
        <div className="flex items-center justify-between border-b border-cream-200/70 pb-2.5">
          <span className="text-temple-500 font-medium">Registration ID:</span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="font-bold text-temple-900 font-mono text-sm tracking-wide">
              {registrationId || '—'}
            </span>
            {registrationId && (
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1 rounded-md text-temple-500 hover:text-saffron-600 hover:bg-cream-200 transition-colors cursor-pointer"
                title="Copy Registration ID"
              >
                {copied ? (
                  <span className="flex items-center text-[11px] text-emerald-600 font-medium gap-0.5">
                    <Check className="w-3.5 h-3.5" /> Copied
                  </span>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between border-b border-cream-200/70 pb-2">
          <span className="text-temple-500 font-medium">Name:</span>
          <span className="font-semibold text-temple-900 truncate ml-2">
            {formData.fullName || 'Participant'}
          </span>
        </div>

        <div className="flex justify-between border-b border-cream-200/70 pb-2">
          <span className="text-temple-500 font-medium">Contact:</span>
          <span className="font-semibold text-temple-900 ml-2">
            {formData.countryCode || '+91'} {formData.mobile}
          </span>
        </div>

        <div className="flex justify-between border-b border-cream-200/70 pb-2">
          <span className="text-temple-500 font-medium">Email:</span>
          <span className="font-semibold text-temple-900 truncate ml-2">
            {formData.email || '—'}
          </span>
        </div>

        <div className="flex justify-between pt-0.5">
          <span className="text-temple-500 font-medium">City:</span>
          <span className="font-semibold text-temple-900 ml-2">
            {formData.currentResidence || formData.city || '—'}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-2 max-w-sm mx-auto">
        <button
          type="button"
          onClick={onRegisterAnother}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-xs sm:text-sm shadow-soft hover:shadow-soft-md transition-all cursor-pointer transform hover:-translate-y-0.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Another Participant</span>
        </button>
      </div>
    </div>
  );
}
