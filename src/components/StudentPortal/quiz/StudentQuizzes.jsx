import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, CalendarClock, ListChecks, RotateCcw, Trophy, Lock, PlayCircle, Clock, CheckCircle2, Hourglass,
} from 'lucide-react';
import QuizPlayer, { SCREEN_HEIGHT } from './QuizPlayer';
import QuizResults from './QuizResults';
import { ASK_CONFIRM_DETAILS, FIRST_QUIZ_STEP } from '../portalRoute';
import RateQuiz from './RateQuiz';
import { Notice, PrimaryButton, FullScreenLoader, Spinner } from '../ui';
import { availability, formatWhen, toDate } from '../../../quiz/quizModel';
import {
  resultsDue, fetchMyResults, submitQuizAttempt, finishQuizEarly, loadAnswerDraft, saveAnswerDraft,
  clearAnswerDraft, quizErrorMessage, loadElapsed, saveElapsed, explainSubmitFailure, savedDraft,
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

/** Which quiz pages make sense for this student right now (anything else goes back to the list). */
function allowedSteps(quiz, progress) {
  const state = quizState(quiz, progress);
  const canAnswer = availability(quiz) === 'open' && (state === 'not-attempted' || state === 'in-progress');
  const steps = canAnswer ? [...(ASK_CONFIRM_DETAILS ? ['confirm'] : []), 'instructions', 'play'] : [];
  if (state === 'in-progress') steps.push('submitted', 'results');
  if (state === 'completed') steps.push('results');
  return steps;
}

/**
 * The student's weekly quizzes: list, confirm details, instructions, answer, submit and results.
 * Each page has its own address (#student-portal/quizzes/{quizId}/{step}), so a refresh stays on it.
 *  progress: { [quizId]: progress } for this student
 *  onReload(): refreshes quizzes and progress
 *  route / navigate: from usePortalRoute
 */
export default function StudentQuizzes({ user, profile, quizzes, progress, error, onReload, onActiveChange, route, navigate }) {
  const [scores, setScores] = useState({}); // quizId -> counted score, for completed quizzes
  const registrationId = profile.registrationId;
  const { quizId, step } = route;
  const quiz = quizId && quizzes ? quizzes.find((q) => q.id === quizId) || null : null;
  // While a submission or "finish" is being saved, progress changes before the next page opens
  const moving = useRef(false);

  const go = useCallback((id = null, next = null, opts) => {
    navigate('quizzes', id, next, opts);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);
  const back = useCallback(() => go(), [go]);

  useEffect(() => { onActiveChange?.(step === 'play'); }, [step, onActiveChange]);

  // An address for a quiz that is gone, or a page that no longer applies (e.g. answering a
  // quiz that has closed): back to the list, without leaving that address in the history
  useEffect(() => {
    if (!quizId || !quizzes || !progress || moving.current) return;
    if (!quiz || !allowedSteps(quiz, progress[quiz.id]).includes(step)) navigate('quizzes', null, null, { replace: true });
  }, [quizId, step, quiz, quizzes, progress, navigate]);

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

  if (error) return <Notice type="error">{error}</Notice>;
  if (quizzes === undefined || progress === undefined) return <ListSkeleton />;

  // Saved, then open the next page in place of the one just finished (Back skips it)
  const settleTo = async (next) => {
    moving.current = true;
    try {
      await onReload?.();
    } finally {
      moving.current = false;
    }
    go(quiz.id, next, { replace: true });
  };

  if (quiz && allowedSteps(quiz, progress[quiz.id]).includes(step)) {
    // Step 1: the student confirms these are their own details. Step 2: instructions.
    if (step === 'confirm') {
      return <ConfirmDetails quiz={quiz} profile={profile} onBack={back} onConfirm={() => go(quiz.id, 'instructions')} />;
    }
    if (step === 'instructions') {
      return <QuizIntro quiz={quiz} progress={progress[quiz.id]} registrationId={registrationId} onBack={ASK_CONFIRM_DETAILS ? () => go(quiz.id, 'confirm', { replace: true }) : back} onBegin={() => go(quiz.id, 'play')} />;
    }
    if (step === 'play') {
      return (
        <PlayQuiz
          quiz={quiz}
          user={user}
          registrationId={registrationId}
          progress={progress[quiz.id]}
          onExit={back}
          onSubmitted={(newProgress) => settleTo(resultsDue(quiz, newProgress) ? 'results' : 'submitted')}
        />
      );
    }
    if (step === 'submitted') {
      return (
        <SubmittedScreen
          quiz={quiz}
          progress={progress[quiz.id]}
          registrationId={registrationId}
          onBack={back}
          onRetake={() => go(quiz.id, FIRST_QUIZ_STEP)}
          onResume={() => go(quiz.id, 'play')}
          onFinished={() => settleTo('results')}
        />
      );
    }
    if (step === 'results') {
      return <ResultsLoader quiz={quiz} user={user} registrationId={registrationId} onBack={back} onScore={(sc) => setScores((m) => ({ ...m, [quiz.id]: sc }))} />;
    }
  }
  // A page that no longer applies: the list shows while the address is corrected
  if (quizId && moving.current && quiz) return <ListSkeleton />;

  // List
  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="space-y-1">
        <h3 className="font-display text-xl sm:text-3xl font-bold text-temple-900">Weekly Gita Quizzes</h3>
        <p className="text-xs sm:text-sm text-temple-500">A short quiz each week to reflect on what you have learnt. Take your time; there is no time limit.</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gold-300 bg-cream-50 px-6 py-12 sm:py-16 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gold-100 border border-gold-200 flex items-center justify-center text-gold-600">
            <Sparkles className="w-7 h-7" />
          </div>
          <h4 className="font-display text-xl sm:text-2xl font-bold text-temple-900">No quizzes yet</h4>
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
              draft={savedDraft(q, registrationId, progress[q.id])}
              onStart={() => go(q.id, FIRST_QUIZ_STEP)}
              onResume={() => go(q.id, 'play')}
              onResults={() => go(q.id, 'results')}
              onSubmitted={() => go(q.id, 'submitted')}
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

function QuizCard({ quiz, progress, score, draft, onStart, onResume, onResults, onSubmitted }) {
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
  // Answers saved on this device for an attempt not submitted yet: go straight back to them
  const resume = draft && availability(quiz, now) === 'open' && (state === 'not-attempted' || state === 'in-progress') ? draft : null;
  const chip = STATE_CHIP[state];
  const max = quiz.maxAttempts || 1;
  const qCount = quiz.questionCount || quiz.questions?.length || 0;
  return (
    <article className="flex flex-col rounded-3xl bg-cream-50 border border-cream-200 shadow-soft hover:shadow-soft-md hover:border-gold-300 transition p-5 sm:p-6 gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-temple-900 text-gold-200 text-[11px] font-semibold tracking-wide">
          {quiz.weekNumber ? `Week ${quiz.weekNumber}` : 'Quiz'}
        </span>
        {/* Started but not submitted: no "Not attempted yet" label next to Resume */}
        {!(resume && state === 'not-attempted') && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${chip.cls}`}>
            {state === 'completed' && score?.total ? `${score.correct}/${score.total} · ${score.percent}%` : chip.text}
          </span>
        )}
      </div>
      <div className="space-y-1.5 flex-1">
        <h4 className="font-display text-lg sm:text-2xl font-bold text-temple-900 leading-snug">{quiz.title}</h4>
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
      {resume && (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-temple-600">
              <span>{state === 'in-progress' ? `Attempt ${resume.attempt}: answered` : 'Answered'} <strong className="text-temple-900">{resume.answered} of {resume.total}</strong> questions</span>
              <span className="font-semibold text-saffron-700 tabular-nums">{Math.round((resume.answered / (resume.total || 1)) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden" aria-hidden>
              <div className="h-full rounded-full bg-gradient-to-r from-saffron-400 to-saffron-600" style={{ width: `${(resume.answered / (resume.total || 1)) * 100}%` }} />
            </div>
          </div>
          <PrimaryButton onClick={onResume}><PlayCircle className="w-4 h-4" /> Resume quiz</PrimaryButton>
          {state === 'in-progress' && (
            <button type="button" onClick={onSubmitted} className="w-full py-1.5 text-xs font-medium text-temple-500 hover:text-temple-800 cursor-pointer">
              See earlier attempts and results
            </button>
          )}
        </div>
      )}
      {!resume && state === 'not-attempted' && (
        <PrimaryButton onClick={onStart}><PlayCircle className="w-4 h-4" /> Start quiz</PrimaryButton>
      )}
      {!resume && state === 'in-progress' && (
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

/** Before a quiz: the student checks the registration their score will be saved under. */
function ConfirmDetails({ quiz, profile, onBack, onConfirm }) {
  const [agreed, setAgreed] = useState(false);
  const mobile = profile.mobileNumberClean || profile.mobile;
  const rows = [
    ['Name', profile.fullName],
    ['Registration ID', profile.registrationId],
    ['Email', profile.email],
    ['Mobile', mobile ? `${profile.countryCode || '+91'} ${mobile}` : ''],
    ['City', profile.currentResidence || profile.city],
  ].filter(([, v]) => v);

  // Centred in the space left by the header and tab bar, without making the page scroll
  return (
    <div className="max-w-md w-full mx-auto flex flex-col justify-center animate-fadeIn min-h-[calc(100dvh-12.5rem)] sm:min-h-[calc(100dvh-14.5rem)]">
      <section className="rounded-3xl bg-cream-50 border border-gold-200/80 shadow-soft-md p-6 sm:p-7 space-y-5">
        <div className="text-center space-y-1">
          <h2 className="font-display text-xl sm:text-3xl font-bold text-temple-900">Confirm your details</h2>
          <p className="text-xs sm:text-sm text-temple-500">{quiz.weekNumber ? `Week ${quiz.weekNumber} · ` : ''}{quiz.title}</p>
        </div>

        <dl className="rounded-2xl bg-white border border-cream-200 divide-y divide-cream-200">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-xs text-temple-500 shrink-0">{k}</dt>
              <dd className={`text-sm text-right break-all ${k === 'Registration ID' ? 'font-mono font-bold text-saffron-700' : 'font-semibold text-temple-900'}`}>{v}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs text-temple-600 leading-relaxed text-center">
          Your score will be saved under these details, so kindly make sure everything is correct.
          If anything is wrong, please let us know through <span className="font-semibold text-temple-800">Contact Us</span> at the top.
        </p>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 shrink-0 accent-saffron-600 cursor-pointer"
          />
          <span className="text-sm text-temple-800">Yes, these are my details.</span>
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="py-3 rounded-xl border border-cream-300 bg-white text-sm font-semibold text-temple-700 hover:bg-cream-100 cursor-pointer"
          >
            Go back
          </button>
          <PrimaryButton onClick={onConfirm} disabled={!agreed} className="!py-3">Continue</PrimaryButton>
        </div>
      </section>
    </div>
  );
}

/** Instructions before answering, styled like the confirm-details card before it. */
function QuizIntro({ quiz, progress, registrationId, onBack, onBegin }) {
  const n = (progress?.attempts || 0) + 1;
  const max = quiz.maxAttempts || 1;
  const hasDraft = Object.keys(loadAnswerDraft(quiz.id, registrationId, n)).length > 0;
  const instructionLines = (quiz.instructions || '')
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*|^\d+[.)]\s*/, ''))
    .filter(Boolean);
  const rows = [
    ['No of Questions', quiz.questionCount || quiz.questions?.length || 0],
    ['Attempts Allowed', max === 1 ? '1' : `${max} (this is attempt ${n})`],
    ['Time Limit', 'No time limit'],
    quiz.closesAt && ['Submission Deadline', formatWhen(quiz.closesAt)],
  ].filter(Boolean);

  return (
    <div className="max-w-md w-full mx-auto flex flex-col justify-center animate-fadeIn min-h-[calc(100dvh-12.5rem)] sm:min-h-[calc(100dvh-14.5rem)]">
      <section className="rounded-3xl bg-cream-50 border border-gold-200/80 shadow-soft-md p-6 sm:p-7 space-y-5">
        <div className="text-center space-y-1">
          <h2 className="font-display text-xl sm:text-3xl font-bold text-temple-900">Before you begin</h2>
          <p className="text-xs sm:text-sm text-temple-500">{quiz.weekNumber ? `Week ${quiz.weekNumber} · ` : ''}{quiz.title}</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-temple-900">Quiz Guide</h3>
          <dl className="rounded-2xl bg-white border border-cream-200 divide-y divide-cream-200">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-xs text-temple-500 shrink-0">{k}</dt>
                <dd className="text-sm text-right font-semibold text-temple-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {instructionLines.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-temple-900">Instructions</h3>
            <ol className="text-xs sm:text-sm text-temple-600 leading-relaxed space-y-1 list-decimal pl-5">
              {instructionLines.map((line) => <li key={line}>{line}</li>)}
            </ol>
          </div>
        )}

        <div className={`grid gap-2.5 ${ASK_CONFIRM_DETAILS ? 'grid-cols-2' : ''}`}>
          {ASK_CONFIRM_DETAILS && (
            <button
              type="button"
              onClick={onBack}
              className="py-3 rounded-xl border border-cream-300 bg-white text-sm font-semibold text-temple-700 hover:bg-cream-100 cursor-pointer"
            >
              Go back
            </button>
          )}
          <PrimaryButton onClick={onBegin} className="!py-3">
            {hasDraft ? 'Continue quiz' : 'Begin quiz'}
          </PrimaryButton>
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
      fullScreen
    />
  );
}

function SubmittedScreen({ quiz, progress, registrationId, onBack, onRetake, onResume, onFinished }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const max = quiz.maxAttempts || 1;
  const left = max - (progress?.attempts || 0);
  const open = availability(quiz) === 'open';
  const draft = savedDraft(quiz, registrationId, progress); // a retake started but not submitted

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
          <h2 className="font-display text-xl sm:text-3xl font-bold text-temple-900">Thank you! Attempt {progress?.attempts} submitted 🙏</h2>
          <p className="text-sm text-temple-600 leading-relaxed">
            You have {left} attempt{left === 1 ? '' : 's'} left. Your score and the correct answers will be shown after your final attempt
            {quiz.closesAt ? `, or when the quiz closes on ${formatWhen(quiz.closesAt)}` : ''}.
          </p>
        </div>
        <RateQuiz quiz={quiz} registrationId={registrationId} />
        {error && <Notice type="error">{error}</Notice>}
        <div className="space-y-2 pt-1">
          {open && left > 0 && (draft
            ? <PrimaryButton onClick={onResume}><PlayCircle className="w-4 h-4" /> Resume retake ({draft.answered} of {draft.total} answered)</PrimaryButton>
            : <PrimaryButton onClick={onRetake}><RotateCcw className="w-4 h-4" /> Retake now</PrimaryButton>)}
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

function ResultsLoader({ quiz, user, registrationId, onBack, onScore }) {
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
  return (
    <QuizResults
      quiz={quiz}
      attempts={state.attempts}
      counted={state.counted}
      answerKey={state.key}
      onBack={onBack}
      extra={<RateQuiz quiz={quiz} registrationId={registrationId} className="max-w-sm w-full mx-auto" />}
    />
  );
}

export function useQuizSummary(quizzes, progress) {
  return useMemo(() => {
    if (!quizzes || !progress) return null;
    const now = new Date();
    const states = quizzes.map((q) => quizState(q, progress[q.id], now));
    const time = (v, none) => toDate(v)?.getTime() ?? none;
    // Every quiz the student can still take right now, closing soonest first (there may be more than one)
    const actionable = quizzes.filter((q, i) => states[i] === 'not-attempted' || states[i] === 'in-progress')
      .sort((a, b) => time(a.closesAt, Infinity) - time(b.closesAt, Infinity));
    const upcoming = quizzes.filter((q, i) => states[i] === 'upcoming')
      .sort((a, b) => time(a.opensAt, Infinity) - time(b.opensAt, Infinity))[0] || null;
    return {
      open: states.filter((s) => s === 'not-attempted' || s === 'in-progress').length,
      completed: states.filter((s) => s === 'completed' || s === 'in-progress').length,
      // Quizzes that have opened so far (taken, open now or missed)
      total: states.filter((s) => s !== 'upcoming').length,
      actionable,
      next: actionable[0] || null,
      upcoming,
      progress, // for "Resume" on the dashboard
    };
  }, [quizzes, progress]);
}
