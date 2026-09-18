import React, { useState } from 'react';
import { CheckCircle2, Home, LayoutDashboard, Copy, Check, UserPlus, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { updateRegistrationPassword } from '../../firebase';

export default function StepSuccess({ 
  registrationId, 
  formData = {}, 
  onBackToHome, 
  onGoToDashboard, 
  onRegisterAnother 
}) {
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(() => {
    try {
      if (formData && formData.password) return true;
      const completed = localStorage.getItem('gita_amrita_completed_reg');
      if (completed) {
        const parsed = JSON.parse(completed);
        if (parsed.formData && parsed.formData.password) return true;
      }
    } catch (e) {}
    return false;
  });

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(registrationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsSavingPassword(true);
    setPasswordError('');

    try {
      await updateRegistrationPassword(
        registrationId,
        password,
        formData?.email || ''
      );
      setPasswordSaved(true);
    } catch (err) {
      console.warn('Password save error:', err);
      setPasswordError('Could not save password. Please try again.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="text-center space-y-6 animate-fadeIn py-4">
      {/* Devotional Calm Checkmark */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-saffron-50 text-saffron-600 rounded-full flex items-center justify-center mx-auto border border-saffron-200 shadow-soft">
        <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.2]" />
      </div>

      {/* Headings */}
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
          Registration Complete
        </h2>
        <div className="space-y-1">
          <p className="text-lg sm:text-xl font-medium text-saffron-700">
            Hare Krishna 🙏
          </p>
          <p className="text-sm sm:text-base text-temple-700 font-normal">
            Thank you for registering for Gita Amrita.
          </p>
        </div>
      </div>

      {/* Dynamic Registration ID Card */}
      <div className="bg-cream-50 rounded-2xl p-4 sm:p-5 border border-cream-300 max-w-xs mx-auto shadow-soft space-y-1.5">
        <span className="text-[11px] uppercase tracking-widest text-temple-500 font-semibold block">
          Your Registration ID
        </span>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl sm:text-2xl font-bold tracking-wider text-temple-900 font-mono">
            {registrationId}
          </span>
          <button
            onClick={handleCopyId}
            className="p-1.5 rounded-lg text-temple-500 hover:text-saffron-600 hover:bg-cream-200 transition-colors"
            title="Copy Registration ID"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <span className="text-[10px] text-temple-400 block">
          Save this ID for your records and attendance
        </span>
      </div>

      {/* Create Dashboard Password Card (Post-Registration) */}
      <div className="bg-cream-50 rounded-2xl p-5 border border-cream-300 max-w-sm mx-auto shadow-soft text-left space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-saffron-100 text-saffron-700 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-temple-900">
              Create Dashboard Password
            </h3>
            <p className="text-[11px] text-temple-600">
              Set a password to log into your participant dashboard anytime.
            </p>
          </div>
        </div>

        {passwordSaved ? (
          <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>Password created! You can now use your mobile or email and password to log in.</span>
          </div>
        ) : (
          <form onSubmit={handleSavePassword} className="space-y-2.5 pt-1">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-temple-700 uppercase tracking-wider">
                Create Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-temple-700 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 transition-colors"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <p className="text-[11px] text-red-600 font-medium">{passwordError}</p>
            )}

            <button
              type="submit"
              disabled={isSavingPassword}
              className="w-full py-2.5 px-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-xs sm:text-sm shadow-soft transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {isSavingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Password...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save Password</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Reassuring message */}
      <p className="text-sm text-temple-600 max-w-sm mx-auto leading-relaxed">
        We'll share the program details and important updates with you soon via WhatsApp / SMS.
      </p>

      {/* Actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs mx-auto">
        <button
          type="button"
          onClick={onBackToHome}
          className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-temple-800 font-medium text-sm transition-colors"
        >
          <Home className="w-4 h-4 text-temple-600" />
          <span>Back to Home</span>
        </button>

        <button
          type="button"
          onClick={onGoToDashboard}
          className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-sm shadow-soft transition-all"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Go to Dashboard</span>
        </button>
      </div>

      {/* Register Another Option */}
      {onRegisterAnother && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onRegisterAnother}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-saffron-700 hover:text-saffron-800 hover:underline transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register another participant</span>
          </button>
        </div>
      )}

      <p className="text-xs text-temple-500 pt-1 italic">
        ISKCON Adilabad &bull; Center for Gita Amrita
      </p>
    </div>
  );
}
