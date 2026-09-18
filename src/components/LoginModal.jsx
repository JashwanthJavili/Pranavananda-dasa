import React, { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff, Loader2, CheckCircle2, User, BookOpen, Calendar, MapPin, LogOut, ArrowRight, AlertCircle } from 'lucide-react';
import { studentLogin, adminLogin } from '../firebase';

export default function LoginModal({ 
  isOpen, 
  onClose, 
  onOpenRegister, 
  onAdminLoginSuccess,
  onStudentLoginSuccess 
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_current_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your mobile/email/username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. First check if credentials belong to Coordinator / Admin
      const adminRes = await adminLogin(identifier, password);
      if (adminRes.success) {
        resetAndClose();
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess(adminRes.admin);
        }
        return;
      }

      // 2. Otherwise check if credentials belong to a registered Participant / Student
      const res = await studentLogin(identifier, password);
      if (res.success) {
        const user = res.participant || res.user || { identifier };
        try {
          localStorage.setItem('gita_amrita_current_user', JSON.stringify(user));
        } catch (e) {}
        onClose();
        if (onStudentLoginSuccess) {
          onStudentLoginSuccess(user);
        }
        return;
      } else {
        setError(res.error || 'Invalid credentials. Please verify your mobile/email and password, or register.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setPassword('');
    try {
      localStorage.removeItem('gita_amrita_current_user');
    } catch (e) {}
  };

  const resetAndClose = () => {
    setError('');
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-cream-50 rounded-3xl p-6 sm:p-8 shadow-soft-lg border border-cream-300 text-temple-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={resetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full text-temple-500 hover:text-temple-900 hover:bg-cream-200 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {loggedInUser ? (
          /* Participant Dashboard View */
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center space-y-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-saffron-600">
                Participant Dashboard
              </span>
              <h3 className="text-2xl font-bold text-temple-900">
                Hare Krishna 🙏
              </h3>
              <p className="text-xs sm:text-sm text-temple-600">
                Welcome, {loggedInUser.fullName || loggedInUser.email || 'Participant'}
              </p>
            </div>

            {/* Registration Details Card */}
            <div className="bg-cream-100 rounded-2xl p-4 border border-cream-200 shadow-soft space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-cream-200 pb-2">
                <span className="text-xs text-temple-600 font-medium">Registration ID</span>
                <span className="text-xs font-bold font-mono text-saffron-800 bg-saffron-50 border border-saffron-200 px-2 py-0.5 rounded">
                  {loggedInUser.registrationId || loggedInUser.id || 'GA26-CONFIRMED'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-temple-800">
                  <BookOpen className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                  <span><strong>Program:</strong> {loggedInUser.batchTitle || 'Bhagavad Gita'} ({loggedInUser.batchMode || 'Online & Offline'})</span>
                </div>

                <div className="flex items-center gap-2 text-temple-800">
                  <Calendar className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                  <span><strong>Schedule:</strong> {loggedInUser.batchSchedule || 'Daily • 7:00 PM'}</span>
                </div>

                <div className="flex items-center gap-2 text-temple-800">
                  <MapPin className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
                  <span><strong>Center:</strong> ISKCON Adilabad (Edulapuram)</span>
                </div>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>Your registration is confirmed. We will share the live batch link via WhatsApp.</span>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-1/3 py-2.5 px-3 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-temple-700 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>

              <button
                type="button"
                onClick={resetAndClose}
                className="w-2/3 py-2.5 px-4 bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-soft cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="space-y-4">
            <div className="text-center mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-saffron-600">
                Gita Amrita Portal
              </span>
              <h3 className="text-2xl font-bold text-temple-900 mt-1">
                Portal Login
              </h3>
              <p className="text-xs sm:text-sm text-temple-600 mt-1 font-normal">
                Sign in with your credentials to access your dashboard
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 animate-fadeIn text-left">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5 text-left">
              <div>
                <label className="block text-xs font-semibold text-temple-700 uppercase tracking-wider mb-1.5">
                  Mobile Number, Email, or Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter mobile, email, or username"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-saffron-500 text-sm transition-colors text-temple-900 placeholder:text-temple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-temple-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-cream-300 bg-cream-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-saffron-500 text-sm transition-colors text-temple-900 placeholder:text-temple-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 transition-colors cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold rounded-xl transition-all shadow-soft flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Login to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Registration Link */}
              {onOpenRegister && (
                <div className="text-center pt-2 border-t border-cream-200">
                  <p className="text-xs text-temple-600">
                    Not registered yet?{' '}
                    <button
                      type="button"
                      onClick={onOpenRegister}
                      className="font-semibold text-saffron-700 hover:text-saffron-800 hover:underline cursor-pointer"
                    >
                      Register for Gita Amrita
                    </button>
                  </p>
                </div>
              )}

              <p className="text-[11px] text-center text-temple-500 pt-1">
                For assistance, contact ISKCON Adilabad program coordinators.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
