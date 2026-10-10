import React, { useState } from 'react';
import {
  MessageCircle, BookOpen, Copy, Check, User, ChevronRight, UserPen,
} from 'lucide-react';
import { useOpenHelp } from './helpContext';

export const EDIT_DETAILS_CATEGORY = 'Edit my profile details';

/** "Want to change something?" note with a button that opens Need help, ready to ask for the change. */
function EditDetailsNote({ compact = false }) {
  const openHelp = useOpenHelp();
  const ask = () => openHelp({ category: EDIT_DETAILS_CATEGORY });
  if (compact) {
    return (
      <p className="text-[11px] sm:text-xs text-temple-500 px-1">
        Would you like to change any of your details?{' '}
        <button type="button" onClick={ask} className="font-semibold text-saffron-700 hover:underline underline-offset-2 cursor-pointer">
          Kindly request it through Need help
        </button>
      </p>
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
export function DashboardView({ profile, whatsapp, quizSummary, onOpen }) {
  const quizLine = !quizSummary
    ? 'Loading…'
    : quizSummary.open
      ? `${quizSummary.open} quiz${quizSummary.open === 1 ? ' is' : 'zes are'} waiting for you`
      : quizSummary.completed
        ? `${quizSummary.completed} completed · thank you 🙏`
        : quizSummary.total
          ? 'The next quiz will open soon'
          : 'The first quiz will appear here soon';
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
            We are grateful to have you with Gita for Youth. Here you can join our community, take the weekly quiz and see your registration details.
          </p>
          <RegistrationChip id={profile.registrationId} />
        </div>
      </section>

      {/* Verse */}
      <figure className="relative overflow-hidden rounded-2xl border border-gold-200 bg-gradient-to-r from-cream-50 to-saffron-50/70 shadow-soft px-4 py-3 sm:px-5 sm:py-3.5 flex items-start gap-3">
        <span aria-hidden className="shrink-0 font-display text-4xl leading-[0.8] text-gold-400 select-none">“</span>
        <div className="min-w-0 flex-1 space-y-1">
          <blockquote className="font-display text-[16px] italic font-semibold text-temple-900 leading-snug">
            You have a right to perform your prescribed duty, but you are not entitled to the fruits of action.
          </blockquote>
          <figcaption className="text-right text-xs font-medium text-saffron-700" title="Bhagavad Gita, chapter 2, verse 47">— BG 2.47</figcaption>
        </div>
      </figure>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
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
              <p className="text-xs text-temple-500">{quizLine}</p>
            </div>
            {quizSummary?.open > 0 && (
              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-saffron-500 text-white text-[11px] font-bold flex items-center justify-center">
                {quizSummary.open}
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-temple-400" />
          </div>
          <p className="text-xs sm:text-sm text-temple-600">A short quiz each week to help you reflect on what you have learnt.</p>
        </button>

        {/* WhatsApp */}
        <section className="rounded-3xl bg-cream-50 border border-cream-200 p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-temple-900">WhatsApp Community</h3>
              <p className="text-xs text-temple-500">Session updates and announcements</p>
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
              The community link will appear here soon. If you need anything meanwhile, kindly tap <strong>Need help?</strong> at the top.
            </p>
          )}
        </section>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onOpen('profile')}
          className="w-full flex items-center gap-3 rounded-2xl bg-white/70 border border-cream-200 px-4 py-3.5 text-left hover:border-gold-300 transition cursor-pointer"
        >
          <User className="w-5 h-5 text-saffron-600" />
          <span className="flex-1 text-sm font-medium text-temple-800">View my registration details</span>
          <ChevronRight className="w-4 h-4 text-temple-400" />
        </button>
        <EditDetailsNote compact />
      </div>
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
