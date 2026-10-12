import React, { useEffect, useState } from 'react';
import { SOCIAL_PLATFORMS, SOCIAL_NAME_MAX, safeSocialUrl, fetchSocialLinks, nameKey } from '../../socialLinks';

const svg = { viewBox: '0 0 24 24', className: 'w-5 h-5', 'aria-hidden': true };

export const SOCIAL_ICONS = {
  instagram: () => (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  youtube: () => (
    <svg {...svg}>
      <path
        fill="currentColor"
        d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8z"
      />
      <path fill="#FF0000" d="M10 15.2 15.4 12 10 8.8z" />
    </svg>
  ),
};

export const SOCIAL_BRAND = {
  instagram: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
  youtube: 'bg-[#FF0000]',
};

const SOCIAL_TINT = {
  instagram: 'bg-pink-50/70 border-pink-200 hover:bg-pink-50 hover:border-pink-300',
  youtube: 'bg-red-50/70 border-red-200 hover:bg-red-50 hover:border-red-300',
};

let cached = null; // links fetched once per page load

/** Links set by the Super Admin, loaded once. null while loading. */
export function useSocialLinks() {
  const [links, setLinks] = useState(cached);
  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    fetchSocialLinks()
      .then((l) => { cached = l; if (alive) setLinks(l); })
      .catch(() => alive && setLinks({}));
    return () => { alive = false; };
  }, []);
  return links;
}

/** "Stay connected": a small button for each social media link. Nothing is shown when no link is set. */
export default function SocialFollowCard({ links, className = '' }) {
  const items = SOCIAL_PLATFORMS
    .map((p) => ({
      ...p,
      href: safeSocialUrl(p.key, links?.[p.key]),
      name: String(links?.[nameKey(p.key)] || '').trim().slice(0, SOCIAL_NAME_MAX) || p.label,
    }))
    .filter((p) => p.href);
  if (!items.length) return null;

  return (
    <section className={`rounded-3xl border border-gold-200/80 bg-white/70 shadow-soft px-4 py-3 sm:py-4 sm:px-5 text-center space-y-2 sm:space-y-3 ${className}`}>
      <div className="space-y-0.5">
        <div className="flex items-center justify-center gap-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-saffron-700" aria-hidden="true">
          <span className="h-px w-6 bg-gradient-to-r from-transparent to-gold-400" />
          Stay connected
          <span className="h-px w-6 bg-gradient-to-l from-transparent to-gold-400" />
        </div>
        <h3 className="font-display text-lg sm:text-xl font-bold text-temple-900 leading-tight">Don’t forget to follow us</h3>
      </div>
      <div className={`grid gap-2.5 mx-auto ${items.length > 1 ? 'grid-cols-2 max-w-sm' : 'max-w-[12rem]'}`}>
        {items.map((p) => {
          const Icon = SOCIAL_ICONS[p.key];
          return (
            <a
              key={p.key}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${p.action} on ${p.label}: ${p.name}`}
              className={`group min-w-0 flex flex-col items-center justify-center gap-1 sm:gap-1.5 rounded-2xl border px-2 py-2 sm:py-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-md ${SOCIAL_TINT[p.key]}`}
            >
              <span className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full ${SOCIAL_BRAND[p.key]} text-white flex items-center justify-center shadow-soft [&_svg]:w-4 [&_svg]:h-4 sm:[&_svg]:w-5 sm:[&_svg]:h-5 transition-transform duration-200 group-hover:scale-105`}>
                <Icon />
              </span>
              <span className="w-full min-w-0 leading-tight">
                <span className="block text-xs sm:text-sm font-semibold text-temple-900 break-words">{p.name}</span>
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
