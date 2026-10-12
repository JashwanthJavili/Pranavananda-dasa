import React from 'react';
import {
  BookOpen, ChevronRight, UserPen, Clock, ArrowRight, CheckCircle2,
  Mail, Phone, MapPin, Home, Hash, GraduationCap, Briefcase, Cake, User, CalendarDays,
  BadgeCheck, HelpCircle, Heart, Target, Compass,
} from 'lucide-react';
import { formatWhen } from '../../quiz/quizModel';
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
/** Dashboard quiz card: every quiz the student can still take right now, and progress so far. */
function QuizCard({ summary, onOpen, onStartQuiz }) {
  if (!summary) return <div className="h-44 rounded-3xl bg-cream-200/70 animate-pulse" />;
  const { actionable, upcoming, completed, total } = summary;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const when = (v) => formatWhen(v).replace(/,? \d{4}/, ''); // year is obvious here

  return (
    <section className="rounded-3xl bg-cream-50 border border-cream-200 shadow-soft overflow-hidden">
      <div className="flex items-center gap-3 px-4 sm:px-6 pt-4 sm:pt-5">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-700">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-temple-900">Weekly quiz{actionable.length > 1 ? 'zes' : ''}</h3>
          <p className="text-xs text-temple-500">Reflect on what you have learnt</p>
        </div>
        <button type="button" onClick={() => onOpen('quizzes')} className="inline-flex items-center gap-0.5 text-xs font-semibold text-saffron-700 hover:text-saffron-800 cursor-pointer">
          All quizzes <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 sm:p-6 pt-3 sm:pt-4 space-y-4">
        {actionable.length > 0 ? (
          <div className="space-y-3">
            {actionable.length > 1 && (
              <p className="text-xs font-semibold text-saffron-700">{actionable.length} quizzes open now</p>
            )}
            {actionable.map((q) => (
              <div key={q.id} className="rounded-2xl bg-gradient-to-br from-saffron-50 to-gold-50 border border-saffron-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-saffron-700">
                    {q.weekNumber ? `Week ${q.weekNumber} · ` : ''}Open now
                  </p>
                  <p className="font-display text-lg sm:text-xl font-bold text-temple-900 leading-snug">{q.title}</p>
                  {q.closesAt && (
                    <p className="flex items-center gap-1.5 text-xs text-temple-600">
                      <Clock className="w-3.5 h-3.5" /> Closes {when(q.closesAt)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onStartQuiz(q.id)}
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold shadow-soft cursor-pointer"
                >
                  Start quiz <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-cream-100 border border-cream-200 p-4 flex items-center gap-3">
            <CheckCircle2 className={`w-6 h-6 shrink-0 ${total ? 'text-emerald-600' : 'text-temple-300'}`} />
            <p className="text-sm text-temple-700">
              {total ? "You're all caught up. Thank you 🙏" : 'The first quiz will appear here soon.'}
              {upcoming?.opensAt && (
                <span className="block text-xs text-temple-500 mt-0.5">
                  Next quiz{upcoming.weekNumber ? ` (Week ${upcoming.weekNumber})` : ''} opens {when(upcoming.opensAt)}
                </span>
              )}
            </p>
          </div>
        )}

        {total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-temple-600">Your progress</span>
              <span className="font-semibold text-temple-900">{completed} of {total} quiz{total === 1 ? '' : 'zes'} taken</span>
            </div>
            <div className="h-2 rounded-full bg-cream-200 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-saffron-400 to-gold-400 transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}
      </div>
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

      <QuizCard summary={quizSummary} onOpen={onOpen} onStartQuiz={onStartQuiz} />

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
  const confirmed = /confirmed|active|approved/i.test(p.status || '');
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
              {p.status && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  confirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white/80 border-cream-300 text-temple-600'
                }`}
                >
                  {confirmed && <BadgeCheck className="w-3 h-3" />}{p.status}
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
