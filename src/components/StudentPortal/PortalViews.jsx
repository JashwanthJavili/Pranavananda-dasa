import React, { useState } from 'react';
import {
  MessageCircle, BookOpen, Copy, Check, User, ChevronRight, Sparkles,
} from 'lucide-react';

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'Seeker';

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-display text-xl sm:text-2xl font-bold text-temple-900">{children}</h3>
      {action}
    </div>
  );
}

function RegistrationChip({ id }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      navigator.clipboard?.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {}
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy registration ID"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-gold-200 text-xs font-semibold text-temple-800 tracking-wide hover:border-gold-300 cursor-pointer"
    >
      <span className="text-temple-500 font-medium">Reg. ID</span>
      {id}
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-temple-400" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export function DashboardView({ profile, whatsapp, quizzes, onOpen }) {
  const quizCount = quizzes?.length || 0;
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
            Your journey with Gita for Youth begins here. Join the community, take part in quizzes and keep your details handy.
          </p>
          <RegistrationChip id={profile.registrationId} />
        </div>
      </section>

      {/* Verse */}
      <section className="rounded-3xl bg-temple-900 text-cream-100 p-6 sm:p-7 shadow-soft-lg">
        <p className="font-display text-lg sm:text-xl italic leading-relaxed text-gold-200">
          “You have a right to perform your prescribed duty, but you are not entitled to the fruits of action.”
        </p>
        <p className="mt-3 text-xs tracking-widest uppercase text-gold-400">Bhagavad Gita 2.47</p>
      </section>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        {/* WhatsApp */}
        <section className="rounded-3xl bg-cream-50 border border-cream-200 p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-temple-900">Community &amp; Help</h3>
              <p className="text-xs text-temple-500">Updates, session links and support</p>
            </div>
          </div>
          {whatsapp === undefined ? (
            <div className="h-11 rounded-xl bg-cream-200 animate-pulse" />
          ) : whatsapp?.eligible && whatsapp.waInviteLink ? (
            <a
              href={whatsapp.waInviteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-soft transition"
            >
              <MessageCircle className="w-4 h-4" />
              {whatsapp.buttonText || 'Join Our WhatsApp Community'}
            </a>
          ) : (
            <p className="text-xs sm:text-sm text-temple-600 bg-cream-100 border border-cream-200 rounded-xl px-3.5 py-3">
              The community link will appear here once it's available. For help, please reach out to the Gita for Youth team.
            </p>
          )}
        </section>

        {/* Quizzes summary */}
        <button
          type="button"
          onClick={() => onOpen('quizzes')}
          className="text-left rounded-3xl bg-cream-50 border border-cream-200 p-5 sm:p-6 shadow-soft space-y-4 hover:border-gold-300 hover:shadow-soft-md transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-temple-900">Quizzes</h3>
              <p className="text-xs text-temple-500">
                {quizzes === undefined ? 'Loading…' : quizCount ? `${quizCount} available` : 'None available yet'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-temple-400" />
          </div>
          <p className="text-xs sm:text-sm text-temple-600">Reflect on what you learn with short quizzes after each session.</p>
        </button>
      </div>

      <button
        type="button"
        onClick={() => onOpen('profile')}
        className="w-full flex items-center gap-3 rounded-2xl bg-white/70 border border-cream-200 px-4 py-3.5 text-left hover:border-gold-300 transition cursor-pointer"
      >
        <User className="w-5 h-5 text-saffron-600" />
        <span className="flex-1 text-sm font-medium text-temple-800">View your registration details</span>
        <ChevronRight className="w-4 h-4 text-temple-400" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------
export function QuizzesView({ quizzes, error }) {
  return (
    <div className="space-y-5 animate-fadeIn">
      <SectionTitle>Quizzes</SectionTitle>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : quizzes === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-32 rounded-3xl bg-cream-200 animate-pulse" />)}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gold-300 bg-cream-50 px-6 py-12 sm:py-16 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gold-100 border border-gold-200 flex items-center justify-center text-gold-600">
            <Sparkles className="w-7 h-7" />
          </div>
          <h4 className="font-display text-2xl font-bold text-temple-900">No quizzes available yet</h4>
          <p className="text-sm text-temple-600 max-w-sm mx-auto">Please check back soon. New quizzes will appear here as the sessions progress.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map((q) => (
            <article key={q.id} className="rounded-3xl bg-cream-50 border border-cream-200 p-5 shadow-soft space-y-2">
              <h4 className="font-semibold text-temple-900">{q.title || 'Untitled quiz'}</h4>
              {q.description && <p className="text-sm text-temple-600">{q.description}</p>}
              <p className="text-xs text-temple-500">
                {Array.isArray(q.questions) ? `${q.questions.length} questions` : 'Opens soon'}
              </p>
            </article>
          ))}
        </div>
      )}
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
      <p className="text-xs sm:text-sm text-temple-500 -mt-2">
        These are the details from your registration. To correct anything, please contact the Gita for Youth team.
      </p>
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
