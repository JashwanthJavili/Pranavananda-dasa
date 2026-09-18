import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar({ onOpenRegister, onOpenLogin, onOpenAdmin, isAdmin, studentUser }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const loginLabel = isAdmin ? 'Admin Panel' : studentUser ? 'My Dashboard' : 'Login';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'About', href: '#about' },
    { name: 'Guide', href: '#guide' },
    { name: 'Experiences', href: '#experiences' },
    { name: 'FAQ', href: '#faq' },
    { name: 'More', href: '#more' },
  ];

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
          
          {/* Left: ISKCON Logo & Title */}
          <a
            href="#"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded-lg p-1"
          >
            <img
              src="/assets/iskcon_logo.webp"
              alt="ISKCON Logo"
              className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col text-left">
              <span className="text-base sm:text-lg font-semibold tracking-tight text-temple-900 leading-tight">
                Gita Amrita
              </span>
              <span className="text-[11px] sm:text-xs font-normal text-temple-600 tracking-wide">
                ISKCON Adilabad
              </span>
            </div>
          </a>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="px-3.5 py-2 text-sm font-medium text-temple-700 hover:text-saffron-600 rounded-lg hover:bg-cream-200/60 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Right: Actions (Desktop) */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={onOpenLogin}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 ${
                isAdmin || studentUser 
                  ? 'text-saffron-700 bg-saffron-50 hover:bg-saffron-100 border border-saffron-200' 
                  : 'text-temple-700 hover:text-temple-900 hover:bg-cream-200/50'
              }`}
            >
              {loginLabel}
            </button>
            <button
              onClick={onOpenRegister}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 rounded-lg shadow-sm hover:shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2"
            >
              Register Now
            </button>
          </div>

          {/* Mobile Right Controls: Login + Menu Hamburger */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={onOpenLogin}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isAdmin || studentUser 
                  ? 'text-saffron-700 bg-saffron-50 border border-saffron-200' 
                  : 'text-temple-800 hover:bg-cream-200'
              }`}
            >
              {loginLabel}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-temple-700 hover:text-temple-900 hover:bg-cream-200 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer / Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-cream-200 bg-cream-50 px-4 pt-3 pb-6 space-y-2 shadow-lg animate-fadeIn">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="px-4 py-2.5 text-base font-medium text-temple-800 hover:text-saffron-600 hover:bg-cream-200/60 rounded-lg transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-cream-200/80">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRegister();
              }}
              className="w-full py-3 text-center text-sm font-semibold text-white bg-saffron-500 hover:bg-saffron-600 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Register Now
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
