import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero({ onOpenRegister }) {
  return (
    <section className="relative overflow-hidden pt-8 pb-14 sm:pt-14 sm:pb-20 lg:pt-18 lg:pb-28">
      {/* Gentle background accent aura */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-saffron-100/50 via-gold-100/30 to-transparent blur-3xl opacity-70"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left / Top Text Content */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6 sm:space-y-7 order-2 lg:order-1">
            
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cream-200/80 border border-cream-300 text-temple-700 shadow-sm mx-auto lg:mx-0">
              <Sparkles className="w-3.5 h-3.5 text-saffron-600" />
              <span className="text-xs sm:text-sm font-medium tracking-wide">
                Sacred Wisdom Sessions
              </span>
            </div>

            {/* Main Title */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-temple-900 leading-[1.15]">
                Gita for Youth
              </h1>
            </div>

            {/* Humble Description */}
            <p className="text-base sm:text-lg text-temple-700 leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
              A humble journey to understand the timeless wisdom of the Bhagavad Gita and bring its sacred teachings into our daily lives.
            </p>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={onOpenRegister}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-base font-semibold text-white bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 rounded-2xl shadow-soft hover:shadow-soft-md transition-all duration-200 group focus:outline-none cursor-pointer"
              >
                <span>Register Now</span>
                <ArrowRight className="w-4 h-4 animate-cute-arrow" />
              </button>
            </div>

          </div>

          {/* Right / Top Hero Image */}
          <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center">
            <div className="relative w-full max-w-md lg:max-w-none">
              {/* Soft warm frame & glow */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden p-2 sm:p-2.5 bg-gradient-to-b from-cream-50 via-cream-200 to-cream-300 shadow-soft-lg border border-cream-300/80">
                <div className="relative rounded-xl sm:rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[4/3] lg:aspect-[4/3.2] bg-cream-200">
                  <img
                    src="/assets/Krishna-Arjuna.jpg"
                    alt="Lord Krishna imparting the sacred wisdom of the Bhagavad Gita to Arjuna"
                    className="w-full h-full object-cover object-center transform hover:scale-102 transition-transform duration-700 ease-out"
                    loading="eager"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-xl sm:rounded-2xl pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
