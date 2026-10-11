import React, { useEffect, useState } from 'react';
import { BellRing, Plus, Trash2, Loader2 } from 'lucide-react';
import { fetchHelpNotifyEmails, saveHelpNotifyEmails } from '../../helpRequests';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Super Admin setting: who gets emailed when a student sends a Contact Us message. */
export default function HelpEmailsSettings({ callerUser }) {
  const [emails, setEmails] = useState(null); // null while loading
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyEmail, setBusyEmail] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchHelpNotifyEmails()
      .then((list) => alive && setEmails(list))
      .catch(() => {
        if (!alive) return;
        setEmails([]);
        setError('Could not load the notification emails. Please refresh the page.');
      });
    return () => { alive = false; };
  }, []);

  const persist = async (next, busyKey, successText) => {
    setBusyEmail(busyKey);
    setError('');
    setMessage('');
    try {
      const saved = await saveHelpNotifyEmails(next, callerUser);
      setEmails(saved);
      setMessage(successText);
      setTimeout(() => setMessage(''), 3000);
      return true;
    } catch (err) {
      setError(err?.message || 'Could not save. Please try again.');
      return false;
    } finally {
      setBusyEmail(null);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    const email = draft.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return setError('Please enter a valid email address.');
    if (emails.includes(email)) return setError('This email already receives Contact Us messages.');
    if (await persist([...emails, email], '__add__', `${email} will now receive Contact Us messages.`)) setDraft('');
  };

  const remove = (email) => persist(emails.filter((x) => x !== email), email, `${email} removed.`);

  return (
    <div className="max-w-2xl mx-auto bg-cream-50 rounded-3xl border border-cream-200 shadow-soft p-5 sm:p-6 space-y-5 text-left">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-saffron-50 border border-saffron-200 flex items-center justify-center text-saffron-700 shrink-0">
          <BellRing className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-temple-900">Contact Us emails</h3>
          <p className="text-xs text-temple-500 leading-relaxed">
            When a student sends a message through Contact Us, an email goes to every address below. Messages are also always saved in the Contact Us tab.
          </p>
        </div>
      </div>

      {emails === null ? (
        <div className="flex items-center gap-2 text-xs text-temple-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : emails.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cream-300 bg-white/60 px-4 py-4 text-xs text-temple-500 text-center">
          No email addresses yet. Messages are only saved in the Contact Us tab until you add one.
        </p>
      ) : (
        <ul className="bg-white border border-cream-200 rounded-2xl divide-y divide-cream-200">
          {emails.map((email, i) => (
            <li key={email} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block text-sm text-temple-900 truncate">{email}</span>
                {i === 0 && <span className="block text-[11px] text-temple-500">Main inbox · others receive a copy</span>}
              </span>
              <button
                type="button"
                onClick={() => remove(email)}
                disabled={busyEmail !== null}
                aria-label={`Remove ${email}`}
                className="p-2 rounded-lg text-temple-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {busyEmail === email ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-col sm:flex-row gap-2" noValidate>
        <input
          type="email"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setError(''); }}
          placeholder="Add an email address"
          aria-label="Email address to notify"
          disabled={emails === null}
          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/50"
        />
        <button
          type="submit"
          disabled={emails === null || busyEmail !== null}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
        >
          {busyEmail === '__add__' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </form>

      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      {message && <p className="text-xs text-emerald-700" role="status">{message}</p>}
      <p className="text-[11px] text-temple-400 leading-relaxed">
        When a new address becomes the main inbox (first in the list), the first message sends it an activation email from
        FormSubmit; kindly click "Activate" in it so messages are delivered. New addresses may also find the first emails in
        their Spam folder. Marking one as "Not spam" fixes it.
      </p>
    </div>
  );
}
