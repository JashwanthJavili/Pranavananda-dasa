// STAGING ONLY: delete all test data so testing can start fresh.
// Firestore rules allow these deletes only to a signed-in Super Admin whose sign-in belongs
// to the staging project, so this cannot run against production even if called there.
// Kept: admin accounts, program settings and configuration, and (unless asked) the quizzes
// and announcements admins created.
import { collection, getDocs, limit, query, writeBatch } from 'firebase/firestore';
import { APP_ENV, firebaseConfig } from './config/firebaseConfig';
import { managerFirestore, clearTrackingCache } from './quiz/quizAdmin';
import { clearAllEditorCaches, setEditorCacheEnabled } from './quiz/editorCache';

export const STAGING_PROJECT_ID = 'gitaforyouth-stg';
export const isStagingBuild = () => APP_ENV === 'staging' && firebaseConfig.projectId === STAGING_PROJECT_ID;

// Deleted in this order (answer keys before quizzes, attempts before progress)
export const WIPE_COLLECTIONS = [
  { label: 'Quiz feedback', path: ['quizFeedback'] },
  { label: 'Quiz ratings', path: ['quizRatings'] },
  { label: 'Quiz attempts', path: ['quizAttempts'] },
  { label: 'Quiz progress', path: ['quizProgress'] },
  { label: 'Quiz answer keys', path: ['portalQuizKeys'], adminContent: true },
  { label: 'Quizzes', path: ['portalQuizzes'], adminContent: true },
  { label: 'Profile edit log', path: ['profileEditLogs'] },
  { label: 'Help requests', path: ['BhagavadGita', 'data', 'helpRequests'] },
  { label: 'Announcements', path: ['BhagavadGita', 'data', 'announcements'], adminContent: true },
  { label: 'Student portal logins', path: ['portalLogins'] },
  { label: 'Student portal accounts', path: ['portalAccounts'] },
  { label: 'Student portal links', path: ['portalLinks'] },
  { label: 'Email hints', path: ['emailHints'] },
  { label: 'Registrations', path: ['BhagavadGita', 'data', 'registrations'] },
  { label: 'Registration number counter', path: ['BhagavadGita', 'data', 'meta'] },
  { label: 'Archived backups (trash)', path: ['BhagavadGita', 'data', 'trash'] },
  { label: 'Old backups (root trash)', path: ['trash'] },
];

export const WIPE_KEEPS = ['Admin and Super Admin accounts (and their sign-ins)', 'Program settings and registration status', 'WhatsApp and help email settings', 'Deletion log (it can never be deleted)'];

/** What a wipe deletes: all participant data, plus quizzes and announcements when asked. */
export const wipeTargets = (includeAdminContent) => WIPE_COLLECTIONS.filter((c) => includeAdminContent || !c.adminContent);

const PAGE = 400;

/** Delete every document in one collection, a page at a time. Returns how many were deleted. */
async function clearCollection(store, path, onCount) {
  let total = 0;
  for (;;) {
    const snap = await getDocs(query(collection(store, ...path), limit(PAGE)));
    if (snap.empty) return total;
    const batch = writeBatch(store);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    onCount?.(total);
    if (snap.size < PAGE) return total;
  }
}

/**
 * Wipe all staging test data. onProgress({ index, label, deleted, done }) after each step
 * (index into wipeTargets(includeAdminContent)). Returns [{ label, deleted, error? }].
 */
export async function wipeStagingData(onProgress, { includeAdminContent = false } = {}) {
  if (!isStagingBuild()) throw new Error('This is only available on the staging site.');
  const store = managerFirestore();
  if (!store) throw new Error('Your secure Super Admin session is not active. Please log out and log in again.');

  const targets = wipeTargets(includeAdminContent);
  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const { label, path } = targets[i];
    onProgress?.({ index: i, label, deleted: 0, done: false });
    try {
      const deleted = await clearCollection(store, path, (n) => onProgress?.({ index: i, label, deleted: n, done: false }));
      results.push({ label, deleted });
      onProgress?.({ index: i, label, deleted, done: true });
    } catch (err) {
      results.push({ label, deleted: 0, error: err?.code === 'permission-denied' ? 'Not allowed' : 'Failed' });
      onProgress?.({ index: i, label, deleted: 0, done: true, error: true });
    }
  }

  // Copies kept in this browser
  clearTrackingCache();
  clearAllEditorCaches();
  setEditorCacheEnabled(true); // still signed in, so keep autosaving the quiz editor
  try {
    ['gita_amrita_registrations', 'gita_amrita_cached_admin_regs'].forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
  return results;
}
