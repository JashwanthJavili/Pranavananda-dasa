import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LifeBuoy, Mail, Phone, Search, X, ChevronRight, MessageCircle, MailCheck, MailX, Inbox, UserPen, Loader2, History,
} from 'lucide-react';
import { HELP_STATUSES } from '../../config/support';
import { updateHelpRequestStatus } from '../../helpRequests';
import { fetchRegistration } from '../../profileEdits';
import ProfileEditModal from './ProfileEditModal';
import ProfileEditLogs from './ProfileEditLogs';

// Requests that ask for a change to the participant's details
const EDIT_CATEGORIES = ['Edit my profile details', 'My registration details are wrong'];

const STATUS = {
  Open: { dot: 'bg-saffron-500', pill: 'bg-saffron-50 text-saffron-800 border-saffron-200', card: 'text-saffron-700' },
  'In Progress': { dot: 'bg-gold-500', pill: 'bg-gold-50 text-gold-600 border-gold-200', card: 'text-gold-600' },
  Resolved: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', card: 'text-emerald-700' },
};

const toDate = (ts) => (ts?.toDate ? ts.toDate() : null);
const formatDate = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Just now';
};
const formatDateTime = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Just now';
};

function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.Open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

/**
 * Help requests sent from the student portal. Visible to Admins and Super Admins.
 * Super Admins can also change a participant's details from a request, and see the edit log.
 */
export default function HelpRequestsPanel({ requests, loadError, adminUser, notify, isSuperAdmin = false, manager, registrations = [], onRegistrationUpdated }) {
  const [view, setView] = useState('requests'); // 'requests' | 'log' (Super Admins)
  const [logKey, setLogKey] = useState(0);
  const [filter, setFilter] = useState('Open');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const counts = useMemo(() => {
    const c = { All: requests.length };
    HELP_STATUSES.forEach((s) => { c[s] = requests.filter((r) => (r.status || 'Open') === s).length; });
    return c;
  }, [requests]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (filter !== 'All' && (r.status || 'Open') !== filter) return false;
      if (!q) return true;
      return [r.reference, r.name, r.email, r.mobile, r.registrationId, r.category, r.message]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [requests, filter, search]);

  // Always show the live version of the open request.
  const selected = requests.find((r) => r.id === selectedId) || null;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-temple-900 flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-saffron-600" />
            Help Requests
          </h2>
          <p className="text-xs text-temple-500">Questions and problems sent by students from the portal.</p>
        </div>
        {view === 'requests' && (
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-temple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, reference…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/50"
          />
        </div>
        )}
      </div>

      {isSuperAdmin && (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-cream-200/70 border border-cream-300/70 w-full sm:w-80" role="tablist" aria-label="Help view">
          {[
            ['requests', 'Requests', Inbox],
            ['log', 'Profile edit log', History],
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                view === key ? 'bg-white shadow-soft text-temple-900' : 'text-temple-500 hover:text-temple-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      )}

      {view === 'log' && isSuperAdmin ? (
        <ProfileEditLogs manager={manager} refreshKey={logKey} />
      ) : (
      <>

      {/* Summary cards = filters */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {HELP_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(filter === s ? 'All' : s)}
            className={`text-left bg-cream-50 rounded-2xl p-3 sm:p-4 border shadow-soft transition cursor-pointer ${
              filter === s ? 'border-saffron-300 ring-2 ring-saffron-400/30' : 'border-cream-200 hover:border-gold-300'
            }`}
          >
            <span className={`text-[11px] uppercase tracking-wide font-semibold flex items-center gap-1.5 ${STATUS[s].card}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS[s].dot}`} />
              {s}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-temple-900 font-mono">{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-temple-500">
        <span>
          Showing <strong className="text-temple-800">{visible.length}</strong> {filter === 'All' ? 'requests' : `${filter.toLowerCase()} requests`}
        </span>
        {filter !== 'All' && (
          <button type="button" onClick={() => setFilter('All')} className="font-semibold text-saffron-700 hover:underline cursor-pointer">
            Show all ({counts.All})
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-cream-50 rounded-2xl border border-cream-200 shadow-soft overflow-hidden">
        {loadError ? (
          <p className="px-4 py-10 text-center text-sm text-red-600">Help requests could not be loaded. Please refresh the page.</p>
        ) : visible.length === 0 ? (
          <div className="px-4 py-12 text-center text-temple-500">
            <Inbox className="w-8 h-8 mx-auto text-temple-300 mb-2" />
            <p className="font-semibold text-sm">{requests.length === 0 ? 'No help requests yet' : 'Nothing here'}</p>
            <p className="text-xs text-temple-400">{requests.length === 0 ? 'Requests from students will appear here.' : 'Try another filter or search.'}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[110px_1.1fr_1.6fr_120px_20px] gap-4 px-4 py-2.5 bg-cream-200/60 border-b border-cream-200 text-[10px] uppercase font-bold tracking-wider text-temple-600">
              <span>Request</span>
              <span>Student</span>
              <span>Issue</span>
              <span>Status</span>
              <span />
            </div>
            <ul className="divide-y divide-cream-200/80">
              {visible.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className="w-full text-left px-4 py-3.5 hover:bg-white transition grid grid-cols-[1fr_auto] md:grid-cols-[110px_1.1fr_1.6fr_120px_20px] gap-x-4 gap-y-1 items-center cursor-pointer"
                  >
                    <span className="hidden md:block">
                      <span className="block text-xs font-bold text-temple-800">{r.reference}</span>
                      <span className="block text-[11px] text-temple-500">{formatDate(r.createdAt)}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-temple-900 truncate">{r.name}</span>
                      <span className="block text-xs text-temple-500 truncate">{r.email}</span>
                    </span>
                    <span className="md:hidden row-span-2 self-start"><StatusPill status={r.status || 'Open'} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-temple-800 truncate">{r.category}</span>
                      <span className="block text-xs text-temple-500 truncate">{r.message}</span>
                      <span className="md:hidden block text-[11px] text-temple-400 mt-0.5">{r.reference} · {formatDate(r.createdAt)}</span>
                    </span>
                    <span className="hidden md:block"><StatusPill status={r.status || 'Open'} /></span>
                    <ChevronRight className="hidden md:block w-4 h-4 text-temple-300" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      </>
      )}

      {selected && (
        <RequestDetail
          request={selected}
          adminUser={adminUser}
          notify={notify}
          onClose={() => setSelectedId(null)}
          isSuperAdmin={isSuperAdmin}
          manager={manager}
          registrations={registrations}
          onEdited={(regId) => { setLogKey((k) => k + 1); onRegistrationUpdated?.(regId); }}
        />
      )}
    </div>
  );
}

/** Registrations this request is about: its linked ID, else the same email or mobile number. */
function matchRegistrations(r, registrations) {
  const idOf = (x) => x.registrationId || x.id;
  if (r.registrationId) {
    const hit = registrations.find((x) => idOf(x) === r.registrationId);
    if (hit) return [hit];
  }
  const email = String(r.email || '').toLowerCase();
  const mobile = String(r.mobile || '').replace(/\D/g, '').slice(-10);
  return registrations.filter((x) => !x.isDeleted && (
    (email && String(x.email || x.emailLower || '').toLowerCase() === email)
    || (mobile && x.mobileNumberClean === mobile && (x.countryCode || '+91') === (r.countryCode || '+91'))
  ));
}

/** Super Admins: open the edit form for the participant behind a request. */
function EditDetailsSection({ request: r, registrations, manager, adminUser, notify, onEdited, onEditorChange }) {
  const matches = useMemo(() => matchRegistrations(r, registrations), [r, registrations]);
  const [typedId, setTypedId] = useState('');
  const [loadingId, setLoadingId] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  useEffect(() => { onEditorChange?.(Boolean(editing)); }, [editing, onEditorChange]);
  const asked = EDIT_CATEGORIES.includes(r.category);

  const open = async (id) => {
    const regId = String(id || '').trim().toUpperCase();
    if (!regId) return setError('Please enter a registration ID.');
    setLoadingId(regId);
    setError('');
    try {
      // Always the latest copy, so the log records the true "before" values
      const fresh = await fetchRegistration(regId);
      if (fresh) setEditing(fresh);
      else setError(`No active registration found with ID ${regId}.`);
    } catch (e) {
      setError('The registration could not be loaded. Please check your connection and try again.');
    } finally {
      setLoadingId('');
    }
  };

  return (
    <section className="space-y-2">
      <h4 className="text-[11px] uppercase tracking-wider font-bold text-temple-500">Participant details</h4>
      <div className={`rounded-xl border px-4 py-3 space-y-2.5 ${asked ? 'border-saffron-200 bg-saffron-50/60' : 'border-cream-200 bg-white'}`}>
        <p className="text-xs text-temple-600">
          {asked ? 'This participant has asked for their details to be changed.' : "You can change this participant's details if needed."}{' '}
          Every change is saved in the profile edit log.
        </p>
        {matches.map((m) => {
          const id = m.registrationId || m.id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => open(id)}
              disabled={Boolean(loadingId)}
              className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold disabled:opacity-70 cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <UserPen className="w-4 h-4 shrink-0" />
                <span className="truncate">Edit details · {id} · {m.fullName || 'Participant'}</span>
              </span>
              {loadingId === id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          );
        })}
        {matches.length === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); open(typedId); }} className="space-y-1.5">
            <p className="text-[11px] text-temple-500">No registration matches this request's email or mobile number. Enter the registration ID to edit:</p>
            <div className="flex gap-2">
              <input
                value={typedId}
                onChange={(e) => { setTypedId(e.target.value); setError(''); }}
                placeholder="e.g. BG26-120"
                aria-label="Registration ID"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/50"
              />
              <button type="submit" disabled={Boolean(loadingId)} className="inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold disabled:opacity-70 cursor-pointer">
                {loadingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPen className="w-4 h-4" />} Edit
              </button>
            </div>
          </form>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {editing && (
        <ProfileEditModal
          registration={editing}
          helpRequest={r}
          registrations={registrations}
          adminUser={adminUser}
          manager={manager}
          notify={notify}
          onClose={() => setEditing(null)}
          onSaved={() => onEdited?.(editing.registrationId || editing.id)}
        />
      )}
    </section>
  );
}

function RequestDetail({ request: r, adminUser, notify, onClose, isSuperAdmin, manager, registrations, onEdited }) {
  // While the edit form is open, Escape and outside clicks belong to it
  const [editorOpen, setEditorOpen] = useState(false);
  const editorOpenRef = useRef(false);
  editorOpenRef.current = editorOpen;
  const [saving, setSaving] = useState(false);
  const status = r.status || 'Open';
  const phoneDigits = r.mobile ? `${(r.countryCode || '+91').replace(/\D/g, '')}${r.mobile}` : '';

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !editorOpenRef.current && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const setStatus = async (next) => {
    if (next === status || saving) return;
    setSaving(true);
    try {
      await updateHelpRequestStatus(r.id, next, adminUser);
      notify?.(`${r.reference} marked as ${next}`);
    } catch (e) {
      notify?.('Could not update the status. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const detailRows = [
    ['Name', r.name],
    ['Registration ID', r.registrationId || 'Not linked'],
    ['Email', r.email],
    ['Mobile', r.mobile ? `${r.countryCode || '+91'} ${r.mobile}` : 'Not given'],
    ['Sent from', r.env === 'staging' ? `${r.source || 'Student portal'} (staging)` : r.source || 'Student portal'],
  ];

  // Rendered into <body>: an animated (transformed) ancestor would otherwise become the
  // containing block for `position: fixed` and push the panel out of place.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-temple-900/30 backdrop-blur-[2px] font-poppins" onMouseDown={(e) => e.target === e.currentTarget && !editorOpen && onClose()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Help request ${r.reference}`}
        className="w-full sm:max-w-md h-full bg-cream-50 shadow-soft-lg border-l border-cream-200 flex flex-col animate-fadeIn"
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-4 border-b border-cream-200 bg-white space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2.5 py-1 rounded-lg bg-cream-100 border border-cream-200 text-xs font-bold tracking-wide text-temple-800">
                {r.reference}
              </span>
              <StatusPill status={status} />
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-full text-temple-500 hover:bg-cream-100 hover:text-temple-900 cursor-pointer shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <h3 className="text-lg font-bold text-temple-900 leading-snug">{r.category}</h3>
            <p className="text-xs text-temple-500">Received {formatDateTime(r.createdAt)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Status */}
          <section className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-temple-500">Status</h4>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-cream-200/70 border border-cream-300/70">
              {HELP_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={saving}
                  onClick={() => setStatus(s)}
                  className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer disabled:cursor-wait ${
                    status === s ? 'bg-white shadow-soft text-temple-900' : 'text-temple-500 hover:text-temple-800'
                  }`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${STATUS[s].dot}`} />
                  {s}
                </button>
              ))}
            </div>
            {r.updatedBy && status !== 'Open' && <p className="text-[11px] text-temple-400">Last updated by {r.updatedBy}</p>}
          </section>

          {/* Message */}
          <section className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-temple-500">Message</h4>
            <p className="text-sm text-temple-800 leading-relaxed whitespace-pre-wrap break-words bg-white border border-cream-200 rounded-xl px-4 py-3">{r.message}</p>
          </section>

          {/* Student */}
          <section className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-temple-500">Student</h4>
            <dl className="bg-white border border-cream-200 rounded-xl divide-y divide-cream-200">
              {detailRows.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <dt className="text-xs text-temple-500 shrink-0">{label}</dt>
                  <dd className="text-xs font-medium text-temple-900 text-right break-all">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {isSuperAdmin && (
            <EditDetailsSection
              request={r}
              registrations={registrations}
              manager={manager}
              adminUser={adminUser}
              notify={notify}
              onEdited={onEdited}
              onEditorChange={setEditorOpen}
            />
          )}

          {/* Email notification */}
          <section className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-temple-500">Email notification</h4>
            {r.emailSent ? (
              <div className="flex items-start gap-2 text-xs text-emerald-700">
                <MailCheck className="w-4 h-4 shrink-0" />
                <span>
                  Sent to{' '}
                  {Array.isArray(r.emailedTo) && r.emailedTo.length
                    ? r.emailedTo.join(', ')
                    : 'the support inbox'}
                </span>
              </div>
            ) : (
              <p className="flex items-start gap-2 text-xs text-temple-600">
                <MailX className="w-4 h-4 shrink-0 text-temple-400" />
                <span>Not emailed{r.emailError ? `: ${r.emailError}` : '.'} The request is still saved here.</span>
              </p>
            )}
          </section>
        </div>

        {/* Reply actions */}
        <div className="px-5 py-4 border-t border-cream-200 bg-white grid grid-cols-3 gap-2">
          <a
            href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: your help request ${r.reference}`)}&body=${encodeURIComponent('Hare Krishna,\n\n')}`}
            className="col-span-3 sm:col-span-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold"
          >
            <Mail className="w-4 h-4" />Reply
          </a>
          {phoneDigits ? (
            <>
              <a href={`tel:+${phoneDigits}`} className="col-span-3 sm:col-span-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-cream-300 text-xs font-semibold text-temple-700 hover:bg-cream-50">
                <Phone className="w-4 h-4" />Call
              </a>
              <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer" className="col-span-3 sm:col-span-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                <MessageCircle className="w-4 h-4" />WhatsApp
              </a>
            </>
          ) : (
            <p className="col-span-3 sm:col-span-2 self-center text-[11px] text-temple-400 text-center">No mobile number given</p>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
