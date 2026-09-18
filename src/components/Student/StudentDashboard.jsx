import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  LogOut, 
  MessageCircle, 
  Clock, 
  Sparkles,
  HelpCircle,
  Award,
  Megaphone,
  Pin
} from 'lucide-react';
import { fetchAnnouncements } from '../../firebase';

export default function StudentDashboard({ studentUser, onLogout }) {
  const [copied, setCopied] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_announcements');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const list = await fetchAnnouncements();
        if (list) {
          setAnnouncements(list);
          try {
            localStorage.setItem('gita_amrita_cached_announcements', JSON.stringify(list));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Error loading announcements for student:', err);
      }
    }
    loadAnnouncements();
  }, []);

  const participant = studentUser || {};
  const registrationId = participant.registrationId || participant.id || 'GA26-PENDING';
  const name = participant.fullName || participant.name || 'Devotee';
  const email = participant.email || '—';
  const mobile = participant.mobile || '—';
  const city = participant.city || '';
  const area = participant.area || '';
  const batchTitle = participant.batchTitle || 'Bhagavad Gita';
  const batchSchedule = participant.batchSchedule || 'Daily • 7:00 PM';
  const batchMode = participant.batchMode || 'Offline';
  const batchStartDate = participant.batchStartDate || participant.startDate || '';
  const batchEndDate = participant.batchEndDate || participant.endDate || '';
  const status = participant.status || 'Confirmed';

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(registrationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOnline = batchMode?.toLowerCase() === 'online';

  const studentAnnouncements = announcements.filter(ann => {
    if (!ann.target || ann.target === 'All') return true;
    if (ann.target === 'Online' && isOnline) return true;
    if (ann.target === 'Offline' && !isOnline) return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins text-temple-900 selection:bg-saffron-100 selection:text-saffron-900 animate-fadeIn">
      
      {/* Clean, Simple Student Header (No Back Button) */}
      <header className="sticky top-0 z-30 bg-cream-50/95 backdrop-blur-md border-b border-cream-200 shadow-soft">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          
          {/* ISKCON Brand */}
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/iskcon_logo.webp"
              alt="ISKCON Logo"
              className="h-8 w-auto object-contain"
            />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-temple-900 leading-tight">
                  Gita Amrita
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-saffron-50 text-saffron-700 px-1.5 py-0.2 rounded border border-saffron-200">
                  Student Portal
                </span>
              </div>
              <span className="text-[10px] text-temple-500 block">
                ISKCON Adilabad
              </span>
            </div>
          </div>

          {/* Clean Logout Button */}
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cream-300 hover:border-red-200 bg-white hover:bg-red-50 text-temple-700 hover:text-red-700 text-xs font-medium transition-colors cursor-pointer"
            title="Log out of student portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 text-left">
        
        {/* Sacred Welcome Hero Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-saffron-50 via-cream-50 to-cream-100 rounded-3xl p-6 sm:p-8 border border-saffron-200/80 shadow-soft">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-saffron-700 bg-saffron-100/90 px-3 py-1 rounded-full border border-saffron-200 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Devotee Dashboard
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-temple-900 tracking-tight">
              Hare Krishna, {name} 🙏
            </h1>

            <p className="text-xs sm:text-sm text-temple-700 leading-relaxed font-normal">
              Welcome to your divine learning sanctuary. Access your batch details, join daily WhatsApp study discussions, and connect with temple mentors.
            </p>
          </div>
        </div>

        {/* Devotee Announcements & Temple Updates Feed */}
        {studentAnnouncements.length > 0 && (
          <div className="bg-cream-50 rounded-3xl p-5 sm:p-6 border border-saffron-200/90 shadow-soft space-y-3.5">
            <div className="flex items-center justify-between border-b border-cream-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-saffron-100 border border-saffron-200 text-saffron-700 flex items-center justify-center">
                  <Megaphone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-temple-900 leading-tight">
                    Temple & Course Announcements
                  </h3>
                  <span className="text-[10px] text-temple-500">
                    Latest updates from ISKCON Adilabad coordinators
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-saffron-800 bg-saffron-100 px-2.5 py-0.5 rounded-full border border-saffron-200">
                {studentAnnouncements.length} {studentAnnouncements.length === 1 ? 'Notice' : 'Notices'}
              </span>
            </div>

            <div className="space-y-3">
              {studentAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left space-y-1.5 ${
                    ann.isPinned
                      ? 'bg-saffron-50/80 border-saffron-300 ring-1 ring-saffron-300/60 shadow-xs'
                      : 'bg-white border-cream-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {ann.isPinned && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        ann.type === 'Urgent' ? 'bg-red-100 text-red-900 border-red-200' :
                        ann.type === 'Online' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                        ann.type === 'Offline' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' :
                        'bg-saffron-100 text-saffron-900 border-saffron-200'
                      }`}>
                        {ann.type || 'General'}
                      </span>
                    </div>
                    <span className="text-[11px] text-temple-400 font-medium">
                      {ann.dateString} {ann.timeString ? `• ${ann.timeString}` : ''}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-temple-900 leading-snug">
                    {ann.title}
                  </h4>

                  <p className="text-xs text-temple-700 whitespace-pre-line leading-relaxed">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Card 1: Official Devotee Registration Pass */}
          <div className="bg-cream-50 rounded-3xl p-5 sm:p-6 border border-cream-200/90 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-saffron-600" />
                Devotee Registration Pass
              </h3>
              <span className="text-[11px] font-semibold text-temple-500">
                Certificate Course
              </span>
            </div>

            {/* Registration ID Banner */}
            <div className="p-4 bg-gradient-to-r from-cream-100 to-cream-50 rounded-2xl border border-cream-300 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-temple-500 block">
                  Registration ID
                </span>
                <span className="text-xl font-bold font-mono text-saffron-800 tracking-wider">
                  {registrationId}
                </span>
              </div>
              <button
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cream-300 bg-white hover:bg-cream-200 text-xs font-medium text-temple-700 transition-colors shadow-xs cursor-pointer"
                title="Copy Registration ID"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-green-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-saffron-600" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Personal Details */}
            <div className="space-y-2 text-xs text-temple-700">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                <span><strong>Registered Mobile:</strong> {mobile}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                <span className="truncate"><strong>Email:</strong> {email}</span>
              </div>
              {(city || area) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                  <span><strong>Location:</strong> {[city, area].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                <span><strong>Temple Center:</strong> ISKCON Adilabad (Edulapuram)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Enrolled Batch & Class Information */}
          <div className="bg-cream-50 rounded-3xl p-5 sm:p-6 border border-cream-200/90 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-temple-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-saffron-600" />
                Your Enrolled Batch
              </h3>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                isOnline
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {batchMode} Mode
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-bold text-temple-900">
                {batchTitle}
              </h4>

              {batchStartDate && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-temple-800 bg-saffron-50/70 p-2 rounded-xl border border-saffron-200/80">
                  <Calendar className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                  <span>Batch Dates: <strong>{batchStartDate} {batchEndDate ? `to ${batchEndDate}` : ''}</strong></span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs font-semibold text-saffron-700">
                <Clock className="w-4 h-4 text-saffron-600" />
                <span>{batchSchedule}</span>
              </div>
              <p className="text-xs text-temple-600 leading-relaxed font-normal">
                {isOnline
                  ? 'Conducted daily via live interactive online video sessions. Links and recordings are distributed in the WhatsApp group.'
                  : 'Held at the sacred Temple Hall, ISKCON Adilabad (Near RIMS, Edulapuram). Devotees are invited to attend prasadam following class.'}
              </p>
            </div>

            {/* WhatsApp Study Group Action */}
            <div className="pt-2">
              <a
                href="https://wa.me/919490853507?text=Hare%20Krishna!%20I%20have%20registered%20for%20Gita%20Amrita%20(ID:%20"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-soft transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Join Official WhatsApp Study Group</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>
          </div>

        </div>


        {/* Sacred Verse of the Day Card */}
        <div className="bg-gradient-to-r from-cream-50 via-saffron-50/40 to-cream-50 rounded-3xl p-5 sm:p-6 border border-saffron-200 shadow-soft text-center space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-saffron-700 block">
            Sacred Shloka &bull; Bhagavad Gita 2.47
          </span>
          <p className="text-sm sm:text-base font-semibold text-temple-900 italic font-serif">
            "karmaṇy evādhikāras te mā phaleṣu kadācana |<br />
            mā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi ||"
          </p>
          <p className="text-xs text-temple-700 max-w-xl mx-auto leading-relaxed">
            You have a right to perform your prescribed duty, but you are not entitled to the fruits of action. Never consider yourself the cause of the results, and never be attached to not doing your duty.
          </p>
        </div>

        {/* Support & Coordinator Help */}
        <div className="p-4 sm:p-5 rounded-2xl bg-cream-200/70 border border-cream-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-temple-700">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-full bg-saffron-100 text-saffron-700 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-temple-900">Have questions about your batch or schedule?</p>
              <p className="text-temple-600">ISKCON Adilabad coordinators are here to assist your spiritual journey.</p>
            </div>
          </div>
          <a
            href="tel:+919490853507"
            className="px-4 py-2 rounded-xl bg-white hover:bg-cream-100 border border-cream-300 font-semibold text-temple-900 shadow-xs flex-shrink-0 transition-colors cursor-pointer"
          >
            Call Coordinator (+91 94908 53507)
          </a>
        </div>

      </main>

      {/* Devotional Footer */}
      <footer className="py-6 text-center text-xs text-temple-500 border-t border-cream-200 mt-auto bg-cream-50/50">
        <p className="italic text-temple-600 font-normal">
          Hare Krishna Hare Krishna Krishna Krishna Hare Hare &bull; Hare Rama Hare Rama Rama Rama Hare Hare
        </p>
        <p className="mt-1">&copy; {new Date().getFullYear()} Gita Amrita &bull; ISKCON Adilabad</p>
      </footer>

    </div>
  );
}
