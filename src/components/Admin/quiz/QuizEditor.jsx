import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Eye, Save, Send, Loader2, AlertTriangle, X, Copy, Check,
  TextCursorInput, TextAlignStart, CircleDot, SquareCheckBig, CalendarClock, RotateCcw, Info, Target, Repeat, Trophy,
  CloudCheck, History,
} from 'lucide-react';
import FancySelect from './FancySelect';
import DateTimePicker from './DateTimePicker';
import {
  QUESTION_TYPES, TYPE_ORDER, emptyQuestion, changeQuestionType, newOptionId, newQuestionId, validateDraft, hasOptions,
  textLimit, MAX_OPTIONS, MIN_OPTIONS, MAX_ATTEMPTS_LIMIT, SCORE_POLICIES, MAX_QUESTIONS,
} from '../../../quiz/quizModel';
import QuizPreview from './QuizPreview';
import { saveEditorCache, clearEditorCache } from '../../../quiz/editorCache';

export const TYPE_ICONS = { short: TextCursorInput, paragraph: TextAlignStart, mcq: CircleDot, checkbox: SquareCheckBig };

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-white border border-cream-300 text-sm text-temple-900 placeholder:text-temple-400 focus:outline-none focus:ring-2 focus:ring-saffron-400/40 focus:border-saffron-300 transition';
const labelCls = 'block text-xs font-medium text-temple-600 mb-1';

const ATTEMPT_OPTIONS = Array.from({ length: MAX_ATTEMPTS_LIMIT }, (_, i) => i + 1).map((n) => ({
  value: n,
  label: n === 1 ? '1 attempt' : `${n} attempts`,
  hint: n === 1 ? 'No retakes — results right after submitting' : `Up to ${n - 1} retake${n === 2 ? '' : 's'}`,
  Icon: n === 1 ? Target : Repeat,
}));
const POLICY_OPTIONS = [
  { value: 'best', label: SCORE_POLICIES.best, hint: 'The highest score of all attempts', Icon: Trophy },
  { value: 'latest', label: SCORE_POLICIES.latest, hint: 'The score of the last attempt', Icon: RotateCcw },
];
const TYPE_OPTIONS = TYPE_ORDER.map((t) => ({ value: t, label: QUESTION_TYPES[t].label, hint: QUESTION_TYPES[t].hint, Icon: TYPE_ICONS[t] }));

const clockTime = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toUpperCase();
const whenSaved = (d) => (new Date().toDateString() === d.toDateString()
  ? `today, ${clockTime(d)}`
  : `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${clockTime(d)}`);

/**
 * Create / edit a quiz. onSave(draft, publish) where publish is true / false / undefined (keep state).
 * Every change is kept on this device as you type. Leaving midway saves an unpublished quiz as a
 * draft (onLeave(draft, dirty)); a published quiz keeps the changes on this device until you save.
 *  savedDraft: the quiz as last saved (to discard restored changes)
 *  restored: { savedAt, stale } when unfinished changes were restored from this device
 */
export default function QuizEditor({
  initialDraft, savedDraft, restored, quiz, attemptCount = 0, onSave, onLeave,
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState(null); // 'draft' | 'publish' | 'save' | 'leave'
  const [errors, setErrors] = useState([]);
  const [questionErrors, setQuestionErrors] = useState({});
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(Boolean(restored));
  const [keptAt, setKeptAt] = useState(restored?.savedAt || null);
  const [restoredNote, setRestoredNote] = useState(restored || null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focusId, setFocusId] = useState(null);
  const isPublished = Boolean(quiz?.published);
  const quizId = quiz?.id || null;

  // Keep unsaved work on this device: shortly after each change, and when the tab is closed
  const latest = useRef({ draft, dirty });
  latest.current = { draft, dirty };
  useEffect(() => {
    if (!dirty) return undefined;
    const t = setTimeout(() => {
      if (saveEditorCache(quizId, draft, quiz?.updatedAt)) setKeptAt(new Date());
    }, 500);
    return () => clearTimeout(t);
  }, [draft, dirty, quizId, quiz?.updatedAt]);
  useEffect(() => {
    const flush = () => {
      if (latest.current.dirty) saveEditorCache(quizId, latest.current.draft, quiz?.updatedAt);
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      flush(); // leaving the editor some other way (tab switch, logout)
    };
  }, [quizId, quiz?.updatedAt]);

  const update = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  const setQuestions = (fn) => {
    setDraft((d) => ({ ...d, questions: fn(d.questions) }));
    setDirty(true);
  };
  const updateQuestion = (id, patch) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const addQuestion = (type) => {
    const q = emptyQuestion(type);
    setQuestions((qs) => [...qs, q]);
    setFocusId(q.id);
    setPickerOpen(false);
  };

  const move = (i, dir) => setQuestions((qs) => {
    const list = [...qs];
    const j = i + dir;
    if (j < 0 || j >= list.length) return qs;
    [list[i], list[j]] = [list[j], list[i]];
    return list;
  });

  const duplicate = (i) => setQuestions((qs) => {
    const src = qs[i];
    const idMap = {};
    const options = src.options.map((o) => {
      const id = newOptionId();
      idMap[o.id] = id;
      return { ...o, id };
    });
    const correct = src.type === 'checkbox'
      ? (src.correct || []).map((id) => idMap[id]).filter(Boolean)
      : src.type === 'mcq' ? idMap[src.correct] || '' : src.correct;
    const list = [...qs];
    list.splice(i + 1, 0, { ...src, id: newQuestionId(), options, correct });
    return list;
  });

  const save = async (publish) => {
    const forPublish = publish === true || (publish === undefined && isPublished);
    const v = validateDraft(draft, { forPublish });
    setErrors(v.errors);
    setQuestionErrors(v.questionErrors);
    if (v.errors.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setBusy(publish === true ? 'publish' : publish === false ? 'draft' : 'save');
    try {
      await onSave(draft, publish);
      finish();
    } catch (err) {
      setErrors([err?.code === 'permission-denied'
        ? 'Saving was refused. Please log out and log in again, then try once more.'
        : 'Could not save the quiz. Please check your connection and try again.']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(null);
    }
  };

  const previewQuiz = useMemo(() => ({
    id: 'preview',
    ...draft,
    questions: draft.questions.map((q) => ({ ...q, options: q.options.filter((o) => o.text.trim()) })),
  }), [draft]);

  // Saved to the server: forget the copy on this device and close
  const finish = () => {
    latest.current.dirty = false;
    clearEditorCache(quizId);
    onLeave(null);
  };

  const hasContent = Boolean(draft.title.trim() || draft.questions.length || draft.description.trim() || draft.instructions.trim());

  // "All quizzes": never lose work. Unpublished quizzes are saved as a draft;
  // a published quiz keeps the changes on this device (students keep seeing the saved version).
  const leave = async () => {
    if (!dirty || !hasContent) {
      latest.current.dirty = false;
      clearEditorCache(quizId);
      onLeave(null);
      return;
    }
    if (isPublished) {
      saveEditorCache(quizId, draft, quiz?.updatedAt);
      onLeave('kept');
      return;
    }
    setBusy('leave');
    try {
      await onSave({ ...draft, title: draft.title.trim() || 'Untitled quiz' }, false, { auto: true });
      finish();
    } catch (err) {
      saveEditorCache(quizId, draft, quiz?.updatedAt);
      onLeave('kept');
    }
  };

  const discardRestored = () => {
    setDraft(savedDraft);
    setDirty(false);
    latest.current.dirty = false;
    setErrors([]);
    setQuestionErrors({});
    setRestoredNote(null);
    setKeptAt(null);
    clearEditorCache(quizId);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fadeIn text-left pb-20">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={leave} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 text-sm font-medium text-temple-600 hover:text-temple-900 disabled:opacity-60 cursor-pointer">
          {busy === 'leave' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
          {busy === 'leave' ? 'Saving draft…' : 'All quizzes'}
        </button>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${isPublished ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-cream-200 border-cream-300 text-temple-600'}`}>
          {quiz ? (isPublished ? 'Published' : quiz.publishedAt ? 'Unpublished' : 'Draft') : 'New quiz'}
        </span>
      </div>

      {restoredNote && (
        <div className={`flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-2xl border px-4 py-3 text-xs sm:text-sm ${
          restoredNote.stale ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-saffron-50 border-saffron-200 text-temple-800'
        }`}
        >
          <History className="w-4 h-4 shrink-0 text-saffron-600" />
          <p className="flex-1">
            <strong>Welcome back.</strong> We restored the unfinished changes you made {whenSaved(restoredNote.savedAt)}.
            {restoredNote.stale && ' This quiz was saved again after that, so please check before saving.'}
          </p>
          <div className="flex gap-2 shrink-0">
            {savedDraft && (
              <button type="button" onClick={discardRestored} className="px-3 py-1.5 rounded-xl border border-cream-300 bg-white text-xs font-semibold text-temple-700 hover:bg-cream-100 cursor-pointer">
                {quiz ? 'Discard changes' : 'Start over'}
              </button>
            )}
            <button type="button" onClick={() => setRestoredNote(null)} aria-label="Dismiss" className="p-1.5 rounded-lg text-temple-400 hover:text-temple-800 hover:bg-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {attemptCount > 0 && (
        <p className="flex items-start gap-2 text-xs sm:text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>{attemptCount}</strong> student{attemptCount === 1 ? ' has' : 's have'} already attempted this quiz. Their answers are kept, but scores always use
            the current questions and correct answers, so changing those changes their scores. Fixing typos is safe.
          </span>
        </p>
      )}

      {errors.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1" role="alert">
          <p className="font-semibold">Please fix the following:</p>
          <ul className="list-disc pl-5 space-y-0.5 text-xs sm:text-sm">
            {errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}
            {errors.length > 8 && <li>…and {errors.length - 8} more</li>}
          </ul>
        </div>
      )}

      {/* Quiz details: title card like a form header */}
      <section className="bg-cream-50 rounded-3xl border border-cream-200 shadow-soft overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-saffron-500 via-gold-400 to-saffron-400" />
        <div className="p-5 sm:p-7 space-y-4">
          <div className="flex gap-3">
            <input
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              maxLength={200}
              placeholder="Quiz title"
              aria-label="Quiz title"
              className="flex-1 min-w-0 bg-transparent border-0 border-b-2 border-cream-300 focus:border-saffron-500 focus:outline-none font-display text-2xl sm:text-3xl font-bold text-temple-900 placeholder:text-temple-300 pb-1.5 transition"
            />
            <label className="shrink-0 w-24">
              <span className="sr-only">Week number</span>
              <div className="flex items-center rounded-xl border border-cream-300 bg-white focus-within:ring-2 focus-within:ring-saffron-400/40 overflow-hidden">
                <span className="pl-3 text-[11px] font-semibold text-temple-500">Week</span>
                <input
                  inputMode="numeric"
                  value={draft.weekNumber}
                  onChange={(e) => update({ weekNumber: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  placeholder="–"
                  aria-label="Week number"
                  className="w-full px-2 py-2.5 text-sm font-bold text-temple-900 focus:outline-none bg-transparent"
                />
              </div>
            </label>
          </div>
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) => update({ description: e.target.value })}
            maxLength={1000}
            placeholder="Short description (optional)"
            aria-label="Quiz description"
            className={`${inputCls} resize-none`}
          />
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="qz-inst" className={labelCls}>Instructions for students</label>
              <span className="text-[10px] text-temple-400">{draft.instructions.length} / 2000</span>
            </div>
            <textarea
              id="qz-inst"
              rows={6}
              value={draft.instructions}
              onChange={(e) => update({ instructions: e.target.value })}
              maxLength={2000}
              placeholder="e.g. Read Chapter 2 before you begin. Answer every question honestly — there is no timer."
              className={`${inputCls} resize-y min-h-[150px] leading-relaxed`}
            />
          </div>
        </div>
      </section>

      {/* Schedule & attempts */}
      <section className="bg-cream-50 rounded-3xl border border-cream-200 shadow-soft p-5 sm:p-6 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-temple-900"><CalendarClock className="w-4 h-4 text-gold-500" /> Schedule & attempts</h2>
        <div>
          <label htmlFor="qz-open" className={labelCls}>Opens on</label>
          <DateTimePicker id="qz-open" value={draft.opensAt} onChange={(d) => update({ opensAt: d })} placeholder="Choose date" />
        </div>
        <div>
          <label htmlFor="qz-close" className={labelCls}>Closes on <span className="text-temple-400">(optional)</span></label>
          <DateTimePicker id="qz-close" value={draft.closesAt} onChange={(d) => update({ closesAt: d })} placeholder="No closing date" clearable defaultHour={21} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="qz-attempts" className={labelCls}>Attempts allowed</label>
            <FancySelect id="qz-attempts" ariaLabel="Attempts allowed" value={Number(draft.maxAttempts)} onChange={(n) => update({ maxAttempts: n })} options={ATTEMPT_OPTIONS} />
          </div>
          {Number(draft.maxAttempts) > 1 && (
            <div>
              <label htmlFor="qz-policy" className={labelCls}>Which score counts</label>
              <FancySelect id="qz-policy" ariaLabel="Which score counts" value={draft.scorePolicy} onChange={(v) => update({ scorePolicy: v })} options={POLICY_OPTIONS} />
            </div>
          )}
        </div>
        {Number(draft.maxAttempts) > 1 && (
          <p className="flex items-start gap-1.5 text-[11px] text-temple-500">
            <RotateCcw className="w-3.5 h-3.5 shrink-0 mt-px" />
            With retakes, students see their score and the correct answers after their final attempt.
          </p>
        )}
      </section>

      {/* Questions */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-sm font-bold text-temple-900">Questions</h2>
          <span className="text-xs text-temple-500">{draft.questions.length} added</span>
        </div>

        {draft.questions.length === 0 && !pickerOpen && (
          <div className="rounded-3xl border-2 border-dashed border-gold-300 bg-cream-50/70 px-6 py-10 text-center space-y-3">
            <p className="text-sm font-semibold text-temple-900">No questions yet</p>
            <p className="text-xs text-temple-500">Add your first question and choose its type.</p>
          </div>
        )}

        {draft.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            total={draft.questions.length}
            error={questionErrors[q.id]}
            autoFocus={focusId === q.id}
            onChange={(patch) => updateQuestion(q.id, patch)}
            onType={(type) => setQuestions((qs) => qs.map((x) => (x.id === q.id ? changeQuestionType(x, type) : x)))}
            onMove={(dir) => move(i, dir)}
            onDuplicate={() => duplicate(i)}
            onDelete={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
          />
        ))}

        {pickerOpen ? (
          <TypePicker onPick={addQuestion} onClose={() => setPickerOpen(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={draft.questions.length >= MAX_QUESTIONS}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-gold-300 text-sm font-semibold text-saffron-700 hover:bg-gold-50 hover:border-gold-400 shadow-soft disabled:opacity-50 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" /> Add question
          </button>
        )}
      </section>

      {/* Actions (sits just above the admin footer navigation) */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 z-30 bg-cream-50/95 backdrop-blur-md border-t border-gold-200/70">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-end gap-2">
          {dirty && (
            <span className="mr-auto inline-flex items-center gap-1.5 text-[11px] text-temple-500 min-w-0" title="Your work is kept on this device until you save">
              <CloudCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">{keptAt ? `Autosaved ${clockTime(keptAt)}` : 'Autosaving…'}</span>
            </span>
          )}
          <button type="button" onClick={() => setPreview(true)} disabled={!draft.questions.length} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-cream-300 bg-white text-xs sm:text-sm font-medium text-temple-800 hover:bg-cream-100 disabled:opacity-50 cursor-pointer">
            <Eye className="w-4 h-4" /> Preview
          </button>
          {isPublished ? (
            <button type="button" onClick={() => save(undefined)} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs sm:text-sm font-semibold disabled:opacity-60 cursor-pointer">
              {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
            </button>
          ) : (
            <>
              <button type="button" onClick={() => save(false)} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-cream-300 bg-white text-xs sm:text-sm font-medium text-temple-800 hover:bg-cream-100 disabled:opacity-60 cursor-pointer">
                {busy === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save draft
              </button>
              <button type="button" onClick={() => save(true)} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-60 cursor-pointer">
                {busy === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publish
              </button>
            </>
          )}
        </div>
      </div>

      {preview && <QuizPreview quiz={previewQuiz} draft={draft} onClose={() => setPreview(false)} />}
    </div>
  );
}

/** Choose the type of the new question. */
function TypePicker({ onPick, onClose }) {
  return (
    <div className="rounded-3xl bg-white border border-gold-200 shadow-soft-md p-4 sm:p-5 space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-temple-900">Choose a question type</p>
        <button type="button" onClick={onClose} aria-label="Cancel" className="p-1.5 rounded-lg text-temple-400 hover:text-temple-800 hover:bg-cream-100 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {TYPE_ORDER.map((type) => {
          const Icon = TYPE_ICONS[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onPick(type)}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-cream-200 bg-cream-50 px-3 py-4 hover:border-saffron-300 hover:bg-saffron-50 transition cursor-pointer"
            >
              <span className="w-10 h-10 rounded-xl bg-white border border-cream-200 group-hover:border-saffron-200 flex items-center justify-center text-saffron-600">
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-xs sm:text-sm font-semibold text-temple-900">{QUESTION_TYPES[type].label}</span>
              <span className="text-[10px] sm:text-[11px] text-temple-500 leading-tight text-center">{QUESTION_TYPES[type].hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuestionCard({ q, index, total, error, autoFocus, onChange, onType, onMove, onDuplicate, onDelete }) {
  const updateOption = (oid, text) => onChange({ options: q.options.map((o) => (o.id === oid ? { ...o, text } : o)) });
  const removeOption = (oid) => onChange({
    options: q.options.filter((o) => o.id !== oid),
    correct: q.type === 'checkbox' ? (q.correct || []).filter((id) => id !== oid) : q.correct === oid ? '' : q.correct,
  });
  const toggleCorrect = (oid) => {
    if (q.type === 'mcq') onChange({ correct: oid });
    else {
      const set = new Set(q.correct || []);
      set.has(oid) ? set.delete(oid) : set.add(oid);
      onChange({ correct: [...set] });
    }
  };

  return (
    <article className={`group bg-cream-50 rounded-3xl border shadow-soft transition focus-within:shadow-soft-md focus-within:border-saffron-300 ${error ? 'border-red-300' : 'border-cream-200'}`}>
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header: number + type */}
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-xl bg-temple-900 text-gold-200 text-xs font-bold">Q{index + 1}</span>
            {q.required && <span className="text-[11px] font-semibold text-red-500">* Required</span>}
          </span>
          <FancySelect id={`type-${q.id}`} ariaLabel="Question type" size="sm" align="right" value={q.type} onChange={onType} options={TYPE_OPTIONS} />
        </div>

        {/* Question + description */}
        <div className="space-y-2">
          <input
            value={q.text}
            onChange={(e) => onChange({ text: e.target.value })}
            maxLength={1000}
            placeholder="Question"
            aria-label={`Question ${index + 1}`}
            autoFocus={autoFocus}
            className="w-full bg-white border border-cream-300 rounded-xl px-4 py-3 text-sm sm:text-base font-medium text-temple-900 placeholder:text-temple-400 focus:outline-none focus:ring-2 focus:ring-saffron-400/40 focus:border-saffron-300"
          />
          <input
            value={q.description}
            onChange={(e) => onChange({ description: e.target.value })}
            maxLength={1000}
            placeholder="Description (optional)"
            aria-label={`Question ${index + 1} description`}
            className="w-full bg-transparent border-0 border-b border-cream-300 focus:border-saffron-400 px-1 py-1.5 text-xs sm:text-sm text-temple-600 placeholder:text-temple-400 focus:outline-none"
          />
        </div>

        {/* Answer area by type */}
        {hasOptions(q.type) ? (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-temple-500">
              {q.type === 'mcq' ? 'Options — select the correct answer' : 'Options — tick every correct answer'}
            </p>
            {q.options.map((o, oi) => {
              const isCorrect = q.type === 'mcq' ? q.correct === o.id : (q.correct || []).includes(o.id);
              return (
                <div key={o.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrect(o.id)}
                    aria-label={`Mark option ${oi + 1} as correct`}
                    aria-pressed={isCorrect}
                    title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                    className={`shrink-0 w-6 h-6 flex items-center justify-center border-2 transition cursor-pointer ${q.type === 'mcq' ? 'rounded-full' : 'rounded-md'} ${
                      isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-cream-400 bg-white hover:border-emerald-400'
                    }`}
                  >
                    {isCorrect && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    value={o.text}
                    onChange={(e) => updateOption(o.id, e.target.value)}
                    maxLength={300}
                    placeholder={`Option ${oi + 1}`}
                    aria-label={`Question ${index + 1} option ${oi + 1}`}
                    className={`flex-1 min-w-0 px-3.5 py-2 rounded-xl border text-sm text-temple-900 placeholder:text-temple-400 focus:outline-none focus:ring-2 focus:ring-saffron-400/40 ${
                      isCorrect ? 'border-emerald-300 bg-emerald-50/60' : 'border-cream-300 bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(o.id)}
                    disabled={q.options.length <= MIN_OPTIONS}
                    aria-label={`Remove option ${oi + 1}`}
                    className="shrink-0 p-1.5 rounded-lg text-temple-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {q.options.length < MAX_OPTIONS && (
              <button type="button" onClick={() => onChange({ options: [...q.options, { id: newOptionId(), text: '' }] })} className="ml-8 inline-flex items-center gap-1 text-xs font-semibold text-saffron-700 hover:underline cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add option
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* What students will see */}
            <div className={`rounded-xl border border-dashed border-cream-400 bg-white/60 px-3.5 text-xs text-temple-400 ${q.type === 'paragraph' ? 'py-6' : 'py-2.5'}`}>
              {q.type === 'paragraph' ? 'Long answer text' : 'Short answer text'} · up to {textLimit(q.type).toLocaleString('en-IN')} characters
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-temple-500">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" /> Written answers are not scored. Students’ answers appear with their results.
            </p>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end gap-0.5 px-3 sm:px-4 py-2 border-t border-cream-200 bg-cream-100/60 rounded-b-3xl">
        <label className="mr-auto inline-flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs font-medium text-temple-700">Required</span>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(q.required)}
            aria-label={`Question ${index + 1} required`}
            onClick={() => onChange({ required: !q.required })}
            className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${q.required ? 'bg-saffron-500' : 'bg-cream-400'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform ${q.required ? 'translate-x-4' : ''}`} />
          </button>
        </label>
        <ToolBtn label="Move up" onClick={() => onMove(-1)} disabled={index === 0}><ChevronUp className="w-4 h-4" /></ToolBtn>
        <ToolBtn label="Move down" onClick={() => onMove(1)} disabled={index === total - 1}><ChevronDown className="w-4 h-4" /></ToolBtn>
        <ToolBtn label="Duplicate" onClick={onDuplicate} disabled={total >= MAX_QUESTIONS}><Copy className="w-4 h-4" /></ToolBtn>
        <span className="w-px h-5 bg-cream-300 mx-1" />
        <ToolBtn label="Delete question" danger onClick={onDelete}><Trash2 className="w-4 h-4" /></ToolBtn>
      </div>
    </article>
  );
}

function ToolBtn({ label, onClick, disabled, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-2 rounded-lg disabled:opacity-30 cursor-pointer transition-colors ${danger ? 'text-temple-400 hover:text-red-600 hover:bg-red-50' : 'text-temple-500 hover:text-temple-900 hover:bg-white'}`}
    >
      {children}
    </button>
  );
}
