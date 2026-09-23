import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Copy, 
  Check, 
  LogOut, 
  HelpCircle,
  Award,
  Briefcase,
  GraduationCap
} from 'lucide-react';

export default function StudentDashboard({ studentUser, onLogout }) {
  const [copied, setCopied] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const participant = studentUser || {};
  const registrationId = participant.registrationId || participant.id || 'BG26-100';
  const name = participant.fullName || participant.name || 'Participant';
  const email = participant.email || '—';
  const mobile = participant.mobile || '—';
  const residence = participant.currentResidence || participant.city || '—';
  const address = participant.fullAddress || participant.address || participant.area || '—';
  const pincode = participant.pincode || '—';
  const education = participant.education || '—';
  const otherEducation = participant.otherEducation || '';
  const occupation = participant.occupation || '—';
  const otherOccupation = participant.otherOccupation || '';
  const status = participant.status || 'Confirmed';

  const displayEducation = education === 'Other' && otherEducation 
    ? `Other (${otherEducation})` 
    : education;

  const displayOccupation = occupation === 'Other' && otherOccupation 
    ? `Other (${otherOccupation})` 
    : occupation;

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(registrationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins text-temple-900 selection:bg-saffron-100 selection:text-saffron-900 animate-fadeIn">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-cream-50/95 backdrop-blur-md border-b border-cream-200 shadow-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/krishna-logo1.webp"
              alt="Krishna"
              className="h-8 w-8 object-contain rounded-full border border-saffron-300 shadow-2xs"
            />
            <div className="text-left">
              <span className="text-sm font-bold text-temple-900 leading-tight block">
                Gita Amrita
              </span>
              <span className="text-[10px] text-temple-500 block">
                Participant Portal
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cream-300 hover:border-red-200 bg-white hover:bg-red-50 text-temple-700 hover:text-red-700 text-xs font-medium transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 text-left">
        
        {/* Welcome Card */}
        <div className="bg-cream-50 rounded-2xl p-5 sm:p-6 border border-cream-200 shadow-soft">
          <div className="space-y-1">
            <span className="text-[11px] sm:text-xs text-temple-500 font-medium block">
              Gita Amrita 2026
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-temple-900 tracking-tight">
              Welcome, {name}
            </h1>
            <p className="text-xs sm:text-sm text-temple-600 font-normal">
              Here is your official registration pass and profile details.
            </p>
          </div>
        </div>

        {/* Official Registration Pass Card */}
        <div className="bg-cream-50 rounded-2xl p-5 sm:p-6 border border-cream-200 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-cream-200 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-temple-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-saffron-600" />
              <span>Registration Pass</span>
            </h2>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {status}
            </span>
          </div>

          {/* Registration ID Banner */}
          <div className="p-4 bg-cream-100/80 rounded-xl border border-cream-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-temple-500 block">
                Registration ID
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-saffron-800">
                {registrationId}
              </span>
            </div>
            <button
              onClick={handleCopyId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-xs font-medium text-temple-700 transition-colors cursor-pointer shadow-2xs"
              title="Copy Registration ID"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-saffron-600" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Personal & Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-temple-700 pt-1">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/70 border border-cream-200">
              <Phone className="w-4 h-4 text-saffron-600 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase text-temple-400 block font-medium">Mobile Number</span>
                <span className="font-semibold text-temple-900">{mobile}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/70 border border-cream-200">
              <Mail className="w-4 h-4 text-saffron-600 flex-shrink-0" />
              <div className="truncate">
                <span className="text-[10px] uppercase text-temple-400 block font-medium">Email Address</span>
                <span className="font-semibold text-temple-900 truncate block">{email}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/70 border border-cream-200">
              <MapPin className="w-4 h-4 text-saffron-600 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase text-temple-400 block font-medium">Current Residence</span>
                <span className="font-semibold text-temple-900">{residence}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/70 border border-cream-200">
              <GraduationCap className="w-4 h-4 text-saffron-600 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase text-temple-400 block font-medium">Qualification</span>
                <span className="font-semibold text-temple-900">{displayEducation}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/70 border border-cream-200">
              <Briefcase className="w-4 h-4 text-saffron-600 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase text-temple-400 block font-medium">Occupation</span>
                <span className="font-semibold text-temple-900">{displayOccupation}</span>
              </div>
            </div>

            {address && address !== '—' && (
              <div className="sm:col-span-2 flex items-center gap-2.5 p-2.5 rounded-xl bg-white/70 border border-cream-200">
                <MapPin className="w-4 h-4 text-saffron-600 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase text-temple-400 block font-medium">Residential Address</span>
                  <span className="font-semibold text-temple-900">{address} {pincode && pincode !== '—' ? `(${pincode})` : ''}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coordinator Support */}
        <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-temple-700 shadow-2xs">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <HelpCircle className="w-4 h-4 text-saffron-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-temple-900">Have questions about the program?</p>
              <p className="text-temple-500">Contact the program coordinator team.</p>
            </div>
          </div>
          <a
            href="tel:+919490853507"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-cream-100 border border-cream-300 font-semibold text-temple-800 shadow-2xs flex-shrink-0 transition-colors cursor-pointer"
          >
            Call Coordinator (+91 94908 53507)
          </a>
        </div>

      </main>

      {/* Devotional Footer */}
      <footer className="py-5 text-center text-xs text-temple-500 border-t border-cream-200 mt-auto bg-cream-50/50">
        <p>© 2026 Pranavananda Das | Built with devotion for spreading Krishna consciousness</p>
      </footer>

      {/* Logout Confirmation Modal */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 border border-cream-300 shadow-soft-lg text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-temple-900">
                Confirm Logout
              </h3>
              <p className="text-xs text-temple-600">
                Are you sure you want to log out of your participant portal?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="w-1/2 py-2.5 px-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-xs font-semibold text-temple-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  onLogout();
                }}
                className="w-1/2 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-soft cursor-pointer transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
