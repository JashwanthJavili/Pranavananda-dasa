import React from 'react';

export default function Footer({ onOpenRegister, onOpenLogin, onOpenAdmin }) {
  const handleLinkClick = (e, href) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-cream-100 border-t border-cream-300/80 py-12 sm:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        
        {/* Brand: Logo & Title */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <img
            src="/assets/iskcon_logo.webp"
            alt="ISKCON Logo"
            className="h-11 w-auto object-contain"
          />
          <div className="text-center sm:text-left">
            <span className="text-lg font-bold text-temple-900 block leading-tight">
              Gita Amrita
            </span>
            <span className="text-xs text-temple-600 block">
              Presented by ISKCON Adilabad
            </span>
          </div>
        </div>

        {/* Simple Navigation Links */}
        <nav className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 text-sm font-medium text-temple-700">
          <a
            href="#about"
            onClick={(e) => handleLinkClick(e, '#about')}
            className="hover:text-saffron-600 transition-colors"
          >
            About
          </a>
          <a
            href="#guide"
            onClick={(e) => handleLinkClick(e, '#guide')}
            className="hover:text-saffron-600 transition-colors"
          >
            Guide
          </a>
          <a
            href="#experiences"
            onClick={(e) => handleLinkClick(e, '#experiences')}
            className="hover:text-saffron-600 transition-colors"
          >
            Experiences
          </a>
          <a
            href="#faq"
            onClick={(e) => handleLinkClick(e, '#faq')}
            className="hover:text-saffron-600 transition-colors"
          >
            FAQ
          </a>
          <button
            onClick={onOpenLogin}
            className="hover:text-saffron-600 transition-colors"
          >
            Login
          </button>
          <button
            onClick={onOpenRegister}
            className="text-saffron-600 hover:text-saffron-700 font-semibold transition-colors"
          >
            Register
          </button>
        </nav>

        {/* Subtle separator */}
        <div className="w-16 h-px bg-cream-300 mx-auto" />

        {/* Bottom Devotional Note & Sacred Mahamantra */}
        <div className="space-y-2 text-xs text-temple-500">
          <p>
            &copy; {new Date().getFullYear()} Gita Amrita &bull; Dedicated to the service of Srila Prabhupada &amp; Lord Krishna.
          </p>
          <p className="italic text-temple-600 font-normal">
            Hare Krishna Hare Krishna Krishna Krishna Hare Hare &bull; Hare Rama Hare Rama Rama Rama Hare Hare
          </p>
        </div>

      </div>
    </footer>
  );
}
