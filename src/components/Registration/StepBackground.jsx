import React from 'react';
import { ArrowRight, ArrowLeft, Briefcase, BookOpen } from 'lucide-react';

const OCCUPATIONS = [
  'Student',
  'Working Professional',
  'Homemaker',
  'Business / Self-employed',
  'Retired',
  'Other',
];

const GITA_EXPERIENCE_OPTIONS = [
  'Beginner / First time',
  'Read a few verses / chapters',
  'Completed reading previously',
];

export default function StepBackground({ data, onChange, onNext, onBack }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn text-left">
      {/* Step Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Your Background
        </h2>
        <p className="text-sm text-temple-600 font-normal">
          Tell us a little about your profession and prior experience with the Gita.
        </p>
      </div>

      {/* Field 1: Occupation / Profession */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-temple-700">
          <Briefcase className="w-4 h-4 text-saffron-600" />
          <span>Occupation / Profession <span className="text-saffron-600">*</span></span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {OCCUPATIONS.map((occ) => {
            const isSelected = (data.occupation || 'Student') === occ;
            return (
              <button
                type="button"
                key={occ}
                onClick={() => onChange('occupation', occ)}
                className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-medium border text-center transition-all ${
                  isSelected
                    ? 'border-saffron-500 bg-saffron-50 text-saffron-800 font-semibold ring-1 ring-saffron-500/25 shadow-soft'
                    : 'border-cream-300 bg-cream-50 text-temple-700 hover:bg-cream-200/60'
                }`}
              >
                {occ}
              </button>
            );
          })}
        </div>
      </div>

      {/* Field 2: Prior Familiarity with Bhagavad Gita */}
      <div className="space-y-2.5 pt-2 border-t border-cream-200/80">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-temple-700">
          <BookOpen className="w-4 h-4 text-saffron-600" />
          <span>Familiarity with the Bhagavad Gita <span className="text-saffron-600">*</span></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {GITA_EXPERIENCE_OPTIONS.map((opt) => {
            const isSelected = (data.gitaExperience || GITA_EXPERIENCE_OPTIONS[0]) === opt;
            return (
              <button
                type="button"
                key={opt}
                onClick={() => onChange('gitaExperience', opt)}
                className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-medium border text-left sm:text-center transition-all ${
                  isSelected
                    ? 'border-saffron-500 bg-saffron-50 text-saffron-800 font-semibold ring-1 ring-saffron-500/25 shadow-soft'
                    : 'border-cream-300 bg-cream-50 text-temple-700 hover:bg-cream-200/60'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Back & Continue Actions */}
      <div className="flex items-center gap-3 pt-4">
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
          className="w-2/3 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-sm sm:text-base shadow-soft hover:shadow-soft-md transition-all focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
