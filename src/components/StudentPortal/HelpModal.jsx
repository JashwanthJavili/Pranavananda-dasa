import React, { useEffect, useRef, useState } from 'react';
import { X, LifeBuoy, CheckCircle2, Send } from 'lucide-react';
import CategorySelect from './CategorySelect';
import { HELP_CATEGORIES } from '../../config/support';
import { submitHelpRequest, validateHelpRequest, helpCooldownLeft } from '../../helpRequests';
import { Field, TextInput, Notice, PrimaryButton, MobileInput } from './ui';

const MESSAGE_MAX = 2000;

/**
 * "Need help" form. `prefill` carries the signed-in student's details
 * ({ name, email, mobile, countryCode, registrationId }) when available.
 */
export default function HelpModal({ open, onClose, prefill }) {
  const [form, setForm] = useState(null);
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const dialogRef = useRef(null);
  // Latest values for listeners, so re-renders never reset the form or steal focus.
  const latest = useRef({ prefill, onClose, sending });
  latest.current = { prefill, onClose, sending };

  // Fresh form each time it opens, pre-filled from the student's profile.
  useEffect(() => {
    if (!open) return;
    const prefill = latest.current.prefill;
    setForm({
      name: prefill?.name || '',
      email: prefill?.email || '',
      countryCode: prefill?.countryCode || '+91',
      mobile: prefill?.mobile || '',
      category: prefill?.category || '',
      message: prefill?.message || '',
    });
    setHoneypot('');
    setError('');
    setResult(null);
    setSending(false);
  }, [open]);

  // Close on Escape, lock page scroll, move focus into the dialog (once per opening).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !latest.current.sending && latest.current.onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const ready = Boolean(open && form);
  useEffect(() => {
    if (ready) dialogRef.current?.focus();
  }, [ready]);

  if (!ready) return null;

  const set = (field) => (e) => {
    const value = field === 'mobile' ? e.target.value.replace(/[^\d\s]/g, '') : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (honeypot) return; // bots fill hidden fields; silently ignore
    const problem = validateHelpRequest(form);
    if (problem) return setError(problem);
    const wait = helpCooldownLeft();
    if (wait > 0) return setError(`You just sent a request. Please wait ${wait} seconds before sending another.`);

    setSending(true);
    setError('');
    try {
      const res = await submitHelpRequest({
        ...form,
        registrationId: prefill?.registrationId || '',
        source: prefill?.registrationId ? 'student-portal (logged in)' : 'student-portal',
      });
      setResult(res);
    } catch (err) {
      setError(
        err?.message && !err.code
          ? err.message
          : 'We could not send your request. Please check your internet connection and try again.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-temple-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !sending && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-cream-50 rounded-t-3xl sm:rounded-3xl border border-cream-200 shadow-soft-lg outline-none animate-fadeIn"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-cream-50/95 backdrop-blur border-b border-cream-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-700">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <h2 id="help-title" className="font-display text-xl sm:text-2xl font-bold text-temple-900">Need help?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
            className="p-2 rounded-full text-temple-500 hover:text-temple-900 hover:bg-cream-200 disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="px-5 sm:px-6 py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-temple-900 leading-snug">
                Hare Krishna 🙏
                <span className="block">Dear Devotee,</span>
              </p>
              <p className="text-sm text-temple-600 leading-relaxed">
                We have received your request. Our team will get back to you at <strong className="text-temple-800">{form.email.trim()}</strong> as soon as possible.
              </p>
              <p className="inline-block mt-1 px-3 py-1.5 rounded-full bg-white border border-gold-200 text-xs font-semibold text-temple-800">
                Reference: {result.reference}
              </p>
            </div>
            <PrimaryButton type="button" onClick={onClose}>Done</PrimaryButton>
          </div>
        ) : (
          <form onSubmit={submit} className="px-5 sm:px-6 py-5 space-y-4" noValidate>
            <p className="text-xs sm:text-sm text-temple-600 leading-relaxed">
              Kindly tell us how we can help. Our team will reply to your email.
            </p>

            {/* Honeypot: hidden from people, tempting for bots */}
            <input
              type="text"
              name="company"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <Field id="help-category" label="What do you need help with?">
              <CategorySelect
                id="help-category"
                labelId="help-category-label"
                value={form.category}
                options={HELP_CATEGORIES}
                onChange={(category) => { setForm((f) => ({ ...f, category })); setError(''); }}
              />
            </Field>

            <Field id="help-message" label={form.category === 'Edit my profile details' ? 'What would you like to change?' : 'Please describe your request'}>
              <textarea
                id="help-message"
                rows={4}
                maxLength={MESSAGE_MAX}
                value={form.message}
                onChange={set('message')}
                placeholder={form.category === 'Edit my profile details'
                  ? 'For example: Please change my mobile number from 98xxxxxx10 to 98xxxxxx20.'
                  : 'For example: I entered my mobile number and email, but I did not receive the verification email.'}
                className="w-full px-4 py-3 rounded-xl bg-white border border-cream-300 text-sm text-temple-900 placeholder:text-temple-400 focus:outline-none focus:ring-2 focus:ring-saffron-400/50 resize-y min-h-[110px]"
              />
              <p className="text-[11px] text-temple-400 text-right">{form.message.length}/{MESSAGE_MAX}</p>
            </Field>

            <Field id="help-name" label="Your name">
              <TextInput id="help-name" autoComplete="name" value={form.name} onChange={set('name')} placeholder="Full name" />
            </Field>

            <Field id="help-email" label="Your email (we will reply here)">
              <TextInput id="help-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
            </Field>

            <Field id="help-mobile" label="Mobile number (optional)">
              <MobileInput
                id="help-mobile"
                countryCode={form.countryCode}
                onCountryCodeChange={(c) => setForm((f) => ({ ...f, countryCode: c }))}
                value={form.mobile}
                onChange={(v) => { setForm((f) => ({ ...f, mobile: v })); setError(''); }}
              />
            </Field>

            {error && <Notice type="error">{error}</Notice>}

            <PrimaryButton type="submit" loading={sending}>
              {!sending && <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Send request'}
            </PrimaryButton>
          </form>
        )}
      </div>
    </div>
  );
}
