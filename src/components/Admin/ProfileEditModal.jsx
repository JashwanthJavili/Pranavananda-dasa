import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPen, ShieldCheck, ArrowRight, AlertTriangle, Loader2, Info } from 'lucide-react';
import FancySelect from '../common/FancySelect';
import { MobileInput } from '../StudentPortal/ui';
import {
  GENDERS, OCCUPATIONS, profileValues, validateProfile, diffProfile, fetchPortalStatus, saveProfileEdit, LOGIN_LOCKED_MESSAGE,
} from '../../profileEdits';
import { updateHelpRequestStatus } from '../../helpRequests';

const inputCls = (changed) =>
  `w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-400/50 ${
    changed ? 'border-saffron-400 ring-1 ring-saffron-300/60' : 'border-cream-300'
  }`;

function Row({ label, changed, children, full }) {
  return (
    <label className={`block space-y-1 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-temple-700">
        {label}
        {changed && <span className="px-1.5 py-px rounded-md bg-saffron-100 text-saffron-800 text-[10px] font-bold">Changed</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * Super Admins change a participant's details, usually in answer to a help request.
 * The change and a detailed log entry (who, when, which fields, from what to what) are saved together.
 *  registration: the record · helpRequest: the request being answered (optional)
 *  registrations: everyone (to warn about an email or mobile number already in use)
 *  manager: the Super Admin's secure session (useQuizManager)
 */
export default function ProfileEditModal({ registration, helpRequest, registrations = [], adminUser, manager, notify, onClose, onSaved }) {
  const original = useMemo(() => profileValues(registration), [registration]);
  const [values, setValues] = useState(original);
  const [reason, setReason] = useState(helpRequest ? `As requested in help request ${helpRequest.reference}.` : '');
  const [resolve, setResolve] = useState(Boolean(helpRequest && (helpRequest.status || 'Open') !== 'Resolved'));
  const [portal, setPortal] = useState('loading');
  const [step, setStep] = useState('edit'); // 'edit' | 'review'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef({ onClose, saving });
  latest.current = { onClose, saving };
  const regId = registration.registrationId || registration.id;
  const secure = manager?.isManager;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !latest.current.saving && latest.current.onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!secure) { setPortal('unknown'); return undefined; }
    fetchPortalStatus(regId).then((s) => alive && setPortal(s));
    return () => { alive = false; };
  }, [regId, secure]);

  const changes = useMemo(() => diffProfile(original, values), [original, values]);
  // Email and mobile stay as they are once the portal login exists (or while that is unknown)
  const loginLocked = portal !== 'not_linked';
  const changed = (field) => changes.some((c) => c.field === field);
  const set = (key) => (e) => { setValues((v) => ({ ...v, [key]: e?.target ? e.target.value : e })); setError(''); };

  // Another registration already using the new email / mobile
  const duplicates = useMemo(() => {
    const out = [];
    const others = registrations.filter((r) => (r.registrationId || r.id) !== regId && !r.isDeleted);
    if (changed('email')) {
      const e = values.email.trim().toLowerCase();
      const hit = others.find((r) => String(r.email || r.emailLower || '').toLowerCase() === e);
      if (hit) out.push(`This email is already used by ${hit.registrationId || hit.id} (${hit.fullName || 'another participant'}).`);
    }
    if (changed('mobile')) {
      const m = values.mobile.replace(/\D/g, '').slice(-10);
      const hit = others.find((r) => r.mobileNumberClean === m && (r.countryCode || '+91') === values.countryCode);
      if (hit) out.push(`This mobile number is already used by ${hit.registrationId || hit.id} (${hit.fullName || 'another participant'}).`);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, changes, registrations, regId]);

  const occupationOptions = useMemo(() => {
    const list = OCCUPATIONS.map((o) => ({ value: o, label: o }));
    if (original.occupation && !OCCUPATIONS.includes(original.occupation)) list.unshift({ value: original.occupation, label: original.occupation });
    return list;
  }, [original.occupation]);

  const toReview = () => {
    const problem = validateProfile(values, original);
    if (problem) return setError(problem);
    if (!changes.length) return setError('Nothing has changed yet.');
    if (duplicates.length) return setError(duplicates[0]);
    setError('');
    setStep('review');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await saveProfileEdit({ registration, values, reason, helpRequest, adminUser });
      if (helpRequest && resolve) await updateHelpRequestStatus(helpRequest.id, 'Resolved', adminUser).catch(() => {});
      notify?.(`${regId}: ${res.changes.length} detail${res.changes.length === 1 ? '' : 's'} updated and logged`);
      onSaved?.(res);
      onClose();
    } catch (err) {
      setError(err?.message || 'The details could not be saved. Please try again.');
      setSaving(false);
    }
  };

  const contactChanged = changed('email') || changed('mobile');

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-temple-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 font-poppins"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="w-full sm:max-w-2xl max-h-[94vh] flex flex-col bg-cream-50 rounded-t-3xl sm:rounded-3xl border border-cream-200 shadow-soft-lg animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-cream-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-700 shrink-0">
              <UserPen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="edit-profile-title" className="text-base sm:text-lg font-bold text-temple-900">
                {step === 'review' ? 'Review changes' : 'Edit participant details'}
              </h2>
              <p className="text-xs text-temple-500 truncate">
                {regId} · {original.fullName || 'Participant'}{helpRequest ? ` · ${helpRequest.reference}` : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="p-2 -mr-2 rounded-full text-temple-500 hover:bg-cream-200 hover:text-temple-900 disabled:opacity-50 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {!secure && (
            <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Your secure Super Admin session is not active, so changes cannot be saved or logged. Please log out and log in again.
            </p>
          )}

          {step === 'edit' ? (
            <>
              {helpRequest?.message && (
                <div className="rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 space-y-1">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-gold-600">What the participant asked</p>
                  <p className="text-sm text-temple-800 whitespace-pre-wrap break-words">{helpRequest.message}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Row label="Full name" changed={changed('fullName')} full>
                  <input value={values.fullName} onChange={set('fullName')} maxLength={100} className={inputCls(changed('fullName'))} />
                </Row>
                <Row label="Email" changed={changed('email')}>
                  <input type="email" value={values.email} onChange={set('email')} maxLength={100} disabled={loginLocked} className={`${inputCls(changed('email'))} disabled:bg-cream-100 disabled:text-temple-500`} />
                </Row>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-temple-700">
                    Mobile number
                    {changed('mobile') && <span className="px-1.5 py-px rounded-md bg-saffron-100 text-saffron-800 text-[10px] font-bold">Changed</span>}
                  </span>
                  {loginLocked ? (
                    <input value={`${original.countryCode} ${original.mobile}`} disabled aria-label="Mobile number" className={`${inputCls(false)} disabled:bg-cream-100 disabled:text-temple-500`} />
                  ) : (
                  <MobileInput
                    id="edit-profile-mobile"
                    countryCode={values.countryCode}
                    onCountryCodeChange={(c) => setValues((v) => ({ ...v, countryCode: c }))}
                    value={values.mobile}
                    onChange={(m) => { setValues((v) => ({ ...v, mobile: m })); setError(''); }}
                  />
                  )}
                </div>
                <Row label="Age" changed={changed('age')}>
                  <input inputMode="numeric" value={values.age} onChange={(e) => set('age')(e.target.value.replace(/\D/g, '').slice(0, 3))} className={inputCls(changed('age'))} />
                </Row>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-temple-700">
                    Gender
                    {changed('gender') && <span className="px-1.5 py-px rounded-md bg-saffron-100 text-saffron-800 text-[10px] font-bold">Changed</span>}
                  </span>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-cream-200/70 border border-cream-300/70" role="radiogroup" aria-label="Gender">
                    {GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        role="radio"
                        aria-checked={values.gender === g}
                        onClick={() => set('gender')(g)}
                        className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${values.gender === g ? 'bg-white shadow-soft text-temple-900' : 'text-temple-500 hover:text-temple-800'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <Row label="Education" changed={changed('education')}>
                  <input value={values.education} onChange={set('education')} maxLength={100} className={inputCls(changed('education'))} />
                </Row>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-temple-700">
                    Occupation
                    {changed('occupation') && <span className="px-1.5 py-px rounded-md bg-saffron-100 text-saffron-800 text-[10px] font-bold">Changed</span>}
                  </span>
                  <FancySelect ariaLabel="Occupation" value={values.occupation} onChange={set('occupation')} options={occupationOptions} />
                  {values.occupation === 'Other' && (
                    <input
                      value={values.otherOccupation}
                      onChange={set('otherOccupation')}
                      maxLength={100}
                      placeholder="Write the occupation"
                      aria-label="Other occupation"
                      className={`mt-2 ${inputCls(changed('occupation'))}`}
                    />
                  )}
                </div>
                <Row label="Current residence" changed={changed('currentResidence')}>
                  <input value={values.currentResidence} onChange={set('currentResidence')} maxLength={150} className={inputCls(changed('currentResidence'))} />
                </Row>
                <Row label="Full address" changed={changed('fullAddress')} full>
                  <textarea rows={2} value={values.fullAddress} onChange={set('fullAddress')} maxLength={300} className={`resize-none ${inputCls(changed('fullAddress'))}`} />
                </Row>
                <Row label="Pincode" changed={changed('pincode')}>
                  <input value={values.pincode} onChange={set('pincode')} maxLength={10} className={inputCls(changed('pincode'))} />
                </Row>
              </div>

              {portal === 'linked' && (
                <p className="flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-50 px-3.5 py-3 text-xs text-temple-700">
                  <Info className="w-4 h-4 shrink-0 text-gold-600" /> {LOGIN_LOCKED_MESSAGE}
                </p>
              )}
              {portal === 'loading' && (
                <p className="flex items-center gap-2 text-xs text-temple-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking whether email and mobile can be changed…</p>
              )}
              {contactChanged && portal === 'not_linked' && (
                <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-800">
                  <Info className="w-4 h-4 shrink-0" />
                  This participant has not set up their portal login yet, so they can do First-time setup with the new details.
                </p>
              )}
              {duplicates.map((d) => (
                <p key={d} className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {d}
                </p>
              ))}
            </>
          ) : (
            <>
              <div className="rounded-xl border border-cream-200 bg-white divide-y divide-cream-200 overflow-hidden">
                {changes.map((c) => (
                  <div key={c.field} className="px-4 py-3 space-y-1">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-temple-500">{c.label}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 line-through decoration-red-300 break-all">{c.from || 'Empty'}</span>
                      <ArrowRight className="w-4 h-4 text-temple-400 shrink-0" />
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold break-all">{c.to || 'Empty'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-temple-700">Reason for the change <span className="font-normal text-temple-400">(saved in the log)</span></span>
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className={`resize-none ${inputCls(false)}`} />
              </label>
              {helpRequest && (helpRequest.status || 'Open') !== 'Resolved' && (
                <label className="flex items-center gap-2 text-sm text-temple-700 cursor-pointer select-none">
                  <input type="checkbox" checked={resolve} onChange={(e) => setResolve(e.target.checked)} className="w-4 h-4 accent-saffron-500" />
                  Mark {helpRequest.reference} as Resolved
                </label>
              )}
              <p className="flex items-start gap-2 text-[11px] text-temple-500">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                The change is saved with a permanent log entry: your account ({adminUser?.email}), the time, and each value before and after.
                Log entries cannot be edited or deleted.
              </p>
            </>
          )}

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-cream-200 bg-white rounded-b-3xl flex items-center justify-between gap-3">
          <span className="text-xs text-temple-500">
            {changes.length ? `${changes.length} change${changes.length === 1 ? '' : 's'}` : 'No changes yet'}
          </span>
          <div className="flex gap-2">
            {step === 'review' ? (
              <>
                <button type="button" onClick={() => setStep('edit')} disabled={saving} className="px-4 py-2.5 rounded-xl border border-cream-300 bg-white text-sm font-medium text-temple-700 hover:bg-cream-100 disabled:opacity-50 cursor-pointer">
                  Back
                </button>
                <button type="button" onClick={save} disabled={saving || !secure} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-cream-300 bg-white text-sm font-medium text-temple-700 hover:bg-cream-100 cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={toReview} disabled={!changes.length || !secure || duplicates.length > 0} className="px-4 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer">
                  Review changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
