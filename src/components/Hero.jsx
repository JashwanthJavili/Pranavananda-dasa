import React from 'react';
import { ArrowRight, LogIn } from 'lucide-react';

const PETALS = Array.from({ length: 16 }, (_, i) => i * 22.5);
const SPARKLES = [
  { top: '12%', left: '8%', delay: '0s', size: 'text-sm' },
  { top: '28%', left: '92%', delay: '1.4s', size: 'text-base' },
  { top: '70%', left: '5%', delay: '2.6s', size: 'text-xs' },
  { top: '82%', left: '88%', delay: '0.8s', size: 'text-sm' },
  { top: '45%', left: '50%', delay: '3.4s', size: 'text-xs' },
  { top: '6%', left: '62%', delay: '2s', size: 'text-xs' },
];

/** A thin lotus-like ring drawn behind the hero image. */
function Mandala({ className }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="0.6">
        <circle cx="100" cy="100" r="97" />
        <circle cx="100" cy="100" r="88" strokeDasharray="2 4" />
        {PETALS.map((deg) => (
          <ellipse key={deg} cx="100" cy="24" rx="7" ry="17" transform={`rotate(${deg} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="62" strokeDasharray="1 3" />
      </g>
    </svg>
  );
}

export default function Hero({ onOpenRegister }) {
  const openPortal = () => { window.location.hash = 'student-portal'; };

  return (
    <section className="relative overflow-hidden w-full flex items-start lg:items-center pt-6 pb-10 sm:py-12 lg:py-16">
      {/* Soft drifting light */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="lp-drift absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-saffron-200/40 blur-3xl" />
        <div className="lp-drift absolute -bottom-40 -right-24 w-[460px] h-[460px] rounded-full bg-gold-200/50 blur-3xl" style={{ animationDelay: '-9s' }} />
        {SPARKLES.map((s, i) => (
          <span key={i} className={`lp-twinkle absolute text-gold-400 ${s.size}`} style={{ top: s.top, left: s.left, animationDelay: s.delay }}>
            ✦
          </span>
        ))}
      </div>

      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Image */}
          <div className="order-1 lg:order-2 flex justify-center lp-rise" style={{ animationDelay: '0.1s' }}>
            <div className="relative w-full max-w-[22rem] sm:max-w-md">
              <div aria-hidden="true" className="absolute -inset-5 sm:-inset-12 flex items-center justify-center pointer-events-none">
                <Mandala className="lp-spin w-full h-full text-gold-300/80" />
              </div>
              <div aria-hidden="true" className="absolute -inset-2 sm:-inset-4 flex items-center justify-center pointer-events-none">
                <Mandala className="lp-spin-rev w-full h-full text-saffron-300/50" />
              </div>
              <div aria-hidden="true" className="lp-glow absolute inset-4 rounded-full bg-gold-200/70 blur-3xl" />

              <div className="relative">
                <div className="rounded-[2rem] p-2 bg-gradient-to-b from-cream-50 via-gold-100 to-gold-200 shadow-soft-lg ring-1 ring-gold-300/60">
                  <div className="rounded-[1.6rem] overflow-hidden aspect-[4/3] bg-cream-200">
                    <img
                      src="/assets/Krishna-Arjuna.jpg"
                      alt="Lord Krishna imparting the wisdom of the Bhagavad Gita to Arjuna"
                      className="w-full h-full object-cover object-center"
                      loading="eager"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="order-2 lg:order-1 text-center lg:text-left space-y-6">
            <div className="lp-rise" style={{ animationDelay: '0.25s' }}>
              <h1 className="lp-shimmer font-display font-bold tracking-tight leading-[1.05] text-5xl sm:text-6xl lg:text-7xl bg-gradient-to-r from-saffron-700 via-gold-500 to-saffron-700 bg-clip-text text-transparent pb-1">
                Gita for Youth
              </h1>
            </div>

            <div className="lp-rise flex items-center justify-center lg:justify-start gap-3 text-gold-500" style={{ animationDelay: '0.4s' }} aria-hidden="true">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold-400" />
              <span className="text-sm">✦</span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold-400" />
            </div>

            <p className="lp-rise text-base sm:text-lg text-temple-700 leading-relaxed max-w-lg mx-auto lg:mx-0" style={{ animationDelay: '0.55s' }}>
              Discover the purpose of life through the timeless wisdom of the Bhagavad Gita and the teachings of Lord Krishna.
            </p>

            <div className="lp-rise pt-2 flex flex-col items-center lg:items-start w-full sm:w-72 mx-auto lg:mx-0" style={{ animationDelay: '0.7s' }}>
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 rounded-2xl shadow-soft-md hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400 focus-visible:ring-offset-2 cursor-pointer"
              >
                <span>Register Now</span>
                <ArrowRight className="w-4 h-4 animate-cute-arrow" />
              </button>
              <p className="w-full text-center text-sm text-temple-600 mt-5 mb-2">Already registered?</p>
              <button
                type="button"
                onClick={openPortal}
                className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-temple-800 bg-white/70 backdrop-blur-sm border border-gold-300 hover:border-saffron-300 hover:bg-white rounded-2xl shadow-soft hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400 focus-visible:ring-offset-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-saffron-600" />
                <span>Sign in / Sign up</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
