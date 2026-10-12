import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, RefreshCw, ChevronDown, Search, MessageSquareHeart, MessageSquareText } from 'lucide-react';
import { fetchAllQuizRatings, fetchQuizFeedback, summarizeRatings, RATING_LABELS } from '../../quiz/quizRatings';
import { managerFirestore } from '../../quiz/quizAdmin';
import { formatWhen } from '../../quiz/quizModel';

function Stars({ value, size = 'w-3.5 h-3.5' }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((v) => (
        <Star key={v} className={`${size} ${v <= Math.round(value) ? 'fill-gold-400 text-gold-500' : 'fill-transparent text-cream-300'}`} strokeWidth={1.5} />
      ))}
    </span>
  );
}

const quizName = (s, quizzes) => {
  const live = quizzes?.find((q) => q.id === s.quizId);
  const title = live?.title || s.title || 'Quiz';
  const week = live ? live.weekNumber : s.weekNumber;
  return week ? `Week ${week} · ${title}` : title;
};

/**
 * Optional star ratings students give a quiz after submitting it. Admins and Super Admins.
 *  registrations: for participant names · quizzes: current quiz titles (Super Admins, optional)
 *  canSeeFeedback: Super Admins with their secure session also see written suggestions
 */
export default function QuizRatingsPanel({ registrations = [], quizzes = null, canSeeFeedback = false, isSuperAdmin = false }) {
  const [state, setState] = useState({ loading: true, ratings: [], feedback: {} });
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const store = canSeeFeedback ? managerFirestore() : null;
      const [ratings, feedback] = await Promise.all([
        fetchAllQuizRatings(),
        store ? fetchQuizFeedback(store).catch(() => ({})) : {},
      ]);
      setState({ loading: false, ratings, feedback });
    } catch (e) {
      setState({ loading: false, ratings: [], feedback: {}, error: true });
    }
  }, [canSeeFeedback]);
  useEffect(() => { load(); }, [load]);

  const names = useMemo(() => {
    const m = {};
    registrations.forEach((r) => { m[r.registrationId || r.id] = r.fullName || r.name || ''; });
    return m;
  }, [registrations]);

  const summaries = useMemo(() => {
    const list = Object.values(summarizeRatings(state.ratings));
    const week = (s) => quizzes?.find((q) => q.id === s.quizId)?.weekNumber ?? s.weekNumber ?? -1;
    return list.sort((a, b) => week(b) - week(a) || (b.ratings[0]?.ratedAt?.toMillis?.() || 0) - (a.ratings[0]?.ratedAt?.toMillis?.() || 0));
  }, [state.ratings, quizzes]);

  // Every written message, newest first, with its stars and quiz
  const messages = useMemo(() => state.ratings
    .filter((r) => state.feedback[r.id])
    .map((r) => ({ ...r, comment: state.feedback[r.id] }))
    .sort((a, b) => (b.ratedAt?.toMillis?.() || 0) - (a.ratedAt?.toMillis?.() || 0)), [state.ratings, state.feedback]);

  const total = summaries.reduce((n, s) => n + s.count, 0);
  const overall = total ? Math.round((summaries.reduce((n, s) => n + s.total, 0) / total) * 10) / 10 : 0;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-temple-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-gold-500 fill-gold-400" />
            Quiz Ratings
          </h2>
          <p className="text-xs text-temple-500">
            Ratings devotees give after a quiz.{' '}
            {canSeeFeedback ? ''
              : isSuperAdmin ? 'Their written messages appear here once quiz access is ready (open the Quizzes tab once).'
                : 'Written messages are visible to Super Admins only.'}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={state.loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs font-semibold text-temple-700 hover:bg-cream-100 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${state.loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {state.error ? (
        <p className="bg-cream-50 rounded-2xl border border-cream-200 px-4 py-10 text-center text-sm text-red-600">
          Ratings could not be loaded. Please check your connection and press Refresh.
        </p>
      ) : state.loading && !state.ratings.length ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-28 rounded-2xl bg-cream-200/60 animate-pulse" />)}
        </div>
      ) : summaries.length === 0 ? (
        <div className="bg-cream-50 rounded-2xl border border-cream-200 px-4 py-12 text-center text-temple-500">
          <MessageSquareHeart className="w-8 h-8 mx-auto text-temple-300 mb-2" />
          <p className="font-semibold text-sm">No ratings yet</p>
          <p className="text-xs text-temple-400">Ratings appear here once devotees rate a quiz.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <Tile label="Ratings" value={total} />
            <Tile label="Average" value={<span className="inline-flex items-center gap-1">{overall.toFixed(1)}<Star className="w-4 h-4 fill-gold-400 text-gold-500" /></span>} />
            <Tile label="Quizzes rated" value={summaries.length} />
          </div>

          {canSeeFeedback && (
            <section className="bg-cream-50 rounded-2xl border border-cream-200 shadow-soft overflow-hidden">
              <h3 className="px-4 py-2.5 border-b border-cream-200 text-xs font-bold text-temple-800 flex items-center gap-1.5">
                <MessageSquareText className="w-4 h-4 text-saffron-600" /> Messages ({messages.length})
              </h3>
              {messages.length === 0 ? (
                <p className="px-4 py-4 text-xs text-temple-500">No written messages yet.</p>
              ) : (
                <ul className="divide-y divide-cream-200/80 max-h-80 overflow-y-auto">
                  {messages.map((m) => (
                    <li key={m.id} className="px-4 py-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-temple-500">
                        <span className="min-w-0 truncate">
                          <strong className="text-temple-900">{names[m.registrationId] || 'Devotee'}</strong> · {m.registrationId}
                          {m.ratedAt ? ` · ${formatWhen(m.ratedAt)}` : ''}
                        </span>
                        <Stars value={m.rating} />
                      </div>
                      <p className="text-sm text-temple-800 whitespace-pre-wrap break-words">{m.comment}</p>
                      <p className="text-[10px] text-temple-400 truncate">{quizName({ quizId: m.quizId, title: m.quizTitle, weekNumber: m.weekNumber }, quizzes)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <ul className="space-y-3">
            {summaries.map((s) => (
              <QuizRatingCard
                key={s.quizId}
                summary={s}
                name={quizName(s, quizzes)}
                names={names}
                feedback={state.feedback}
                open={openId === s.quizId}
                onToggle={() => setOpenId(openId === s.quizId ? null : s.quizId)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="bg-cream-50 rounded-2xl p-3 sm:p-4 border border-cream-200 shadow-soft">
      <span className="block text-[11px] uppercase tracking-wide font-semibold text-temple-500">{label}</span>
      <span className="text-xl sm:text-2xl font-bold text-temple-900 font-mono">{value}</span>
    </div>
  );
}

function QuizRatingCard({ summary: s, name, names, feedback = {}, open, onToggle }) {
  const suggestions = s.ratings.filter((r) => feedback[r.id]).length;
  const [search, setSearch] = useState('');
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return s.ratings.filter((r) => !q || [r.registrationId, names[r.registrationId]].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [s.ratings, names, search]);

  return (
    <li className="bg-cream-50 rounded-2xl border border-cream-200 shadow-soft overflow-hidden">
      <div className="p-4 sm:p-5 grid gap-4 sm:grid-cols-[1fr_220px] items-center">
        <div className="min-w-0 space-y-1.5">
          <h3 className="text-sm sm:text-base font-bold text-temple-900 truncate">{name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-temple-900 font-mono">{s.average.toFixed(1)}</span>
            <div>
              <Stars value={s.average} />
              <p className="text-[11px] text-temple-500">
                {s.count} rating{s.count === 1 ? '' : 's'}{suggestions ? ` · ${suggestions} suggestion${suggestions === 1 ? '' : 's'}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((v) => {
            const pct = s.count ? Math.round((s.counts[v] / s.count) * 100) : 0;
            return (
              <div key={v} className="flex items-center gap-2 text-[11px] text-temple-600" title={`${RATING_LABELS[v]}: ${s.counts[v]}`}>
                <span className="w-6 shrink-0 inline-flex items-center gap-0.5">{v}<Star className="w-2.5 h-2.5 fill-gold-400 text-gold-500" /></span>
                <span className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden">
                  <span className="block h-full rounded-full bg-gold-400" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-7 text-right font-mono">{s.counts[v]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-cream-200 text-xs font-semibold text-saffron-700 hover:bg-white cursor-pointer"
      >
        {open ? 'Hide ratings' : `View all ${s.count} rating${s.count === 1 ? '' : 's'}`}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-cream-200 bg-white">
          {s.ratings.length > 8 && (
            <div className="px-4 pt-3">
              <div className="relative">
                <Search className="w-4 h-4 text-temple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or registration ID…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-cream-50 border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/50"
                />
              </div>
            </div>
          )}
          <ul className="divide-y divide-cream-200/80 max-h-96 overflow-y-auto">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-temple-900 truncate">{names[r.registrationId] || 'Devotee'}</span>
                    <span className="block text-[11px] text-temple-500">{r.registrationId}{r.ratedAt ? ` · ${formatWhen(r.ratedAt)}` : ''}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <Stars value={r.rating} />
                    <span className="block text-[10px] text-temple-500">{RATING_LABELS[r.rating]}</span>
                  </span>
                </div>
                {feedback[r.id] && (
                  <p className="flex items-start gap-1.5 rounded-xl bg-cream-50 border border-cream-200 px-3 py-2 text-xs text-temple-700 whitespace-pre-wrap break-words">
                    <MessageSquareText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-saffron-600" />
                    {feedback[r.id]}
                  </p>
                )}
              </li>
            ))}
            {rows.length === 0 && <li className="px-4 py-6 text-center text-xs text-temple-500">No matching ratings.</li>}
          </ul>
        </div>
      )}
    </li>
  );
}
