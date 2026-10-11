import React, { useEffect, useState } from 'react';
import { Share2, Loader2, Save, Eye } from 'lucide-react';
import { SOCIAL_PLATFORMS, SOCIAL_NAME_MAX, safeSocialUrl, fetchSocialLinks, saveSocialLinks, nameKey } from '../../socialLinks';
import SocialFollowCard, { SOCIAL_ICONS, SOCIAL_BRAND } from '../StudentPortal/SocialFollowCard';

const EXAMPLE_LINKS = Object.fromEntries(SOCIAL_PLATFORMS.flatMap((p) => [[p.key, p.example], [nameKey(p.key), '@gitaforyouth']]));
const FIELDS = SOCIAL_PLATFORMS.flatMap((p) => [p.key, nameKey(p.key)]);

/** Super Admin setting: social media links shown to students on their quiz results. */
export default function SocialLinksSettings({ callerUser }) {
  const [draft, setDraft] = useState(null); // null while loading
  const [saved, setSaved] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    fetchSocialLinks()
      .then((links) => { if (alive) { setDraft(links); setSaved(links); } })
      .catch(() => {
        if (!alive) return;
        setDraft({});
        setError('Could not load the social media links. Please refresh the page.');
      });
    return () => { alive = false; };
  }, []);

  const invalid = draft ? SOCIAL_PLATFORMS.filter((p) => draft[p.key]?.trim() && !safeSocialUrl(p.key, draft[p.key])) : [];
  const changed = draft && FIELDS.some((f) => (draft[f] || '').trim() !== (saved[f] || ''));
  const hasAny = draft && SOCIAL_PLATFORMS.some((p) => safeSocialUrl(p.key, draft[p.key]));

  const save = async (e) => {
    e.preventDefault();
    if (invalid.length) return setError(`Please check the ${invalid.map((p) => p.label).join(' and ')} link.`);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const clean = await saveSocialLinks(draft, callerUser);
      setDraft(clean);
      setSaved(clean);
      setMessage('Saved. Students will see these links on their quiz results.');
      setTimeout(() => setMessage(''), 3500);
    } catch (err) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-cream-50 rounded-3xl border border-cream-200 shadow-soft p-5 sm:p-6 space-y-5 text-left">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-saffron-50 border border-saffron-200 flex items-center justify-center text-saffron-700 shrink-0">
          <Share2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-temple-900">Social media links</h3>
          <p className="text-xs text-temple-500 leading-relaxed">
            Shown to students on their quiz results, asking them to follow and subscribe. The name is shown on the button (for example @gitaforyouth). Leave a link empty to hide that button.
          </p>
        </div>
      </div>

      {draft === null ? (
        <div className="flex items-center gap-2 text-xs text-temple-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <form onSubmit={save} className="space-y-3" noValidate>
          {SOCIAL_PLATFORMS.map((p) => {
            const Icon = SOCIAL_ICONS[p.key];
            const bad = invalid.includes(p);
            return (
              <div key={p.key} className="space-y-1">
                <label htmlFor={`social-${p.key}`} className="flex items-center gap-2 text-xs font-semibold text-temple-800">
                  <span className={`w-6 h-6 rounded-full ${SOCIAL_BRAND[p.key]} text-white flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5`}>
                    <Icon />
                  </span>
                  {p.label}
                </label>
                <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
                  <input
                    id={`social-${p.key}`}
                    type="url"
                    inputMode="url"
                    value={draft[p.key] || ''}
                    onChange={(e) => { setDraft((d) => ({ ...d, [p.key]: e.target.value })); setError(''); }}
                    placeholder={`Link, e.g. ${p.example}`}
                    aria-invalid={bad}
                    className={`w-full px-4 py-2.5 rounded-xl bg-white border text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/50 ${bad ? 'border-red-300' : 'border-cream-300'}`}
                  />
                  <input
                    type="text"
                    value={draft[nameKey(p.key)] || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [nameKey(p.key)]: e.target.value }))}
                    maxLength={SOCIAL_NAME_MAX}
                    placeholder="Name to show, e.g. @gitaforyouth"
                    aria-label={`${p.label} name shown to students`}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/50"
                  />
                </div>
                {bad && <p className="text-[11px] text-red-600">This must be a {p.label} link ({p.hosts[0]}).</p>}
              </div>
            );
          })}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={busy || !changed}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save links
            </button>
            {message && <p className="text-xs text-emerald-700" role="status">{message}</p>}
          </div>
          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
        </form>
      )}

      {draft !== null && (
        <div className="space-y-2 pt-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-temple-500">
            <Eye className="w-3.5 h-3.5" /> {hasAny ? 'Preview — how students will see it' : 'Example — add your links above'}
          </p>
          <div className={hasAny ? '' : 'opacity-70'}>
            <SocialFollowCard links={hasAny ? draft : EXAMPLE_LINKS} />
          </div>
        </div>
      )}
    </div>
  );
}
