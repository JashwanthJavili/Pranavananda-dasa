import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  Save, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Power,
  Link as LinkIcon,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  fetchWhatsAppSettings, 
  saveWhatsAppSettings, 
  OFFICIAL_WA_FALLBACK_LINK,
  DEFAULT_WHATSAPP_SETTINGS 
} from '../../firebase';

const REFERRAL_SOURCES = [
  { id: 'Yuva Setu', label: 'Yuva Setu' },
  { id: 'Friends', label: 'Friends' },
  { id: 'Social media', label: 'Social Media' },
  { id: 'Others', label: 'Others' },
];

export default function WhatsAppConfigModule({ callerUser = null, onSaved = null }) {
  const [initialSettings, setInitialSettings] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_WHATSAPP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Confirmation Modal State for Feature Toggle
  const [confirmToggleModal, setConfirmToggleModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchWhatsAppSettings();
        if (isMounted && data) {
          setSettings(data);
          setInitialSettings(data);
        }
      } catch (err) {
        console.warn('Failed to load WA settings:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // Compute Dirty State: True ONLY if fields were actually edited compared to initial settings
  const isDirty = useMemo(() => {
    if (!initialSettings) return false;
    if ((settings.waInviteLink || '').trim() !== (initialSettings.waInviteLink || '').trim()) return true;
    if ((settings.waButtonText || '').trim() !== (initialSettings.waButtonText || '').trim()) return true;

    const curExcluded = (settings.waExcludedSources || []).map(s => s.toLowerCase()).sort().join(',');
    const initExcluded = (initialSettings.waExcludedSources || []).map(s => s.toLowerCase()).sort().join(',');
    if (curExcluded !== initExcluded) return true;

    return false;
  }, [settings, initialSettings]);

  const handleToggleSource = (sourceId) => {
    setSettings(prev => {
      const current = prev.waExcludedSources || [];
      const exists = current.some(s => s.toLowerCase() === sourceId.toLowerCase());
      const updated = exists 
        ? current.filter(s => s.toLowerCase() !== sourceId.toLowerCase())
        : [...current, sourceId];
      return { ...prev, waExcludedSources: updated };
    });
  };

  // Immediate Toggle with Confirmation
  const handleConfirmToggleFeature = async () => {
    const targetStatus = !settings.waFeatureEnabled;
    const updated = { ...settings, waFeatureEnabled: targetStatus };
    setSettings(updated);
    setConfirmToggleModal(false);
    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await saveWhatsAppSettings(updated, callerUser);
      if (res.success) {
        setInitialSettings(updated);
        setStatusMsg({ 
          type: 'success', 
          text: `WhatsApp Feature ${targetStatus ? 'ENABLED' : 'DISABLED'} successfully!` 
        });
        if (onSaved) onSaved(res.settings);
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to update feature status.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Error updating status' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(null), 3500);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!isDirty) return;

    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await saveWhatsAppSettings(settings, callerUser);
      if (res.success) {
        setInitialSettings(settings);
        setStatusMsg({ type: 'success', text: 'WhatsApp Community settings saved successfully!' });
        if (onSaved) onSaved(res.settings);
      } else {
        setStatusMsg({ type: 'error', text: 'Could not save settings. Please try again.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Error saving settings' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(null), 3500);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-10 text-center border border-cream-200/90 shadow-soft max-w-2xl mx-auto space-y-3">
        <div className="w-9 h-9 border-3 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-temple-600 font-semibold tracking-wide">Loading WhatsApp Configurations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 font-poppins text-left animate-fadeIn">
      
      {/* Toast Alert */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-soft transition-all animate-fadeIn ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500 text-white border border-emerald-600' 
            : 'bg-rose-500 text-white border border-rose-600'
        }`}>
          <div className="flex items-center gap-2.5">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button type="button" onClick={() => setStatusMsg(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Confirmation Modal for Enable / Disable Toggle */}
      {confirmToggleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-cream-300 shadow-soft-lg space-y-5 text-center">
            
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-soft ${
              settings.waFeatureEnabled 
                ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            }`}>
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-temple-900">
                {settings.waFeatureEnabled ? 'Disable WhatsApp Access?' : 'Enable WhatsApp Access?'}
              </h3>
              <p className="text-xs text-temple-600 leading-relaxed">
                {settings.waFeatureEnabled ? (
                  <span>Are you sure you want to <strong>DISABLE</strong> the WhatsApp Community joining feature? The button will be hidden for all participants.</span>
                ) : (
                  <span>Are you sure you want to <strong>ENABLE</strong> the WhatsApp Community joining feature for participants?</span>
                )}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmToggleModal(false)}
                className="w-1/2 py-3 px-4 rounded-xl border border-cream-300 bg-cream-50 hover:bg-cream-100 text-temple-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleFeature}
                className={`w-1/2 py-3 px-4 rounded-xl font-bold text-xs text-white shadow-soft transition-all cursor-pointer transform hover:-translate-y-0.5 ${
                  settings.waFeatureEnabled
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {settings.waFeatureEnabled ? 'Yes, Disable' : 'Yes, Enable'}
              </button>
            </div>

          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-cream-200/90 shadow-soft-md p-6 sm:p-8 space-y-6">
        
        {/* Header Banner */}
        <div className="flex items-center justify-between pb-5 border-b border-cream-200/80">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-soft shrink-0">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-temple-900 tracking-tight">
                WhatsApp Community Joining
              </h2>
              <p className="text-xs text-temple-500">
                Configure invite link, button text, and referral rules
              </p>
            </div>
          </div>

          <span className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${
            settings.waFeatureEnabled 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${settings.waFeatureEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {settings.waFeatureEnabled ? 'Feature Active' : 'Feature Paused'}
          </span>
        </div>

        {/* 1. MASTER ENABLE / DISABLE TOGGLE CARD (Saves immediately on confirmation) */}
        <div className="bg-gradient-to-r from-cream-100/70 to-cream-50 rounded-2xl p-4 sm:p-5 border border-cream-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Power className={`w-4.5 h-4.5 ${settings.waFeatureEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              <h3 className="text-xs sm:text-sm font-bold text-temple-900">
                WhatsApp Join Button Status
              </h3>
            </div>
            <p className="text-xs text-temple-600">
              Clicking switch asks confirmation and saves status immediately.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setConfirmToggleModal(true)}
            className={`w-full sm:w-auto py-2.5 px-5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-soft transform hover:scale-[1.02] active:scale-[0.98] ${
              settings.waFeatureEnabled 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${settings.waFeatureEnabled ? 'bg-white' : 'bg-slate-500'}`} />
            <span>{settings.waFeatureEnabled ? 'ENABLED (ACTIVE)' : 'DISABLED (OFF)'}</span>
          </button>
        </div>

        {/* 2. INVITE LINK & BUTTON TEXT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* WhatsApp Invite Link */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-temple-900 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-saffron-600" />
              WhatsApp Group Link:
            </label>
            <input
              type="url"
              required
              placeholder="https://chat.whatsapp.com/..."
              value={settings.waInviteLink || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, waInviteLink: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-cream-300 bg-cream-50/50 text-temple-900 text-xs focus:outline-none focus:border-saffron-500 focus:bg-white focus:ring-2 focus:ring-saffron-500/20 transition-all font-mono shadow-2xs"
            />
          </div>

          {/* Custom Button Text */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-temple-900 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-saffron-600" />
              Custom Button Text:
            </label>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="Join Our WhatsApp Community"
              value={settings.waButtonText || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, waButtonText: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-cream-300 bg-cream-50/50 text-temple-900 text-xs focus:outline-none focus:border-saffron-500 focus:bg-white focus:ring-2 focus:ring-saffron-500/20 transition-all shadow-2xs"
            />
          </div>

        </div>

        {/* 3. REFERRAL VISIBILITY & EXCLUSIONS */}
        <div className="space-y-3 pt-2 border-t border-cream-200/80">
          <div className="space-y-0.5">
            <label className="block text-xs font-bold text-temple-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-saffron-600" />
              Hide Button For Specific Referral Sources:
            </label>
            <p className="text-xs text-temple-500">
              Click a source below to <strong>HIDE</strong> the button for users coming from that channel:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {REFERRAL_SOURCES.map((opt) => {
              const isExcluded = (settings.waExcludedSources || []).some(
                s => s.toLowerCase() === opt.id.toLowerCase()
              );
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleToggleSource(opt.id)}
                  className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-[0.98] ${
                    isExcluded 
                      ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-soft' 
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/80 shadow-2xs'
                  }`}
                >
                  <span className="font-bold text-left truncate">{opt.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    isExcluded ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {isExcluded ? 'Hidden' : 'Visible'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. LIVE BUTTON PREVIEW */}
        <div className="pt-2 border-t border-cream-200/80 space-y-2">
          <span className="block text-[11px] font-bold text-temple-500 uppercase tracking-wider">
            Live Registration Page Button Preview:
          </span>
          
          {settings.waFeatureEnabled ? (
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-center space-y-1">
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="w-full max-w-md mx-auto flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-emerald-600 text-white font-semibold text-xs sm:text-sm shadow-soft cursor-default"
              >
                <MessageSquare className="w-4.5 h-4.5 fill-current" />
                <span>{settings.waButtonText || 'Join Our WhatsApp Community'}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80 ml-0.5" />
              </button>
            </div>
          ) : (
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-2">
              <Power className="w-4 h-4 text-slate-400" />
              <span>WhatsApp Button is currently DISABLED.</span>
            </div>
          )}
        </div>

        {/* 5. SAVE BUTTON (Enabled ONLY when form fields are actually edited!) */}
        <div className="pt-3 border-t border-cream-200/80">
          <button
            type="submit"
            disabled={!isDirty || saving}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-soft ${
              isDirty && !saving
                ? 'bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-white cursor-pointer transform hover:-translate-y-0.5'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60 shadow-none'
            }`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>
              {saving 
                ? 'Saving Changes...' 
                : isDirty 
                  ? 'Save Settings (Changes Detected)' 
                  : 'Save Settings (No Changes to Save)'}
            </span>
          </button>
        </div>

      </form>
    </div>
  );
}
