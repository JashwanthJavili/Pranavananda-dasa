import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, CalendarClock, ListChecks, RotateCcw, Trophy, Lock, PlayCircle, ArrowLeft, Clock, CheckCircle2, Hourglass,
} from 'lucide-react';
import QuizPlayer, { SCREEN_HEIGHT } from './QuizPlayer';
import QuizResults from './QuizResults';
import { Notice, PrimaryButton, FullScreenLoader, Spinner } from '../ui';
import { availability, formatWhen, formatClock, toDate } from '../../../quiz/quizModel';
import {
  resultsDue, fetchMyResults, submitQuizAttempt, finishQuizEarly, loadAnswerDraft, saveAnswerDraft,
  clearAnswerDraft, quizErrorMessage, loadElapsed, saveElapsed, explainSubmitFailure,
} from '../../../quiz/studentQuizzes';

/** Where this student stands on a quiz. */
export function quizState(quiz, progress, now = new Date()) {
  const avail = availability(quiz, now);
  if (!progress) {
    if (avail === 'upcoming') return 'upcoming';
    if (avail === 'closed') return 'missed';
    return 'not-attempted';
  }
  return resultsDue(quiz, progress, now) ? 'completed' : 'in-progress';
}

const STATE_CHIP = {
  'not-attempted': { text: 'Not attempted yet', cls: 'bg-cream-200 text-temple-700 border-cream-300' },
  'in-progress': { text: 'Retake available', cls: 'bg-gold-100 text-gold-600 border-gold-200' },
  completed: { text: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  upcoming: { text: 'Opening soon', cls: 'bg-saffron-50 text-saffron-700 border-saffron-200' },
  missed: { text: 'Not attempted', cls: 'bg-cream-200 text-temple-500 border-cream-300' }, // closed without an attempt
};

function windowText(quiz) {
  const avail = availability(quiz);
  if (avail === 'upcoming') return `Opens ${formatWhen(quiz.opensAt)}`;
  if (avail === 'closed') return `Closed ${formatWhen(quiz.closesAt)}`;
  return quiz.closesAt ? `Open until ${formatWhen(quiz.closesAt)}` : 'Open now';
}

/**
 * The student's weekly quizzes: list, start, answer, submit and results.
 *  progress: { [quizId]: progress } for this student
 *  onReload(): refreshes quizzes and progress
 */
export default function StudentQuizzes({ user, profile, quizzes, progress, error, onReload, onActiveChange }) {
  const [view, setView] = useState({ name: 'list' });
  const [scores, setScores] = useState({}); // quizId -> counted score, for completed quizzes
  const registrationId = profile.registrationId;

  useEffect(() => { onActiveChange?.(view.name === 'play'); }, [view.name, onActiveChange]);

  // Scores for completed quizzes (shown on the cards)
  useEffect(() => {
    if (!quizzes || !progress) return undefined;
    let alive = true;
    quizzes
      .filter((q) => quizState(q, progress[q.id]) === 'completed' && !scores[q.id])
      .forEach((q) => {
        fetchMyResults(user.uid, q)
          .then((r) => alive && r.counted && setScores((s) => ({ ...s, [q.id]: r.counted.score })))
          .catch(() => {});
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizzes, progress, user.uid]);

  const back = useCallback(() => {
    setView({ name: 'list' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (error) return <Notice type="error">{error}</Notice>;
  if (quizzes === undefined || progress === undefined) return <ListSkeleton />;

  if (view.name === 'intro') {
    return <QuizIntro quiz={view.quiz} progress={progress[view.quiz.id]} registrationId={registrationId} onBack={back} onBegin={() => setView({ name: 'play', quiz: view.quiz })} />;
  }
  if (view.name === 'play') {
    return (
      <PlayQuiz
        quiz={view.quiz}
        user={user}
        registrationId={registrationId}
        progress={progress[view.quiz.id]}
        onExit={back}
        onSubmitted={async (newProgress) => {
          await onReload?.();
          const due = resultsDue(view.quiz, newProgress);
          setView({ name: due ? 'results' : 'submitted', quiz: view.quiz, progress: newProgress });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }
  if (view.name === 'submitted') {
    return (
      <SubmittedScreen
        quiz={view.quiz}
        progress={progress[view.quiz.id] || view.progress}
        registrationId={registrationId}
        onBack={back}
        onRetake={() => setView({ name: 'intro', quiz: view.quiz })}
        onFinished={async () => {
          await onReload?.();
          setView({ name: 'results', quiz: view.quiz });
        }}
      />
    );
  }
  if (view.name === 'results') {
    return <ResultsLoader quiz={view.quiz} user={user} onBack={back} onScore={(s) => setScores((m) => ({ ...m, [view.quiz.id]: s }))} />;
  }

  // List
  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="space-y-1">
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-temple-900">Weekly Gita Quizzes</h3>
        <p className="text-xs sm:text-sm text-temple-500">A short quiz each week to reflect on what you have learnt. Take your time; there is no time limit.</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gold-300 bg-cream-50 px-6 py-12 sm:py-16 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gold-100 border border-gold-200 flex items-center justify-center text-gold-600">
            <Sparkles className="w-7 h-7" />
          </div>
          <h4 className="font-display text-2xl font-bold text-temple-900">No quizzes yet</h4>
          <p className="text-sm text-temple-600 max-w-sm mx-auto leading-relaxed">
            Hare Krishna 🙏 This week’s quiz will appear here soon. Meanwhile, please keep reading and reflecting on the Gita.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map((q) => (
            <QuizCard
              key={q.id}
              quiz={q}
              progress={progress[q.id]}
              score={scores[q.id]}
              onStart={() => setView({ name: 'intro', quiz: q })}
              onResults={() => setView({ name: 'results', quiz: q })}
              onSubmitted={() => setView({ name: 'submitted', quiz: q })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading quizzes">
      {[0, 1].map((i) => <div key={i} className="h-48 rounded-3xl bg-cream-200 animate-pulse" />)}
    </div>
  );
}

/** Re-render every second while `active` (for live countdowns). */
function useNow(active) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Short time left: "2d 4h", "5h 12m 09s", "12m 09s". */
function timeLeft(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${pad(m)}m ${pad(total % 60)}s`;
  return `${m}m ${pad(total % 60)}s`;
}

const TIMER_TONE = { open: 'text-saffron-700', closing: 'text-amber-700', urgent: 'text-red-600' };

function QuizCard({ quiz, progress, score, onStart, onResults, onSubmitted }) {
  const opens = toDate(quiz.opensAt);
  const closes = toDate(quiz.closesAt);
  const ticking = Boolean((closes && closes > new Date()) || (opens && opens > new Date()));
  const now = useNow(ticking);
  const state = quizState(quiz, progress, now);
  // Live countdown: to closing while it can still be attempted, or to opening
  const timer = state === 'upcoming' && opens
    ? { label: 'Opens in', ms: opens - now, tone: 'open', when: formatWhen(opens) }
    : (state === 'not-attempted' || state === 'in-progress') && closes
      ? { label: 'Closes in', ms: closes - now, tone: closes - now < 3600e3 ? 'urgent' : 'closing', when: formatWhen(closes) }
      : null;
  const chip = STATE_CHIP[state];
  const max = quiz.maxAttempts || 1;
  const qCount = quiz.questionCount || quiz.questions?.length || 0;
  return (
    <article className="flex flex-col rounded-3xl bg-cream-50 border border-cream-200 shadow-soft hover:shadow-soft-md hover:border-gold-300 transition p-5 sm:p-6 gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-temple-900 text-gold-200 text-[11px] font-semibold tracking-wide">
          {quiz.weekNumber ? `Week ${quiz.weekNumber}` : 'Quiz'}
        </span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${chip.cls}`}>
          {state === 'completed' && score?.total ? `${score.correct}/${score.total} · ${score.percent}%` : chip.text}
        </span>
      </div>
      <div className="space-y-1.5 flex-1">
        <h4 className="font-display text-xl sm:text-2xl font-bold text-temple-900 leading-snug">{quiz.title}</h4>
        {quiz.description && <p className="text-sm text-temple-600 leading-relaxed line-clamp-3">{quiz.description}</p>}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-temple-500">
        <li className="inline-flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5 text-gold-500" />{qCount} question{qCount === 1 ? '' : 's'}</li>
        <li className="inline-flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-gold-500" />{max === 1 ? 'Only 1 attempt' : `${max} attempts`}</li>
        {/* Upcoming and missed quizzes show their date in the box below instead */}
        {timer && timer.ms > 0 ? (
          // Live countdown in place of the date (exact date on hover / screen readers)
          <li className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${TIMER_TONE[timer.tone]}`} title={timer.when} role="timer" aria-label={`${timer.label} ${timeLeft(timer.ms)}, ${timer.when}`}>
            <Hourglass className={`w-3.5 h-3.5 ${timer.tone === 'urgent' ? 'animate-pulse' : ''}`} />{timer.label} {timeLeft(timer.ms)}
          </li>
        ) : state !== 'upcoming' && state !== 'missed' && (
          <li className="inline-flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-gold-500" />{windowText(quiz)}</li>
        )}
      </ul>
            {state === 'not-attempted' && (
        <PrimaryButton onClick={onStart}><PlayCircle className="w-4 h-4" /> Start quiz</PrimaryButton>
      )}
      {state === 'in-progress' && (
        <div className="space-y-2">
          <p className="text-xs text-temple-600">You have submitted attempt {progress.attempts} of {max}.</p>
          <PrimaryButton onClick={onSubmitted}><RotateCcw className="w-4 h-4" /> Retake or see results</PrimaryButton>
        </div>
      )}
      {state === 'completed' && (
        <button type="button" onClick={onResults} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-sm font-semibold cursor-pointer">
          <Trophy className="w-4 h-4" /> View results
        </button>
      )}
      {state === 'upcoming' && (
        <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed border-gold-300 text-temple-500 text-sm font-medium">
          <Clock className="w-4 h-4" /> {windowText(quiz)}
        </div>
      )}
      {state === 'missed' && (
        <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-cream-200/70 text-temple-600 text-sm font-medium">
          <Lock className="w-4 h-4" /> Closed on {formatWhen(quiz.closesAt)}
        </div>
      )}
    </article>
  );
}

function QuizIntro({ quiz, progress, registrationId, onBack, onBegin }) {
  const n = (progress?.attempts || 0) + 1;
  const max = quiz.maxAttempts || 1;
  const hasDraft = Object.keys(loadAnswerDraft(quiz.id, registrationId, n)).length > 0;
  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-temple-600 hover:text-temple-900 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back to quizzes
      </button>
      <section className="rounded-3xl bg-cream-50 border border-gold-200/80 shadow-soft-md overflow-hidden">
        <div className="bg-gradient-to-br from-saffron-50 via-cream-50 to-gold-100 px-6 sm:px-8 py-6 sm:py-7 border-b border-gold-200/70">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-saffron-700">{quiz.weekNumber ? `Week ${quiz.weekNumber}` : 'Weekly quiz'}</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-temple-900 leading-tight mt-1">{quiz.title}</h2>
          {quiz.description && <p className="text-sm text-temple-600 mt-2 leading-relaxed">{quiz.description}</p>}
        </div>
        <div className="px-6 sm:px-8 py-6 space-y-5">
          <dl className={`grid gap-2 sm:gap-3 text-center ${max > 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {[
              ['Questions', quiz.questionCount || quiz.questions?.length || 0],
              max > 1 && ['Attempt', `${n} of ${max}`],
              ['Timer', formatClock(loadElapsed(quiz.id, registrationId, n))],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white border border-cream-200 px-2 py-3">
                <dt className="text-[11px] text-temple-500">{k}</dt>
                <dd className="text-base sm:text-lg font-bold text-temple-900">{v}</dd>
              </div>
            ))}
          </dl>
          {quiz.instructions && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-temple-500">Instructions</h3>
              <p className="text-sm text-temple-700 leading-relaxed whitespace-pre-line">{quiz.instructions}</p>
            </div>
          )}
          <ul className="text-xs text-temple-500 space-y-1 list-disc pl-5">
            {max === 1 && (
              <li className="text-temple-800 font-semibold">
                You can attempt this quiz only once, so please read each question carefully before you submit.
              </li>
            )}
            <li>A timer starts from 00:00 when you begin, just to show how long you took. There is no time limit.</li>
            {quiz.closesAt && <li>Please submit before {formatWhen(quiz.closesAt)}.</li>}
            <li>Your answers are saved on this device as you go, so you can pause and continue later.</li>
            <li>{max > 1 ? 'Your score and the correct answers are shown after your final attempt (or when you choose to finish).' : 'Your score and the correct answers are shown right after you submit.'}</li>
          </ul>
          <PrimaryButton onClick={onBegin}><PlayCircle className="w-4 h-4" /> {hasDraft ? 'Continue quiz' : 'Begin quiz'}</PrimaryButton>
        </div>
      </section>
    </div>
  );
}

function PlayQuiz({ quiz, user, registrationId, progress, onExit, onSubmitted }) {
  const n = (progress?.attempts || 0) + 1;
  const [answers, setAnswers] = useState(() => loadAnswerDraft(quiz.id, registrationId, n));
  const submitted = useRef(false);
  const change = (next) => {
    setAnswers(next);
    saveAnswerDraft(quiz.id, registrationId, n, next);
  };
  const submit = async (final, timeTakenSec) => {
    try {
      await submitQuizAttempt({ uid: user.uid, registrationId, quiz, answers: final, progress, timeTakenSec });
    } catch (err) {
      throw new Error(await explainSubmitFailure(err, { quiz, registrationId, n }));
    }
    submitted.current = true; // stop keeping the timer for this attempt
    clearAnswerDraft(quiz.id, registrationId, n);
    await onSubmitted({ ...(progress || {}), attempts: n, finished: false });
  };
  return (
    <QuizPlayer
      quiz={quiz}
      answers={answers}
      onAnswersChange={change}
      onSubmit={submit}
      onExit={onExit}
      initialElapsed={loadElapsed(quiz.id, registrationId, n)}
      onElapsed={(sec) => { if (!submitted.current) saveElapsed(quiz.id, registrationId, n, sec); }}
      attemptLabel={`${quiz.weekNumber ? `Week ${quiz.weekNumber} · ` : ''}Attempt ${n} of ${quiz.maxAttempts || 1}`}
    />
  );
}

function SubmittedScreen({ quiz, progress, registrationId, onBack, onRetake, onFinished }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const max = quiz.maxAttempts || 1;
  const left = max - (progress?.attempts || 0);
  const open = availability(quiz) === 'open';

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      await finishQuizEarly(quiz.id, registrationId);
      await onFinished();
    } catch (err) {
      setError(quizErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className={`max-w-lg w-full mx-auto flex flex-col justify-center animate-fadeIn ${SCREEN_HEIGHT.portal}`}>
      <div className="rounded-3xl bg-cream-50 border border-gold-200/80 shadow-soft-md p-6 sm:p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-temple-900">Thank you! Attempt {progress?.attempts} submitted 🙏</h2>
          <p className="text-sm text-temple-600 leading-relaxed">
            You have {left} attempt{left === 1 ? '' : 's'} left. Your score and the correct answers will be shown after your final attempt
            {quiz.closesAt ? `, or when the quiz closes on ${formatWhen(quiz.closesAt)}` : ''}.
          </p>
        </div>
        {error && <Notice type="error">{error}</Notice>}
        <div className="space-y-2 pt-1">
          {open && left > 0 && <PrimaryButton onClick={onRetake}><RotateCcw className="w-4 h-4" /> Retake now</PrimaryButton>}
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-cream-300 bg-white text-sm font-semibold text-temple-800 hover:bg-cream-100 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-gold-500" /> Finish and see my results
          </button>
          <button type="button" onClick={onBack} className="w-full py-2 text-xs font-medium text-temple-500 hover:text-temple-800 cursor-pointer">
            Back to quizzes
          </button>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 bg-temple-900/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="finish-title">
          <div className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 space-y-4 shadow-soft-lg border border-cream-200">
            <h3 id="finish-title" className="font-display text-2xl font-bold text-temple-900">Finish this quiz?</h3>
            <p className="text-sm text-temple-600">You will see your results now, and your remaining {left === 1 ? 'attempt' : `${left} attempts`} will no longer be available.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm(false)} disabled={busy} className="w-1/2 py-2.5 rounded-xl border border-cream-300 bg-white text-sm font-medium cursor-pointer disabled:opacity-50">
                Not yet
              </button>
              <button type="button" onClick={finish} disabled={busy} className="w-1/2 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold cursor-pointer disabled:opacity-70">
                {busy && <Spinner />} Finish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsLoader({ quiz, user, onBack, onScore }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let alive = true;
    fetchMyResults(user.uid, quiz)
      .then((r) => {
        if (!alive) return;
        setState({ loading: false, ...r });
        if (r.counted) onScore?.(r.counted.score);
      })
      .catch(() => alive && setState({ loading: false, failed: true }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.id, user.uid]);

  if (state.loading) return <FullScreenLoader label="Loading your results…" />;
  if (state.failed || !state.key || !state.counted) {
    return (
      <div className={`max-w-md w-full mx-auto flex flex-col justify-center gap-4 ${SCREEN_HEIGHT.portal}`}>
        <Notice type={state.failed ? 'error' : 'info'}>
          {state.failed
            ? 'Your results could not be loaded right now. Please check your connection and try again.'
            : 'Your results are not available yet. They appear after your final attempt or when the quiz closes.'}
        </Notice>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-temple-600 hover:text-temple-900 cursor-pointer">
          <Hourglass className="w-4 h-4" /> Back to quizzes
        </button>
      </div>
    );
  }
  return <QuizResults quiz={quiz} attempts={state.attempts} counted={state.counted} answerKey={state.key} onBack={onBack} />;
}

export function useQuizSummary(quizzes, progress) {
  return useMemo(() => {
    if (!quizzes || !progress) return null;
    const now = new Date();
    const states = quizzes.map((q) => quizState(q, progress[q.id], now));
    return {
      open: states.filter((s) => s === 'not-attempted' || s === 'in-progress').length,
      completed: states.filter((s) => s === 'completed').length,
      total: quizzes.length,
    };
  }, [quizzes, progress]);
}
