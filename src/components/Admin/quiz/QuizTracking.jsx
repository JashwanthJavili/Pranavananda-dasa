import React from 'react';
import { RefreshCw, ShieldCheck, BookOpenCheck, CheckCircle2, Circle } from 'lucide-react';
import { formatWhen, availability } from '../../../quiz/quizModel';
import FancySelect from '../../common/FancySelect';

export const quizColumnLabel = (q) => (q.weekNumber ? `Week ${q.weekNumber}` : q.title.length > 18 ? `${q.title.slice(0, 17)}…` : q.title);

/** Quizzes a student could have taken by now (opened already), for "attempted all" counts. */
export const countableQuizzes = (quizzes) => quizzes.filter((q) => availability(q) !== 'upcoming');

/** How many of the given quizzes this participant attempted. */
export const attemptedCount = (quizzes, tracking, registrationId) =>
  quizzes.reduce((n, q) => n + (tracking[q.id]?.[registrationId] ? 1 : 0), 0);

// Status filters: per quiz, or across all quizzes
export const STATUS_ONE = [
  { value: 'all', label: 'All statuses' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'not', label: 'Not Attempted' },
];
export const STATUS_ALL = [
  { value: 'all', label: 'All participants' },
  { value: 'every', label: 'Attempted every quiz' },
  { value: 'missed', label: 'Missed at least one' },
  { value: 'none', label: 'Attempted none' },
];

export const sortQuizzesByWeek = (list) =>
  [...list].sort((a, b) => (Number(a.weekNumber) || 9999) - (Number(b.weekNumber) || 9999)
    || (a.publishedAt?.toMillis?.() || 0) - (b.publishedAt?.toMillis?.() || 0));

/** One participant's status for one quiz: green Attempted (with score) or grey Not Attempted. */
export function QuizStatusCell({ quiz, status }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cream-200/80 border border-cream-300 text-[10px] font-semibold text-temple-500 whitespace-nowrap">
        <Circle className="w-2.5 h-2.5" /> Not Attempted
      </span>
    );
  }
  const s = status.score?.total ? status.score : null; // nothing to score (e.g. only long answers)
  const max = quiz.maxAttempts || 1;
  const title = [
    `Attempted (${status.attempts} of ${max} attempt${max === 1 ? '' : 's'})`,
    s ? `Score ${s.correct}/${s.total} (${s.percent}%)${max > 1 ? `, ${quiz.scorePolicy === 'latest' ? 'latest' : 'best'} attempt` : ''}` : '',
    status.lastSubmittedAt ? `Last submitted ${formatWhen(status.lastSubmittedAt)}` : '',
  ].filter(Boolean).join(' · ');
  return (
    <span title={title} className="inline-flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-2.5 h-2.5" /> Attempted{s ? ` · ${s.correct}/${s.total}` : ''}
      </span>
      {status.lastSubmittedAt && (
        <span className="text-[10px] text-temple-400 whitespace-nowrap pl-1">
          {formatWhen(status.lastSubmittedAt)}{status.attempts > 1 ? ` · ${status.attempts} tries` : ''}
        </span>
      )}
    </span>
  );
}

/** Quiz filter, status filter and sort for the participants table, with a summary. */
export function QuizTrackingBar({
  manager, quizData, quizzes, filter, onFilterChange, sortBy, onSortChange, participants, shownCount, onOpenQuizzes,
}) {
  if (manager.status === 'loading') return <div className="h-12 rounded-2xl bg-cream-200/70 animate-pulse" />;

  if (!manager.isManager) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-temple-700">
          <ShieldCheck className="w-4 h-4 text-gold-600 shrink-0" />
          Quiz status columns (Attempted / Not Attempted) appear here once quiz access is set up. Open Quizzes to finish it.
        </p>
        <button type="button" onClick={onOpenQuizzes} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-temple-900 hover:bg-temple-800 text-cream-50 text-xs font-semibold cursor-pointer shrink-0">
          <BookOpenCheck className="w-3.5 h-3.5" /> Open Quizzes
        </button>
      </div>
    );
  }

  if (quizData.quizzes && quizzes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gold-300 bg-cream-50 px-4 py-3 text-xs text-temple-600">
        No quizzes have been published yet. A status column for each quiz appears here automatically when you publish it.
      </div>
    );
  }

  const active = quizzes.find((q) => q.id === filter.quizId) || null;
  const map = active ? quizData.tracking[active.id] || {} : {};
  const attempted = active ? participants.filter((p) => map[p.registrationId || p.id]).length : 0;
  const scored = active ? participants.map((p) => map[p.registrationId || p.id]?.score).filter((s) => s?.total) : [];
  const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.percent, 0) / scored.length) : null;

  // Across all quizzes that have opened so far
  const countable = countableQuizzes(quizzes);
  const doneCounts = active ? [] : participants.map((p) => attemptedCount(countable, quizData.tracking, p.registrationId || p.id));
  const everyCount = doneCounts.filter((n) => countable.length && n === countable.length).length;
  const noneCount = doneCounts.filter((n) => n === 0).length;

  // A summary chip that also filters the table
  const Chip = ({ status, cls, children }) => (
    <button
      type="button"
      onClick={() => onFilterChange({ ...filter, status: filter.status === status ? 'all' : status })}
      aria-pressed={filter.status === status}
      className={`px-2 py-0.5 rounded-full border font-semibold cursor-pointer transition ${cls} ${filter.status === status ? 'ring-2 ring-saffron-400/60' : 'hover:brightness-95'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-cream-50 rounded-2xl p-3 border border-cream-200 shadow-soft space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-temple-700 mr-1">
          <BookOpenCheck className="w-3.5 h-3.5 text-saffron-600" /> Quiz tracking
        </span>
        <FancySelect
          size="xs"
          ariaLabel="Quiz"
          className="max-w-[220px]"
          value={active ? active.id : 'all'}
          onChange={(quizId) => {
            // Per-quiz and all-quiz filters have different statuses, so switching modes resets it
            const sameMode = (quizId === 'all') === !active;
            onFilterChange({ quizId, status: sameMode ? filter.status : 'all' });
            if (quizId === 'all' && !['default', 'name', 'id', 'quizzes-desc', 'quizzes-asc'].includes(sortBy)) onSortChange('default');
            if (quizId !== 'all' && sortBy.startsWith('quizzes-')) onSortChange('default');
          }}
          options={[
            { value: 'all', label: 'All quizzes' },
            ...quizzes.map((q) => ({ value: q.id, label: `${quizColumnLabel(q)}${q.weekNumber ? ` – ${q.title}` : ''}` })),
          ]}
        />
        <FancySelect
          size="xs"
          ariaLabel="Status"
          value={filter.status}
          onChange={(status) => onFilterChange({ ...filter, status })}
          options={active ? STATUS_ONE : STATUS_ALL}
        />
        <FancySelect
          size="xs"
          ariaLabel="Sort"
          value={sortBy}
          onChange={onSortChange}
          options={[
            { value: 'default', label: 'Sort: Default' },
            { value: 'id', label: 'Sort: Registration ID' },
            { value: 'name', label: 'Sort: Name (A–Z)' },
            ...(active ? [
              { value: 'score-desc', label: 'Sort: Score (high → low)' },
              { value: 'score-asc', label: 'Sort: Score (low → high)' },
              { value: 'recent', label: 'Sort: Recently submitted' },
            ] : [
              { value: 'quizzes-desc', label: 'Sort: Most quizzes attempted' },
              { value: 'quizzes-asc', label: 'Sort: Fewest quizzes attempted' },
            ]),
          ]}
        />
        <button
          type="button"
          onClick={quizData.reload}
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-temple-500 hover:text-saffron-700 font-medium cursor-pointer"
          title="Reload quiz statuses"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${quizData.loading ? 'animate-spin text-saffron-600' : ''}`} />
          {quizData.loadedAt ? `Updated ${quizData.loadedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toUpperCase()}` : 'Load'}
        </button>
      </div>
      {quizData.error && <p className="text-xs text-red-600" role="alert">{quizData.error}</p>}
      {!active && countable.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Chip status="every" cls="bg-emerald-50 border-emerald-200 text-emerald-700">{everyCount} attempted all {countable.length} quiz{countable.length === 1 ? '' : 'zes'}</Chip>
          <Chip status="missed" cls="bg-amber-50 border-amber-200 text-amber-800">{participants.length - everyCount} missed at least one</Chip>
          <Chip status="none" cls="bg-cream-200 border-cream-300 text-temple-600">{noneCount} attempted none</Chip>
          <span className="text-temple-400">Showing {shownCount} of {participants.length} matching participants</span>
        </div>
      )}
      {active && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Chip status="attempted" cls="bg-emerald-50 border-emerald-200 text-emerald-700">{attempted} Attempted</Chip>
          <Chip status="not" cls="bg-cream-200 border-cream-300 text-temple-600">{participants.length - attempted} Not Attempted</Chip>
          {avg !== null && <span className="px-2 py-0.5 rounded-full bg-gold-50 border border-gold-200 text-temple-700 font-semibold">Average {avg}%</span>}
          <span className="text-temple-400">Showing {shownCount} of {participants.length} matching participants</span>
        </div>
      )}
    </div>
  );
}
