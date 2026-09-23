import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  LogIn,
  User,
  Key,
  ChevronDown
} from 'lucide-react';
import { 
  studentLogin, 
  adminLogin, 
  checkLoginRateLimit, 
  recordFailedLoginAttempt, 
  clearLoginRateLimit 
} from '../firebase';

const STORAGE_KEY_USER_ACCOUNTS = 'gita_amrita_saved_user_accounts';
const LEGACY_USER_ID_KEY = 'gita_amrita_remember_user_id';
const LEGACY_USER_PASS_KEY = 'gita_amrita_remember_user_pass';

function getSavedUserAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_ACCOUNTS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    // Migrate legacy single item if present
    const legacyId = localStorage.getItem(LEGACY_USER_ID_KEY);
    const legacyPass = localStorage.getItem(LEGACY_USER_PASS_KEY);
    if (legacyId && !list.some(a => a.id.toLowerCase() === legacyId.toLowerCase())) {
      list.unshift({
        id: legacyId.trim(),
        pass: legacyPass || '',
        lastUsed: Date.now()
      });
      localStorage.setItem(STORAGE_KEY_USER_ACCOUNTS, JSON.stringify(list));
    }
    return list;
  } catch (e) {
    return [];
  }
}

export default function LoginModal({ 
  isOpen, 
  onClose, 
  onOpenRegister, 
  onAdminLoginSuccess,
  onStudentLoginSuccess 
}) {
  const [savedAccounts, setSavedAccounts] = useState(() => getSavedUserAccounts());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const suggestionsContainerRef = useRef(null);

  // Textboxes start clean/empty - populated only when a suggestion is clicked or user types
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reload saved accounts list on modal open without auto-filling the inputs
  useEffect(() => {
    if (isOpen) {
      setError('');
      setIdentifier('');
      setPassword('');
      setRememberMe(false);
      const accounts = getSavedUserAccounts();
      setSavedAccounts(accounts);
      setManuallyDismissed(false);
      setShowSuggestions(false);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const selectAccount = (acc) => {
    setIdentifier(acc.id);
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
      localStorage.setItem(STORAGE_KEY_USER_ACCOUNTS, JSON.stringify(updated));
      if (updated.length === 0) {
        localStorage.removeItem(LEGACY_USER_ID_KEY);
        localStorage.removeItem(LEGACY_USER_PASS_KEY);
      }
    } catch (e) {}

    if (identifier.toLowerCase() === idToRemove.toLowerCase()) {
      if (updated.length > 0) {
        selectAccount(updated[0]);
      } else {
        setIdentifier('');
        setPassword('');
        setRememberMe(false);
      }
    }
  };

  const saveCredentialsIfRemembered = () => {
    try {
      const cleanId = identifier.trim();
      if (rememberMe) {
        const encodedPass = btoa(password);
        let list = getSavedUserAccounts().filter(a => a.id.toLowerCase() !== cleanId.toLowerCase());
        list.unshift({
          id: cleanId,
          pass: encodedPass,
          lastUsed: Date.now()
        });
        localStorage.setItem(STORAGE_KEY_USER_ACCOUNTS, JSON.stringify(list));
        localStorage.setItem(LEGACY_USER_ID_KEY, cleanId);
        localStorage.setItem(LEGACY_USER_PASS_KEY, encodedPass);
        setSavedAccounts(list);
      } else {
        let list = getSavedUserAccounts().filter(a => a.id.toLowerCase() !== cleanId.toLowerCase());
        localStorage.setItem(STORAGE_KEY_USER_ACCOUNTS, JSON.stringify(list));
        if (list.length === 0) {
          localStorage.removeItem(LEGACY_USER_ID_KEY);
          localStorage.removeItem(LEGACY_USER_PASS_KEY);
        }
        setSavedAccounts(list);
      }
    } catch (e) {}
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your mobile number/email and password.');
      return;
    }

    // Rate limiting check
    const rateCheck = checkLoginRateLimit(identifier);
    if (!rateCheck.allowed) {
      setError(rateCheck.message);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Check Coordinator / Admin credentials
      const adminRes = await adminLogin(identifier, password);
      if (adminRes.success) {
        clearLoginRateLimit(identifier);
        saveCredentialsIfRemembered();
        resetAndClose();
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess(adminRes.admin);
        }
        return;
      }

      // 2. Check Participant credentials
      const res = await studentLogin(identifier, password);
      if (res.success) {
        clearLoginRateLimit(identifier);
        saveCredentialsIfRemembered();
        const user = res.participant || res.user || { identifier };
        try {
          localStorage.setItem('gita_amrita_current_user', JSON.stringify(user));
        } catch (e) {}
        resetAndClose();
        if (onStudentLoginSuccess) {
          onStudentLoginSuccess(user);
        }
        return;
      } else {
        recordFailedLoginAttempt(identifier);
        setError(res.error || 'Invalid credentials. Please verify your mobile/email and password.');
      }
    } catch (err) {
      setError('An error occurred during sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setError('');
    setShowSuggestions(false);
    if (!rememberMe) {
      setPassword('');
      setIdentifier('');
    }
    setLoading(false);
    onClose();
  };

  // Matching accounts for autocomplete
  const matchingAccounts = savedAccounts.filter(acc => {
    if (!identifier.trim()) return true;
    return acc.id.toLowerCase().includes(identifier.toLowerCase().trim());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-cream-50 rounded-3xl p-6 sm:p-8 shadow-soft-lg border border-cream-300 text-temple-900 overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={resetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full text-temple-400 hover:text-temple-800 hover:bg-cream-200 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 mb-5 text-center sm:text-left">
          <h3 className="text-2xl font-bold tracking-tight text-temple-900">
            Sign In
          </h3>
          <p className="text-xs sm:text-sm text-temple-600 font-normal">
            Access your Gita Amrita participant or coordinator account.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Password Login Form */}
        <form onSubmit={handleLogin} className="space-y-3.5" autoComplete="off">
          
          {/* Identifier Input with Autofill Suggestions */}
          <div className="space-y-1.5 relative" ref={suggestionsContainerRef}>
            <div className="flex items-center justify-between">
              <label 
                htmlFor="user-identifier"
                className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
              >
                Mobile Number or Email
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
                id="user-identifier"
                name="ga_usr_ident"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                required
                placeholder="Enter mobile number or email"
                value={identifier}
                onFocus={() => {
                  if (!manuallyDismissed) {
                    setShowSuggestions(true);
                  }
                }}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError('');
                  // Only show suggestions if the user has not explicitly clicked Close
                  if (!manuallyDismissed) {
                    setShowSuggestions(true);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
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
                      className="px-3.5 py-2 hover:bg-saffron-50/80 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
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

          {/* Password Input */}
          <div className="space-y-1.5">
            <label 
              htmlFor="user-password"
              className="block text-xs font-semibold uppercase tracking-wider text-temple-700"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="user-password"
                name="ga_usr_key"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-cream-300 bg-white text-temple-900 placeholder:text-temple-400 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
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

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-medium text-sm shadow-soft hover:shadow-soft-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>

          {/* New Registration Prompt */}
          {onOpenRegister && (
            <div className="text-center pt-2.5 border-t border-cream-200">
              <p className="text-xs text-temple-600">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetAndClose();
                    onOpenRegister();
                  }}
                  className="font-semibold text-saffron-700 hover:text-saffron-800 hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
