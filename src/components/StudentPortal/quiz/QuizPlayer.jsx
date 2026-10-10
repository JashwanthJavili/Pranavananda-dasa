import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, Send, Check, AlertTriangle, ListChecks, CheckCircle2, Timer } from 'lucide-react';
import ProgressRing from './ProgressRing';
import { Notice, Spinner } from '../ui';
import { isAnswered, textLimit, missingRequired, formatClock } from '../../../quiz/quizModel';

/** Short answer (one line) or long answer (paragraph), with a character counter. */
function TextAnswer({ q, value, onChange }) {
  const max = q.maxLength || textLimit(q.type);
  const common = {
    value,
    maxLength: max,
    onChange: (e) => onChange(e.target.value.slice(0, max)),
    'aria-labelledby': 'quiz-question',
    placeholder: 'Your answer',
    className: 'w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 text-sm sm:text-[15px] text-temple-900 placeholder:text-temple-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-saffron-400/40 focus:border-saffron-300 transition',
  };
  return (
    <div className="space-y-1.5">
      {q.type === 'paragraph' ? <textarea rows={6} {...common} className={`${common.className} resize-y min-h-[140px]`} /> : <input type="text" {...common} />}
      <p className={`text-right text-[11px] ${value.length >= max ? 'text-saffron-700 font-semibold' : 'text-temple-400'}`}>
        {value.length.toLocaleString('en-IN')} / {max.toLocaleString('en-IN')}
      </p>
    </div>
  );
}

// Minimum height so the player fills the visible screen below the surrounding header and padding
export const SCREEN_HEIGHT = {
  portal: 'min-h-[calc(100dvh-11.75rem)] sm:min-h-[calc(100dvh-14.25rem)]',
  preview: 'min-h-[calc(100dvh-6.25rem)]',
};

const listQs = (idx) => idx.map((i) => `Q${i + 1}`).join(', ');

/**
 * Answer a quiz one question at a time, then review every question on one page and submit.
 *  answers / onAnswersChange: controlled { [questionId]: answer }
 *  onSubmit(answers): Promise; errors are shown here
 *  preview: admin preview (nothing is saved)
 */
export default function QuizPlayer({
  quiz, answers, onAnswersChange, onSubmit, onExit, attemptLabel, preview = false, initialElapsed = 0, onElapsed,
}) {
  const screenClass = SCREEN_HEIGHT[preview ? 'preview' : 'portal'];

  // Stopwatch from 00:00 (continues from initialElapsed after "Save & exit"); no time limit
  const startRef = useRef(Date.now() - initialElapsed * 1000);
  const elapsedNow = () => Math.floor((Date.now() - startRef.current) / 1000);
  const [seconds, setSeconds] = useState(initialElapsed);
  const onElapsedRef = useRef(onElapsed);
  onElapsedRef.current = onElapsed;
  useEffect(() => {
    const t = setInterval(() => {
      const s = elapsedNow();
      setSeconds(s);
      if (s % 5 === 0) onElapsedRef.current?.(s);
    }, 1000);
    return () => {
      clearInterval(t);
      onElapsedRef.current?.(elapsedNow());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const questions = quiz.questions || [];
  const total = questions.length;
  const [index, setIndex] = useState(() => {
    const firstOpen = questions.findIndex((q) => !isAnswered(answers[q.id]));
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [reviewing, setReviewing] = useState(false);
  const [fromReview, setFromReview] = useState(false); // opened a question from the review page
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState([]); // required questions left empty at submit
  const headingRef = useRef(null);

  const answered = useMemo(() => questions.filter((q) => isAnswered(answers[q.id])).length, [questions, answers]);
  const percent = total ? (answered / total) * 100 : 0;
  const q = questions[index];
  const isLast = index === total - 1;

  // Questions the student has opened (for the review colours)
  const [visited, setVisited] = useState(() => new Set([index]));
  useEffect(() => {
    if (!reviewing) setVisited((v) => (v.has(index) ? v : new Set(v).add(index)));
  }, [index, reviewing]);
  const unanswered = useMemo(
    () => questions.map((qq, i) => (isAnswered(answers[qq.id]) ? -1 : i)).filter((i) => i >= 0),
    [questions, answers],
  );
  const stillMissing = missing.filter((i) => unanswered.includes(i));

  // Move focus to the new question (or the review heading) for keyboard and screen reader users.
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [index, reviewing]);

  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const setAnswer = (value) => onAnswersChange({ ...answers, [q.id]: value });
  const choose = (optionId) => {
    if (q.type !== 'checkbox') return setAnswer(optionId);
    const set = new Set(Array.isArray(answers[q.id]) ? answers[q.id] : []);
    set.has(optionId) ? set.delete(optionId) : set.add(optionId);
    return setAnswer([...set]);
  };

  const go = (i) => {
    setIndex(Math.max(0, Math.min(total - 1, i)));
    top();
  };
  const openReview = () => {
    setReviewing(true);
    setFromReview(false);
    top();
  };
  const openFromReview = (i) => {
    setReviewing(false);
    setFromReview(true);
    go(i);
  };

  // Required questions must be answered before the submit dialog opens.
  const trySubmit = () => {
    const m = missingRequired(questions, answers);
    setMissing(m);
    setError('');
    if (m.length) return;
    setConfirming(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(answers, elapsedNow());
    } catch (err) {
      setError(err?.message || 'Could not submit. Please try again.');
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  const onOptionKey = (e, i) => {
    if (q.type === 'checkbox') return; // checkboxes: Tab between them, Space to toggle
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
    const next = (i + dir + q.options.length) % q.options.length;
    choose(q.options[next].id);
    e.currentTarget.parentElement?.children[next]?.focus();
  };

  if (!q) return <Notice type="error">This quiz has no questions yet.</Notice>;

  const btnGhost = 'inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-cream-300 bg-white text-sm font-medium text-temple-700 hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';
  const btnDark = 'inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-temple-900 hover:bg-temple-800 text-cream-50 text-sm font-semibold shadow-soft cursor-pointer';
  const btnSaffron = 'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold shadow-soft cursor-pointer';

  return (
    // Fills the screen: summary at the top, question (or review) in the middle, buttons at the bottom
    <div className={`w-full max-w-2xl mx-auto flex flex-col gap-4 sm:gap-5 animate-fadeIn ${screenClass}`}>
      {/* Top: progress */}
      <div className="rounded-3xl bg-cream-50 border border-gold-200/80 shadow-soft p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
        {/* The ring is the only progress shown here; the question card says which question this is */}
        <ProgressRing percent={percent} size={56} label={`${answered} of ${total} questions answered`}>
          <span className="text-sm font-bold text-temple-900">{Math.round(percent)}%</span>
          <span className="text-[8px] font-semibold uppercase tracking-wider text-temple-400 mt-0.5">done</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase text-saffron-700">
            {preview ? 'Preview' : attemptLabel || (quiz.weekNumber ? `Week ${quiz.weekNumber}` : 'Quiz')}
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-temple-900 leading-tight truncate">{quiz.title}</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-cream-200 text-xs font-semibold text-temple-700 tabular-nums" role="timer" aria-label={`Time taken ${formatClock(seconds)}`}>
            <Timer className="w-3.5 h-3.5 text-saffron-600" /> {formatClock(seconds)}
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          title={preview ? 'Close preview' : 'Save & exit (your answers stay on this device)'}
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs font-medium text-temple-700 hover:bg-cream-100 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">{preview ? 'Close preview' : 'Save & exit'}</span><span className="sm:hidden">Exit</span>
        </button>
      </div>

      {/* Middle: one question, or the review page */}
      <div className="flex-1 flex flex-col justify-center gap-4 sm:gap-5">
        {reviewing ? (
          <section className="rounded-3xl bg-white/80 border border-cream-200 shadow-soft-md p-5 sm:p-7 space-y-5" aria-labelledby="quiz-review">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gold-600 tracking-wide inline-flex items-center gap-1.5"><ListChecks className="w-4 h-4" /> Review</p>
              <h3 id="quiz-review" ref={headingRef} tabIndex={-1} className="font-display text-xl sm:text-2xl font-bold text-temple-900 leading-snug outline-none">
                {unanswered.length ? 'Almost there' : 'All questions answered'}
              </h3>
              <p className="text-sm text-temple-600">Please check your answers. Tap any number to open that question.</p>
            </div>

            <div className="flex flex-wrap gap-2" role="list" aria-label="Questions">
              {questions.map((qq, i) => {
                const done = isAnswered(answers[qq.id]);
                const seen = visited.has(i) || missing.includes(i);
                const state = done ? 'answered' : seen ? 'not answered' : 'not opened yet';
                return (
                  <button
                    key={qq.id}
                    type="button"
                    role="listitem"
                    onClick={() => openFromReview(i)}
                    aria-label={`Question ${i + 1}, ${state}${qq.required ? ', required' : ''}`}
                    className={`relative w-11 h-11 rounded-xl text-sm font-semibold border transition cursor-pointer hover:-translate-y-0.5 ${
                      done
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : seen
                          ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                          : 'border-cream-300 bg-white text-temple-500 hover:border-gold-300'
                    } ${stillMissing.includes(i) ? 'ring-2 ring-red-400/70 ring-offset-1' : ''}`}
                  >
                    {i + 1}
                    {qq.required && !done && <span className="absolute -top-1 -right-0.5 text-red-500 text-xs" aria-hidden>*</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-temple-500" aria-hidden>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-emerald-300 bg-emerald-50" /> Answered</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-red-200 bg-red-50" /> Seen, not answered</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-cream-300 bg-white" /> Not seen yet</span>
            </div>

            {stillMissing.length > 0 ? (
              <p className="flex items-start gap-2 text-xs sm:text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-3.5 py-3" role="alert">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Hare Krishna 🙏 Kindly answer {stillMissing.length === 1 ? 'this question' : 'these questions'} marked{' '}
                  <span className="font-bold">*</span> before submitting: {listQs(stillMissing)}
                </span>
              </p>
            ) : unanswered.length > 0 ? (
              <p className="flex items-start gap-2 text-xs sm:text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Hare Krishna 🙏 {unanswered.length === 1 ? `${listQs(unanswered)} is` : `${listQs(unanswered)} are`} still waiting
                  for your answer. If you have a moment, kindly complete {unanswered.length === 1 ? 'it' : 'them'} before submitting.
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2 text-xs sm:text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Wonderful! You have answered every question. Submit when you are ready.</span>
              </p>
            )}
          </section>
        ) : (
          <section className="rounded-3xl bg-white/80 border border-cream-200 shadow-soft-md p-5 sm:p-7 space-y-5" aria-labelledby="quiz-question">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gold-600 tracking-wide">Question {index + 1} of {total}</p>
              <h3 id="quiz-question" ref={headingRef} tabIndex={-1} className="font-display text-xl sm:text-2xl font-bold text-temple-900 leading-snug outline-none whitespace-pre-line">
                {q.text}
                {q.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
              </h3>
              {q.description && <p className="text-sm text-temple-600 leading-relaxed whitespace-pre-line">{q.description}</p>}
              {q.type === 'checkbox' && <p className="text-xs font-medium text-saffron-700">Select all that apply</p>}
            </div>
            {q.type === 'short' || q.type === 'paragraph' ? (
              <TextAnswer key={q.id} q={q} value={typeof answers[q.id] === 'string' ? answers[q.id] : ''} onChange={setAnswer} />
            ) : (
              <div role={q.type === 'checkbox' ? 'group' : 'radiogroup'} aria-labelledby="quiz-question" className="grid gap-2.5">
                {q.options.map((o, i) => {
                  const multi = q.type === 'checkbox';
                  const selected = multi ? (Array.isArray(answers[q.id]) && answers[q.id].includes(o.id)) : answers[q.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role={multi ? 'checkbox' : 'radio'}
                      aria-checked={selected}
                      tabIndex={multi || selected || (!answers[q.id] && i === 0) ? 0 : -1}
                      onClick={() => choose(o.id)}
                      onKeyDown={(e) => onOptionKey(e, i)}
                      className={`w-full flex items-start gap-3 text-left rounded-2xl border px-4 py-3.5 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400/60 ${
                        selected
                          ? 'border-saffron-400 bg-saffron-50 shadow-soft'
                          : 'border-cream-300 bg-cream-50 hover:border-gold-300 hover:bg-white'
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-6 h-6 shrink-0 border-2 flex items-center justify-center text-[11px] font-bold ${multi ? 'rounded-md' : 'rounded-full'} ${
                          selected ? 'border-saffron-500 bg-saffron-500 text-white' : 'border-gold-300 text-gold-600 bg-white'
                        }`}
                        aria-hidden
                      >
                        {selected ? <Check className="w-3.5 h-3.5" /> : multi ? '' : String.fromCharCode(65 + i)}
                      </span>
                      <span className={`text-sm sm:text-[15px] leading-relaxed ${selected ? 'text-temple-900 font-medium' : 'text-temple-800'}`}>{o.text}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {error && <Notice type="error">{error}</Notice>}
      </div>

      {/* Bottom: navigation */}
      <div className="rounded-3xl bg-cream-50 border border-cream-200 shadow-soft p-3 flex items-center gap-2.5">
        {reviewing ? (
          <>
            <button type="button" onClick={() => { setReviewing(false); go(total - 1); }} className={btnGhost}>
              <ArrowLeft className="w-4 h-4" /> Questions
            </button>
            <div className="flex-1" />
            <button type="button" onClick={trySubmit} className={btnSaffron}>
              <Send className="w-4 h-4" /> {preview ? 'Finish preview' : 'Submit quiz'}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={btnGhost}>
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            <div className="flex-1" />
            {fromReview ? (
              <button type="button" onClick={openReview} className={btnSaffron}>
                <ListChecks className="w-4 h-4" /> Back to review
              </button>
            ) : isLast ? (
              <button type="button" onClick={openReview} className={btnSaffron}>
                Review <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={() => go(index + 1)} className={btnDark}>
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 bg-temple-900/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="submit-title">
          <div className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 space-y-4 shadow-soft-lg border border-cream-200 animate-fadeIn">
            <h3 id="submit-title" className="font-display text-2xl font-bold text-temple-900">
              {preview ? 'Finish preview?' : 'Submit your answers?'}
            </h3>
            <p className="text-sm text-temple-600">
              You have answered <strong>{answered}</strong> of <strong>{total}</strong> questions.
              {unanswered.length > 0 && ' Unanswered questions cannot earn a mark.'}
            </p>
            {!preview && <p className="text-xs text-temple-500">Once submitted, answers cannot be changed.</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl border border-cream-300 bg-white text-sm font-medium cursor-pointer disabled:opacity-50"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="w-1/2 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold cursor-pointer disabled:opacity-70"
              >
                {submitting && <Spinner />} {submitting ? 'Submitting…' : unanswered.length ? 'Submit anyway' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
