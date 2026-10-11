import React from 'react';
import { Eye, RefreshCw, ShieldCheck, BookOpenCheck, CheckCircle2, Circle, X } from 'lucide-react';
import { formatWhen, availability } from '../../../quiz/quizModel';
import FancySelect from '../../common/FancySelect';

export const quizColumnLabel = (q) => (q.weekNumber ? `Week ${q.weekNumber}` : q.title.length > 18 ? `${q.title.slice(0, 17)}…` : q.title);

/** Quizzes a student could have taken by now (opened already), for "attempted all" counts. */
export const countableQuizzes = (quizzes) => quizzes.filter((q) => availability(q) !== 'upcoming');

/** How many of the given quizzes this participant attempted. */
export const attemptedCount = (quizzes, tracking, registrationId) =>
  quizzes.reduce((n, q) => n + (tracking[q.id]?.[registrationId] ? 1 : 0), 0);

// "Show" filters: for one quiz, or across all quizzes (plain words for admins)
export const STATUS_ONE = [
  { value: 'all', label: 'Everyone' },
  { value: 'attempted', label: 'Took this quiz' },
  { value: 'not', label: 'Did not take this quiz' },
  { value: 'score-high', label: 'Scored 80% or more', hint: 'Did very well' },
  { value: 'score-mid', label: 'Scored 50% to 79%' },
  { value: 'score-low', label: 'Scored below 50%', hint: 'May need some help' },
];
export const STATUS_ALL = [
  { value: 'all', label: 'Everyone' },
  { value: 'every', label: 'Took every quiz' },
  { value: 'some', label: 'Took some, missed some' },
  { value: 'missed', label: 'Missed one or more quizzes' },
  { value: 'none', label: 'Has not taken any quiz' },
];

// "Order by" choices
const SORT_COMMON = [
  { value: 'id', label: 'Order of registration' },
  { value: 'default', label: 'Newest registrations first' },
  { value: 'name', label: 'Name (A to Z)' },
];
const SORT_ONE = [
  { value: 'score-desc', label: 'Highest score first' },
  { value: 'score-asc', label: 'Lowest score first' },
  { value: 'recent', label: 'Latest submission first' },
];
const SORT_ALL = [
  { value: 'quizzes-desc', label: 'Most quizzes taken first' },
  { value: 'quizzes-asc', label: 'Fewest quizzes taken first' },
];

/** Does this one-quiz status (from tracking) match the chosen "Show" filter? */
export function matchesQuizStatus(status, filterValue) {
  if (filterValue === 'all') return true;
  if (filterValue === 'attempted') return Boolean(status);
  if (filterValue === 'not') return !status;
  const pct = status?.score?.total ? status.score.percent : null;
  if (pct === null) return false;
  if (filterValue === 'score-high') return pct >= 80;
  if (filterValue === 'score-mid') return pct >= 50 && pct < 80;
  if (filterValue === 'score-low') return pct < 50;
  return true;
}

/** Does this count of quizzes taken (out of `total` opened) match the all-quizzes "Show" filter? */
export function matchesQuizCount(n, total, filterValue) {
  if (!total || filterValue === 'all') return true;
  if (filterValue === 'every') return n === total;
  if (filterValue === 'some') return n > 0 && n < total;
  if (filterValue === 'missed') return n < total;
  if (filterValue === 'none') return n === 0;
  return true;
}

export const sortQuizzesByWeek = (list) =>
  [...list].sort((a, b) => (Number(a.weekNumber) || 9999) - (Number(b.weekNumber) || 9999)
    || (a.publishedAt?.toMillis?.() || 0) - (b.publishedAt?.toMillis?.() || 0));

/** One participant's status for one quiz: green Attempted (with score) or grey Not Attempted.
 *  onView: open this participant's answers (Attempted only) */
export function QuizStatusCell({ quiz, status, onView }) {
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
      <button
        type="button"
        onClick={onView}
        disabled={!onView}
        aria-label={`Attempted${s ? `, score ${s.correct} of ${s.total}` : ''}. View answers`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700 whitespace-nowrap enabled:hover:bg-emerald-100 enabled:hover:border-emerald-300 enabled:cursor-pointer disabled:cursor-default"
      >
        <CheckCircle2 className="w-2.5 h-2.5" /> Attempted{s ? ` · ${s.correct}/${s.total}` : ''}
        {onView && <Eye className="w-2.5 h-2.5 opacity-70" />}
      </button>
      {status.lastSubmittedAt && (
        <span className="text-[10px] text-temple-400 whitespace-nowrap pl-1">
          {formatWhen(status.lastSubmittedAt)}{status.attempts > 1 ? ` · ${status.attempts} tries` : ''}
        </span>
      )}
    </span>
  );
}

/** Filters for the participants table by quiz: which quiz, who to show, and the order. */
export function QuizTrackingBar({
  manager, quizData, quizzes, filter, onFilterChange, sortBy, onSortChange, participants, shownCount, onOpenQuizzes,
}) {
  if (manager.status === 'loading') return <div className="h-12 rounded-2xl bg-cream-200/70 animate-pulse" />;

  if (!manager.isManager) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-temple-700">
          <ShieldCheck className="w-4 h-4 text-gold-600 shrink-0" />
          To see who took each quiz, please finish the quiz setup first in the Quizzes tab.
        </p>
        <button type="button" onClick={onOpenQuizzes} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-temple-900 hover:bg-temple-800 text-cream-50 text-xs font-semibold cursor-pointer shrink-0">
          <BookOpenCheck className="w-3.5 h-3.5" /> Go to Quizzes
        </button>
      </div>
    );
  }

  if (quizData.quizzes && quizzes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gold-300 bg-cream-50 px-4 py-3 text-xs text-temple-600">
        No quizzes published yet. Once you publish a quiz, you can see here who has taken it.
      </div>
    );
  }

  const active = quizzes.find((q) => q.id === filter.quizId) || null;
  const map = active ? quizData.tracking[active.id] || {} : {};
  const statuses = active ? participants.map((p) => map[p.registrationId || p.id]) : [];
  const attempted = statuses.filter(Boolean).length;
  const scored = statuses.map((s) => s?.score).filter((s) => s?.total);
  const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.percent, 0) / scored.length) : null;

  // Across all quizzes that have opened so far
  const countable = countableQuizzes(quizzes);
  const doneCounts = active ? [] : participants.map((p) => attemptedCount(countable, quizData.tracking, p.registrationId || p.id));
  const countOf = (value) => doneCounts.filter((n) => matchesQuizCount(n, countable.length, value)).length;

  const showOptions = active ? STATUS_ONE : STATUS_ALL;
  const sortOptions = [...SORT_COMMON, ...(active ? SORT_ONE : SORT_ALL)];
  const isFiltered = filter.quizId !== 'all' || filter.status !== 'all' || sortBy !== 'id';

  const changeQuiz = (quizId) => {
    // "Show" choices differ for one quiz and all quizzes, so switching between them resets it
    const sameMode = (quizId === 'all') === !active;
    onFilterChange({ quizId, status: sameMode ? filter.status : 'all' });
    const allowed = [...SORT_COMMON, ...(quizId === 'all' ? SORT_ALL : SORT_ONE)].map((o) => o.value);
    if (!allowed.includes(sortBy)) onSortChange('id');
  };

  const Labeled = ({ label, children }) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[11px] font-medium text-temple-500">{label}</span>
      {children}
    </span>
  );

  // A count chip that also works as a quick filter
  const Chip = ({ status, cls, children }) => (
    <button
      type="button"
      onClick={() => onFilterChange({ ...filter, status: filter.status === status ? 'all' : status })}
      aria-pressed={filter.status === status}
      title={filter.status === status ? 'Click again to show everyone' : 'Click to show only these'}
      className={`px-2 py-0.5 rounded-full border font-semibold cursor-pointer transition ${cls} ${filter.status === status ? 'ring-2 ring-saffron-400/60' : 'hover:brightness-95'}`}
    >
      {children}
    </button>
  );

  const updated = quizData.loadedAt ? formatWhen(quizData.loadedAt) : '';
  const students = (n) => `${n} student${n === 1 ? '' : 's'}`;

  return (
    <div className="bg-cream-50 rounded-2xl px-3 py-2.5 border border-cream-200 shadow-soft space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-temple-800">
          <BookOpenCheck className="w-4 h-4 text-saffron-600" /> Quiz progress
        </span>
        <Labeled label="Quiz">
          <FancySelect
            size="xs"
            ariaLabel="Quiz"
            className="max-w-[200px]"
            value={active ? active.id : 'all'}
            onChange={changeQuiz}
            options={[
              { value: 'all', label: 'All quizzes' },
              ...quizzes.map((q) => ({ value: q.id, label: `${quizColumnLabel(q)}${q.weekNumber ? ` – ${q.title}` : ''}` })),
            ]}
          />
        </Labeled>
        <Labeled label="Show">
          <FancySelect size="xs" ariaLabel="Show" value={filter.status} onChange={(status) => onFilterChange({ ...filter, status })} options={showOptions} />
        </Labeled>
        <Labeled label="Sort by">
          <FancySelect size="xs" ariaLabel="Sort by" value={sortBy} onChange={onSortChange} options={sortOptions} />
        </Labeled>
        <span className="ml-auto inline-flex items-center gap-2">
          {updated && (
            <span className="text-[11px] text-temple-400 whitespace-nowrap">
              {quizData.loading ? 'Updating…' : `Last updated: ${updated}`}
            </span>
          )}
          <button
            type="button"
            onClick={quizData.reload}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-temple-500 hover:text-saffron-700 hover:bg-cream-100 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${quizData.loading ? 'animate-spin text-saffron-600' : ''}`} /> Refresh
          </button>
        </span>
      </div>

      {quizData.error && <p className="text-xs text-red-600" role="alert">{quizData.error}</p>}

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {!active && countable.length > 0 && (
          <>
            <Chip status="every" cls="bg-emerald-50 border-emerald-200 text-emerald-700">{students(countOf('every'))} took every quiz</Chip>
            <Chip status="some" cls="bg-amber-50 border-amber-200 text-amber-800">{students(countOf('some'))} took only some quizzes</Chip>
            <Chip status="none" cls="bg-cream-200 border-cream-300 text-temple-600">{students(countOf('none'))} took no quiz yet</Chip>
          </>
        )}
        {active && (
          <>
            <Chip status="attempted" cls="bg-emerald-50 border-emerald-200 text-emerald-700">{students(attempted)} took this quiz</Chip>
            <Chip status="not" cls="bg-cream-200 border-cream-300 text-temple-600">{students(participants.length - attempted)} have not taken it</Chip>
            {avg !== null && (
              <span className="px-2 py-0.5 rounded-full bg-gold-50 border border-gold-200 text-temple-700 font-semibold">Average score {avg}%</span>
            )}
          </>
        )}
        <span className="text-temple-500 ml-1" aria-live="polite">
          Showing <strong className="text-temple-900">{shownCount}</strong> of {participants.length}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={() => { onFilterChange({ quizId: 'all', status: 'all' }); onSortChange('id'); }}
            className="ml-auto inline-flex items-center gap-0.5 font-semibold text-saffron-700 hover:text-saffron-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
