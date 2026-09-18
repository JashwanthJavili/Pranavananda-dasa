import React from 'react';
import { ArrowLeft, ArrowRight, Edit3, Loader2 } from 'lucide-react';

export default function StepReview({ 
  data, 
  onBack, 
  onGoToStep, 
  onSubmit, 
  isSubmitting 
}) {
  const [isConfirmed, setIsConfirmed] = React.useState(false);

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Step Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Review Your Details
        </h2>
        <p className="text-sm text-temple-600 font-normal">
          Please verify your information before confirming your registration.
        </p>
      </div>

      <div className="space-y-3.5">
        {/* Section 1: Personal Details */}
        <div className="bg-cream-50 rounded-2xl p-4 sm:p-5 border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cream-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800">
              Personal Details
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(1)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-600 hover:text-saffron-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs sm:text-sm">
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Full Name</span>
              <span className="font-semibold text-temple-900">{data.fullName || '—'}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Age</span>
              <span className="font-semibold text-temple-900">{data.age || '—'} years</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Gender</span>
              <span className="font-semibold text-temple-900">{data.gender || '—'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="bg-cream-50 rounded-2xl p-4 sm:p-5 border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cream-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800">
              Contact &amp; Location
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-600 hover:text-saffron-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Mobile Number</span>
              <span className="font-semibold text-temple-900">{data.countryCode} {data.mobile}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Email Address</span>
              <span className="font-semibold text-temple-900">{data.email}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">City</span>
              <span className="font-semibold text-temple-900">{data.city}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Area</span>
              <span className="font-semibold text-temple-900">{data.area}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Your Background */}
        <div className="bg-cream-50 rounded-2xl p-4 sm:p-5 border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cream-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800">
              Your Background
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(3)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-600 hover:text-saffron-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Occupation</span>
              <span className="font-semibold text-temple-900">{data.occupation || 'Student'}</span>
            </div>
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Gita Familiarity</span>
              <span className="font-semibold text-temple-900">{data.gitaExperience || 'Beginner'}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Batch & Referral */}
        <div className="bg-cream-50 rounded-2xl p-4 sm:p-5 border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cream-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800">
              Batch &amp; Referral
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(4)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-600 hover:text-saffron-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
            <div>
              <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Selected Batch</span>
              <span className="font-semibold text-temple-900 block">
                {data.batchTitle || 'Bhagavad Gita'} ({data.batchMode})
              </span>
              <span className="text-xs text-saffron-700 font-medium">
                {data.batchSchedule}
              </span>
            </div>

            {data.referralSource && (
              <div>
                <span className="text-temple-500 block text-[11px] uppercase tracking-wide">Heard About Us</span>
                <span className="font-semibold text-temple-900">{data.referralSource}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Declaration with Checkbox */}
      <div className="pt-2">
        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-cream-50 border border-cream-300/80 cursor-pointer select-none hover:bg-cream-100/60 transition-colors">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded text-saffron-600 focus:ring-saffron-500 border-cream-300 cursor-pointer accent-saffron-600 flex-shrink-0"
          />
          <span className="text-xs sm:text-sm text-temple-800 leading-relaxed font-normal">
            By submitting this registration, I confirm that the information provided is correct.
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-1/3 flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-temple-700 font-medium text-sm sm:text-base transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !isConfirmed}
          className={`w-2/3 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm sm:text-base transition-all focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 ${
            isConfirmed && !isSubmitting
              ? 'bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white shadow-soft hover:shadow-soft-md cursor-pointer'
              : 'bg-cream-300 text-temple-400 cursor-not-allowed border border-cream-300 opacity-70'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirming...</span>
            </>
          ) : (
            <>
              <span>Confirm Registration</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
