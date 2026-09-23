import React, { useState } from 'react';
import { CheckCircle2, Home, LayoutDashboard, Copy, Check, UserPlus, Sparkles } from 'lucide-react';

export default function StepSuccess({ 
  registrationId, 
  formData = {}, 
  onBackToHome, 
  onGoToDashboard, 
  onRegisterAnother 
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(registrationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="text-center space-y-6 animate-fadeIn py-2 sm:py-4">
      {/* Devotional Checkmark */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-soft ring-8 ring-emerald-500/10">
        <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.2]" />
      </div>

      {/* Headings */}
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          Enrollment Confirmed
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Registration Successfull
        </h2>
        <div className="space-y-1">
          <p className="text-base sm:text-lg font-semibold text-saffron-700">
            Hare Krishna 🙏
          </p>
          <p className="text-xs sm:text-sm text-temple-600 font-normal">
            Thank you for registering for Bhagavad Gita Course.
          </p>
        </div>
      </div>

      {/* Dynamic Registration ID Card */}
      <div className="bg-cream-100/60 rounded-2xl p-4 sm:p-5 border border-cream-200/90 max-w-xs mx-auto shadow-soft space-y-1.5">
        <span className="text-[11px] uppercase tracking-widest text-temple-500 font-semibold block">
          Your Registration ID
        </span>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl sm:text-2xl font-bold tracking-wider text-temple-900 font-mono">
            {registrationId}
          </span>
          <button
            onClick={handleCopyId}
            className="p-1.5 rounded-lg text-temple-500 hover:text-saffron-600 hover:bg-cream-200 transition-colors cursor-pointer"
            title="Copy Registration ID"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        {copied && (
          <span className="text-[10px] text-emerald-600 font-medium block">
            ID copied to clipboard!
          </span>
        )}
      </div>

      {/* Participant Details Summary Card */}
      <div className="bg-cream-100/60 rounded-2xl p-4 sm:p-5 border border-cream-200/90 max-w-md mx-auto text-left text-xs space-y-2 shadow-soft">
        <div className="flex justify-between border-b border-cream-200/70 pb-2">
          <span className="text-temple-400 font-medium">Name:</span>
          <span className="font-semibold text-temple-900">{formData.fullName || 'Participant'}</span>
        </div>
        <div className="flex justify-between border-b border-cream-200/70 pb-2">
          <span className="text-temple-400 font-medium">Contact:</span>
          <span className="font-semibold text-temple-900">{formData.countryCode || '+91'} {formData.mobile}</span>
        </div>
        <div className="flex justify-between pt-0.5">
          <span className="text-temple-400 font-medium">Residence:</span>
          <span className="font-semibold text-temple-900">{formData.currentResidence || formData.city || '—'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 max-w-sm mx-auto space-y-2.5">
        <button
          type="button"
          onClick={onGoToDashboard}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-sm shadow-soft hover:shadow-soft-md transition-all cursor-pointer transform hover:-translate-y-0.5"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Go to Participant Dashboard</span>
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-1/2 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-50 text-temple-700 font-medium text-xs transition-colors cursor-pointer shadow-2xs"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </button>

          <button
            type="button"
            onClick={onRegisterAnother}
            className="w-1/2 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-50 text-temple-700 font-medium text-xs transition-colors cursor-pointer shadow-2xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Registration</span>
          </button>
        </div>
      </div>
    </div>
  );
}
