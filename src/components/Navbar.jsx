import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar({ onOpenRegister, onOpenLogin, onOpenAdmin, isAdmin, studentUser, isRegistrationOpen = true }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);


  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-cream-100/95 backdrop-blur-md shadow-soft border-b border-cream-300/80'
          : 'bg-cream-100/80 backdrop-blur-sm border-b border-cream-200/60'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Left: Brand & Title */}
          <a
            href="#"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded-lg p-1"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-amber-300 shadow-2xs flex items-center justify-center bg-cream-50 flex-shrink-0 transition-transform group-hover:scale-105">
              <img
                src="/assets/krishna-logo1.webp"
                alt="Sri Krishna"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base sm:text-lg font-bold tracking-tight text-temple-900 leading-tight">
                Gita Amrita
              </span>
              <span className="text-[10px] sm:text-xs text-temple-500 block">
                Bhagavad Gita
              </span>
            </div>
          </a>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-temple-800 hover:text-temple-900 bg-white hover:bg-cream-200/80 border border-cream-300 shadow-2xs transition-all focus:outline-none cursor-pointer"
            >
              {isAdmin ? 'Admin Panel' : 'Login'}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
