import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import BrandLogo from './BrandLogo';

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
            className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded-lg p-1"
          >
            <BrandLogo />
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
