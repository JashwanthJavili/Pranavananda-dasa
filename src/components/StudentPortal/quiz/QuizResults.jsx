import React, { useState } from 'react';
import { ArrowLeft, Check, X, Minus, PenLine, ChevronDown, Timer } from 'lucide-react';
import ProgressRing from './ProgressRing';
import { SCREEN_HEIGHT } from './QuizPlayer';
import Celebration from './Celebration';
import { resultMessage, formatWhen, formatDuration, markQuestion, hasOptions } from '../../../quiz/quizModel';

const MARK_STYLE = {
  correct: { Icon: Check, label: 'Correct', pill: 'bg-emerald-50 border-emerald-200 text-emerald-700', bar: 'bg-emerald-400' },
  incorrect: { Icon: X, label: 'Incorrect', pill: 'bg-red-50 border-red-200 text-red-600', bar: 'bg-red-400' },
  unanswered: { Icon: Minus, label: 'Not answered', pill: 'bg-cream-200 border-cream-300 text-temple-600', bar: 'bg-temple-300' },
  ungraded: { Icon: PenLine, label: 'Not scored', pill: 'bg-gold-50 border-gold-200 text-temple-600', bar: 'bg-gold-300' },
};

/**
 * Score, then a per-question review with the correct answers.
 *  attempts: [{ attemptNumber, answers, submittedAt, score }]  (scored)
 *  counted:  the attempt that counts under the quiz's policy
 *  answerKey: { answers }
 */
export default function QuizResults({ quiz, attempts, counted, answerKey, onBack, backLabel = 'Back to quizzes', preview = false }) {
  const key = answerKey?.answers || {};
  const [shownNumber, setShownNumber] = useState(counted?.attemptNumber);
  const shown = attempts.find((a) => a.attemptNumber === shownNumber) || counted || attempts[attempts.length - 1];
  if (!shown) return null;

  const main = shown.score; // the attempt being viewed (★ marks the one that counts)
  const graded = main.total > 0;
  const perfect = graded && main.correct === main.total;
  const msg = resultMessage(main.percent, main.total);
  const multiple = attempts.length > 1;

  const marks = quiz.questions.map((q) => markQuestion(q, shown.answers?.[q.id], key));
  const count = (m) => marks.filter((x) => x === m).length;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-fadeIn">
      {/* First screen: the score card in the middle, answers below */}
      <div className={`flex flex-col gap-5 ${SCREEN_HEIGHT[preview ? 'preview' : 'portal']}`}>
      {onBack && (
        <button type="button" onClick={onBack} className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-temple-600 hover:text-temple-900 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </button>
      )}
      <div className="flex-1 flex flex-col justify-center gap-5">

      {/* Score */}
      <section className="relative overflow-hidden rounded-3xl border border-gold-200/80 bg-gradient-to-b from-saffron-50 to-cream-50 shadow-soft-md px-5 py-7 sm:px-8 text-center space-y-4">
        <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-saffron-700">
          {preview ? 'Preview result' : quiz.weekNumber ? `Week ${quiz.weekNumber} · Result` : 'Result'}
        </p>
        <div className="relative flex justify-center">
          {perfect && <Celebration key={shown.attemptNumber} />}
          {graded ? (
            <span key={shown.attemptNumber} className={`relative ${perfect ? 'gfy-pop' : ''}`}>
              <ProgressRing percent={main.percent} size={120} stroke={10} tone={main.percent >= 50 ? 'emerald' : 'saffron'}>
                <span className="text-3xl font-bold text-temple-900">{main.percent}%</span>
                <span className="text-xs text-temple-500 mt-1">{main.correct} of {main.total}</span>
              </ProgressRing>
            </span>
          ) : (
            <div className="w-28 h-28 rounded-full bg-white border-4 border-emerald-300 flex items-center justify-center text-emerald-600">
              <Check className="w-12 h-12" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-temple-900 leading-tight">{msg.title}</h2>
          <p className="text-sm text-temple-600 max-w-md mx-auto">{msg.text}</p>
        </div>
        {Number.isFinite(shown.timeTakenSec) && (
          <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-cream-200 text-xs font-semibold text-temple-700">
            <Timer className="w-3.5 h-3.5 text-saffron-600" /> Time taken: {formatDuration(shown.timeTakenSec)}
          </p>
        )}
        <p className="text-xs text-temple-500">
          {quiz.title}
          {shown.submittedAt && !preview ? ` · ${formatWhen(shown.submittedAt)}` : ''}
        </p>

        {graded && (
          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto pt-1">
            <Stat value={count('correct')} label="Correct" cls="text-emerald-700" />
            <Stat value={count('incorrect')} label="Incorrect" cls="text-red-600" />
            <Stat value={count('unanswered')} label="Skipped" cls="text-temple-600" />
          </div>
        )}
      </section>

      {/* Attempts */}
      {multiple && (
        <div className="space-y-2">
          <div className="flex flex-wrap justify-center gap-1 p-1 rounded-2xl bg-cream-200/70 border border-cream-300/70 w-fit mx-auto" role="tablist" aria-label="Attempts">
            {attempts.map((a) => (
              <button
                key={a.attemptNumber}
                type="button"
                role="tab"
                aria-selected={a.attemptNumber === shown.attemptNumber}
                onClick={() => setShownNumber(a.attemptNumber)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  a.attemptNumber === shown.attemptNumber ? 'bg-white text-saffron-700 shadow-soft' : 'text-temple-600 hover:text-temple-900'
                }`}
              >
                Attempt {a.attemptNumber}{a.score.total ? ` · ${a.score.percent}%` : ''}
                {a.attemptNumber === counted?.attemptNumber && ' ★'}
              </button>
            ))}
          </div>
          <p className="text-center text-[11px] text-temple-500">
            ★ Your {quiz.scorePolicy === 'latest' ? 'latest' : 'best'} attempt counts.
          </p>
        </div>
      )}

      </div>
      <button
        type="button"
        onClick={() => document.getElementById('quiz-answers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="self-center inline-flex items-center gap-1.5 text-xs font-semibold text-saffron-700 hover:text-saffron-800 cursor-pointer"
      >
        See your answers <ChevronDown className="w-4 h-4 animate-bounce" />
      </button>
      </div>

      {/* Review */}
      <div id="quiz-answers" className="scroll-mt-24 flex items-baseline justify-between gap-3 px-1 pt-1">
        <h3 className="font-display text-xl sm:text-2xl font-bold text-temple-900">Your answers</h3>
        {multiple && <span className="text-xs text-temple-500">Attempt {shown.attemptNumber}</span>}
      </div>

      <ol className="space-y-3">
        {quiz.questions.map((q, i) => {
          const mine = shown.answers?.[q.id];
          const mark = marks[i];
          const s = MARK_STYLE[mark === 'ungraded' && !mine ? 'unanswered' : mark];
          return (
            <li key={q.id} className="relative overflow-hidden rounded-3xl border border-cream-200 bg-cream-50 shadow-soft">
              <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} aria-hidden />
              <div className="p-4 sm:p-5 pl-5 sm:pl-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-gold-600">Question {i + 1}</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${s.pill}`}>
                    <s.Icon className="w-3 h-3" /> {s.label}
                  </span>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-temple-900 leading-snug whitespace-pre-line">{q.text}</p>
                  {q.description && <p className="text-xs text-temple-500 mt-1 whitespace-pre-line">{q.description}</p>}
                </div>
                {hasOptions(q.type || 'mcq') ? (
                  <OptionReview q={q} mine={mine} rightKey={key[q.id]} />
                ) : (
                  <TextReview mine={mine} />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {onBack && (
        <div className="flex justify-center pt-1">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-temple-900 hover:bg-temple-800 text-cream-50 text-sm font-semibold shadow-soft cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, cls }) {
  return (
    <div className="rounded-2xl bg-white/80 border border-cream-200 py-2.5">
      <span className={`block text-xl font-bold leading-none ${cls}`}>{value}</span>
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-temple-400 mt-1">{label}</span>
    </div>
  );
}

function OptionReview({ q, mine, rightKey }) {
  const multi = q.type === 'checkbox';
  const isRight = (id) => (multi ? (rightKey || []).includes(id) : id === rightKey);
  const isMine = (id) => (multi ? (Array.isArray(mine) && mine.includes(id)) : id === mine);
  return (
    <ul className="grid gap-2">
      {q.options.map((o) => {
        const right = isRight(o.id);
        const picked = isMine(o.id);
        return (
          <li
            key={o.id}
            className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm ${
              right ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : picked ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-cream-200 bg-white text-temple-600'
            }`}
          >
            <span
              className={`w-5 h-5 shrink-0 flex items-center justify-center border-2 ${multi ? 'rounded-md' : 'rounded-full'} ${
                right ? 'border-emerald-500 bg-emerald-500 text-white'
                  : picked ? 'border-red-400 bg-red-400 text-white'
                    : 'border-cream-300 bg-white'
              }`}
              aria-hidden
            >
              {right ? <Check className="w-3 h-3" /> : picked ? <X className="w-3 h-3" /> : null}
            </span>
            <span className="flex-1 min-w-0">{o.text}</span>
            {picked && <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap opacity-80">Your answer</span>}
            {right && !picked && <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap opacity-80">Correct</span>}
          </li>
        );
      })}
    </ul>
  );
}

function TextReview({ mine }) {
  return (
    <div className="space-y-1.5">
      <div className="rounded-2xl border border-cream-200 bg-white px-3.5 py-2.5 text-sm text-temple-800 whitespace-pre-line break-words">
        {mine ? String(mine) : <span className="italic text-temple-400">No answer</span>}
      </div>
      <p className="text-[11px] text-temple-500">Written answers are not scored. Thank you for reflecting 🙏</p>
    </div>
  );
}
