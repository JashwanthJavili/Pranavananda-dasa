import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Minus, PenLine, Timer, CalendarClock } from 'lucide-react';
import { markQuestion, hasOptions, formatWhen, formatDuration } from '../../../quiz/quizModel';
import { quizColumnLabel } from './QuizTracking';

const MARK = {
  correct: { Icon: Check, label: 'Correct', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  incorrect: { Icon: X, label: 'Incorrect', cls: 'bg-red-50 border-red-200 text-red-600' },
  unanswered: { Icon: Minus, label: 'Not answered', cls: 'bg-cream-200 border-cream-300 text-temple-600' },
  ungraded: { Icon: PenLine, label: 'Written', cls: 'bg-gold-50 border-gold-200 text-temple-600' },
};

/**
 * A participant's answers for one quiz (Super Admins), attempt by attempt, marked against
 * the current answer key.
 *  status: the tracking entry { history: [{ attemptNumber, answers, score, submittedAt, timeTakenSec }], score }
 */
export default function StudentAnswersModal({ participant, quiz, status, answerKey, onClose }) {
  const history = status?.history || [];
  const countedNumber = history.find((h) => h.score === status?.score)?.attemptNumber;
  const [shownNumber, setShownNumber] = useState(countedNumber || history[history.length - 1]?.attemptNumber);
  const shown = history.find((h) => h.attemptNumber === shownNumber) || history[history.length - 1];
  const key = answerKey?.answers || {};

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const name = participant?.fullName || 'Participant';
  const regId = participant?.registrationId || participant?.id || '';

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-temple-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="answers-title" className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col bg-cream-50 rounded-t-3xl sm:rounded-3xl border border-cream-200 shadow-soft-lg text-left animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-cream-200">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-saffron-700">{quizColumnLabel(quiz)} · Answers</p>
            <h2 id="answers-title" className="text-lg font-bold text-temple-900 truncate">{name}</h2>
            <p className="text-xs text-temple-500 truncate">{regId}{quiz.weekNumber ? ` · ${quiz.title}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full text-temple-500 hover:text-temple-900 hover:bg-cream-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {!shown ? (
            <p className="text-sm text-temple-500">No answers found for this participant.</p>
          ) : (
            <>
              {/* Attempts */}
              {history.length > 1 && (
                <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-cream-200/70 border border-cream-300/70 w-fit" role="tablist" aria-label="Attempts">
                  {history.map((h) => (
                    <button
                      key={h.attemptNumber}
                      type="button"
                      role="tab"
                      aria-selected={h.attemptNumber === shown.attemptNumber}
                      onClick={() => setShownNumber(h.attemptNumber)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        h.attemptNumber === shown.attemptNumber ? 'bg-white text-saffron-700 shadow-soft' : 'text-temple-600 hover:text-temple-900'
                      }`}
                    >
                      Attempt {h.attemptNumber}{h.score?.total ? ` · ${h.score.percent}%` : ''}{h.attemptNumber === countedNumber ? ' ★' : ''}
                    </button>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {shown.score?.total > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 font-semibold text-emerald-800">
                    Score {shown.score.correct}/{shown.score.total} · {shown.score.percent}%
                  </span>
                )}
                {Number.isFinite(shown.timeTakenSec) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-cream-200 font-medium text-temple-700">
                    <Timer className="w-3.5 h-3.5 text-saffron-600" /> {formatDuration(shown.timeTakenSec)}
                  </span>
                )}
                {shown.submittedAt && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-cream-200 font-medium text-temple-700">
                    <CalendarClock className="w-3.5 h-3.5 text-gold-500" /> {formatWhen(shown.submittedAt)}
                  </span>
                )}
                {history.length > 1 && <span className="text-temple-400">★ counts ({quiz.scorePolicy === 'latest' ? 'latest' : 'best'} attempt)</span>}
              </div>

              {/* Questions */}
              <ol className="space-y-2.5">
                {quiz.questions.map((q, i) => {
                  const mine = shown.answers?.[q.id];
                  const mark = markQuestion(q, mine, key);
                  const m = MARK[mark === 'ungraded' && !mine ? 'unanswered' : mark];
                  return (
                    <li key={q.id} className="rounded-2xl border border-cream-200 bg-white/80 p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-temple-900 leading-snug whitespace-pre-line">
                          <span className="text-gold-600 mr-1">Q{i + 1}.</span>{q.text}
                        </p>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${m.cls}`}>
                          <m.Icon className="w-3 h-3" /> {m.label}
                        </span>
                      </div>
                      {hasOptions(q.type || 'mcq') ? (
                        <ul className="grid gap-1">
                          {q.options.map((o) => {
                            const multi = q.type === 'checkbox';
                            const right = multi ? (key[q.id] || []).includes(o.id) : key[q.id] === o.id;
                            const picked = multi ? Array.isArray(mine) && mine.includes(o.id) : mine === o.id;
                            return (
                              <li
                                key={o.id}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${
                                  right ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                    : picked ? 'border-red-200 bg-red-50 text-red-800'
                                      : 'border-cream-200 bg-white text-temple-600'
                                }`}
                              >
                                <span className="flex-1 min-w-0">{o.text}</span>
                                {picked && <span className="text-[10px] font-semibold uppercase tracking-wider">Their answer</span>}
                                {right && !picked && <span className="text-[10px] font-semibold uppercase tracking-wider">Correct</span>}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-xs text-temple-800 whitespace-pre-line break-words">
                          {mine ? String(mine) : <span className="italic text-temple-400">No answer</span>}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
