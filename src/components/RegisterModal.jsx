import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

export default function RegisterModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    mode: 'Online',
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const resetAndClose = () => {
    setSubmitted(false);
    setFormData({ fullName: '', phone: '', email: '', mode: 'Online' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card */}
      <div 
        className="relative w-full max-w-md bg-cream-50 rounded-3xl p-6 sm:p-8 shadow-soft-lg border border-cream-300 text-temple-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={resetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full text-temple-500 hover:text-temple-900 hover:bg-cream-200 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-saffron-100 text-saffron-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-temple-900">
              Hare Krishna!
            </h3>
            <p className="text-sm sm:text-base text-temple-700 leading-relaxed">
              Thank you for registering your interest, <strong className="font-semibold text-temple-900">{formData.fullName}</strong>. We will notify you as soon as the upcoming batch schedule is finalized.
            </p>
            <div className="pt-4">
              <button
                onClick={resetAndClose}
                className="w-full py-3 px-4 bg-saffron-500 hover:bg-saffron-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-saffron-600">
                Sacred Wisdom Program
              </span>
              <h3 className="text-2xl font-bold text-temple-900 mt-1">
                Register for Gita Amrita
              </h3>
              <p className="text-xs sm:text-sm text-temple-600 mt-1">
                Join the upcoming Bhagavad Gita learning batch
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-temple-700 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-saffron-500 text-sm transition-colors text-temple-900 placeholder:text-temple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-temple-700 uppercase tracking-wider mb-1.5">
                  WhatsApp / Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-saffron-500 text-sm transition-colors text-temple-900 placeholder:text-temple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-temple-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com (optional)"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-saffron-500 text-sm transition-colors text-temple-900 placeholder:text-temple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-temple-700 uppercase tracking-wider mb-1.5">
                  Preferred Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Online', 'Offline'].map((modeOption) => (
                    <button
                      type="button"
                      key={modeOption}
                      onClick={() => setFormData({ ...formData, mode: modeOption })}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                        formData.mode === modeOption
                          ? 'border-saffron-500 bg-saffron-50 text-saffron-700 font-semibold'
                          : 'border-cream-300 bg-cream-100/60 text-temple-700 hover:bg-cream-200/50'
                      }`}
                    >
                      {modeOption}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
                >
                  Submit Registration
                </button>
              </div>

              <p className="text-[11px] text-center text-temple-500 leading-tight">
                No fee required for registration &bull; Batch timings will be communicated via WhatsApp
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
