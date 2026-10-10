import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X, ChevronDown } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const pad = (n) => String(n).padStart(2, '0');
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatDate = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const formatTime = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).replace(/\b(am|pm)\b/i, (s) => s.toUpperCase());

/** Open/close a popover and close it on outside click or Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
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
  return { open, setOpen, ref };
}

function FieldButton({ id, icon: Icon, text, placeholder, open, onClick, onClear, label }) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={label}
      className={`w-full flex items-center gap-2 pl-2 pr-2.5 py-2 rounded-xl bg-white border text-left text-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-saffron-400/40 ${
        open ? 'border-saffron-300 ring-2 ring-saffron-400/30' : 'border-cream-300 hover:border-gold-300'
      }`}
    >
      <span className="shrink-0 w-8 h-8 rounded-lg bg-saffron-50 border border-saffron-200 flex items-center justify-center text-saffron-700">
        <Icon className="w-4 h-4" />
      </span>
      <span className={`flex-1 min-w-0 truncate ${text ? 'font-medium text-temple-900' : 'text-temple-400'}`}>{text || placeholder}</span>
      {onClear ? (
        <span
          role="button"
          tabIndex={0}
          aria-label="Clear"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClear(); } }}
          className="p-1 rounded-md text-temple-400 hover:text-temple-800 hover:bg-cream-100"
        >
          <X className="w-3.5 h-3.5" />
        </span>
      ) : (
        <ChevronDown className={`w-4 h-4 shrink-0 text-temple-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      )}
    </button>
  );
}

/**
 * Date and time as two separate fields side by side (local time, 5-minute steps).
 *  value: Date | null · onChange(Date | null) · clearable: allows "no value"
 */
export default function DateTimePicker({ id, value, onChange, placeholder = 'Pick a date', clearable = false, defaultHour = 18 }) {
  const datePop = usePopover();
  const timePop = usePopover();
  const [month, setMonth] = useState(() => {
    const d = value || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const hour24 = value ? value.getHours() : defaultHour;
  const minute = value ? value.getMinutes() - (value.getMinutes() % 5) : 0;
  const pm = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const today = new Date();
  const day = value || today; // choosing a time first uses today's date

  const set = (y, m, d, h, min) => onChange(new Date(y, m, d, h, min, 0, 0));
  const pickDay = (d) => {
    set(d.getFullYear(), d.getMonth(), d.getDate(), hour24, minute);
    datePop.setOpen(false);
  };
  const pickHour = (h12) => set(day.getFullYear(), day.getMonth(), day.getDate(), (h12 % 12) + (pm ? 12 : 0), minute);
  const pickMinute = (m) => set(day.getFullYear(), day.getMonth(), day.getDate(), hour24, m);
  const pickHalf = (wantPm) => set(day.getFullYear(), day.getMonth(), day.getDate(), (hour24 % 12) + (wantPm ? 12 : 0), minute);

  const openDate = () => {
    if (!datePop.open && value) setMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    datePop.setOpen((o) => !o);
    timePop.setOpen(false);
  };
  const openTime = () => {
    timePop.setOpen((o) => !o);
    datePop.setOpen(false);
  };

  // 6-week calendar grid
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + i));

  const chip = (selected) => `py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
    selected ? 'bg-saffron-500 text-white shadow-soft' : 'text-temple-700 hover:bg-saffron-50'
  }`;

  return (
    <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2">
      {/* Date */}
      <div ref={datePop.ref} className="relative">
        <FieldButton
          id={id}
          icon={CalendarDays}
          text={value ? formatDate(value) : ''}
          placeholder={placeholder}
          open={datePop.open}
          onClick={openDate}
          onClear={clearable && value ? () => onChange(null) : null}
          label={value ? `Date: ${formatDate(value)}` : 'Choose date'}
        />
        {datePop.open && (
          <div role="dialog" aria-label="Choose date" className="absolute z-40 mt-2 left-0 w-[292px] rounded-2xl bg-white border border-cream-200 shadow-soft-lg p-3.5 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-cream-100 text-temple-600 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-semibold text-temple-900">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
              <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-cream-100 text-temple-600 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((w) => <span key={w} className="text-[10px] font-semibold text-temple-400 py-1">{w}</span>)}
              {days.map((d) => {
                const inMonth = d.getMonth() === month.getMonth();
                const selected = sameDay(d, value);
                const isToday = sameDay(d, today);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => pickDay(d)}
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
              <button type="button" onClick={() => pickDay(today)} className="text-xs font-semibold text-saffron-700 hover:underline cursor-pointer">Today</button>
              <button type="button" onClick={() => datePop.setOpen(false)} className="text-xs font-medium text-temple-500 hover:text-temple-800 cursor-pointer">Close</button>
            </div>
          </div>
        )}
      </div>

      {/* Time */}
      <div ref={timePop.ref} className="relative">
        <FieldButton
          id={`${id}-time`}
          icon={Clock}
          text={value ? formatTime(value) : ''}
          placeholder="Time"
          open={timePop.open}
          onClick={openTime}
          label={value ? `Time: ${formatTime(value)}` : 'Choose time'}
        />
        {timePop.open && (
          <div role="dialog" aria-label="Choose time" className="absolute z-40 mt-2 right-0 w-[260px] rounded-2xl bg-white border border-cream-200 shadow-soft-lg p-3.5 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-temple-900">{value ? formatTime(value) : 'Choose a time'}</span>
              <div className="inline-flex rounded-lg bg-cream-100 p-0.5" role="group" aria-label="AM or PM">
                {[false, true].map((isPm) => (
                  <button key={String(isPm)} type="button" onClick={() => pickHalf(isPm)} aria-pressed={Boolean(value) && pm === isPm} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${value && pm === isPm ? 'bg-white text-saffron-700 shadow-soft' : 'text-temple-500'}`}>
                    {isPm ? 'PM' : 'AM'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-temple-400 mb-1">Hour</p>
              <div className="grid grid-cols-6 gap-1">
                {HOURS.map((h) => <button key={h} type="button" onClick={() => pickHour(h)} className={chip(value && hour12 === h)}>{h}</button>)}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-temple-400 mb-1">Minute</p>
              <div className="grid grid-cols-6 gap-1">
                {MINUTES.map((m) => <button key={m} type="button" onClick={() => pickMinute(m)} className={chip(value && minute === m)}>:{pad(m)}</button>)}
              </div>
            </div>
            <div className="flex justify-between border-t border-cream-200 pt-2">
              <button
                type="button"
                onClick={() => { const n = new Date(); n.setSeconds(0, 0); onChange(n); timePop.setOpen(false); }}
                className="text-xs font-semibold text-saffron-700 hover:underline cursor-pointer"
              >
                Now
              </button>
              <button type="button" onClick={() => timePop.setOpen(false)} className="px-3 py-1 rounded-lg bg-temple-900 hover:bg-temple-800 text-cream-50 text-xs font-semibold cursor-pointer">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
