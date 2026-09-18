import React, { useState } from 'react';
import { 
  BookOpen, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  LogOut, 
  ArrowLeft, 
  MessageCircle, 
  PlayCircle,
  HelpCircle,
  Sparkles,
  Clock
} from 'lucide-react';

export default function StudentDashboard({ studentUser, onLogout, onBackToHome }) {
  const [copied, setCopied] = useState(false);

  const participant = studentUser || {};
  const registrationId = participant.registrationId || participant.id || 'GA26-PENDING';
  const name = participant.fullName || participant.name || 'Devotee';
  const email = participant.email || '—';
  const mobile = participant.mobile || '—';
  const batchTitle = participant.batchTitle || 'Bhagavad Gita';
  const batchSchedule = participant.batchSchedule || 'Daily • 7:00 PM';
  const batchMode = participant.batchMode || 'Offline';
  const status = participant.status || 'Confirmed';

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(registrationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins text-temple-900 selection:bg-saffron-100 selection:text-saffron-900 animate-fadeIn">
      
      {/* Clean Devotional Top Navigation */}
      <header className="sticky top-0 z-30 bg-cream-50/95 backdrop-blur-md border-b border-cream-200 shadow-soft">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/iskcon_logo.webp"
              alt="ISKCON Logo"
              className="h-8 sm:h-9 w-auto object-contain"
            />
            <div className="text-left">
              <span className="text-base sm:text-lg font-bold text-temple-900 block leading-tight">
                Gita Amrita
              </span>
              <span className="text-[10px] sm:text-[11px] text-temple-600 block">
                ISKCON Adilabad Student Portal
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-temple-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-saffron-600" />
              <span className="hidden sm:inline">Back to Website</span>
            </button>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium transition-colors cursor-pointer"
              title="Log out of student account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Student Stage */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 text-left">
        
        {/* Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-saffron-50 via-cream-50 to-cream-100 rounded-3xl p-6 sm:p-8 border border-saffron-200/80 shadow-soft">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-saffron-700 bg-saffron-100/80 px-2.5 py-1 rounded-full border border-saffron-200 inline-block">
              Participant Sanctuary
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-temple-900 tracking-tight">
              Hare Krishna, {name} 🙏
            </h1>
            <p className="text-xs sm:text-sm text-temple-700 leading-relaxed">
              Welcome to your Gita Amrita journey. Here you can find your batch schedule, live links, daily study resources, and coordinator updates.
            </p>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Card 1: Your Registration Record */}
          <div className="bg-cream-50 rounded-3xl p-5 sm:p-6 border border-cream-200/90 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-temple-800">
                Registration Profile
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{status}</span>
              </span>
            </div>

            {/* Dynamic Registration ID highlight */}
            <div className="p-3.5 bg-cream-100/80 rounded-2xl border border-cream-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-temple-500 block">
                  Participant ID
                </span>
                <span className="text-lg font-bold font-mono text-saffron-800 tracking-wider">
                  {registrationId}
                </span>
              </div>
              <button
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cream-300 bg-white hover:bg-cream-200 text-xs font-medium text-temple-700 transition-colors cursor-pointer"
                title="Copy Registration ID"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-green-700 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-saffron-600" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Contact details */}
            <div className="space-y-2 text-xs text-temple-700">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                <span><strong>Mobile:</strong> {mobile}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                <span className="truncate"><strong>Email:</strong> {email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                <span><strong>Center:</strong> ISKCON Adilabad (Edulapuram)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Your Enrolled Batch */}
          <div className="bg-cream-50 rounded-3xl p-5 sm:p-6 border border-cream-200/90 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-temple-800">
                Enrolled Program Batch
              </h3>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                batchMode === 'Offline'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {batchMode} Batch
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-bold text-temple-900">
                {batchTitle} Course
              </h4>
              <div className="flex items-center gap-2 text-xs font-semibold text-saffron-700">
                <Clock className="w-4 h-4" />
                <span>{batchSchedule}</span>
              </div>
              <p className="text-xs text-temple-600 leading-relaxed">
                {batchMode === 'Offline'
                  ? 'Conducted daily at the sacred Temple Hall, ISKCON Edulapuram, Adilabad.'
                  : 'Live daily online broadcast with interactive Q&A and recorded archives.'}
              </p>
            </div>

            {/* WhatsApp Group Link */}
            <div className="pt-2">
              <a
                href="https://wa.me/919490853507?text=Hare%20Krishna!%20I%20have%20registered%20for%20Gita%20Amrita."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-soft transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Join Participant WhatsApp Updates</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>
          </div>

        </div>

        {/* 18-Day Journey Roadmap */}
        <div className="bg-cream-50 rounded-3xl p-5 sm:p-7 border border-cream-200/90 shadow-soft space-y-4">
          <div>
            <h3 className="text-base font-bold text-temple-900">
              18-Day Wisdom Roadmap
            </h3>
            <p className="text-xs text-temple-600">
              A gentle progressive overview of the 3 sacred sections of the Bhagavad Gita.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 text-xs">
            
            {/* Section 1 */}
            <div className="p-4 bg-cream-100/70 rounded-2xl border border-cream-200/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-saffron-700 block">
                Chapters 1 – 6
              </span>
              <h4 className="font-bold text-sm text-temple-900">
                Karma Yoga
              </h4>
              <p className="text-temple-600 leading-relaxed font-normal">
                Mastering the mind, understanding duty, selfless action, and transcending anxiety.
              </p>
            </div>

            {/* Section 2 */}
            <div className="p-4 bg-cream-100/70 rounded-2xl border border-cream-200/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-saffron-700 block">
                Chapters 7 – 12
              </span>
              <h4 className="font-bold text-sm text-temple-900">
                Bhakti Yoga
              </h4>
              <p className="text-temple-600 leading-relaxed font-normal">
                The heart of Gita: Pure devotion, divine opulences, the Universal Form, and love for Krishna.
              </p>
            </div>

            {/* Section 3 */}
            <div className="p-4 bg-cream-100/70 rounded-2xl border border-cream-200/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-saffron-700 block">
                Chapters 13 – 18
              </span>
              <h4 className="font-bold text-sm text-temple-900">
                Jnana Yoga
              </h4>
              <p className="text-temple-600 leading-relaxed font-normal">
                The three modes of material nature, ultimate surrender, and attaining unconditional peace.
              </p>
            </div>

          </div>
        </div>

        {/* Support Card */}
        <div className="p-4 rounded-2xl bg-cream-200/60 border border-cream-300/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-temple-700">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <HelpCircle className="w-5 h-5 text-saffron-600 flex-shrink-0" />
            <span>Need help or have questions regarding your batch? Reach out to ISKCON Adilabad coordinators.</span>
          </div>
          <a
            href="tel:+919490853507"
            className="px-3.5 py-1.5 rounded-lg bg-cream-50 hover:bg-white border border-cream-300 font-semibold text-temple-900 flex-shrink-0 transition-colors"
          >
            Contact Center
          </a>
        </div>

      </main>

      {/* Gentle Devotional Footer */}
      <footer className="py-6 text-center text-xs text-temple-500 border-t border-cream-200 mt-auto">
        <p className="italic text-temple-600 font-normal">
          Hare Krishna Hare Krishna Krishna Krishna Hare Hare &bull; Hare Rama Hare Rama Rama Rama Hare Hare
        </p>
        <p className="mt-1">&copy; {new Date().getFullYear()} Gita Amrita &bull; ISKCON Adilabad</p>
      </footer>

    </div>
  );
}
