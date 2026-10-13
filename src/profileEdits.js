// Super Admins changing a participant's details (usually from an "Edit my profile details"
// help request), with a detailed, tamper-proof log of every change:
//   profileEditLogs/{logId}  who changed which fields of which registration, from what to what.
// Both the registration change and its log entry are written in one batch through the
// Super Admin's own Firebase session, so Firestore rules can check who made the change and
// that the log matches a real edit. Logs can never be changed or deleted.
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, where, writeBatch,
} from 'firebase/firestore';
import { db, sanitizeText, saveEmailHint, emailHintKey } from './firebase';
import { managerFirestore, managerAccountEmail } from './quiz/quizAdmin';
import { mobileProblem } from './utils/mobile';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GENDERS = ['Male', 'Female'];
export const OCCUPATIONS = ['Student', 'Working Professional', 'Homemaker', 'Business / Self-employed', 'Other'];

/** Fields a Super Admin may change, in form order. */
export const PROFILE_FIELDS = [
  { key: 'fullName', label: 'Full name', max: 100 },
  { key: 'email', label: 'Email', max: 100 },
  { key: 'mobile', label: 'Mobile number' }, // with countryCode
  { key: 'age', label: 'Age', max: 3 },
  { key: 'gender', label: 'Gender' },
  { key: 'education', label: 'Education', max: 100 },
  { key: 'occupation', label: 'Occupation', max: 100 }, // with otherOccupation when 'Other'
  { key: 'currentResidence', label: 'Current residence', max: 150 },
  { key: 'fullAddress', label: 'Full address', max: 300 },
  { key: 'pincode', label: 'Pincode', max: 10 },
];
const LABEL = Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, f.label]));

const digitsOf = (v) => String(v || '').replace(/\D/g, '');

/** The editable values of a registration, as the form shows them. */
export function profileValues(reg = {}) {
  return {
    fullName: reg.fullName || reg.name || '',
    email: reg.email || reg.emailLower || '',
    countryCode: reg.countryCode || '+91',
    mobile: reg.mobileNumberClean || digitsOf(reg.mobile).slice(-10),
    age: String(reg.age ?? ''),
    gender: reg.gender || '',
    education: reg.education || '',
    occupation: reg.occupation || '',
    otherOccupation: reg.occupation === 'Other' ? reg.otherOccupation || '' : '',
    currentResidence: reg.currentResidence || reg.city || '',
    fullAddress: reg.fullAddress || reg.area || reg.address || '',
    pincode: reg.pincode || '',
  };
}

/** Values trimmed and cleaned the way they are saved. */
function cleanValues(v) {
  const out = {};
  PROFILE_FIELDS.forEach(({ key, max }) => {
    if (key === 'mobile') return;
    out[key] = sanitizeText(String(v[key] ?? '').replace(/\s+/g, ' ').trim(), max || 100);
  });
  out.email = out.email.toLowerCase();
  out.otherOccupation = out.occupation === 'Other' ? sanitizeText(String(v.otherOccupation || '').replace(/\s+/g, ' ').trim(), 100) : '';
  out.age = digitsOf(out.age).slice(0, 3);
  out.countryCode = sanitizeText(v.countryCode || '+91', 10);
  out.mobile = digitsOf(v.mobile).slice(0, 15);
  return out;
}

/**
 * Returns an error message, or '' when the values can be saved. Only the fields being
 * changed are checked, so an odd older value never blocks fixing something else.
 */
export function validateProfile(values, original) {
  const v = cleanValues(values);
  const changed = new Set(diffProfile(original, values).map((c) => c.field));
  if (changed.has('fullName') && v.fullName.length < 2) return 'Please enter the full name.';
  if (changed.has('email') && !EMAIL_RE.test(v.email)) return 'Please enter a valid email address.';
  const m = changed.has('mobile') ? mobileProblem(v.mobile, v.countryCode) : '';
  if (m) return m.replace('your registered', 'a');
  if (changed.has('age') && v.age && !(Number(v.age) >= 10 && Number(v.age) <= 120)) return 'Please enter a valid age.';
  if (changed.has('occupation') && v.occupation === 'Other' && !v.otherOccupation) return 'Please write the occupation.';
  if (changed.has('pincode') && v.pincode && !/^[A-Za-z0-9 -]{3,10}$/.test(v.pincode)) return 'Please enter a valid pincode.';
  return '';
}

/** Changing these after the student has set up their portal login would break it. */
export const LOGIN_FIELDS = ['email', 'mobile'];
export const LOGIN_LOCKED_MESSAGE =
  'This participant has already created their account, so their email and mobile number cannot be changed here: '
  + 'their login, password reset and account recovery all depend on them.';

const shown = (key, v) => {
  if (key === 'mobile') return v.mobile ? `${v.countryCode} ${v.mobile}` : '';
  if (key === 'occupation' && v.occupation === 'Other') return `Other (${v.otherOccupation})`;
  return v[key];
};

/** [{ field, label, from, to }] for every field that changed. */
export function diffProfile(before, after) {
  const a = cleanValues(before);
  const b = cleanValues(after);
  return PROFILE_FIELDS
    .map(({ key }) => ({ field: key, label: LABEL[key], from: String(shown(key, a) || ''), to: String(shown(key, b) || '') }))
    .filter((c) => c.from !== c.to)
    .map((c) => ({ ...c, from: c.from.slice(0, 500), to: c.to.slice(0, 500) }));
}

/** Registration fields to write for the changed values (keeps the older duplicate fields in step). */
function registrationUpdates(changes, v) {
  const u = {};
  changes.forEach(({ field }) => {
    if (field === 'email') { u.email = v.email; u.emailLower = v.email; }
    else if (field === 'mobile') { u.countryCode = v.countryCode; u.mobile = v.mobile; u.mobileNumberClean = v.mobile.slice(-10); }
    else if (field === 'currentResidence') { u.currentResidence = v.currentResidence; u.city = v.currentResidence; }
    else if (field === 'fullAddress') { u.fullAddress = v.fullAddress; u.area = v.fullAddress; }
    else if (field === 'occupation') { u.occupation = v.occupation; u.otherOccupation = v.otherOccupation; }
    else u[field] = v[field];
  });
  return u;
}

export const EDIT_SESSION_ERROR =
  'Your secure Super Admin session is not active. Please log out and log in again, then try once more.';

/** Whether the participant has already set up their student portal login ('linked' | 'not_linked' | 'unknown'). */
export async function fetchPortalStatus(registrationId) {
  const store = managerFirestore();
  if (!store || !registrationId) return 'unknown';
  try {
    const snap = await getDoc(doc(store, 'portalLinks', registrationId));
    return snap.exists() ? 'linked' : 'not_linked';
  } catch (e) {
    return 'unknown';
  }
}

/** Another active registration already using this email / mobile number (its ID), or ''. */
async function contactInUse(store, registrationId, field, value) {
  const col = collection(store, 'BhagavadGita', 'data', 'registrations');
  const snap = await getDocs(query(col, where(field, '==', value), limit(10)));
  const other = snap.docs.find((d) => d.id !== registrationId && !d.data().isDeleted);
  return other ? other.data().registrationId || other.id : '';
}

/**
 * Save the changes and their log entry together. Returns { changes, logId }.
 *  registration: the current record · values: the form · helpRequest: the request it answers (optional)
 */
export async function saveProfileEdit({ registration, values, reason = '', helpRequest = null, adminUser }) {
  const store = managerFirestore();
  const account = managerAccountEmail();
  if (!store || !account) throw new Error(EDIT_SESSION_ERROR);
  const registrationId = registration.registrationId || registration.id;
  const before = profileValues(registration);
  const problem = validateProfile(values, before);
  if (problem) throw new Error(problem);
  const changes = diffProfile(before, values);
  if (!changes.length) throw new Error('Nothing has changed yet.');

  const v = cleanValues(values);
  const fields = changes.map((c) => c.field);
  if (fields.some((f) => LOGIN_FIELDS.includes(f))) {
    // Checked again here, not only in the form
    if ((await fetchPortalStatus(registrationId)) !== 'not_linked') throw new Error(LOGIN_LOCKED_MESSAGE);
    if (fields.includes('email')) {
      const taken = (await contactInUse(store, registrationId, 'emailLower', v.email))
        || (await contactInUse(store, registrationId, 'email', v.email));
      if (taken) throw new Error(`This email is already used by ${taken}. Two registrations cannot share it.`);
    }
    if (fields.includes('mobile')) {
      const taken = await contactInUse(store, registrationId, 'mobileNumberClean', v.mobile.slice(-10));
      if (taken) throw new Error(`This mobile number is already used by ${taken}. Two registrations cannot share it.`);
    }
  }
  const adminEmail = String(adminUser?.email || '').trim().toLowerCase();
  const batch = writeBatch(store);
  batch.update(doc(store, 'BhagavadGita', 'data', 'registrations', registrationId), {
    ...registrationUpdates(changes, v),
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail || account,
  });
  const logRef = doc(collection(store, 'profileEditLogs'));
  batch.set(logRef, {
    registrationId,
    participantName: sanitizeText(v.fullName, 120),
    changes,
    changedFields: changes.map((c) => c.field),
    reason: sanitizeText(String(reason || '').trim(), 500),
    helpRequestId: helpRequest?.id ? String(helpRequest.id).slice(0, 60) : '',
    helpReference: helpRequest?.reference ? String(helpRequest.reference).slice(0, 20) : '',
    editedByEmail: adminEmail || account,
    editedByName: sanitizeText(adminUser?.name || '', 100),
    editedByAccount: account,
    editedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (err) {
    if (err?.code === 'permission-denied') throw new Error(EDIT_SESSION_ERROR);
    throw err;
  }

  // Keep "Don't remember which email you used?" in step (best effort)
  if (changes.some((c) => c.field === 'email' || c.field === 'mobile')) {
    const clean = v.mobile.slice(-10);
    await saveEmailHint(registrationId, { countryCode: v.countryCode, mobileNumberClean: clean, email: v.email }).catch(() => {});
    const oldKey = emailHintKey(before.countryCode, digitsOf(before.mobile).slice(-10));
    if (oldKey !== emailHintKey(v.countryCode, clean)) await deleteDoc(doc(db, 'emailHints', oldKey)).catch(() => {});
  }
  return { changes, logId: logRef.id };
}

/** The latest copy of a registration (so the log records the true "before" values), or null. */
export async function fetchRegistration(registrationId) {
  const snap = await getDoc(doc(db, 'BhagavadGita', 'data', 'registrations', registrationId));
  return snap.exists() && !snap.data().isDeleted ? { id: snap.id, ...snap.data(), registrationId: snap.data().registrationId || snap.id } : null;
}

/** The edit log, newest first (Super Admins only). */
export async function fetchEditLogs(max = 500) {
  const store = managerFirestore();
  if (!store) throw new Error(EDIT_SESSION_ERROR);
  const snap = await getDocs(query(collection(store, 'profileEditLogs'), orderBy('editedAt', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
