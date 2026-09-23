import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Loader2,
  User,
  Key,
  X,
  ChevronDown
} from 'lucide-react';
import { adminLogin } from '../../firebase';

const STORAGE_KEY_ADMIN_ACCOUNTS = 'gita_amrita_saved_admin_accounts';
const LEGACY_ADMIN_ID_KEY = 'gita_amrita_remember_admin_id';
const LEGACY_ADMIN_PASS_KEY = 'gita_amrita_remember_admin_pass';

function getSavedAdminAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADMIN_ACCOUNTS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    // Migrate legacy single item if present
    const legacyId = localStorage.getItem(LEGACY_ADMIN_ID_KEY) || localStorage.getItem('gita_amrita_remember_admin');
    const legacyPass = localStorage.getItem(LEGACY_ADMIN_PASS_KEY);
    if (legacyId && !list.some(a => a.id.toLowerCase() === legacyId.toLowerCase())) {
      list.unshift({
        id: legacyId.trim(),
        pass: legacyPass || '',
        lastUsed: Date.now()
      });
      localStorage.setItem(STORAGE_KEY_ADMIN_ACCOUNTS, JSON.stringify(list));
    }
    return list;
  } catch (e) {
    return [];
  }
}

export default function AdminLogin({ onLoginSuccess, onBackToHome }) {
  const [savedAccounts, setSavedAccounts] = useState(() => getSavedAdminAccounts());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const suggestionsContainerRef = useRef(null);

  // Inputs start clean/empty - filled only when user selects a suggestion or types
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsContainerRef.current && 
        !suggestionsContainerRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectAccount = (acc) => {
    setUsername(acc.id);
    if (acc.pass) {
      try {
        setPassword(atob(acc.pass));
      } catch (e) {
        setPassword(acc.pass);
      }
    } else {
      setPassword('');
    }
    setRememberMe(true);
    setShowSuggestions(false);
    setManuallyDismissed(false);
    setError('');
  };

  const handleDismissSuggestions = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setShowSuggestions(false);
    setManuallyDismissed(true);
  };

  const handleManualToggleSuggestions = () => {
    if (showSuggestions) {
      setShowSuggestions(false);
      setManuallyDismissed(true);
    } else {
      setShowSuggestions(true);
      setManuallyDismissed(false);
    }
  };

  const removeSavedAccount = (idToRemove) => {
    const updated = savedAccounts.filter(a => a.id.toLowerCase() !== idToRemove.toLowerCase());
    setSavedAccounts(updated);
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN_ACCOUNTS, JSON.stringify(updated));
      if (updated.length === 0) {
        localStorage.removeItem(LEGACY_ADMIN_ID_KEY);
        localStorage.removeItem(LEGACY_ADMIN_PASS_KEY);
        localStorage.removeItem('gita_amrita_remember_admin');
      }
    } catch (e) {}

    if (username.toLowerCase() === idToRemove.toLowerCase()) {
      if (updated.length > 0) {
        selectAccount(updated[0]);
      } else {
        setUsername('');
        setPassword('');
        setRememberMe(false);
      }
    }
  };

  const saveOrUpdateAccount = (id, plainPass) => {
    try {
      const cleanId = id.trim();
      const encodedPass = btoa(plainPass);
      let list = getSavedAdminAccounts();
      list = list.filter(a => a.id.toLowerCase() !== cleanId.toLowerCase());
      list.unshift({
        id: cleanId,
        pass: encodedPass,
        lastUsed: Date.now()
      });
      localStorage.setItem(STORAGE_KEY_ADMIN_ACCOUNTS, JSON.stringify(list));
      localStorage.setItem(LEGACY_ADMIN_ID_KEY, cleanId);
      localStorage.setItem(LEGACY_ADMIN_PASS_KEY, encodedPass);
      setSavedAccounts(list);
    } catch (e) {}
  };

  const removeCurrentAccountFromStorage = (id) => {
    try {
      const cleanId = id.trim();
      let list = getSavedAdminAccounts().filter(a => a.id.toLowerCase() !== cleanId.toLowerCase());
      localStorage.setItem(STORAGE_KEY_ADMIN_ACCOUNTS, JSON.stringify(list));
      if (list.length === 0) {
        localStorage.removeItem(LEGACY_ADMIN_ID_KEY);
        localStorage.removeItem(LEGACY_ADMIN_PASS_KEY);
        localStorage.removeItem('gita_amrita_remember_admin');
      }
      setSavedAccounts(list);
    } catch (e) {}
  };

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
        if (rememberMe) {
          saveOrUpdateAccount(username, password);
        } else {
          removeCurrentAccountFromStorage(username);
        }
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

  // Filter accounts matching input
  const matchingAccounts = savedAccounts.filter(acc => {
    if (!username.trim()) return true;
    return acc.id.toLowerCase().includes(username.toLowerCase().trim());
  });

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-4 font-poppins text-temple-900 selection:bg-saffron-100 selection:text-saffron-900">
      
      {/* Top Bar / Badge */}
      <div className="w-full max-w-md mb-4 flex items-center justify-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700 bg-saffron-50 px-3 py-1 rounded-full border border-saffron-200">
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
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          
          {/* Username / Email with Autofill Suggestions */}
          <div className="space-y-1.5 relative" ref={suggestionsContainerRef}>
            <div className="flex items-center justify-between">
              <label 
                htmlFor="admin-username"
                className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
              >
                Coordinator Username or Email
              </label>
              {savedAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={handleManualToggleSuggestions}
                  className="text-[11px] text-saffron-700 hover:text-saffron-800 font-medium cursor-pointer flex items-center gap-1"
                >
                  <span>Saved accounts ({savedAccounts.length})</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            <div className="relative">
              <input
                id="admin-username"
                name="ga_admin_coord"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                required
                placeholder="e.g. administrator@iskconadilabad.com"
                value={username}
                onFocus={() => {
                  if (!manuallyDismissed) {
                    setShowSuggestions(true);
                  }
                }}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                  // Only show suggestions if the user has not explicitly clicked Close
                  if (!manuallyDismissed) {
                    setShowSuggestions(true);
                  }
                }}
                className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && matchingAccounts.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-2xl border border-cream-300 shadow-soft-lg overflow-hidden animate-fadeIn text-left py-1">
                {/* Header with Title and Interactive Close Button */}
                <div className="px-3.5 py-1.5 text-[10px] uppercase font-bold tracking-wider text-temple-400 flex items-center justify-between border-b border-cream-100 bg-cream-50/70">
                  <span>Saved Accounts</span>
                  <button
                    type="button"
                    onMouseDown={handleDismissSuggestions}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-temple-500 hover:text-temple-900 px-2 py-0.5 rounded-md hover:bg-cream-200/80 transition-colors cursor-pointer"
                    title="Dismiss suggestions"
                  >
                    <span>Close</span>
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-cream-100">
                  {matchingAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="px-3.5 py-2.5 hover:bg-saffron-50/80 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectAccount(acc);
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-saffron-100 text-saffron-700 flex items-center justify-center flex-shrink-0 group-hover:bg-saffron-200">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-temple-900 truncate">
                            {acc.id}
                          </div>
                          <div className="text-[10px] text-temple-400 flex items-center gap-1 font-mono tracking-wider">
                            <Key className="w-2.5 h-2.5 text-saffron-500" />
                            <span>••••••••</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        title="Delete saved account"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAccountToDelete(acc.id);
                        }}
                        className="p-1.5 rounded-lg text-temple-300 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirmation Modal for Removing Saved Credentials */}
          {accountToDelete && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn"
              onClick={(e) => {
                e.stopPropagation();
                setAccountToDelete(null);
              }}
            >
              <div 
                className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-soft-xl border border-cream-300 text-left space-y-4 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs">
                  <AlertCircle className="w-5 h-5" />
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-temple-900">
                    Remove Saved Credentials?
                  </h4>
                  <p className="text-xs text-temple-600 leading-relaxed">
                    Are you sure you want to remove the saved credentials for <span className="font-semibold text-temple-900 font-mono break-all">{accountToDelete}</span>? You will need to enter your password manually next time you sign in.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-100">
                  <button
                    type="button"
                    onClick={() => setAccountToDelete(null)}
                    className="px-3.5 py-2 rounded-xl border border-cream-300 text-xs font-medium text-temple-700 hover:bg-cream-100 transition-colors cursor-pointer"
                  >
                    Keep Saved
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeSavedAccount(accountToDelete);
                      setAccountToDelete(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-soft transition-all cursor-pointer"
                  >
                    Remove Credentials
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <label 
              htmlFor="admin-password"
              className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                name="ga_admin_key"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-temple-700 hover:text-temple-900">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-cream-400 text-saffron-600 focus:ring-saffron-500/30 accent-saffron-600 cursor-pointer"
              />
              <span className="font-medium">Remember me</span>
            </label>
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

      </div>

      <p className="text-xs text-temple-500 mt-6 text-center">
        Hare Krishna &bull; Dedicated to Sri Sri Radha Govinda &bull; ISKCON Adilabad
      </p>

    </div>
  );
}
