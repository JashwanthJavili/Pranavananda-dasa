import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, RefreshCw, Search, ShieldCheck, Download, FileClock } from 'lucide-react';
import { fetchDeletionLogs } from '../../deletionLogs';
import { formatWhen } from '../../quiz/quizModel';

const by = (l) => (l.deletedByName ? `${l.deletedByName} (${l.deletedByEmail})` : l.deletedByEmail);

async function downloadLogs(logs) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(logs.map((l) => ({
    'Deleted At': l.deletedAt ? formatWhen(l.deletedAt) : '',
    'Deleted By': l.deletedByName || '',
    'Admin Email': l.deletedByEmail || '',
    'Registration ID': l.registrationId,
    'Participant': l.participantName || '',
    'Email': l.participantEmail || '',
    'Mobile': l.participantMobile || '',
    'Reason': l.reason || '',
  })));
  ws['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 28 }, { wch: 14 }, { wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Deletion Log');
  XLSX.writeFile(wb, `Deletion_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Super Admin view: every participant deleted, by whom and when (newest first).
 * Entries cannot be edited or deleted by anyone.
 */
export default function DeletionLogs({ manager, refreshKey = 0 }) {
  const [state, setState] = useState({ loading: true, logs: [] });
  const [search, setSearch] = useState('');
  const secure = manager?.isManager;

  const load = useCallback(async () => {
    if (!secure) return;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      setState({ loading: false, logs: await fetchDeletionLogs() });
    } catch (e) {
      setState({ loading: false, logs: [], error: 'The deletion log could not be loaded. Please press Refresh.' });
    }
  }, [secure]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.logs;
    return state.logs.filter((l) => [
      l.registrationId, l.participantName, l.participantEmail, l.participantMobile, l.deletedByEmail, l.deletedByName, l.reason,
    ].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [state.logs, search]);

  return (
    <div className="w-full bg-white rounded-2xl border border-cream-200 shadow-2xs p-4 sm:p-5 space-y-4 text-left">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
          <Trash2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-temple-900">Deletion log</h3>
          <p className="flex items-start gap-1.5 text-xs text-temple-500 leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-600" />
            Every participant deleted, by whom and when. Deleted participants are only hidden, so their details are kept and their
            registration number is never given to anyone else. Entries can never be edited or deleted.
          </p>
        </div>
      </div>

      {!secure ? (
        <p className="rounded-2xl border border-cream-200 bg-white/70 px-4 py-6 text-center text-sm text-temple-600">
          The deletion log needs your secure Super Admin session. Please finish the quiz setup in the Quizzes tab, or log out and log in again.
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-temple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, name, mobile, admin…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/50"
              />
            </div>
            <button type="button" onClick={load} disabled={state.loading} title="Refresh" aria-label="Refresh" className="px-3 rounded-xl border border-cream-300 bg-white text-temple-700 hover:bg-cream-100 disabled:opacity-60 cursor-pointer">
              <RefreshCw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => downloadLogs(visible)}
              disabled={!visible.length}
              title="Download as Excel"
              className="inline-flex items-center gap-1.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Excel</span>
            </button>
          </div>

          {state.error ? (
            <p className="rounded-2xl border border-cream-200 bg-white/70 px-4 py-6 text-center text-sm text-red-600">{state.error}</p>
          ) : state.loading && !state.logs.length ? (
            <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 rounded-2xl bg-cream-200/60 animate-pulse" />)}</div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-cream-200 bg-white/70 px-4 py-8 text-center text-temple-500">
              <FileClock className="w-7 h-7 mx-auto text-temple-300 mb-2" />
              <p className="font-semibold text-sm">{state.logs.length ? 'Nothing matches your search' : 'No participants deleted yet'}</p>
            </div>
          ) : (
            <ul className="bg-white border border-cream-200 rounded-2xl divide-y divide-cream-200">
              {visible.map((l) => (
                <li key={l.id} className="px-4 py-3 space-y-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
                    <p className="text-sm font-bold text-temple-900 min-w-0 break-words">
                      {l.registrationId}{l.participantName ? ` · ${l.participantName}` : ''}
                    </p>
                    <p className="text-[11px] font-medium text-temple-700 whitespace-nowrap">{l.deletedAt ? formatWhen(l.deletedAt) : 'Just now'}</p>
                  </div>
                  {(l.participantMobile || l.participantEmail) && (
                    <p className="text-[11px] text-temple-500 break-all">{[l.participantMobile, l.participantEmail].filter(Boolean).join(' · ')}</p>
                  )}
                  <p className="text-[11px] text-temple-500">Deleted by <strong className="font-semibold text-temple-700">{by(l)}</strong></p>
                  {l.reason && <p className="text-xs text-temple-600"><span className="font-semibold">Reason:</span> {l.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
