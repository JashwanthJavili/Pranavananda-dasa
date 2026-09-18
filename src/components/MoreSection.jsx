import React from 'react';
import { Sparkles } from 'lucide-react';

export default function MoreSection() {
  return (
    <section id="more" className="py-16 sm:py-20 bg-cream-50 border-t border-cream-200/80">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        <div className="bg-cream-100/70 rounded-3xl p-8 sm:p-12 border border-dashed border-cream-300 flex flex-col items-center justify-center space-y-4">
          
          <div className="w-10 h-10 rounded-full bg-saffron-100 flex items-center justify-center text-saffron-600 mb-1">
            <Sparkles className="w-5 h-5" />
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-temple-900">
            More From Our Journey
          </h3>

          <p className="text-sm sm:text-base text-temple-600 max-w-md font-normal leading-relaxed">
            More spiritual learning programs and activities will be shared here.
          </p>

          <span className="inline-block text-[11px] uppercase tracking-widest text-saffron-700 bg-saffron-50 border border-saffron-200/70 rounded-full px-3 py-1 font-semibold">
            Coming Soon
          </span>

        </div>

      </div>
    </section>
  );
}
