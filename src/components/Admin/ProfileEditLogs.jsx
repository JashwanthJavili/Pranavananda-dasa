import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, RefreshCw, Search, ArrowRight, ShieldCheck, Download, FileClock } from 'lucide-react';
import { fetchEditLogs } from '../../profileEdits';
import { formatWhen } from '../../quiz/quizModel';

const editor = (l) => (l.editedByName ? `${l.editedByName} (${l.editedByEmail})` : l.editedByEmail);

async function downloadLogs(logs) {
  const XLSX = await import('xlsx');
  const rows = logs.flatMap((l) => (l.changes || []).map((c) => ({
    'Edited At': l.editedAt ? formatWhen(l.editedAt) : '',
    'Edited By': l.editedByName || '',
    'Editor Email': l.editedByEmail || '',
    'Registration ID': l.registrationId,
    'Participant': l.participantName || '',
    'Field': c.label || c.field,
    'From': c.from,
    'To': c.to,
    'Reason': l.reason || '',
    'Help Request': l.helpReference || '',
  })));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 28 }, { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 34 }, { wch: 34 }, { wch: 40 }, { wch: 13 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Profile Edit Log');
  XLSX.writeFile(wb, `Profile_Edit_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * The permanent log of participant details changed by Super Admins (newest first).
 * Needs the Super Admin's secure session; entries cannot be changed or deleted.
 */
export default function ProfileEditLogs({ manager, refreshKey = 0 }) {
  const [state, setState] = useState({ loading: true, logs: [] });
  const [search, setSearch] = useState('');
  const secure = manager?.isManager;

  const load = useCallback(async () => {
    if (!secure) return;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      setState({ loading: false, logs: await fetchEditLogs() });
    } catch (e) {
      setState({ loading: false, logs: [], error: 'The log could not be loaded. Please press Refresh.' });
    }
  }, [secure]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.logs;
    return state.logs.filter((l) => [
      l.registrationId, l.participantName, l.editedByEmail, l.editedByName, l.helpReference, l.reason,
      ...(l.changes || []).flatMap((c) => [c.label, c.from, c.to]),
    ].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [state.logs, search]);

  if (!secure) {
    return (
      <p className="bg-cream-50 rounded-2xl border border-cream-200 px-4 py-10 text-center text-sm text-temple-600">
        The edit log needs your secure Super Admin session. Please log out and log in again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="flex items-start gap-2 text-xs text-temple-500 max-w-md">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
          Every change to a participant's details: who made it, when, and each value before and after. Entries cannot be edited or deleted.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-temple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, name, editor…"
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
      </div>

      {state.error ? (
        <p className="bg-cream-50 rounded-2xl border border-cream-200 px-4 py-10 text-center text-sm text-red-600">{state.error}</p>
      ) : state.loading && !state.logs.length ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-28 rounded-2xl bg-cream-200/60 animate-pulse" />)}</div>
      ) : visible.length === 0 ? (
        <div className="bg-cream-50 rounded-2xl border border-cream-200 px-4 py-12 text-center text-temple-500">
          <FileClock className="w-8 h-8 mx-auto text-temple-300 mb-2" />
          <p className="font-semibold text-sm">{state.logs.length ? 'Nothing matches your search' : 'No changes yet'}</p>
          <p className="text-xs text-temple-400">{state.logs.length ? 'Try another search.' : 'Edits made from Contact Us messages will be recorded here.'}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((l) => (
            <li key={l.id} className="bg-cream-50 rounded-2xl border border-cream-200 shadow-soft overflow-hidden">
              <div className="px-4 py-3 bg-white border-b border-cream-200 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-temple-900 truncate">
                    {l.registrationId}{l.participantName ? ` · ${l.participantName}` : ''}
                  </p>
                  <p className="text-[11px] text-temple-500 flex items-center gap-1">
                    <History className="w-3 h-3" /> Edited by <strong className="font-semibold text-temple-700">{editor(l)}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-temple-700">{l.editedAt ? formatWhen(l.editedAt) : 'Just now'}</p>
                  {l.helpReference && <p className="text-[11px] text-saffron-700 font-semibold">{l.helpReference}</p>}
                </div>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {(l.changes || []).map((c) => (
                  <div key={c.field} className="grid sm:grid-cols-[130px_1fr] gap-1 sm:gap-3 items-start">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-temple-500 pt-0.5">{c.label || c.field}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 line-through decoration-red-300 break-all">{c.from || 'Empty'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-temple-400 shrink-0" />
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold break-all">{c.to || 'Empty'}</span>
                    </span>
                  </div>
                ))}
                {l.reason && <p className="text-xs text-temple-600 pt-1 border-t border-cream-200"><span className="font-semibold">Reason:</span> {l.reason}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
