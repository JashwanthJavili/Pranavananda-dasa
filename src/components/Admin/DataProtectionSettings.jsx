import React, { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { setRegistrationDelete } from '../../adminControls';

/** Super Admin setting: show the delete icon in the registration table (off by default). */
export default function DataProtectionSettings({ callerUser, enabled, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      onChange(await setRegistrationDelete(!enabled, callerUser));
    } catch (err) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-cream-50 rounded-3xl border border-cream-200 shadow-soft p-5 sm:p-6 space-y-3 text-left">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-temple-900">Data protection</h3>
          <p className="text-xs text-temple-500 leading-relaxed">Keep this off unless a registration really must be deleted.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-white border border-cream-200 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-temple-900">Allow deleting registrations</p>
          <p className="text-[11px] text-temple-500">
            {enabled ? 'On: the delete icon shows in the registration table.' : 'Off: no one can delete a registration.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Allow deleting registrations"
          onClick={toggle}
          disabled={busy}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer disabled:cursor-wait ${enabled ? 'bg-red-500' : 'bg-cream-300'}`}
        >
          <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center transition-transform ${enabled ? 'translate-x-5' : ''}`}>
            {busy && <Loader2 className="w-3 h-3 animate-spin text-temple-500" />}
          </span>
        </button>
      </div>
      {enabled && <p className="text-[11px] text-red-700">Please turn this off again once you are done.</p>}
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
