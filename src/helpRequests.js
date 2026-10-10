// "Need help" requests from students: saved in Firestore for the admin dashboard,
// and emailed to the support inbox as a notification.
import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, sanitizeText, isSuperAdminUser } from './firebase';
import { mobileProblem } from './utils/mobile';
import { APP_ENV } from './config/firebaseConfig';
import { SUPPORT_EMAIL, FORMSUBMIT_ENDPOINT, HELP_CATEGORIES, HELP_STATUSES } from './config/support';

const helpCol = () => collection(db, 'BhagavadGita', 'data', 'helpRequests');
const COOLDOWN_KEY = 'gfy_help_last_sent';
const COOLDOWN_MS = 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Short reference shown to the student and the admins, e.g. HR-7K2Q9D. */
export const helpReference = (id) => `HR-${String(id).slice(0, 6).toUpperCase()}`;

/** Seconds left before this browser may send another request (simple anti-spam). */
export function helpCooldownLeft() {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    return Math.max(0, Math.ceil((last + COOLDOWN_MS - Date.now()) / 1000));
  } catch (e) {
    return 0;
  }
}

/** Returns an error message, or '' when the request is valid. */
export function validateHelpRequest(req) {
  // Same order as the fields on the form.
  if (!HELP_CATEGORIES.includes(req.category)) return 'Please choose what you need help with.';
  if (!req.message || req.message.trim().length < 10) return 'Please write a few words about your request (at least 10 characters).';
  if (!req.name || req.name.trim().length < 2) return 'Please enter your name.';
  if (!EMAIL_RE.test((req.email || '').trim())) return 'Please enter a valid email address so we can reply to you.';
  const digits = (req.mobile || '').replace(/\D/g, '');
  // Mobile is optional here, but must be valid when given.
  if (digits && mobileProblem(digits, req.countryCode || '+91')) {
    return `${mobileProblem(digits, req.countryCode || '+91')} Or leave it empty.`;
  }
  return '';
}

function emailFields(id, data) {
  return {
    Reference: helpReference(id),
    Name: data.name,
    Email: data.email,
    Mobile: data.mobile ? `${data.countryCode} ${data.mobile}` : 'Not given',
    'Registration ID': data.registrationId || 'Not linked',
    Issue: data.category,
    Message: data.message,
    Environment: APP_ENV,
  };
}

// ---------------------------------------------------------------------------
// Notification recipients (managed by Super Admins in Settings)
// ---------------------------------------------------------------------------
const notifyRef = () => doc(db, 'BhagavadGita', 'data', 'config', 'helpNotifications');

/** Extra emails that receive a copy of every help request (SUPPORT_EMAIL always does). */
export async function fetchHelpNotifyEmails() {
  const snap = await getDoc(notifyRef());
  const list = snap.exists() && Array.isArray(snap.data().emails) ? snap.data().emails : [];
  return list.filter((e) => EMAIL_RE.test(e));
}

export async function saveHelpNotifyEmails(emails, callerUser) {
  if (!isSuperAdminUser(callerUser)) throw new Error('Only Super Admins can change notification emails.');
  const clean = [...new Set(emails.map((e) => String(e).trim().toLowerCase()))]
    .filter((e) => EMAIL_RE.test(e) && e !== SUPPORT_EMAIL);
  await setDoc(notifyRef(), {
    emails: clean,
    updatedBy: callerUser?.email || 'Super Admin',
    updatedAt: serverTimestamp(),
  });
  return clean;
}

/**
 * Email the request to SUPPORT_EMAIL, with copies (CC) to the Super Admin's list.
 * Returns the addresses it was sent to; throws with the provider's reason on failure.
 */
async function emailSupport(id, data) {
  const subject = `[Gita for Youth${APP_ENV === 'staging' ? ' - STAGING' : ''}] Help request ${helpReference(id)}: ${data.category}`;
  const cc = (await fetchHelpNotifyEmails().catch(() => [])).filter((e) => e !== SUPPORT_EMAIL);

  const res = await fetch(FORMSUBMIT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      _replyto: data.email,
      ...(cc.length ? { _cc: cc.join(',') } : {}),
      Reference: helpReference(id),
      Name: data.name,
      Email: data.email,
      Mobile: data.mobile ? `${data.countryCode} ${data.mobile}` : 'Not given',
      'Registration ID': data.registrationId || 'Not linked',
      Issue: data.category,
      Message: data.message,
      Environment: APP_ENV,
    }),
  });
  const body = await res.json().catch(() => ({}));
  // FormSubmit answers success "true" only when the email was accepted.
  if (!res.ok || String(body?.success) !== 'true') {
    throw new Error(body?.message || `Email service responded ${res.status}`);
  }
  return [SUPPORT_EMAIL, ...cc];
}

/**
 * Save the request (the part that must succeed) and then email it (best effort).
 * Returns { id, reference, emailed }.
 */
export async function submitHelpRequest(req) {
  const problem = validateHelpRequest(req);
  if (problem) throw new Error(problem);

  const data = {
    name: sanitizeText(req.name, 100),
    email: sanitizeText(req.email, 100).toLowerCase(),
    countryCode: sanitizeText(req.countryCode || '+91', 10),
    mobile: (req.mobile || '').replace(/\D/g, '').slice(0, 15),
    category: req.category,
    message: sanitizeText(req.message, 2000),
    registrationId: sanitizeText(req.registrationId || '', 30),
    source: sanitizeText(req.source || 'student-portal', 40),
    status: 'Open',
    env: APP_ENV,
    emailSent: false,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(helpCol(), data);
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch (e) {}

  let emailed = false;
  try {
    const sentTo = await emailSupport(ref.id, data);
    emailed = true;
    await updateDoc(ref, { emailSent: true, emailedTo: sentTo }).catch(() => {});
  } catch (err) {
    console.warn('Help request saved, but the email notification failed:', err);
    // Keep the reason so admins can see why it was not emailed.
    await updateDoc(ref, { emailError: String(err?.message || err).slice(0, 300) }).catch(() => {});
  }
  return { id: ref.id, reference: helpReference(ref.id), emailed };
}

/** Live list of help requests for the admin dashboard (newest first). */
export function subscribeToHelpRequests(callback, onError) {
  const q = query(helpCol(), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, reference: helpReference(d.id), ...d.data() }))),
    (err) => {
      console.warn('Help requests listener:', err);
      onError?.(err);
    }
  );
}

export async function updateHelpRequestStatus(id, status, adminUser) {
  if (!HELP_STATUSES.includes(status)) throw new Error('Unknown status');
  await updateDoc(doc(db, 'BhagavadGita', 'data', 'helpRequests', id), {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: adminUser?.email || adminUser?.name || 'Admin',
  });
}
