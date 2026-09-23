import React from 'react';
import { ArrowLeft, ArrowRight, Edit3, Loader2, CheckCircle2, ShieldCheck, User, Phone } from 'lucide-react';

export default function StepReview({ 
  data, 
  onBack, 
  onGoToStep, 
  onSubmit, 
  isSubmitting 
}) {
  const [isConfirmed, setIsConfirmed] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConfirmed) return;
    onSubmit(e);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Step Header */}
      <div className="space-y-1 text-center sm:text-left border-b border-cream-200/80 pb-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-temple-900">
          Review &amp; Confirm
        </h2>
        <p className="text-xs sm:text-sm text-temple-600 font-normal">
          Please verify your details before submitting your registration.
        </p>
      </div>

      <div className="space-y-4">
        {/* Section 1: Participant Details */}
        <div className="bg-cream-100/60 rounded-2xl p-4 sm:p-5 border border-cream-200/90 shadow-soft space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-cream-200/70">
            <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-saffron-600" />
              <span>Participant Details</span>
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(1)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-700 hover:text-saffron-800 bg-saffron-50 hover:bg-saffron-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs sm:text-sm">
            <div className="col-span-2 sm:col-span-1">
              <span className="text-temple-400 block text-[10px] uppercase font-semibold tracking-wider">Full Name</span>
              <span className="font-semibold text-temple-900 truncate block">{data.fullName || '—'}</span>
            </div>
            <div>
              <span className="text-temple-400 block text-[10px] uppercase font-semibold tracking-wider">Age</span>
              <span className="font-semibold text-temple-900">{data.age || '—'} yrs</span>
            </div>
            <div>
              <span className="text-temple-400 block text-[10px] uppercase font-semibold tracking-wider">Gender</span>
              <span className="font-semibold text-temple-900">{data.gender || '—'}</span>
            </div>
            <div>
              <span className="text-temple-400 block text-[10px] uppercase font-semibold tracking-wider">Qualification</span>
              <span className="font-semibold text-temple-900 truncate block">{data.education || '—'}</span>
            </div>
            <div>
              <span className="text-temple-400 block text-[10px] uppercase font-semibold tracking-wider">Occupation</span>
              <span className="font-semibold text-temple-900 truncate block">
                {data.occupation === 'Other' && data.otherOccupation ? `Other (${data.otherOccupation})` : (data.occupation || '—')}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="bg-cream-100/60 rounded-2xl p-4 sm:p-5 border border-cream-200/90 shadow-soft space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-cream-200/70">
            <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-saffron-600" />
              <span>Contact Details</span>
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-700 hover:text-saffron-800 bg-saffron-50 hover:bg-saffron-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-temple-400 block text-[10px] uppercase font-semibold tracking-wider">Mobile Number</span>
              <span className="font-semibold text-temple-900 font-mono sm:font-sans">{data.countryCode || '+91'} {data.mobile}</span>
            </div>
            <div>
              <span className="text-temple-400 block text-[10px] uppercase font-semibold tracking-wider">Email Address</span>
              <span className="font-semibold text-temple-900 truncate block">{data.email}</span>
            </div>
          </div>
        </div>

        {/* Information Confirmation Checkbox */}
        <label className="p-4 rounded-2xl border border-cream-300 bg-cream-100/60 hover:bg-cream-200/60 flex items-center gap-3 text-xs sm:text-sm cursor-pointer transition-all select-none shadow-2xs">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            className="w-4 h-4 rounded border-cream-400 text-saffron-600 focus:ring-0 accent-saffron-600 cursor-pointer flex-shrink-0"
          />
          <span className="font-normal text-temple-800">
            I confirm that the information provided is correct.
          </span>
        </label>
      </div>

      {/* Back & Submit Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-1/3 flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-temple-700 font-semibold text-xs sm:text-sm shadow-2xs transition-colors focus:outline-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting || !isConfirmed}
          className="w-2/3 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-xs sm:text-sm shadow-soft hover:shadow-soft-md transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-saffron-500/20 cursor-pointer transform hover:-translate-y-0.5"
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
