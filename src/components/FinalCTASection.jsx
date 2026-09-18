import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function FinalCTASection({ onOpenRegister }) {
  return (
    <section className="py-20 sm:py-24 bg-cream-100 border-t border-cream-200 text-center">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        <div className="w-12 h-1 bg-saffron-500 mx-auto rounded-full" />

        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-temple-900 leading-tight">
          Begin Your Gita Journey
        </h2>

        <p className="text-base sm:text-lg text-temple-700 leading-relaxed font-normal max-w-xl mx-auto">
          Take the first step towards understanding the timeless wisdom of the Bhagavad Gita.
        </p>

        <div className="pt-2">
          <button
            onClick={onOpenRegister}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-base font-semibold text-white bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 rounded-xl shadow-soft hover:shadow-soft-md transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500"
          >
            <span>Register Now</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <p className="text-xs text-temple-500 pt-1">
          Open to all seekers &bull; Simple &amp; practical learning
        </p>

      </div>
    </section>
  );
}
