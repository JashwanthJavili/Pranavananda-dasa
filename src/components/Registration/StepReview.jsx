import React from 'react';
import { ArrowLeft, ArrowRight, Edit3, Loader2, CheckCircle2, ShieldCheck, User, Phone, MapPin } from 'lucide-react';

export default function StepReview({ 
  data, 
  onBack, 
  onGoToStep, 
  onSubmit, 
  isSubmitting 
}) {
  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn text-left">
      {/* Step Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Review Your Details
        </h2>
        <p className="text-xs sm:text-sm text-temple-600 font-normal">
          Please verify your information before confirming your registration.
        </p>
      </div>

      <div className="space-y-3.5">
        {/* Section 1: Personal Profile */}
        <div className="bg-cream-50 rounded-2xl p-4 sm:p-5 border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cream-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-saffron-600" />
              <span>Personal Profile</span>
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(1)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-600 hover:text-saffron-700 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs sm:text-sm">
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Full Name</span>
              <span className="font-semibold text-temple-900">{data.fullName || '—'}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Age</span>
              <span className="font-semibold text-temple-900">{data.age || '—'} yrs</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Gender</span>
              <span className="font-semibold text-temple-900">{data.gender || '—'}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Qualification</span>
              <span className="font-semibold text-temple-900">{data.education || '—'}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Occupation</span>
              <span className="font-semibold text-temple-900">
                {data.occupation === 'Other' && data.otherOccupation ? `Other (${data.otherOccupation})` : (data.occupation || '—')}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Security */}
        <div className="bg-cream-50 rounded-2xl p-4 sm:p-5 border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cream-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-saffron-600" />
              <span>Contact &amp; Security</span>
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-600 hover:text-saffron-700 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Mobile Number</span>
              <span className="font-semibold text-temple-900">{data.countryCode || '+91'} {data.mobile}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Email Address</span>
              <span className="font-semibold text-temple-900">{data.email}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Password</span>
              <span className="font-semibold text-emerald-700 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                •••••• (Configured)
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Residential Address */}
        <div className="bg-cream-50 rounded-2xl p-4 sm:p-5 border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cream-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-saffron-600" />
              <span>Residential Address</span>
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-600 hover:text-saffron-700 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Current Residence</span>
              <span className="font-semibold text-temple-900">{data.currentResidence || '—'}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Address</span>
              <span className="font-semibold text-temple-900">{data.fullAddress || '—'}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Pincode</span>
              <span className="font-semibold text-temple-900">{data.pincode || '—'}</span>
            </div>
          </div>
        </div>

        {/* Devotional Program Banner */}
        <div className="p-3.5 bg-saffron-50/80 border border-saffron-200 rounded-2xl flex items-center gap-2.5 text-xs text-saffron-900">
          <CheckCircle2 className="w-4 h-4 text-saffron-600 flex-shrink-0" />
          <span>You are registering for <strong>Gita Amrita</strong> &bull; ISKCON Adilabad.</span>
        </div>
      </div>

      {/* Back & Submit Actions */}
      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-1/3 flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-temple-700 font-medium text-xs sm:text-sm transition-colors focus:outline-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-2/3 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-medium text-xs sm:text-sm shadow-soft hover:shadow-soft-md transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering Participant...</span>
            </>
          ) : (
            <span>Confirm Registration</span>
          )}
        </button>
      </div>
    </div>
  );
}
