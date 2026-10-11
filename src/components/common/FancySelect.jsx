import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Accessible custom dropdown (listbox) used everywhere instead of the browser's <select>.
 *  options: [{ value, label, hint?, Icon? }]   (values may be strings or numbers)
 *  size: 'md' form field (full width) · 'sm' compact · 'xs' toolbar / filter
 *  align: 'left' | 'right' (which edge the list lines up with)
 *  className: extra classes for the wrapper (e.g. a width)
 * Opens upwards when there is no room below. Arrow keys, Enter, Escape and typing a letter work.
 */
export default function FancySelect({
  id, ariaLabel, value, onChange, options, size = 'md', align = 'left', disabled, className = '', placeholder = 'Select…',
}) {
  const autoId = useId();
  const baseId = id || `fs-${autoId.replace(/:/g, '')}`;
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const typed = useRef({ text: '', at: 0 });
  const index = options.findIndex((o) => String(o.value) === String(value));
  const selected = index >= 0 ? options[index] : null;

  const openList = () => {
    if (disabled) return;
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) setUp(window.innerHeight - r.bottom < 280 && r.top > window.innerHeight - r.bottom);
    setActive(Math.max(0, index));
    setOpen(true);
  };
  const choose = (o) => {
    onChange(o.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  // Typing letters jumps to the first matching option
  const typeahead = (key) => {
    const now = Date.now();
    typed.current = { text: (now - typed.current.at > 700 ? '' : typed.current.text) + key.toLowerCase(), at: now };
    const i = options.findIndex((o) => String(o.label).toLowerCase().startsWith(typed.current.text));
    if (i >= 0) setActive(i);
  };

  const onButtonKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };
  const onListKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[active]) choose(options[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); buttonRef.current?.focus(); }
    else if (e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) typeahead(e.key);
  };

  const md = size === 'md';
  const xs = size === 'xs';
  const SelIcon = selected?.Icon;

  return (
    <div ref={wrapRef} className={`relative ${md ? 'w-full' : 'inline-block'} ${className}`}>
      <button
        ref={buttonRef}
        id={baseId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}: ${selected?.label ?? placeholder}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKey}
        className={`w-full flex items-center gap-2 rounded-xl bg-white border text-left transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-saffron-400/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs ${
          md ? 'pl-2.5 pr-3 py-2 text-sm' : xs ? 'pl-3 pr-2 py-1.5 text-xs' : 'pl-2 pr-2.5 py-1.5 text-xs sm:text-sm'
        } ${open ? 'border-saffron-300 ring-2 ring-saffron-400/30' : 'border-cream-300 hover:border-gold-300'}`}
      >
        {SelIcon && (
          <span className={`shrink-0 rounded-lg bg-saffron-50 border border-saffron-200 flex items-center justify-center text-saffron-700 ${md ? 'w-8 h-8' : 'w-6 h-6'}`}>
            <SelIcon className={md ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className={`block truncate ${selected ? 'font-medium text-temple-900' : 'text-temple-400'}`}>{selected?.label ?? placeholder}</span>
          {md && selected?.hint && <span className="block text-[11px] text-temple-500 truncate">{selected.hint}</span>}
        </span>
        <ChevronDown className={`${xs ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0 text-temple-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={`${baseId}-opt-${active}`}
          onKeyDown={onListKey}
          className={`absolute z-50 max-h-72 overflow-y-auto overscroll-contain rounded-2xl bg-white border border-cream-200 shadow-soft-lg p-1.5 focus:outline-none animate-fadeIn ${
            up ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${md ? 'w-full min-w-[200px]' : 'min-w-full w-max max-w-[18rem]'} ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {options.map((o, i) => {
            const isSelected = String(o.value) === String(value);
            const Icon = o.Icon;
            return (
              <li
                key={String(o.value)}
                id={`${baseId}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                className={`flex items-center gap-2.5 rounded-xl cursor-pointer transition-colors ${Icon ? 'px-2.5 py-2' : 'px-3 py-2'} ${i === active ? 'bg-saffron-50' : ''}`}
              >
                {Icon && (
                  <span className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${
                    isSelected ? 'bg-saffron-500 border-saffron-500 text-white' : 'bg-cream-50 border-cream-200 text-saffron-700'
                  }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className={`block leading-snug ${xs ? 'text-xs' : 'text-sm'} ${isSelected ? 'font-semibold text-saffron-800' : 'font-medium text-temple-900'}`}>{o.label}</span>
                  {o.hint && <span className="block text-[11px] text-temple-500 leading-snug">{o.hint}</span>}
                </span>
                {isSelected && <Check className="w-4 h-4 shrink-0 text-saffron-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
