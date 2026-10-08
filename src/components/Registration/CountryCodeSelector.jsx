import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { COUNTRY_CODES, getCountryByCode } from '../../data/countryCodes';

export default function CountryCodeSelector({
  value = '+91',
  onChange,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const activeItemRef = useRef(null);

  // Find currently selected country metadata
  const selectedCountry = useMemo(() => {
    return getCountryByCode(value);
  }, [value]);

  // Filtered countries based on search
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    const qNoPlus = q.startsWith('+') ? q.slice(1) : q;
    
    return COUNTRY_CODES.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchCode = c.code.toLowerCase().includes(q) || c.code.replace('+', '').includes(qNoPlus);
      const matchIso = c.iso.toLowerCase() === q;
      return matchName || matchCode || matchIso;
    });
  }, [searchQuery]);

  const handleOpen = () => {
    if (disabled) return;
    setSearchQuery('');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelect = (code) => {
    onChange(code);
    handleClose();
  };

  // Close on Click Outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Scroll active selected item into view on open without stealing input focus
    const timer = setTimeout(() => {
      if (activeItemRef.current) {
        activeItemRef.current.scrollIntoView({ block: 'nearest' });
      }
    }, 40);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      clearTimeout(timer);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative flex-shrink-0 ${className}`}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select country code. Current: ${selectedCountry.name} (${selectedCountry.code})`}
        className={`flex items-center gap-1.5 px-3.5 py-3 rounded-xl border border-cream-300 bg-white text-temple-900 text-sm sm:text-base font-medium transition-all duration-150 cursor-pointer shadow-2xs select-none hover:border-saffron-400 hover:bg-cream-50/60 focus:outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 active:scale-[0.98] ${
          isOpen ? 'border-saffron-500 ring-2 ring-saffron-500/20 bg-saffron-50/20' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="font-semibold text-temple-900 text-xs sm:text-sm tracking-tight">
          {selectedCountry.code}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-temple-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-saffron-600' : ''
          }`}
        />
      </button>

      {/* Compact Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white border border-cream-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col animate-fadeIn"
          style={{ maxHeight: '310px' }}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-cream-200/80 bg-cream-50/60 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-temple-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 focus:outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 text-temple-400 hover:text-temple-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Country List */}
          <div className="overflow-y-auto flex-1 divide-y divide-cream-100/60 overscroll-contain">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = value === country.code;
                return (
                  <button
                    key={`${country.iso}-${country.code}`}
                    ref={isSelected ? activeItemRef : null}
                    type="button"
                    onClick={() => handleSelect(country.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-saffron-50/90 text-saffron-950 font-semibold'
                        : 'hover:bg-cream-100/70 text-temple-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className={`truncate text-xs ${isSelected ? 'font-semibold text-saffron-950' : 'text-temple-900'}`}>
                        {country.name}
                      </span>
                      <span className={`text-[10px] font-mono flex-shrink-0 ${isSelected ? 'text-saffron-700' : 'text-temple-400'}`}>
                        ({country.iso})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-mono font-medium ${isSelected ? 'font-bold text-saffron-700' : 'text-temple-600 group-hover:text-temple-900'}`}>
                        {country.code}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-temple-500">
                Please enter correct country name or code
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
