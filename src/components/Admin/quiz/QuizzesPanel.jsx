import React, { useMemo, useState } from 'react';
import {
  Plus, BookOpen, Pencil, Eye, Send, EyeOff, Trash2, Loader2, CalendarClock, ListChecks, Table2, RotateCcw, PenLine, History,
} from 'lucide-react';
import QuizManagerGate from './QuizManagerGate';
import QuizEditor from './QuizEditor';
import QuizPreview from './QuizPreview';
import {
  saveQuiz, setQuizPublished, deleteDraftQuiz, getQuizKey,
} from '../../../quiz/quizAdmin';
import { emptyDraft, toDraft, validateDraft, availability, formatWhen } from '../../../quiz/quizModel';
import {
  loadEditorCache, clearEditorCache, hasEditorCache, cacheIsStale,
} from '../../../quiz/editorCache';

function statusOf(q) {
  if (q.published) {
    const a = availability(q);
    return a === 'upcoming'
      ? { text: 'Scheduled', cls: 'bg-saffron-50 border-saffron-200 text-saffron-700', dot: 'bg-saffron-500' }
      : a === 'closed'
        ? { text: 'Closed', cls: 'bg-cream-200 border-cream-300 text-temple-600', dot: 'bg-temple-400' }
        : { text: 'Live', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500 animate-pulse' };
  }
  return q.publishedAt
    ? { text: 'Unpublished', cls: 'bg-amber-50 border-amber-200 text-amber-800', dot: 'bg-amber-500' }
    : { text: 'Draft', cls: 'bg-cream-200 border-cream-300 text-temple-600', dot: 'bg-temple-400' };
}

/**
 * Super admin: create, edit, preview, publish and unpublish weekly quizzes.
 *  quizData: from useQuizTracking  { quizzes, tracking, loading, error, reload }
 *  participantCount: number of registrations (for "x of y attempted")
 *  onTrack(quizId): open the participants table filtered by this quiz
 */
export default function QuizzesPanel({ adminUser, manager, quizData, participantCount, notify, onTrack, onLogout }) {
  const [editing, setEditing] = useState(null); // { quiz?, draft }
  const [loadingEdit, setLoadingEdit] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null); // { quiz, draft }
  const [confirm, setConfirm] = useState(null); // { kind: 'unpublish' | 'delete', quiz }
  const [cacheTick, setCacheTick] = useState(0); // re-read device copies after leaving the editor
  const newCache = useMemo(() => loadEditorCache(null), [cacheTick, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!manager.isManager) {
    return (
      <div className="space-y-5 animate-fadeIn">
        <Header />
        <QuizManagerGate manager={manager} adminEmail={adminUser?.email} onLogout={onLogout} />
      </div>
    );
  }

  const { quizzes, tracking, loading, error, reload } = quizData;

  // Unfinished work kept on this device is restored automatically
  const openEditor = async (quiz) => {
    if (!quiz) {
      const cache = loadEditorCache(null);
      const nextWeek = Math.max(0, ...(quizzes || []).map((q) => Number(q.weekNumber) || 0)) + 1;
      return setEditing({
        draft: cache?.draft || { ...emptyDraft(), weekNumber: String(nextWeek) },
        saved: emptyDraft(),
        restored: cache ? { savedAt: cache.savedAt, stale: false } : null,
      });
    }
    setLoadingEdit(quiz.id);
    try {
      const key = await getQuizKey(quiz.id);
      const saved = toDraft(quiz, key);
      const cache = loadEditorCache(quiz.id);
      setEditing({
        quiz,
        draft: cache?.draft || saved,
        saved,
        restored: cache ? { savedAt: cache.savedAt, stale: cacheIsStale(cache, quiz) } : null,
      });
    } catch (err) {
      notify('Could not open the quiz. Please try again.');
    } finally {
      setLoadingEdit(null);
    }
  };

  const openPreview = async (quiz) => {
    setBusyId(quiz.id);
    try {
      const draft = toDraft(quiz, await getQuizKey(quiz.id));
      setPreview({ quiz: { ...quiz, questions: draft.questions }, draft });
    } catch (err) {
      notify('Could not load the preview.');
    } finally {
      setBusyId(null);
    }
  };

  const onSave = async (draft, publish, { auto = false } = {}) => {
    await saveQuiz({ existingQuiz: editing.quiz, draft, publish });
    notify(auto ? 'Your quiz was saved as a draft. Open Edit to continue any time.'
      : publish === true ? 'Quiz published. Students can see it now.' : publish === false ? 'Draft saved.' : 'Quiz updated.');
    reload();
  };

  // outcome: null (saved or nothing to keep) | 'kept' (changes kept on this device)
  const onLeave = (outcome) => {
    if (outcome === 'kept') {
      notify(editing.quiz?.published
        ? 'Your changes are kept on this device. Students still see the published version until you save.'
        : 'Could not save the draft right now, so your work is kept on this device. Open the quiz again to continue.');
    }
    setEditing(null);
    setCacheTick((n) => n + 1);
  };

  const discardNewCache = () => {
    clearEditorCache(null);
    setCacheTick((n) => n + 1);
  };

  const publish = async (quiz) => {
    setBusyId(quiz.id);
    try {
      const key = await getQuizKey(quiz.id);
      const v = validateDraft(toDraft(quiz, key), { forPublish: true });
      if (v.errors.length) {
        notify(`Cannot publish yet: ${v.errors[0]}`);
        return;
      }
      await setQuizPublished(quiz, true);
      notify('Quiz published. Students can see it now.');
      reload();
    } catch (err) {
      notify('Could not publish the quiz. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const runConfirm = async () => {
    const { kind, quiz } = confirm;
    setBusyId(quiz.id);
    try {
      if (kind === 'unpublish') {
        await setQuizPublished(quiz, false);
        notify('Quiz unpublished. Students no longer see it; their attempts are kept.');
      } else {
        await deleteDraftQuiz(quiz.id);
        notify('Draft deleted.');
      }
      setConfirm(null);
      reload();
    } catch (err) {
      notify(kind === 'delete' ? 'Only drafts that were never published can be deleted.' : 'Could not unpublish. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  if (editing) {
    const attemptCount = editing.quiz ? Object.keys(tracking[editing.quiz.id] || {}).length : 0;
    return (
      <QuizEditor
        key={editing.quiz?.id || 'new'}
        initialDraft={editing.draft}
        savedDraft={editing.saved}
        restored={editing.restored}
        quiz={editing.quiz}
        attemptCount={attemptCount}
        onSave={onSave}
        onLeave={onLeave}
        usedWeeks={Object.fromEntries((quizzes || [])
          .filter((q) => q.weekNumber && q.id !== editing.quiz?.id)
          .map((q) => [q.weekNumber, q.title]))}
      />
    );
  }

  const list = quizzes || [];
  const liveCount = list.filter((q) => q.published && availability(q) === 'open').length;
  const draftCount = list.filter((q) => !q.publishedAt).length;
  const submissions = Object.values(tracking).reduce((n, m) => n + Object.keys(m).length, 0);

  return (
    <div className="space-y-5 animate-fadeIn text-left">
      <Header onNew={() => openEditor(null)} />

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3" role="alert">{error}</p>}

      {newCache && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-3xl border border-saffron-200 bg-saffron-50 px-4 sm:px-5 py-3.5 shadow-soft">
          <span className="shrink-0 w-10 h-10 rounded-2xl bg-white border border-saffron-200 flex items-center justify-center text-saffron-600">
            <History className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-temple-900 truncate">
              Unfinished quiz: {newCache.draft.title.trim() || 'Untitled quiz'}
            </p>
            <p className="text-[11px] text-temple-500">
              {newCache.draft.questions.length} question{newCache.draft.questions.length === 1 ? '' : 's'} · last change {formatWhen(newCache.savedAt)} · kept on this device
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={discardNewCache} className="px-3 py-2 rounded-xl text-xs font-medium text-temple-600 hover:text-red-700 hover:bg-white cursor-pointer">Discard</button>
            <button type="button" onClick={() => openEditor(null)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold shadow-soft cursor-pointer">
              <Pencil className="w-3.5 h-3.5" /> Continue
            </button>
          </div>
        </div>
      )}

      {quizzes === null ? (
        <div className="grid gap-3">{[0, 1].map((i) => <div key={i} className="h-36 rounded-3xl bg-cream-200/80 animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <Stat label="Live now" value={liveCount} tone="emerald" />
            <Stat label="Drafts" value={draftCount} tone="gold" />
            <Stat label="Submissions" value={submissions} tone="saffron" />
          </div>

          {/* Quizzes */}
          <ul className="grid gap-3">
            {list.map((q) => {
              const st = statusOf(q);
              const t = tracking[q.id] || {};
              const attempted = Object.keys(t).length;
              const scored = Object.values(t).filter((x) => x.score?.total);
              const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.score.percent, 0) / scored.length) : null;
              const pct = participantCount ? Math.min(100, Math.round((attempted / participantCount) * 100)) : 0;
              const busy = busyId === q.id || loadingEdit === q.id;
              return (
                <li key={q.id} className="bg-cream-50 rounded-3xl border border-cream-200 shadow-soft hover:shadow-soft-md hover:border-gold-200 transition overflow-hidden">
                  <div className="p-4 sm:p-5 flex gap-3.5 sm:gap-4">
                    {/* Week badge */}
                    <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-saffron-500 to-gold-500 text-white flex flex-col items-center justify-center shadow-soft">
                      {q.weekNumber ? (
                        <>
                          <span className="text-[9px] font-semibold uppercase tracking-wider opacity-90 leading-none">Week</span>
                          <span className="text-lg sm:text-xl font-bold leading-tight">{q.weekNumber}</span>
                        </>
                      ) : (
                        <BookOpen className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-temple-900 leading-snug">{q.title}</h3>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${st.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.text}
                        </span>
                      </div>
                      <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-temple-500">
                        <span className="inline-flex items-center gap-1"><ListChecks className="w-3.5 h-3.5 text-gold-500" />{q.questionCount} question{q.questionCount === 1 ? '' : 's'}</span>
                        <span className="inline-flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5 text-gold-500" />{q.maxAttempts === 1 ? 'No retakes' : `${q.maxAttempts} attempts`}</span>
                        <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5 text-gold-500" />
                          {q.opensAt ? `Opens ${formatWhen(q.opensAt)}` : 'Opening time not set'}{q.closesAt ? ` · Closes ${formatWhen(q.closesAt)}` : ''}
                        </span>
                      </p>

                      {hasEditorCache(q.id) && (
                        <button type="button" onClick={() => openEditor(q)} disabled={busy} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-saffron-50 border border-saffron-200 text-[11px] font-semibold text-saffron-800 hover:bg-saffron-100 cursor-pointer">
                          <History className="w-3.5 h-3.5" /> Unsaved changes on this device · Continue editing
                        </button>
                      )}

                      {q.publishedAt && (
                        <button type="button" onClick={() => onTrack(q.id)} className="group w-full text-left pt-1 cursor-pointer" title="See who has attempted">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-temple-600"><strong className="text-temple-900">{attempted}</strong> of {participantCount} students attempted</span>
                            <span className="text-temple-500">{avg !== null ? `Average ${avg}%` : ''}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 px-4 sm:px-5 py-2.5 bg-cream-100/70 border-t border-cream-200">
                    <ActionBtn onClick={() => openEditor(q)} disabled={busy} icon={loadingEdit === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}>Edit</ActionBtn>
                    <ActionBtn onClick={() => openPreview(q)} disabled={busy} icon={<Eye className="w-3.5 h-3.5" />}>Preview</ActionBtn>
                    {q.publishedAt && <ActionBtn onClick={() => onTrack(q.id)} icon={<Table2 className="w-3.5 h-3.5" />}>Results</ActionBtn>}
                    {!q.publishedAt && (
                      <ActionBtn danger onClick={() => setConfirm({ kind: 'delete', quiz: q })} disabled={busy} icon={<Trash2 className="w-3.5 h-3.5" />}>Delete</ActionBtn>
                    )}
                    <span className="flex-1" />
                    {q.published ? (
                      <button type="button" onClick={() => setConfirm({ kind: 'unpublish', quiz: q })} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50 cursor-pointer">
                        <EyeOff className="w-3.5 h-3.5" /> Unpublish
                      </button>
                    ) : (
                      <button type="button" onClick={() => publish(q)} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-soft disabled:opacity-50 cursor-pointer">
                        {busyId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Publish
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-[11px] text-temple-400 text-center">
            Published quizzes can be unpublished but never deleted, so students’ attempts and scores are always kept.
          </p>
        </>
      )}

      {preview && <QuizPreview quiz={preview.quiz} draft={preview.draft} onClose={() => setPreview(null)} />}

      {confirm && (
        <div className="fixed inset-0 z-50 bg-temple-900/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="quiz-confirm-title">
          <div className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 space-y-4 shadow-soft-lg border border-cream-200">
            <h3 id="quiz-confirm-title" className="text-lg font-bold text-temple-900">{confirm.kind === 'delete' ? 'Delete this draft?' : 'Unpublish this quiz?'}</h3>
            <p className="text-sm text-temple-600">
              {confirm.kind === 'delete'
                ? `“${confirm.quiz.title}” will be removed permanently.`
                : `Students will no longer see “${confirm.quiz.title}”. Attempts already submitted are kept, and you can publish it again any time.`}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="w-1/2 py-2.5 rounded-xl border border-cream-300 bg-white text-sm font-medium cursor-pointer">Cancel</button>
              <button type="button" onClick={runConfirm} disabled={busyId === confirm.quiz.id} className={`w-1/2 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer disabled:opacity-60 ${confirm.kind === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                {busyId === confirm.quiz.id && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirm.kind === 'delete' ? 'Delete' : 'Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ onNew }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-gold-200/80 bg-gradient-to-br from-cream-50 via-saffron-50 to-gold-100 px-5 sm:px-7 py-5 sm:py-6 shadow-soft">
      <div aria-hidden className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-gold-200/40 blur-2xl" />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-saffron-700">Hare Krishna 🙏</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-temple-900 leading-tight">Weekly Quizzes</h1>
          <p className="text-xs sm:text-sm text-temple-600">One quiz each week, delivered to every student’s portal.</p>
        </div>
        {onNew && <button type="button" onClick={onNew} className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold shadow-soft hover:shadow-soft-md transition cursor-pointer">
          <Plus className="w-4 h-4" /> New quiz
        </button>}
      </div>
    </section>
  );
}

const STEPS = [
  { Icon: PenLine, title: 'Add questions', text: 'Short answer, long answer, multiple choice or checkboxes.' },
  { Icon: Eye, title: 'Preview it', text: 'Take the quiz exactly as a student will see it.' },
  { Icon: Send, title: 'Publish', text: 'It appears in every student’s portal, with a status column in Participants.' },
];

function EmptyState() {
  return (
    <section className="rounded-3xl border border-dashed border-gold-300 bg-cream-50 px-5 sm:px-8 py-8 sm:py-10 text-center space-y-6">
      <div className="space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gold-100 border border-gold-200 flex items-center justify-center text-gold-600">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-temple-900">No quizzes yet</h2>
        <p className="text-sm text-temple-600">Create your first weekly quiz with <strong>New quiz</strong> above. It takes three simple steps:</p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3 text-left">
        {STEPS.map(({ Icon, title, text }, i) => (
          <li key={title} className="rounded-2xl bg-white border border-cream-200 p-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-saffron-500 text-white text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
              <Icon className="w-4 h-4 text-gold-500" />
            </div>
            <p className="text-sm font-semibold text-temple-900">{title}</p>
            <p className="text-xs text-temple-500 leading-relaxed">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const STAT_TONES = {
  emerald: 'text-emerald-700',
  gold: 'text-gold-600',
  saffron: 'text-saffron-700',
};

function Stat({ label, value, tone }) {
  return (
    <div className="bg-cream-50 rounded-2xl border border-cream-200 shadow-soft px-3.5 py-3 sm:px-4">
      <span className={`block text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold ${STAT_TONES[tone]}`}>{label}</span>
      <span className="block text-xl sm:text-2xl font-bold text-temple-900">{value}</span>
    </div>
  );
}

function ActionBtn({ onClick, disabled, danger, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 cursor-pointer transition-colors ${
        danger ? 'text-temple-500 hover:text-red-700 hover:bg-red-50' : 'text-temple-700 hover:text-saffron-800 hover:bg-white'
      }`}
    >
      {icon} {children}
    </button>
  );
}

