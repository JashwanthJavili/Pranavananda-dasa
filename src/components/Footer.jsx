import React from 'react';

export default function Footer({ onOpenLogin }) {
  return (
    <footer className="bg-cream-100 border-t border-cream-200/80 py-6 sm:py-8 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-temple-500 font-normal">
        <p>
          &copy; {new Date().getFullYear()} Gita Amrita &bull; ISKCON Adilabad. All rights reserved.
        </p>
        <div>
          <button
            onClick={onOpenLogin}
            className="hover:text-saffron-600 transition-colors cursor-pointer text-temple-600 font-medium"
          >
            Portal Login
          </button>
        </div>
      </div>
    </footer>
  );
}

