import React from 'react';
import { ArrowRight } from 'lucide-react';

const GENDERS = ['Male', 'Female', 'Prefer not to say'];

export default function StepPersonal({ data, onChange, onNext, errors }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      {/* Step Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Create Your Profile
        </h2>
        <p className="text-sm text-temple-600 font-normal">
          Let's begin with a few simple details.
        </p>
      </div>

      {/* Field: Full Name */}
      <div className="space-y-1.5">
        <label 
          htmlFor="fullName"
          className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
        >
          Full Name <span className="text-saffron-600">*</span>
        </label>
        <input
          id="fullName"
          type="text"
          placeholder="e.g. Ramesh Kumar"
          value={data.fullName || ''}
          onChange={(e) => onChange('fullName', e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
            errors.fullName
              ? 'border-red-400 focus:ring-red-400/40'
              : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
          }`}
        />
        {errors.fullName && (
          <p className="text-xs text-red-600 font-medium pt-0.5">{errors.fullName}</p>
        )}
      </div>

      {/* Field: Age */}
      <div className="space-y-1.5">
        <label 
          htmlFor="age"
          className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
        >
          Age <span className="text-saffron-600">*</span>
        </label>
        <input
          id="age"
          type="number"
          min="5"
          max="110"
          placeholder="e.g. 28"
          value={data.age || ''}
          onChange={(e) => onChange('age', e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
            errors.age
              ? 'border-red-400 focus:ring-red-400/40'
              : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
          }`}
        />
        {errors.age && (
          <p className="text-xs text-red-600 font-medium pt-0.5">{errors.age}</p>
        )}
      </div>

      {/* Field: Gender */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-temple-700">
          Gender <span className="text-saffron-600">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {GENDERS.map((item) => {
            const isSelected = data.gender === item;
            return (
              <button
                type="button"
                key={item}
                onClick={() => onChange('gender', item)}
                className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-medium border text-center transition-all ${
                  isSelected
                    ? 'border-saffron-500 bg-saffron-50 text-saffron-800 font-semibold ring-1 ring-saffron-500/30'
                    : 'border-cream-300 bg-cream-50 text-temple-700 hover:bg-cream-200/60'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
        {errors.gender && (
          <p className="text-xs text-red-600 font-medium pt-0.5">{errors.gender}</p>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-4">
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-base shadow-soft hover:shadow-soft-md transition-all focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
