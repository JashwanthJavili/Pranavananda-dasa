import React from 'react';
import {
  BookOpen, ChevronRight, UserPen, Clock, ArrowRight, CheckCircle2, Info,
} from 'lucide-react';
import { formatWhen } from '../../quiz/quizModel';
import { useOpenHelp } from './helpContext';

export const EDIT_DETAILS_CATEGORY = 'Edit my profile details';

/** "Want to change something?" note with a button that opens Need help, ready to ask for the change. */
function EditDetailsNote({ compact = false }) {
  const openHelp = useOpenHelp();
  const ask = () => openHelp({ category: EDIT_DETAILS_CATEGORY });
  if (compact) {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-gold-200 bg-gold-50/70 px-4 py-3">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-gold-600" />
        <p className="text-xs sm:text-sm text-temple-700 leading-relaxed">
          <span className="font-semibold text-temple-900">Note: </span>
          Would you like to change any of your details?{' '}
          <button type="button" onClick={ask} className="font-semibold text-saffron-700 hover:underline underline-offset-2 cursor-pointer">
            Kindly request it through Need help.
          </button>
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-3xl border border-saffron-200 bg-saffron-50/70 px-4 sm:px-5 py-4">
      <span className="shrink-0 w-10 h-10 rounded-2xl bg-white border border-saffron-200 flex items-center justify-center text-saffron-600">
        <UserPen className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-temple-900">Want to edit your details?</p>
        <p className="text-xs text-temple-600 leading-relaxed">
          Details cannot be changed here directly. Kindly send a request through <strong>Need help</strong> and tell us what
          should be changed. The Gita for Youth team will update it for you.
        </p>
      </div>
      <button
        type="button"
        onClick={ask}
        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold shadow-soft cursor-pointer"
      >
        <UserPen className="w-4 h-4" /> Request an edit
      </button>
    </div>
  );
}

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'Seeker';

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-display text-xl sm:text-2xl font-bold text-temple-900">{children}</h3>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
/** Dashboard quiz card: the quiz to take now (or the next one to open) and progress so far. */
function QuizCard({ summary, onOpen, onStartQuiz }) {
  if (!summary) return <div className="h-44 rounded-3xl bg-cream-200/70 animate-pulse" />;
  const { next, upcoming, completed, total } = summary;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const when = (v) => formatWhen(v).replace(/,? \d{4}/, ''); // year is obvious here

  return (
    <section className="rounded-3xl bg-cream-50 border border-cream-200 shadow-soft overflow-hidden">
      <div className="flex items-center gap-3 px-5 sm:px-6 pt-5">
        <div className="w-10 h-10 rounded-2xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-700">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-temple-900">Weekly quiz</h3>
          <p className="text-xs text-temple-500">Reflect on what you have learnt</p>
        </div>
        <button type="button" onClick={() => onOpen('quizzes')} className="inline-flex items-center gap-0.5 text-xs font-semibold text-saffron-700 hover:text-saffron-800 cursor-pointer">
          All quizzes <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 sm:p-6 pt-4 space-y-4">
        {next ? (
          <div className="rounded-2xl bg-gradient-to-br from-saffron-50 to-gold-50 border border-saffron-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-saffron-700">
                {next.weekNumber ? `Week ${next.weekNumber} · ` : ''}Open now
              </p>
              <p className="font-display text-xl font-bold text-temple-900 leading-snug">{next.title}</p>
              {next.closesAt && (
                <p className="flex items-center gap-1.5 text-xs text-temple-600">
                  <Clock className="w-3.5 h-3.5" /> Closes {when(next.closesAt)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onStartQuiz(next.id)}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold shadow-soft cursor-pointer"
            >
              Start quiz <ArrowRight className="w-4 h-4" />
            </button>
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
    <div className="space-y-5 sm:space-y-6 animate-fadeIn">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl border border-gold-200/80 bg-gradient-to-br from-cream-50 via-saffron-50 to-gold-100 p-6 sm:p-8 shadow-soft-md">
        <div aria-hidden className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gold-200/40 blur-2xl" />
        <div className="relative space-y-3">
          <p className="text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-saffron-700">Hare Krishna</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-temple-900 leading-tight">
            Welcome, {firstName(profile.fullName)}
          </h2>
          <p className="text-sm text-temple-600 max-w-xl leading-relaxed">
            We are glad to have you with Gita for Youth.
          </p>
        </div>
      </section>

      <QuizCard summary={quizSummary} onOpen={onOpen} onStartQuiz={onStartQuiz} />

      <EditDetailsNote compact />
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

function DetailGroup({ title, rows }) {
  const visible = rows.filter(([, v]) => v);
  if (!visible.length) return null;
  return (
    <section className="rounded-3xl bg-cream-50 border border-cream-200 shadow-soft overflow-hidden">
      <h4 className="px-5 sm:px-6 pt-5 pb-3 text-xs font-semibold tracking-[0.16em] uppercase text-saffron-700">{title}</h4>
      <dl className="divide-y divide-cream-200">
        {visible.map(([label, value]) => (
          <div key={label} className="px-5 sm:px-6 py-3 grid grid-cols-1 sm:grid-cols-3 gap-0.5 sm:gap-4">
            <dt className="text-xs sm:text-sm text-temple-500">{label}</dt>
            <dd className="sm:col-span-2 text-sm font-medium text-temple-900 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ProfileView({ profile }) {
  const p = profile;
  const occupation = p.occupation === 'Other' && p.otherOccupation ? `Other (${p.otherOccupation})` : p.occupation;
  const education = p.education === 'Other' && p.otherEducation ? `Other (${p.otherEducation})` : p.education;
  const source = p.sourceOfDiscovery === 'Others' && p.sourceOfDiscoveryOther ? `Others (${p.sourceOfDiscoveryOther})` : p.sourceOfDiscovery;

  return (
    <div className="space-y-5 animate-fadeIn">
      <SectionTitle>My Profile</SectionTitle>
      <p className="text-xs sm:text-sm text-temple-500 -mt-2">These are the details you shared when you registered.</p>
      <EditDetailsNote />
      <DetailGroup
        title="Registration"
        rows={[
          ['Registration ID', p.registrationId],
          ['Status', p.status],
          ['Registered on', formatDate(p.createdAt)],
          ['Program', p.program],
        ]}
      />
      <DetailGroup
        title="Personal"
        rows={[
          ['Full name', p.fullName],
          ['Age', p.age],
          ['Gender', p.gender],
          ['Education', education],
          ['Occupation', occupation],
        ]}
      />
      <DetailGroup
        title="Contact"
        rows={[
          ['Email', p.email],
          ['Mobile', p.mobile ? `${p.countryCode || '+91'} ${p.mobile}` : ''],
          ['Current residence', p.currentResidence || p.city],
          ['Address', p.fullAddress || p.area],
          ['Pincode', p.pincode],
        ]}
      />
      <DetailGroup
        title="Reflections"
        rows={[
          ['Question for Pranavananda Prabhu', p.questionForPranavanandaPrabhu],
          ['Inspiration to join', p.inspirationToJoin],
          ['Hoped-for takeaway', p.takeawayAspiration],
          ['How you heard about us', source],
        ]}
      />
    </div>
  );
}
