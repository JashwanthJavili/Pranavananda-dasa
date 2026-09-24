import React from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const DISCOVERY_SOURCES = [
  'Yuva setu',
  'Friends',
  'Social media',
  'Others',
];

export default function StepReflections({
  data,
  onChange,
  onNext,
  onBack
}) {
  const handleInputFocus = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn text-left w-full">
      <div className="space-y-5">
        {/* Question 1: What inspires you to join the Bhagavad Gita course? */}
        <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
          <label
            htmlFor="inspirationToJoin"
            className="block text-xs font-semibold text-temple-800 leading-snug"
          >
            What inspires you to join the Bhagavad Gita course? <span className="text-[10px] text-temple-400 font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="inspirationToJoin"
            rows={3}
            maxLength={500}
            placeholder="Enter your answer..."
            value={data.inspirationToJoin || ''}
            onFocus={handleInputFocus}
            onChange={(e) => onChange('inspirationToJoin', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-sm focus:outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 transition-all shadow-2xs resize-none"
          />
        </div>

        {/* Question 2: What would you like to learn or gain from this course? */}
        <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
          <label
            htmlFor="takeawayAspiration"
            className="block text-xs font-semibold text-temple-800 leading-snug"
          >
            What would you like to learn or gain from this course? <span className="text-[10px] text-temple-400 font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="takeawayAspiration"
            rows={3}
            maxLength={500}
            placeholder="Enter your answer..."
            value={data.takeawayAspiration || ''}
            onFocus={handleInputFocus}
            onChange={(e) => onChange('takeawayAspiration', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-sm focus:outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 transition-all shadow-2xs resize-none"
          />
        </div>

        {/* Question 3: If you could ask one question to HG Pranavananda Prabhu, what would it be? */}
        <div className="space-y-1.5 scroll-mt-24 scroll-mb-36">
          <label
            htmlFor="questionForPranavanandaPrabhu"
            className="block text-xs font-semibold text-temple-800 leading-snug"
          >
            If you could ask one question to HG Pranavananda Prabhu, what would it be? <span className="text-[10px] text-temple-400 font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="questionForPranavanandaPrabhu"
            rows={3}
            maxLength={500}
            placeholder="Enter your answer..."
            value={data.questionForPranavanandaPrabhu || ''}
            onFocus={handleInputFocus}
            onChange={(e) => onChange('questionForPranavanandaPrabhu', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-sm focus:outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 transition-all shadow-2xs resize-none"
          />
        </div>

        {/* Question 4: How did you hear about the Bhagavad Gita course? */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-temple-800 leading-snug">
            How did you hear about the Bhagavad Gita course? <span className="text-[10px] text-temple-400 font-normal lowercase">(optional)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DISCOVERY_SOURCES.map((source) => {
              const isSelected = data.sourceOfDiscovery === source;
              return (
                <button
                  type="button"
                  key={source}
                  onClick={() => onChange('sourceOfDiscovery', isSelected ? '' : source)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer flex items-center justify-center min-h-[44px] ${isSelected
                      ? 'border-saffron-500 bg-saffron-50 text-saffron-800 font-semibold ring-1 ring-saffron-500/25 shadow-soft'
                      : 'border-cream-300 bg-white text-temple-700 hover:bg-cream-100/70 shadow-2xs'
                    }`}
                >
                  <span className="leading-tight">{source}</span>
                </button>
              );
            })}
          </div>

          {/* If "Others" is chosen */}
          {(data.sourceOfDiscovery === 'Others' || data.sourceOfDiscovery === 'Other') && (
            <div className="space-y-1 pt-1 animate-fadeIn scroll-mt-24 scroll-mb-36">
              <label
                htmlFor="sourceOfDiscoveryOther"
                className="block text-[11px] font-semibold text-temple-700 uppercase tracking-wider"
              >
                Specify other source <span className="text-[10px] text-temple-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                id="sourceOfDiscoveryOther"
                type="text"
                placeholder="Enter your answer..."
                value={data.sourceOfDiscoveryOther || ''}
                onFocus={handleInputFocus}
                onChange={(e) => onChange('sourceOfDiscoveryOther', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-sm focus:outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 transition-all shadow-2xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Back & Continue Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="w-1/3 flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-temple-700 font-semibold text-xs sm:text-sm shadow-2xs transition-colors focus:outline-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="submit"
          className="w-2/3 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-xs sm:text-sm shadow-soft hover:shadow-soft-md transition-all focus:outline-none focus:ring-4 focus:ring-saffron-500/20 cursor-pointer transform hover:-translate-y-0.5"
        >
          <span>Continue to Review</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
