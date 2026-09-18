import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, MapPin, Sparkles } from 'lucide-react';

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const FREQUENCIES = [
  { label: 'Daily', value: 'Daily' },
  { label: 'Mon - Fri (Weekdays)', value: 'Mon - Fri' },
  { label: 'Weekends (Sat & Sun)', value: 'Sat & Sun' },
  { label: 'Every Sunday', value: 'Every Sunday' },
  { label: 'Alternate Days', value: 'Alternate Days' },
  { label: 'Weekly', value: 'Weekly' },
];

export function parseBatchSchedule(scheduleStr = '') {
  if (!scheduleStr) {
    return {
      frequency: 'Daily',
      startHour: '07',
      startMinute: '00',
      startPeriod: 'PM',
      hasEndTime: false,
      endHour: '08',
      endMinute: '00',
      endPeriod: 'PM'
    };
  }

  const parts = scheduleStr.split('•').map(p => p.trim());
  let frequency = 'Daily';
  let timeStr = scheduleStr;
  
  if (parts.length > 1) {
    frequency = parts[0] || 'Daily';
    timeStr = parts.slice(1).join('•').trim();
  }

  // Find all time patterns like 7:00 PM or 07:30 AM or 7 PM
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi;
  const matches = [...timeStr.matchAll(timeRegex)];

  let startHour = '07', startMinute = '00', startPeriod = 'PM';
  let endHour = '08', endMinute = '00', endPeriod = 'PM';
  let hasEndTime = false;

  if (matches.length >= 1) {
    const h = parseInt(matches[0][1], 10);
    startHour = String(h > 12 ? h - 12 : h).padStart(2, '0');
    startMinute = matches[0][2] || '00';
    startPeriod = (matches[0][3] || 'PM').toUpperCase();
  }

  if (matches.length >= 2) {
    hasEndTime = true;
    const h = parseInt(matches[1][1], 10);
    endHour = String(h > 12 ? h - 12 : h).padStart(2, '0');
    endMinute = matches[1][2] || '00';
    endPeriod = (matches[1][3] || 'PM').toUpperCase();
  }

  return {
    frequency,
    startHour,
    startMinute,
    startPeriod,
    hasEndTime,
    endHour,
    endMinute,
    endPeriod
  };
}

export function formatBatchSchedule({
  frequency,
  startHour,
  startMinute,
  startPeriod,
  hasEndTime,
  endHour,
  endMinute,
  endPeriod
}) {
  const sH = parseInt(startHour || '7', 10);
  const startStr = `${sH}:${startMinute || '00'} ${startPeriod || 'PM'}`;
  
  let timeStr = startStr;
  if (hasEndTime) {
    const eH = parseInt(endHour || '8', 10);
    const endStr = `${eH}:${endMinute || '00'} ${endPeriod || 'PM'}`;
    timeStr = `${startStr} - ${endStr}`;
  }

  if (frequency && frequency.trim() !== '') {
    return `${frequency.trim()} • ${timeStr}`;
  }
  return timeStr;
}

export default function BatchFormModal({
  isOpen,
  onClose,
  modalTitle = 'Add New Batch',
  initialBatch = null,
  onSubmit,
  submitLabel = 'Save Batch'
}) {
  // Clean empty states - no prefilled text forcing admin to backspace
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState('Offline');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');

  // Time & digit state
  const [frequency, setFrequency] = useState('Daily');
  const [startHour, setStartHour] = useState('07');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState('PM');
  const [hasEndTime, setHasEndTime] = useState(false);
  const [endHour, setEndHour] = useState('08');
  const [endMinute, setEndMinute] = useState('00');
  const [endPeriod, setEndPeriod] = useState('PM');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubmitting(false);
      return;
    }

    if (isOpen) {
      if (initialBatch && initialBatch.id) {
        setTitle(initialBatch.title || '');
        setMode(initialBatch.mode || 'Offline');
        setStartDate(initialBatch.startDate || '');
        setEndDate(initialBatch.endDate || '');
        setLocation(initialBatch.location || '');

        const parsed = parseBatchSchedule(initialBatch.schedule || 'Daily • 7:00 PM');
        setFrequency(parsed.frequency);
        setStartHour(parsed.startHour);
        setStartMinute(parsed.startMinute);
        setStartPeriod(parsed.startPeriod);
        setHasEndTime(parsed.hasEndTime);
        setEndHour(parsed.endHour);
        setEndMinute(parsed.endMinute);
        setEndPeriod(parsed.endPeriod);
      } else {
        // Completely clean slate for new batch
        setTitle('');
        setMode('Offline');
        setStartDate('');
        setEndDate('');
        setLocation('');
        setFrequency('Daily');
        setStartHour('07');
        setStartMinute('00');
        setStartPeriod('PM');
        setHasEndTime(false);
        setEndHour('08');
        setEndMinute('00');
        setEndPeriod('PM');
      }
    }
  }, [isOpen, initialBatch]);

  if (!isOpen) return null;

  const currentSchedulePreview = formatBatchSchedule({
    frequency,
    startHour,
    startMinute,
    startPeriod,
    hasEndTime,
    endHour,
    endMinute,
    endPeriod
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...(initialBatch || {}),
        title: title.trim() || 'Bhagavad Gita',
        mode,
        startDate: startDate || '',
        endDate: endDate || '',
        schedule: currentSchedulePreview,
        location: location.trim(),
        status: initialBatch?.status || 'Upcoming'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-cream-50 rounded-2xl p-4 sm:p-5 border border-cream-300 shadow-soft text-left space-y-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-200 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-700">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h4 className="font-bold text-sm sm:text-base text-temple-900">{modalTitle}</h4>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-lg text-temple-400 hover:text-temple-700 hover:bg-cream-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Title & Mode */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block font-semibold mb-1 text-temple-800">
                Batch Title <span className="text-saffron-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bhagavad Gita - Batch 1"
                className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs text-temple-900 focus:ring-1 focus:ring-saffron-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-temple-800">Mode</label>
              <select
                value={mode}
                onChange={(e) => handleModeChange(e.target.value)}
                className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs font-semibold text-temple-800 focus:ring-1 focus:ring-saffron-500 cursor-pointer"
              >
                <option value="Offline">Offline</option>
                <option value="Online">Online</option>
              </select>
            </div>
          </div>

          {/* Batch Date Range (From Date to To Date) */}
          <div className="bg-white/80 p-2.5 rounded-xl border border-cream-200 space-y-2">
            <label className="font-semibold text-temple-900 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-saffron-600" />
              Batch Dates (From Date to To Date)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-temple-600 block mb-0.5 font-medium">From Date (Start):</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-1.5 border border-cream-300 rounded-lg bg-white text-xs text-temple-900 focus:ring-1 focus:ring-saffron-500 focus:outline-none cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-temple-600 block mb-0.5 font-medium">To Date (End):</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-1.5 border border-cream-300 rounded-lg bg-white text-xs text-temple-900 focus:ring-1 focus:ring-saffron-500 focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Time Selector Box (Select digits, no typing!) */}
          <div className="bg-cream-100/80 p-3 rounded-xl border border-cream-300/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-temple-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-saffron-600" />
                Class Timing (Select Digits)
              </label>
              <button
                type="button"
                onClick={() => setHasEndTime(!hasEndTime)}
                className="text-[11px] font-semibold text-saffron-700 hover:text-saffron-800 cursor-pointer"
              >
                {hasEndTime ? '− Remove End Time' : '+ Add End Time'}
              </button>
            </div>

            {/* Frequency Selection */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-temple-600 w-16 flex-shrink-0">Frequency:</span>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="flex-1 p-1.5 rounded-lg border border-cream-300 bg-white text-xs text-temple-800 font-medium focus:ring-1 focus:ring-saffron-500 cursor-pointer"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Start Time Digit Selectors */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-temple-600 w-16 flex-shrink-0">
                {hasEndTime ? 'Start Time:' : 'Class Time:'}
              </span>
              <div className="flex items-center gap-1">
                {/* Hours Dropdown */}
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="p-1 px-2 rounded-lg border border-cream-300 bg-white text-xs font-bold text-temple-900 text-center cursor-pointer focus:ring-1 focus:ring-saffron-500"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="font-bold text-temple-600">:</span>
                {/* Minutes Dropdown */}
                <select
                  value={startMinute}
                  onChange={(e) => setStartMinute(e.target.value)}
                  className="p-1 px-2 rounded-lg border border-cream-300 bg-white text-xs font-bold text-temple-900 text-center cursor-pointer focus:ring-1 focus:ring-saffron-500"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {/* AM / PM Toggle */}
                <div className="flex rounded-lg border border-cream-300 overflow-hidden bg-white text-xs font-semibold ml-1">
                  <button
                    type="button"
                    onClick={() => setStartPeriod('AM')}
                    className={`px-2 py-1 transition-colors cursor-pointer ${
                      startPeriod === 'AM' ? 'bg-saffron-500 text-white' : 'text-temple-700 hover:bg-cream-100'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartPeriod('PM')}
                    className={`px-2 py-1 transition-colors cursor-pointer ${
                      startPeriod === 'PM' ? 'bg-saffron-500 text-white' : 'text-temple-700 hover:bg-cream-100'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Optional End Time Digit Selectors */}
            {hasEndTime && (
              <div className="flex items-center gap-2 pt-1 border-t border-cream-200/80">
                <span className="text-[11px] font-medium text-temple-600 w-16 flex-shrink-0">End Time:</span>
                <div className="flex items-center gap-1">
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="p-1 px-2 rounded-lg border border-cream-300 bg-white text-xs font-bold text-temple-900 text-center cursor-pointer focus:ring-1 focus:ring-saffron-500"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="font-bold text-temple-600">:</span>
                  <select
                    value={endMinute}
                    onChange={(e) => setEndMinute(e.target.value)}
                    className="p-1 px-2 rounded-lg border border-cream-300 bg-white text-xs font-bold text-temple-900 text-center cursor-pointer focus:ring-1 focus:ring-saffron-500"
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <div className="flex rounded-lg border border-cream-300 overflow-hidden bg-white text-xs font-semibold ml-1">
                    <button
                      type="button"
                      onClick={() => setEndPeriod('AM')}
                      className={`px-2 py-1 transition-colors cursor-pointer ${
                        endPeriod === 'AM' ? 'bg-saffron-500 text-white' : 'text-temple-700 hover:bg-cream-100'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndPeriod('PM')}
                      className={`px-2 py-1 transition-colors cursor-pointer ${
                        endPeriod === 'PM' ? 'bg-saffron-500 text-white' : 'text-temple-700 hover:bg-cream-100'
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Formatted Preview */}
            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-cream-200/80">
              <span className="text-temple-600">Formatted Schedule:</span>
              <span className="font-bold text-saffron-800 bg-saffron-50 px-2.5 py-0.5 rounded-full border border-saffron-200">
                {currentSchedulePreview}
              </span>
            </div>
          </div>

          {/* Location / Platform */}
          <div>
            <label className="block font-semibold mb-1 text-temple-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-saffron-600" />
              Location / Venue / Link
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. ISKCON Temple, Adilabad or Live Zoom Sessions"
              className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs text-temple-900 focus:ring-1 focus:ring-saffron-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-cream-200">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="w-1/2 py-2.5 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 disabled:opacity-50 text-xs font-semibold text-temple-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="w-1/2 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 disabled:opacity-75 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-soft hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{submitLabel}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
