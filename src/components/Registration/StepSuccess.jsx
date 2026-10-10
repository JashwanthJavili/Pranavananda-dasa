import React, { useState, useEffect } from 'react';
import { Copy, Check, UserPlus, CheckCircle2, MessageSquare, ExternalLink, ArrowLeft } from 'lucide-react';
import { subscribeToProgramSettings, verifyAndGetWhatsAppAccess, OFFICIAL_WA_FALLBACK_LINK } from '../../firebase';

const maskMobile = (m = '') => {
  const d = String(m).replace(/\D/g, '');
  return d.length > 4 ? `${'•'.repeat(d.length - 4)}${d.slice(-4)}` : m;
};
const maskEmail = (e = '') => {
  const [u, dom] = String(e).split('@');
  return dom ? `${u.slice(0, 2)}${'•'.repeat(Math.max(u.length - 2, 2))}@${dom}` : e;
};

export default function StepSuccess({
  registrationId,
  formData = {},
  onRegisterAnother,
  initialSettings,
  isReturning = false,
  onBack
}) {
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState(() => {
    if (initialSettings) return initialSettings;
    try {
      const cached = localStorage.getItem('gita_amrita_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      courseName: 'Gita for Youth'
    };
  });

  // WhatsApp Access Verification State (Defaults to disabled / false until verified)
  const [waAccess, setWaAccess] = useState({ 
    loading: true, 
    eligible: false, 
    buttonText: 'Join Our WhatsApp Community', 
    waInviteLink: OFFICIAL_WA_FALLBACK_LINK 
  });

  useEffect(() => {
    try {
      localStorage.removeItem('gita_amrita_wa_settings');
    } catch (e) {}
    const unsub = subscribeToProgramSettings((latest) => {
      if (latest) setSettings(latest);
    });
    return () => unsub();
  }, []);

  // Evaluate WhatsApp Access on backend against database rules
  useEffect(() => {
    let isMounted = true;
    async function checkAccess() {
      try {
        const res = await verifyAndGetWhatsAppAccess({
          registrationId,
          mobile: formData.mobile,
          email: formData.email,
          sourceOfDiscovery: formData.sourceOfDiscovery || formData.sourceOfDiscoveryOther || ''
        });
        if (isMounted) {
          setWaAccess({
            loading: false,
            eligible: res?.eligible === true,
            buttonText: res?.buttonText || 'Join Our WhatsApp Community',
            waInviteLink: res?.waInviteLink || OFFICIAL_WA_FALLBACK_LINK
          });
        }
      } catch (err) {
        if (isMounted) {
          setWaAccess({ 
            loading: false, 
            eligible: false, 
            buttonText: 'Join Our WhatsApp Community', 
            waInviteLink: OFFICIAL_WA_FALLBACK_LINK 
          });
        }
      }
    }
    checkAccess();
    return () => { isMounted = false; };
  }, [registrationId, formData.sourceOfDiscovery, formData.mobile, formData.email]);

  const courseName = settings?.courseName || 'Gita for Youth';

  const handleCopyId = () => {
    if (registrationId && navigator.clipboard) {
      navigator.clipboard.writeText(registrationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinWhatsAppClick = (e) => {
    if (!waAccess.waInviteLink) return;
    const win = window.open(waAccess.waInviteLink, '_blank', 'noopener,noreferrer');
    if (win) {
      win.opener = null;
    }
  };

  return (
    <div className="text-center space-y-4 sm:space-y-5 animate-fadeIn py-1 sm:py-3 max-w-lg mx-auto">
      {/* Devotional Checkmark Badge */}
      <div className="flex justify-center -mb-1 items-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-soft ring-8 ring-emerald-500/10 transition-all">
          <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.2]" />
        </div>
      </div>

      {/* Headings & Devotional Message */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          {isReturning ? 'You Are Registered' : 'Registration Successful'}
        </h2>
        <p className="text-base sm:text-lg font-semibold text-saffron-700">
          Hare Krishna
        </p>
        <p className="text-xs sm:text-sm text-temple-600 font-normal max-w-md mx-auto px-2 leading-relaxed">
          {isReturning
            ? `Your registration for the ${courseName} Course is confirmed. Here are your details.`
            : `Thank you for registering for the ${courseName} Course. Further updates will be shared on your registered mobile number.`}
        </p>
      </div>

      {/* Participant Summary */}
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
            {formData.countryCode || '+91'} {isReturning ? maskMobile(formData.mobile) : formData.mobile}
          </span>
        </div>

        <div className="flex justify-between border-b border-cream-200/70 pb-2">
          <span className="text-temple-500 font-medium">Email:</span>
          <span className="font-semibold text-temple-900 truncate ml-2">
            {(isReturning ? maskEmail(formData.email) : formData.email) || '—'}
          </span>
        </div>

        <div className="flex justify-between pt-0.5">
          <span className="text-temple-500 font-medium">City:</span>
          <span className="font-semibold text-temple-900 ml-2">
            {formData.currentResidence || formData.city || '—'}
          </span>
        </div>
      </div>

      {/* WhatsApp Community Access Action (Rendered only for Eligible Referral Sources) */}
      <div className="pt-1 max-w-sm mx-auto space-y-2.5">
        
        {waAccess.eligible && (
          <button
            type="button"
            onClick={handleJoinWhatsAppClick}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-soft transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4.5 h-4.5 fill-current shrink-0" />
            <span>{waAccess.buttonText || 'Join Our WhatsApp Community'}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80 ml-0.5 shrink-0" />
          </button>
        )}

        {/* Primary Action Buttons */}
        {!isReturning ? (
          <button
            type="button"
            onClick={onRegisterAnother}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-xs sm:text-sm shadow-soft hover:shadow-soft-md transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Another Participant</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-xs sm:text-sm shadow-soft hover:shadow-soft-md transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}

        <a
          href="https://pranavanandadas.com/home"
          className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-cream-50 hover:bg-cream-200/80 border border-cream-300 text-temple-700 hover:text-temple-900 font-medium text-xs sm:text-sm shadow-soft transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          Home
        </a>
      </div>
    </div>
  );
}
