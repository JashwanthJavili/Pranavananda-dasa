import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { subscribeToProgramSettings } from '../../firebase';

// Generates gentle randomized falling flower petals
const PETALS_COUNT = 14;

export default function WaitingRoomQueue({ 
  waitSeconds = 60, 
  customMessage = '', 
  onAdmitted, 
  onBackToHome 
}) {
  const [liveSettings, setLiveSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return { courseName: 'Gita Amrita', courseSubtitle: 'Bhagavad Gita' };
  });

  useEffect(() => {
    const unsub = subscribeToProgramSettings((latest) => {
      if (latest) setLiveSettings(latest);
    });
    return () => unsub();
  }, []);
  // Synchronously compute total duration from session or props
  const totalDuration = useMemo(() => {
    try {
      const storedDur = sessionStorage.getItem('ga_queue_total_duration');
      if (storedDur && Number(storedDur) > 0) {
        return Number(storedDur);
      }
    } catch (e) {}
    return Math.max(2, Math.min(240, Number(waitSeconds) || 60));
  }, [waitSeconds]);

  // Synchronously compute initial remaining seconds from stored target timestamp
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    try {
      const storedTarget = sessionStorage.getItem('ga_queue_target_time');
      const now = Date.now();
      if (storedTarget && Number(storedTarget) > now) {
        return Math.max(0, Math.ceil((Number(storedTarget) - now) / 1000));
      }
    } catch (e) {}
    return Math.max(2, Math.min(240, Number(waitSeconds) || 60));
  });

  const [isAdmitted, setIsAdmitted] = useState(false);
  const targetTimestampRef = useRef(null);
  const skipTransitionRef = useRef(true);
  const isAdmittedRef = useRef(false);

  // Generate static petal positions & animation properties with soft subtle transparency and slow falling speed
  const petals = useMemo(() => {
    return Array.from({ length: PETALS_COUNT }).map((_, i) => ({
      id: i,
      left: `${(i * 7.1 + (i % 5) * 3) % 95}%`,
      delay: `${(i * 1.2 + (i % 4) * 0.8).toFixed(2)}s`,
      duration: `${(16 + (i % 5) * 3).toFixed(2)}s`, // Slow, serene falling motion
      size: `${16 + (i % 3) * 5}px`,
      color: i % 3 === 0 ? '#F59E0B' : i % 3 === 1 ? '#EF4444' : '#F97316',
      opacity: 0.16 + (i % 3) * 0.07 // Soft and gentle
    }));
  }, []);

  // Initialize or resume target wall-clock timestamp with active background sync
  useEffect(() => {
    const storedTarget = sessionStorage.getItem('ga_queue_target_time');
    const now = Date.now();

    if (storedTarget && Number(storedTarget) > now) {
      targetTimestampRef.current = Number(storedTarget);
    } else {
      const newTarget = now + totalDuration * 1000;
      targetTimestampRef.current = newTarget;
      try {
        sessionStorage.setItem('ga_queue_target_time', String(newTarget));
        sessionStorage.setItem('ga_queue_total_duration', String(totalDuration));
      } catch (e) {}
    }

    // Enable smooth transitions after mount paint
    const initialFrame = setTimeout(() => {
      skipTransitionRef.current = false;
    }, 60);

    const updateTimer = (isWakeUp = false) => {
      if (isAdmittedRef.current) return;

      const currentNow = Date.now();
      const target = targetTimestampRef.current || currentNow;
      const diffSec = Math.max(0, Math.ceil((target - currentNow) / 1000));
      
      if (isWakeUp) {
        // Suppress CSS animation jump so the ring snaps to exact real-time instantly
        skipTransitionRef.current = true;
        setTimeout(() => {
          skipTransitionRef.current = false;
        }, 60);
      }

      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        isAdmittedRef.current = true;
        setIsAdmitted(true);
        try {
          sessionStorage.removeItem('ga_queue_target_time');
          sessionStorage.removeItem('ga_queue_total_duration');
          // Issue a 30-minute valid queue pass
          sessionStorage.setItem('ga_queue_pass', String(Date.now()));
        } catch (e) {}
        
        if (onAdmitted) {
          onAdmitted();
        }
      }
    };

    updateTimer();
    // High-frequency 250ms check ensures zero lag even if intervals drop frames
    const interval = setInterval(() => updateTimer(false), 250);

    // Instant wall-clock resync when switching browser tabs or waking mobile device
    const handleTabWakeUp = () => {
      if (!document.hidden) {
        updateTimer(true);
      }
    };

    document.addEventListener('visibilitychange', handleTabWakeUp);
    window.addEventListener('focus', handleTabWakeUp);
    window.addEventListener('pageshow', handleTabWakeUp);

    return () => {
      clearTimeout(initialFrame);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleTabWakeUp);
      window.removeEventListener('focus', handleTabWakeUp);
      window.removeEventListener('pageshow', handleTabWakeUp);
    };
  }, [totalDuration, onAdmitted]);

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Circular progress calculation: directly aligned with remaining time
  const remainingRatio = totalDuration > 0 ? (remainingSeconds / totalDuration) : 0;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - remainingRatio);

  return (
    <div className="fixed inset-0 z-50 min-h-screen bg-gradient-to-b from-[#FAF4EA] via-[#FDFBF7] to-[#F3E7D8] flex flex-col justify-between overflow-y-auto overflow-x-hidden text-center select-none animate-fadeIn">
      
      {/* Background Falling Flower Petals (Subtle, Slow & Non-Dominating) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {petals.map((petal) => (
          <div
            key={petal.id}
            className="absolute animate-petal pointer-events-none"
            style={{
              top: '-35px',
              left: petal.left,
              animationDelay: petal.delay,
              animationDuration: petal.duration,
              width: petal.size,
              height: petal.size,
              opacity: petal.opacity
            }}
          >
            {/* Elegant Flower Petal SVG */}
            <svg viewBox="0 0 24 24" fill={petal.color} className="w-full h-full">
              <path d="M12 2C9.5 7 5 9.5 5 13.5C5 17.5 8 20.5 12 21.5C16 20.5 19 17.5 19 13.5C19 9.5 14.5 7 12 2Z" />
            </svg>
          </div>
        ))}
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex items-center justify-between">
        {/* Top Back Icon ONLY (without text) */}
        {onBackToHome ? (
          <button
            type="button"
            onClick={onBackToHome}
            className="w-10 h-10 rounded-2xl bg-white/85 hover:bg-white border border-amber-200/70 text-temple-700 hover:text-saffron-600 shadow-2xs hover:shadow-soft transition-all flex items-center justify-center cursor-pointer active:scale-95"
            title="Return to Home"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}

        {/* Gita Amrita Clean Header */}
        <div className="flex flex-col items-center">
          <span className="text-lg sm:text-xl font-bold tracking-tight text-temple-900 font-serif leading-tight">
            {liveSettings.courseName || 'Gita Amrita'}
          </span>
          <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-saffron-700">
            {liveSettings.courseSubtitle || 'Bhagavad Gita'}
          </span>
        </div>

        {/* Right Spacer for Center Balance */}
        <div className="w-10 h-10" />
      </header>

      {/* Center Main Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-4 sm:py-6 max-w-xl mx-auto w-full space-y-5">
        
        {/* Lord Krishna's Divine Portrait - Larger Size with Clean Ornate Gold Frame */}
        <div className="relative group">
          {/* Outer Divine Aura Glow */}
          <div className="absolute -inset-2.5 bg-gradient-to-r from-amber-400/35 via-saffron-500/45 to-amber-400/35 rounded-3xl blur-lg opacity-85" />

          {/* Ornate Golden Frame */}
          <div className="relative p-2 sm:p-2.5 rounded-3xl bg-gradient-to-b from-[#EDCF9F] via-[#C88A3E] to-[#9E5F12] shadow-soft-xl border border-amber-300/80">
            
            {/* Inner Border */}
            <div className="p-1 rounded-2xl bg-[#FFFDF9] border border-amber-200 shadow-inner overflow-hidden">
              
              {/* Increased Image Dimensions */}
              <div className="relative w-56 sm:w-68 md:w-80 aspect-[3/4] rounded-xl overflow-hidden bg-cream-100 shadow-md">
                <img
                  src="/assets/Krishna-single.jpeg"
                  alt="Sri Krishna"
                  className="w-full h-full object-cover object-top transition-transform duration-700 hover:scale-105"
                />

                {/* Subtle Divine Lighting Vignette */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-temple-950/20 via-transparent to-transparent" />
              </div>

            </div>
          </div>
        </div>

        {/* Circular Progress Timer */}
        <div className="flex flex-col items-center justify-center pt-1">
          <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32">
            <svg 
              className="w-full h-full -rotate-90 -scale-y-100 transform origin-center" 
              viewBox="0 0 108 108"
            >
              <defs>
                <linearGradient id="queueGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FBBF24" />
                  <stop offset="50%" stopColor="#D97706" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
              </defs>

              {/* Background Track Circle */}
              <circle
                cx="54"
                cy="54"
                r={radius}
                className="text-amber-200/40"
                strokeWidth="6.5"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Foreground Animated Progress Circle (Right-to-Left) */}
              <circle
                cx="54"
                cy="54"
                r={radius}
                stroke="url(#queueGoldGradient)"
                style={{
                  transition: skipTransitionRef.current ? 'none' : 'stroke-dashoffset 0.3s linear'
                }}
                strokeWidth="6.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Content: Time Only (No tick icon) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl sm:text-3xl font-black text-temple-900 font-mono tracking-tight leading-none">
                {formatTime(remainingSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Clean Simple Text */}
        <div className="w-full max-w-md px-4 text-center">
          <p className="text-xs sm:text-sm font-medium text-temple-800 leading-relaxed">
            {customMessage || "Due to exceptionally high traffic, registrations are being admitted in an orderly queue to guarantee your spot."}
          </p>
        </div>

      </main>

      {/* Devotional Footer */}
      <footer className="relative z-10 w-full border-t border-amber-200/70 bg-cream-50/80 backdrop-blur-md py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center text-[11px] sm:text-xs text-temple-600 font-normal">
          <p className="flex flex-wrap items-center gap-1.5 justify-center">
            <span>&copy; 2026 Pranavananda Das</span>
            <span className="text-amber-400">&bull;</span>
            <span className="text-temple-500">Built with devotion for spreading Krishna consciousness</span>
          </p>
        </div>
      </footer>

    </div>
  );
}

