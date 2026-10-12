import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, Loader2, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { WIPE_KEEPS, isStagingBuild, wipeStagingData, wipeTargets } from '../../stagingWipe';

const CONFIRM_TEXT = 'DELETE STAGING';

/**
 * STAGING ONLY (Super Admins): delete all test data. Not rendered at all on production,
 * and Firestore rules refuse these deletes outside the staging project.
 */
export default function StagingWipePanel({ manager, onDone }) {
  const [open, setOpen] = useState(false);
  if (!isStagingBuild()) return null;

  return (
    <div className="rounded-2xl p-4 sm:p-5 border border-red-200 bg-red-50/60 shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-4 h-4" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider">Danger zone</h2>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">Staging only</span>
      </div>
      <p className="text-xs text-temple-700 leading-relaxed">
        Permanently deletes all participant data in the staging database (registrations, student accounts, quiz answers,
        ratings, Contact Us messages and logs) so testing can start fresh. Admin accounts and settings are kept, and you can choose
        whether to keep the quizzes. This button does not exist on the live site.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!manager?.isManager}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 cursor-pointer"
      >
        <Trash2 className="w-4 h-4" /> Delete all staging data
      </button>
      {!manager?.isManager && (
        <p className="text-[11px] text-red-700">Needs your secure Super Admin session. Please log out and log in again.</p>
      )}
      {open && <WipeDialog onClose={() => setOpen(false)} onDone={onDone} />}
    </div>
  );
}

function WipeDialog({ onClose, onDone }) {
  const [typed, setTyped] = useState('');
  const [includeAdminContent, setIncludeAdminContent] = useState(false);
  const targets = wipeTargets(includeAdminContent);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({}); // index -> { deleted, done, error }
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !running && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [running, onClose]);

  const run = async () => {
    setRunning(true);
    setError('');
    try {
      const res = await wipeStagingData((p) => setProgress((m) => ({ ...m, [p.index]: p })), { includeAdminContent });
      setResults(res);
      onDone?.();
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const total = results ? results.reduce((n, r) => n + r.deleted, 0) : 0;
  const failed = results ? results.filter((r) => r.error) : [];
  const started = running || results;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-temple-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 font-poppins" onMouseDown={(e) => e.target === e.currentTarget && !running && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="wipe-title" className="w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-cream-50 rounded-t-3xl sm:rounded-3xl border border-red-200 shadow-soft-lg animate-fadeIn">
        <div className="px-5 sm:px-6 py-4 border-b border-cream-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 id="wipe-title" className="text-base sm:text-lg font-bold text-temple-900">
              {results ? 'Staging data deleted' : 'Delete all staging data?'}
            </h2>
            <p className="text-xs text-temple-500">Staging database only · this cannot be undone</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          {!started && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-red-200 bg-white p-3.5 space-y-1.5">
                <p className="text-[11px] uppercase tracking-wider font-bold text-red-600">Will be deleted</p>
                <ul className="text-xs text-temple-700 space-y-0.5">
                  {targets.map((c) => <li key={c.label}>• {c.label}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white p-3.5 space-y-1.5 self-start">
                <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">Will be kept</p>
                <ul className="text-xs text-temple-700 space-y-0.5">
                  {WIPE_KEEPS.map((k) => <li key={k}>• {k}</li>)}
                  {!includeAdminContent && <li>• Quizzes and announcements</li>}
                </ul>
              </div>
            </div>
          )}
          {!started && (
            <label className="flex items-start gap-2.5 rounded-xl border border-cream-300 bg-white px-3.5 py-3 cursor-pointer select-none">
              <input type="checkbox" checked={includeAdminContent} onChange={(e) => setIncludeAdminContent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-red-600 cursor-pointer" />
              <span className="text-xs text-temple-700">Also delete the quizzes (with their answer keys) and announcements created by admins</span>
            </label>
          )}
          {!started && (
            <p className="text-[11px] text-temple-500 leading-relaxed">
              Student sign-in accounts (Firebase Authentication) cannot be removed from the website. Run{' '}
              <code className="font-mono text-temple-700">npm run wipe:staging-auth</code> afterwards to delete them; admin sign-ins are kept.
              Download a backup from Backup &amp; Data Management first if you may need anything.
            </p>
          )}

          {started && (
            <ul className="rounded-2xl border border-cream-200 bg-white divide-y divide-cream-200">
              {targets.map((c, i) => {
                const p = progress[i];
                return (
                  <li key={c.label} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                    <span className="inline-flex items-center gap-2 text-temple-800">
                      {p?.error ? <XCircle className="w-4 h-4 text-red-500" />
                        : p?.done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : p ? <Loader2 className="w-4 h-4 animate-spin text-saffron-600" />
                            : <Circle className="w-4 h-4 text-cream-300" />}
                      {c.label}
                    </span>
                    <span className={`font-mono ${p?.error ? 'text-red-600' : 'text-temple-500'}`}>
                      {p?.error ? 'failed' : p ? p.deleted : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {results && (
            <p className={`rounded-xl px-3.5 py-2.5 text-xs border ${failed.length ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              {failed.length
                ? `${total} records deleted, but ${failed.map((f) => f.label).join(', ')} could not be cleared. Make sure the latest database rules are deployed to staging, then try again.`
                : `Done. ${total} record${total === 1 ? '' : 's'} deleted. Staging is fresh.`}
            </p>
          )}

          {!started && (
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-temple-800">
                Type <span className="font-mono text-red-600">{CONFIRM_TEXT}</span> to confirm
              </span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-cream-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </label>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-cream-200 bg-white rounded-b-3xl flex justify-end gap-2">
          {results ? (
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-temple-900 hover:bg-temple-800 text-cream-50 text-sm font-semibold cursor-pointer">Close</button>
          ) : (
            <>
              <button type="button" onClick={onClose} disabled={running} className="px-4 py-2.5 rounded-xl border border-cream-300 bg-white text-sm font-medium text-temple-700 hover:bg-cream-100 disabled:opacity-50 cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={run}
                disabled={running || typed.trim() !== CONFIRM_TEXT}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {running ? 'Deleting…' : 'Delete everything'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
