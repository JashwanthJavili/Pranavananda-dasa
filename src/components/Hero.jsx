import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';

export default function Hero({ onOpenRegister }) {
  const scrollToAbout = (e) => {
    e.preventDefault();
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-20 lg:pb-32">
      {/* Gentle background accent aura */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-saffron-100/50 via-gold-100/30 to-transparent blur-3xl opacity-70"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left / Top Text Content (7 cols on desktop) */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6 sm:space-y-7 order-2 lg:order-1">
            
            {/* Small ISKCON Adilabad Header Badge without logo */}
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-cream-200/80 border border-cream-300 text-temple-700 shadow-sm mx-auto lg:mx-0">
              <span className="text-xs sm:text-sm font-medium tracking-wide">
                ISKCON Adilabad Presents
              </span>
            </div>

            {/* Main Title and Subtitle */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-temple-900 leading-[1.15]">
                Gita Amrita
              </h1>
              <p className="text-xl sm:text-2xl font-medium text-saffron-600 tracking-tight">
                Bhagavad Gita Classes
              </p>
            </div>

            {/* Humble Description */}
            <p className="text-base sm:text-lg text-temple-700 leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
              A humble journey to understand the timeless wisdom of the Bhagavad Gita and bring its teachings into our daily lives.
            </p>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-5">
              <button
                onClick={onOpenRegister}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-base font-semibold text-white bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 rounded-xl shadow-soft hover:shadow-soft-md transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2"
              >
                <span>Register Now</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <a
                href="#about"
                onClick={scrollToAbout}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-temple-600 hover:text-saffron-600 transition-colors py-2 px-3"
              >
                <span>Learn About the Program</span>
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </a>
            </div>

          </div>

          {/* Right / Top Hero Image (5 cols on desktop, large on mobile) */}
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
                  {/* Subtle inner devotional vignette */}
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
