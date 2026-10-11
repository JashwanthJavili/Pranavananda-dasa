import React, { useEffect, useRef, useState } from 'react';
import { Star, Send } from 'lucide-react';
import { Spinner } from '../ui';
import {
  RATING_LABELS, ASK_FEEDBACK_AT, FEEDBACK_MAX, fetchMyRating, fetchMyFeedback, saveQuizRating, saveQuizFeedback,
} from '../../../quiz/quizRatings';

/**
 * 5-star rating for a quiz the student has submitted, saved as soon as a star is tapped.
 * For 4 stars or fewer it also asks how we can improve (sent with its own button).
 */
export default function RateQuiz({ quiz, registrationId, className = '' }) {
  const [rating, setRating] = useState(null); // null while loading, 0 = not rated
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(0);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(''); // what has been sent
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const sectionRef = useRef(null);
  const revealAfterRate = useRef(false);

  // After a star is tapped, bring the comment box (or the thank-you) into view
  useEffect(() => {
    if (!revealAfterRate.current || saving) return;
    revealAfterRate.current = false;
    requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, [rating, saving]);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchMyRating(quiz.id, registrationId), fetchMyFeedback(quiz.id, registrationId)]).then(([r, f]) => {
      if (!alive) return;
      setFeedback(f);
      setDraft(f);
      setRating(r);
    });
    return () => { alive = false; };
  }, [quiz.id, registrationId]);

  const rate = async (value) => {
    setHover(0); // show the message, not the star's label, once tapped
    if (saving || value === rating) return;
    const previous = rating;
    revealAfterRate.current = true;
    setRating(value);
    setSaving(value);
    setError('');
    setJustSent(false);
    try {
      await saveQuizRating({ quiz, registrationId, rating: value });
    } catch (e) {
      setRating(previous);
      setError('Your rating could not be saved. Please try again.');
    } finally {
      setSaving(0);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const text = await saveQuizFeedback({ quiz, registrationId, comment: draft });
      setFeedback(text);
      setDraft(text);
      setJustSent(true);
    } catch (err) {
      setError('Your suggestion could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (rating === null) return null;
  const shown = hover || rating;
  const askImprove = rating > 0 && rating <= ASK_FEEDBACK_AT;
  const changed = draft.trim() !== feedback;
  // Thank them once there is nothing more to ask: 5 stars, or a suggestion sent
  const thanked = rating > 0 && (!askImprove || (feedback && !changed));

  return (
    <section ref={sectionRef} className={`scroll-mb-6 rounded-2xl border border-cream-200 bg-white/80 px-4 py-4 text-center space-y-2 ${className}`} aria-labelledby={`rate-${quiz.id}`}>
      <h3 id={`rate-${quiz.id}`} className="text-sm font-semibold text-temple-900">How was your experience?</h3>
      <div className="flex justify-center gap-1" role="radiogroup" aria-label="Rate your experience" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={rating === v}
            aria-label={`${v} star${v === 1 ? '' : 's'}: ${RATING_LABELS[v]}`}
            onClick={() => rate(v)}
            onMouseEnter={() => setHover(v)}
            onFocus={() => setHover(v)}
            onBlur={() => setHover(0)}
            disabled={Boolean(saving)}
            className="p-1 rounded-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400 cursor-pointer disabled:cursor-wait"
          >
            <Star
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${v <= shown ? 'fill-gold-400 text-gold-500' : 'fill-transparent text-cream-300'}`}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      <div className="min-h-[1rem] text-xs font-medium" aria-live="polite">
        {saving ? (
          <span className="inline-flex items-center gap-1.5 text-temple-500"><Spinner className="w-3 h-3" /> Saving…</span>
        ) : hover ? (
          <span className="text-temple-600">{RATING_LABELS[hover]}</span>
        ) : rating ? (
          <span className="text-temple-600">{RATING_LABELS[rating]}</span>
        ) : null}
      </div>

      {askImprove && (
        <form onSubmit={send} className="space-y-2 text-left animate-fadeIn">
          <label htmlFor={`improve-${quiz.id}`} className="block text-xs font-semibold text-temple-800">
            How can we improve and serve you better?
          </label>
          <textarea
            id={`improve-${quiz.id}`}
            rows={3}
            value={draft}
            onChange={(e) => { setDraft(e.target.value.slice(0, FEEDBACK_MAX)); setJustSent(false); }}
            placeholder="Kindly share what we could do better, for example the questions, the instructions or anything else."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-cream-300 text-sm text-temple-900 placeholder:text-temple-400 focus:outline-none focus:ring-2 focus:ring-saffron-400/50 resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-temple-400 tabular-nums">{draft.length}/{FEEDBACK_MAX}</span>
            <button
              type="submit"
              disabled={!draft.trim() || !changed || sending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {sending ? <Spinner className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              {feedback ? 'Update' : 'Send'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-xs font-medium text-red-600" role="alert">{error}</p>}

      {thanked && !error && !saving && (
        <div className={`pt-1 space-y-0.5 ${justSent || !askImprove ? 'animate-fadeIn' : ''}`}>
          <p className="text-sm font-semibold text-emerald-700">Thank you for your time 🙏</p>
          <p className="text-xs text-temple-600 leading-relaxed">
            {askImprove
              ? 'Hare Krishna. We will carefully go through your suggestion and keep improving, so that we can serve you better.'
              : 'Hare Krishna. Your feedback helps us serve you better on your journey with the Bhagavad Gita.'}
          </p>
        </div>
      )}
    </section>
  );
}
