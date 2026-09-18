import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Calendar, 
  Clock, 
  MapPin, 
  Monitor, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { fetchBatchesFromFirestore, DEFAULT_BATCHES } from '../../firebase';

const REFERRAL_OPTIONS = [
  'Friend / Family',
  'WhatsApp',
  'YouTube',
  'Instagram',
  'Previous Program',
  'Other',
];

export default function StepBatch({ data, onChange, onNext, onBack, errors }) {
  const [batches, setBatches] = useState(DEFAULT_BATCHES);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function loadBatches() {
      try {
        const remoteBatches = await fetchBatchesFromFirestore();
        if (remoteBatches && remoteBatches.length > 0) {
          setBatches(remoteBatches);
        }
      } catch (err) {
        console.warn('Using default batches fallback', err);
      }
    }
    loadBatches();
  }, []);

  const scrollBatches = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn text-left">
      {/* Step Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Choose Your Batch
        </h2>
        <p className="text-sm text-temple-600 font-normal">
          Select your class schedule and let us know how you heard about us.
        </p>
      </div>

      {/* Horizontally Sliding Batches Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-temple-700">
            Available Batches <span className="text-saffron-600">*</span>
          </label>
          
          {batches.length > 1 && (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => scrollBatches('left')}
                className="p-1 rounded-full hover:bg-cream-200 text-temple-600 transition-colors"
                aria-label="Scroll batches left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBatches('right')}
                className="p-1 rounded-full hover:bg-cream-200 text-temple-600 transition-colors"
                aria-label="Scroll batches right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Sliding Batches Strip */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1 scroll-smooth snap-x scrollbar-thin"
        >
          {batches.map((batch) => {
            const isSelected = data.batchId === batch.id;
            const isOffline = batch.mode?.toLowerCase() === 'offline';

            return (
              <div
                key={batch.id}
                onClick={() => {
                  onChange('batchId', batch.id);
                  onChange('batchTitle', batch.title);
                  onChange('batchSchedule', batch.schedule);
                  onChange('batchMode', batch.mode);
                }}
                className={`min-w-[240px] sm:min-w-[270px] snap-center rounded-2xl p-4 border cursor-pointer transition-all duration-200 text-left flex flex-col justify-between flex-shrink-0 ${
                  isSelected
                    ? 'border-saffron-500 bg-saffron-50/80 shadow-soft ring-2 ring-saffron-500/25'
                    : 'border-cream-300 bg-cream-50 hover:bg-cream-100 hover:border-cream-400'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-bold text-temple-900 tracking-tight">
                      {batch.title}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                        isOffline
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-saffron-100 text-saffron-800 border border-saffron-200'
                      }`}
                    >
                      {isOffline ? <MapPin className="w-2.5 h-2.5" /> : <Monitor className="w-2.5 h-2.5" />}
                      <span>{batch.mode}</span>
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-temple-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-saffron-600" />
                      <span>{batch.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-saffron-600" />
                      <span>{batch.schedule}</span>
                    </div>
                  </div>

                  {batch.location && (
                    <p className="text-[11px] text-temple-500 italic pt-0.5 truncate">
                      {batch.location}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-cream-200/80 flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-saffron-700' : 'text-temple-500'}`}>
                    {isSelected ? 'Selected' : 'Tap to Select'}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-saffron-500 text-white shadow-soft'
                        : 'border border-cream-300 bg-white text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {errors.batchId && (
          <p className="text-xs text-red-600 font-medium pt-0.5">{errors.batchId}</p>
        )}
      </div>

      {/* Referral Source Question */}
      <div className="space-y-2.5 pt-2 border-t border-cream-200/80">
        <label className="block text-xs font-semibold uppercase tracking-wider text-temple-700">
          How did you hear about us?
        </label>
        <div className="flex flex-wrap gap-2">
          {REFERRAL_OPTIONS.map((opt) => {
            const isSelected = data.referralSource === opt;
            return (
              <button
                type="button"
                key={opt}
                onClick={() => onChange('referralSource', opt)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                  isSelected
                    ? 'border-saffron-500 bg-saffron-50 text-saffron-800 font-semibold ring-1 ring-saffron-500/20'
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
      <div className="flex items-center gap-3 pt-3">
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
