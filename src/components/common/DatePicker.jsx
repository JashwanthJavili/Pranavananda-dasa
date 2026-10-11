import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (n) => String(n).padStart(2, '0');
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/**
 * Date field with a calendar popover (replaces the browser's <input type="date">).
 *  value / onChange: 'YYYY-MM-DD' strings ('' when empty) · clearable: show ✕ to empty it
 */
export default function DatePicker({ id, value, onChange, placeholder = 'Pick a date', ariaLabel, clearable = true, size = 'sm', align = 'left' }) {
  const date = fromIso(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = date || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open && date) setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setOpen((o) => !o);
  };
  const pick = (d) => {
    onChange(toIso(d));
    setOpen(false);
  };

  const today = new Date();
  const same = (a, b) => a && b && toIso(a) === toIso(b);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + i));
  const text = date ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const sm = size === 'sm';

  return (
    <div ref={ref} className="relative w-full">
      <button
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${ariaLabel || 'Date'}: ${text || 'not set'}`}
        className={`w-full flex items-center gap-2 rounded-xl bg-white border text-left transition cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-saffron-400/40 ${
          sm ? 'pl-2 pr-2 py-1.5 text-xs' : 'pl-2.5 pr-3 py-2 text-sm'
        } ${open ? 'border-saffron-300 ring-2 ring-saffron-400/30' : 'border-cream-300 hover:border-gold-300'}`}
      >
        <CalendarDays className={`${sm ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0 text-saffron-600`} />
        <span className={`flex-1 min-w-0 truncate ${text ? 'font-medium text-temple-900' : 'text-temple-400'}`}>{text || placeholder}</span>
        {clearable && value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onChange(''); } }}
            className="p-0.5 rounded-md text-temple-400 hover:text-temple-800 hover:bg-cream-100"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Choose date" className={`absolute z-50 mt-2 ${align === 'right' ? 'right-0' : 'left-0'} w-[280px] max-w-[85vw] rounded-2xl bg-white border border-cream-200 shadow-soft-lg p-3 space-y-2 animate-fadeIn`}>
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-cream-100 text-temple-600 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold text-temple-900">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
            <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-cream-100 text-temple-600 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((w) => <span key={w} className="text-[10px] font-semibold text-temple-400 py-1">{w}</span>)}
            {days.map((d) => {
              const inMonth = d.getMonth() === month.getMonth();
              const selected = same(d, date);
              const isToday = same(d, today);
              return (
                <button
                  key={toIso(d)}
                  type="button"
                  onClick={() => pick(d)}
                  aria-label={d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  aria-pressed={selected}
                  className={`h-8 rounded-lg text-xs transition cursor-pointer ${
                    selected ? 'bg-saffron-500 text-white font-bold shadow-soft'
                      : isToday ? 'text-saffron-700 font-bold ring-1 ring-saffron-300 hover:bg-saffron-50'
                        : inMonth ? 'text-temple-800 hover:bg-saffron-50' : 'text-temple-300 hover:bg-cream-100'
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between border-t border-cream-200 pt-2">
            <button type="button" onClick={() => pick(today)} className="text-xs font-semibold text-saffron-700 hover:underline cursor-pointer">Today</button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-medium text-temple-500 hover:text-temple-800 cursor-pointer">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
