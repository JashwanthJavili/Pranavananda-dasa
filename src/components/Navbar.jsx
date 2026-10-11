import React from 'react';
import { Home } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 bg-cream-50/90 backdrop-blur-md border-b border-gold-200/70 shadow-soft">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-[72px] flex items-center justify-between gap-2">
        <BrandLogo />
        <nav className="flex items-center gap-2 flex-shrink-0">
          <a
            href="https://pranavanandadas.com/home"
            aria-label="Home"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-cream-300 bg-white hover:bg-cream-100 hover:border-gold-300 text-temple-700 hover:text-temple-900 font-medium text-xs sm:text-sm shadow-soft transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-saffron-400/50 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
