import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, ArrowLeft, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { adminLogin } from '../../firebase';

export default function AdminLogin({ onLoginSuccess, onBackToHome }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your coordinator username/email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await adminLogin(username, password);
      if (res.success) {
        onLoginSuccess(res.admin);
      } else {
        setError(res.error || 'Invalid credentials. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-4 font-poppins text-temple-900 selection:bg-saffron-100 selection:text-saffron-900">
      
      {/* Top Bar / Back to Home */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-temple-600 hover:text-temple-900 px-3 py-1.5 rounded-full border border-cream-300 bg-cream-50 hover:bg-cream-200/70 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-saffron-600" />
          <span>Back to Gita Amrita</span>
        </button>

        <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700 bg-saffron-50 px-2.5 py-1 rounded-full border border-saffron-200">
          Coordinator Access
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-cream-50 rounded-3xl p-6 sm:p-8 shadow-soft-lg border border-cream-300/90 text-left space-y-6 animate-fadeIn">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-saffron-100 text-saffron-700 flex items-center justify-center mx-auto border border-saffron-200 shadow-soft">
            <ShieldCheck className="w-7 h-7 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-temple-900">
              Admin Portal
            </h2>
            <p className="text-xs sm:text-sm text-temple-600">
              ISKCON Adilabad &bull; Gita Amrita Management
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username / Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-temple-700">
              Coordinator Username or Email
            </label>
            <input
              type="text"
              required
              placeholder="e.g. admin or coordinator"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-temple-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full pl-4 pr-11 py-3 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 transition-colors cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-sm shadow-soft hover:shadow-soft-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Credentials helper hint */}
        <div className="p-3 bg-cream-100 rounded-xl border border-cream-200 text-[11px] text-temple-600 space-y-1">
          <span className="font-semibold text-temple-800 block">Default Coordinator Credentials:</span>
          <div>Username: <code className="bg-cream-200 px-1 py-0.5 rounded text-temple-900">admin</code> &bull; Password: <code className="bg-cream-200 px-1 py-0.5 rounded text-temple-900">iskcon108</code></div>
          <div>Or: <code className="bg-cream-200 px-1 py-0.5 rounded text-temple-900">coordinator</code> &bull; Password: <code className="bg-cream-200 px-1 py-0.5 rounded text-temple-900">gita2026</code></div>
        </div>

      </div>

      <p className="text-xs text-temple-500 mt-6 text-center">
        Hare Krishna &bull; Dedicated to Sri Sri Radha Govinda &bull; ISKCON Adilabad
      </p>

    </div>
  );
}
