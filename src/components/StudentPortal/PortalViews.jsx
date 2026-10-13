import React from 'react';
import {
  BookOpen, ChevronRight, UserPen, Clock, ArrowRight, CheckCircle2,
  Mail, Phone, MapPin, Home, Hash, GraduationCap, Briefcase, Cake, User, CalendarDays,
  HelpCircle, Heart, Target, Compass,
} from 'lucide-react';
import { formatWhen } from '../../quiz/quizModel';
import { savedDraft } from '../../quiz/studentQuizzes';
import { useOpenHelp } from './helpContext';

export const EDIT_DETAILS_CATEGORY = 'Edit my profile details';

/** "Want to change something?" note with a button that opens Contact Us, ready to ask for the change. */
function EditDetailsNote() {
  const openHelp = useOpenHelp();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gold-200 bg-gold-50/70 px-4 py-3">
      <UserPen className="w-4 h-4 shrink-0 text-saffron-600" />
      <p className="flex-1 min-w-0 text-xs sm:text-sm text-temple-700 leading-relaxed">
        Need to change a detail?{' '}
        <button
          type="button"
          onClick={() => openHelp({ category: EDIT_DETAILS_CATEGORY })}
          className="font-semibold text-saffron-700 hover:underline underline-offset-2 cursor-pointer"
        >
          Request it through Contact Us
        </button>
      </p>
    </div>
  );
}

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'Seeker';

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
/** Small progress ring: quizzes taken out of all quizzes. */
function ProgressRing({ done, total }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const part = total ? done / total : 0;
  return (
    <div className="relative w-11 h-11 shrink-0" role="img" aria-label={`${done} of ${total} quizzes taken`}>
      <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-cream-200" />
        <circle
          cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" strokeLinecap="round"
          className="stroke-saffron-500 transition-all"
          strokeDasharray={c} strokeDashoffset={c * (1 - part)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-temple-900 tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

/** Dashboard quiz card: a short look at the open quizzes; the Quizzes section has everything else. */
const SHOW_OPEN = 2;
function QuizCard({ summary, registrationId, onOpen, onStartQuiz }) {
  if (!summary) return <div className="h-36 rounded-3xl bg-cream-200/70 animate-pulse" />;
  const { actionable, upcoming, completed, total } = summary;
  const when = (v) => formatWhen(v).replace(/,? \d{4}/, ''); // year is obvious here
  const shown = actionable.slice(0, SHOW_OPEN);
  const more = actionable.length - shown.length;

  return (
    <section className="rounded-3xl bg-white border border-cream-200 shadow-soft overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-saffron-50/80 via-cream-50 to-gold-50/80 border-b border-cream-200">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 text-white flex items-center justify-center shadow-soft">
          <BookOpen className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base sm:text-lg font-bold text-temple-900 leading-tight">Weekly Quiz</h3>
          <p className="text-[11px] text-temple-500">Reflect on what you have learnt</p>
        </div>
        {total > 0 && <ProgressRing done={completed} total={total} />}
      </div>

      {/* Open quizzes (short) */}
      <div className="p-3 sm:p-4 space-y-2">
        {shown.length > 0 ? shown.map((q) => {
          // Started on this device but not submitted: Resume goes straight back to the questions
          const draft = savedDraft(q, registrationId, summary.progress?.[q.id]);
          return (
          <div
            key={q.id}
            className="relative flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50/60 pl-4 pr-3 py-3 overflow-hidden"
          >
            <span aria-hidden className="absolute left-0 inset-y-0 w-1 bg-gradient-to-b from-saffron-400 to-gold-400" />
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-saffron-700">
                {q.weekNumber ? `Week ${q.weekNumber}` : 'Quiz'}
              </p>
              <p className="text-sm sm:text-base font-semibold text-temple-900 leading-snug truncate">{q.title}</p>
              {draft ? (
                <p className="text-[11px] font-medium text-saffron-700">In progress: {draft.answered} of {draft.total} answered</p>
              ) : q.closesAt && (
                <p className="flex items-center gap-1 text-[11px] text-temple-500">
                  <Clock className="w-3 h-3 shrink-0" /> Closes {when(q.closesAt)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onStartQuiz(q.id, draft ? 'play' : undefined)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold shadow-soft transition cursor-pointer"
            >
              {draft ? 'Resume' : 'Start'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          );
        }) : (
          <div className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50/60 px-3.5 py-3">
            <CheckCircle2 className={`w-5 h-5 shrink-0 ${total ? 'text-emerald-600' : 'text-temple-300'}`} />
            <p className="text-xs sm:text-sm text-temple-700">
              {total ? "You're all caught up. Thank you 🙏" : 'The first quiz will appear here soon.'}
              {upcoming?.opensAt && (
                <span className="block text-[11px] text-temple-500">
                  Next quiz{upcoming.weekNumber ? ` (Week ${upcoming.weekNumber})` : ''} opens {when(upcoming.opensAt)}
                </span>
              )}
            </p>
          </div>
        )}
        {more > 0 && <p className="px-1 text-[11px] font-semibold text-saffron-700">+{more} more open in Quizzes</p>}
      </div>

      {/* Everything else lives in Quizzes */}
      <button
        type="button"
        onClick={() => onOpen('quizzes')}
        className="group w-full flex items-center justify-between gap-2 border-t border-cream-200 px-4 sm:px-5 py-2.5 text-xs text-temple-600 hover:bg-cream-50 transition cursor-pointer"
      >
        <span>Scores, answers and all quizzes are in the <strong className="text-saffron-700">Quizzes</strong> section</span>
        <ChevronRight className="w-4 h-4 shrink-0 text-saffron-600 transition-transform group-hover:translate-x-0.5" />
      </button>
    </section>
  );
}

export function DashboardView({ profile, quizSummary, onOpen, onStartQuiz }) {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl border border-gold-200/80 bg-gradient-to-br from-cream-50 via-saffron-50 to-gold-100 p-5 sm:p-8 shadow-soft-md">
        <div aria-hidden className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gold-200/40 blur-2xl" />
        <div className="relative space-y-2 sm:space-y-3">
          <p className="text-[11px] sm:text-sm font-medium tracking-[0.18em] uppercase text-saffron-700">Hare Krishna</p>
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-temple-900 leading-tight">
            Welcome, {firstName(profile.fullName)}
          </h2>
          <p className="text-sm text-temple-600 max-w-xl leading-relaxed">
            We are glad to have you with Gita for Youth.
          </p>
        </div>
      </section>

      <QuizCard summary={quizSummary} registrationId={profile?.registrationId} onOpen={onOpen} onStartQuiz={onStartQuiz} />

      <EditDetailsNote />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile (read-only)
// ---------------------------------------------------------------------------
const formatDate = (value) => {
  try {
    const d = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    return d && !isNaN(d) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  } catch (e) {
    return '';
  }
};

const initials = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
  .map((w) => w[0].toUpperCase()).join('') || '🙏';

/** A card of short details: icon, small label, value. Empty values are left out. */
function InfoCard({ title, rows }) {
  const visible = rows.filter(([, , v]) => v);
  if (!visible.length) return null;
  return (
    <section className="rounded-2xl bg-cream-50 border border-cream-200 shadow-soft">
      <h4 className="px-4 sm:px-5 pt-4 pb-1 text-[11px] font-bold tracking-[0.16em] uppercase text-saffron-700">{title}</h4>
      <dl className="px-4 sm:px-5 pb-2">
        {visible.map(([Icon, label, value]) => (
          <div key={label} className="flex items-start gap-3 py-2.5 border-b border-cream-200/80 last:border-0">
            <span className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-saffron-50 border border-saffron-100 flex items-center justify-center text-saffron-600">
              <Icon className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <dt className="text-[11px] text-temple-500">{label}</dt>
              <dd className="text-sm font-medium text-temple-900 break-words">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ProfileView({ profile }) {
  const p = profile;
  const occupation = p.occupation === 'Other' && p.otherOccupation ? p.otherOccupation : p.occupation;
  const education = p.education === 'Other' && p.otherEducation ? p.otherEducation : p.education;
  const source = p.sourceOfDiscovery === 'Others' && p.sourceOfDiscoveryOther ? p.sourceOfDiscoveryOther : p.sourceOfDiscovery;
  const joined = formatDate(p.createdAt);
  const reflections = [
    [HelpCircle, 'My question for Pranavananda Prabhu', p.questionForPranavanandaPrabhu],
    [Heart, 'What inspired me to join', p.inspirationToJoin],
    [Target, 'What I hope to take away', p.takeawayAspiration],
    [Compass, 'How I heard about us', source],
  ].filter(([, , v]) => v);

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn">
      {/* Who */}
      <section className="relative overflow-hidden rounded-3xl border border-gold-200/80 bg-gradient-to-br from-cream-50 via-saffron-50 to-gold-100 p-5 sm:p-7 shadow-soft-md">
        <div aria-hidden className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gold-200/40 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-saffron-400 to-gold-500 text-white flex items-center justify-center font-display text-xl sm:text-2xl font-bold shadow-soft ring-4 ring-white/70">
            {initials(p.fullName)}
          </div>
          <div className="min-w-0 space-y-1.5">
            <h2 className="font-display text-xl sm:text-3xl font-bold text-temple-900 leading-tight break-words">{p.fullName || 'Devotee'}</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {p.registrationId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-saffron-200 px-2.5 py-0.5 text-xs font-bold text-temple-900 tabular-nums">
                  <Hash className="w-3 h-3 text-saffron-600" />{p.registrationId}
                </span>
              )}
            </div>
            {(joined || p.program) && (
              <p className="flex items-center gap-1.5 text-xs text-temple-600">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span className="min-w-0 truncate">{[p.program, joined && `Joined ${joined}`].filter(Boolean).join(' · ')}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Details */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 items-start">
        <InfoCard
          title="Contact"
          rows={[
            [Phone, 'Mobile', p.mobile ? `${p.countryCode || '+91'} ${p.mobile}` : ''],
            [Mail, 'Email', p.email],
            [MapPin, 'Lives in', p.currentResidence || p.city],
            [Home, 'Address', [p.fullAddress || p.area, p.pincode].filter(Boolean).join(' – ')],
          ]}
        />
        <InfoCard
          title="About me"
          rows={[
            [Cake, 'Age', p.age],
            [User, 'Gender', p.gender],
            [GraduationCap, 'Education', education],
            [Briefcase, 'Occupation', occupation],
          ]}
        />
      </div>

      {/* Reflections */}
      {reflections.length > 0 && (
        <section className="rounded-2xl bg-cream-50 border border-cream-200 shadow-soft p-4 sm:p-5 space-y-3">
          <h4 className="text-[11px] font-bold tracking-[0.16em] uppercase text-saffron-700">My reflections</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {reflections.map(([Icon, label, value]) => (
              <div key={label} className="rounded-xl bg-white/70 border border-cream-200 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-temple-500">
                  <Icon className="w-3.5 h-3.5 text-saffron-600" /> {label}
                </p>
                <p className="mt-1 text-sm text-temple-800 leading-relaxed whitespace-pre-wrap break-words">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <EditDetailsNote />
    </div>
  );
}
