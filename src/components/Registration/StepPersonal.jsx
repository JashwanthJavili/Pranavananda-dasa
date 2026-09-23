import React from 'react';
import { ArrowRight, Briefcase, GraduationCap } from 'lucide-react';

const GENDERS = ['Male', 'Female'];

const OCCUPATIONS = [
  'Student',
  'Working Professional',
  'Homemaker',
  'Business / Self-employed',
  'Other',
];

export default function StepPersonal({ data, onChange, onNext, errors }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFormValid) {
      onNext();
    }
  };

  const handleInputFocus = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const ageNum = parseInt(data.age, 10);
  const isNameValid = Boolean(data.fullName && data.fullName.trim().length >= 2);
  const isAgeValid = Boolean(data.age && !isNaN(ageNum) && ageNum >= 16 && ageNum <= 30);
  const isAgeInvalid = Boolean(data.age && data.age.trim() !== '' && !isAgeValid);
  const isGenderValid = Boolean(data.gender === 'Male' || data.gender === 'Female');
  const isEducationValid = Boolean(data.education && data.education.trim().length >= 2);
  const isOccupationValid = Boolean(
    data.occupation &&
    (data.occupation !== 'Other' || (data.otherOccupation && data.otherOccupation.trim().length > 0))
  );

  const isFormValid = isNameValid && isAgeValid && isGenderValid && isEducationValid && isOccupationValid;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 animate-fadeIn text-left">
      {/* Step Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Personal Profile
        </h2>
        <p className="text-xs sm:text-sm text-temple-600 font-normal">
          Let's start with your basic information.
        </p>
      </div>

      {/* Field: Full Name */}
      <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
        <label 
          htmlFor="fullName"
          className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
        >
          Full Name <span className="text-saffron-600">*</span>
        </label>
        <input
          id="fullName"
          type="text"
          placeholder="Enter full name"
          value={data.fullName || ''}
          onFocus={handleInputFocus}
          onChange={(e) => {
            const noDigits = e.target.value.replace(/\d/g, '');
            onChange('fullName', noDigits);
          }}
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

      {/* Field: Age & Gender */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Age */}
        <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
          <label 
            htmlFor="age"
            className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
          >
            Age <span className="text-saffron-600">*</span>
          </label>
          <input
            id="age"
            type="text"
            inputMode="numeric"
            maxLength={3}
            placeholder="Enter age (16 - 30)"
            value={data.age || ''}
            onFocus={handleInputFocus}
            onChange={(e) => {
              const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 3);
              onChange('age', numericOnly);
            }}
            className={`w-full px-4 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
              (errors.age || isAgeInvalid)
                ? 'border-red-400 focus:ring-red-400/40'
                : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
            }`}
          />
          {(errors.age || isAgeInvalid) && (
            <p className="text-xs text-red-600 font-medium pt-0.5 animate-fadeIn">
              {errors.age || 'Age must be between 16 and 30 years.'}
            </p>
          )}
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-temple-700">
            Gender <span className="text-saffron-600">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((item) => {
              const isSelected = data.gender === item;
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => onChange('gender', item)}
                  className={`py-3 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
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
      </div>

      {/* Field: Educational Qualification (Textbox above Occupation) */}
      <div className="space-y-1.5 pt-1 border-t border-cream-200 scroll-mt-24 scroll-mb-36">
        <label 
          htmlFor="education"
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-temple-700"
        >
          <GraduationCap className="w-3.5 h-3.5 text-saffron-600" />
          <span>Educational Qualification <span className="text-saffron-600">*</span></span>
        </label>
        <input
          id="education"
          type="text"
          placeholder="Enter your qualification (e.g. B.Tech, Degree, Intermediate, MBA, Diploma)"
          value={data.education || ''}
          onFocus={handleInputFocus}
          onChange={(e) => onChange('education', e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
            errors.education
              ? 'border-red-400 focus:ring-red-400/40'
              : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
          }`}
        />
        {errors.education && (
          <p className="text-xs text-red-600 font-medium pt-0.5 animate-fadeIn">{errors.education}</p>
        )}
      </div>

      {/* Field: Occupation / Profession */}
      <div className="space-y-2 pt-1 border-t border-cream-200">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-temple-700">
          <Briefcase className="w-3.5 h-3.5 text-saffron-600" />
          <span>Occupation / Profession <span className="text-saffron-600">*</span></span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {OCCUPATIONS.map((occ) => {
            const isSelected = data.occupation === occ;
            return (
              <button
                type="button"
                key={occ}
                onClick={() => onChange('occupation', occ)}
                className={`py-2.5 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[48px] ${
                  isSelected
                    ? 'border-saffron-500 bg-saffron-50 text-saffron-800 font-semibold ring-1 ring-saffron-500/25 shadow-2xs'
                    : 'border-cream-300 bg-cream-50 text-temple-700 hover:bg-cream-200/60'
                }`}
              >
                {occ === 'Business / Self-employed' ? (
                  <span className="leading-tight">
                    Business /<br />Self-employed
                  </span>
                ) : (
                  <span>{occ}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Text Input when "Other" is selected */}
        {data.occupation === 'Other' && (
          <div className="space-y-1 pt-2 animate-fadeIn scroll-mt-24 scroll-mb-36">
            <label 
              htmlFor="otherOccupation" 
              className="block text-[11px] font-semibold text-temple-700 uppercase tracking-wider"
            >
              Specify Your Occupation / Profession <span className="text-saffron-600">*</span>
            </label>
            <input
              id="otherOccupation"
              type="text"
              placeholder="Enter your occupation / profession"
              value={data.otherOccupation || ''}
              onFocus={handleInputFocus}
              onChange={(e) => onChange('otherOccupation', e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border bg-cream-50 text-temple-900 placeholder:text-temple-400 text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.otherOccupation
                  ? 'border-red-400 focus:ring-red-400/40'
                  : 'border-cream-300 focus:border-saffron-500 focus:ring-saffron-500/20'
              }`}
            />
            {errors.otherOccupation && (
              <p className="text-xs text-red-600 font-medium pt-0.5">{errors.otherOccupation}</p>
            )}
          </div>
        )}

        {errors.occupation && (
          <p className="text-xs text-red-600 font-medium pt-0.5">{errors.occupation}</p>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-3">
        <button
          type="submit"
          disabled={!isFormValid}
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium text-sm sm:text-base transition-all focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 ${
            isFormValid
              ? 'bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white shadow-soft hover:shadow-soft-md cursor-pointer'
              : 'bg-cream-300 text-temple-400 cursor-not-allowed opacity-75'
          }`}
        >
          <span>Continue to Contact &amp; Address</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
