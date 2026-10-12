// Super Admin switches that protect data. Stored at adminSettings/controls; the database rules
// read the same record, so a switch that is off is enforced there too, not only hidden in the page.
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isSuperAdminUser } from './firebase';

const controlsRef = (store) => doc(store, 'adminSettings', 'controls');

const SESSION_ERROR = 'Your secure Super Admin session is not active, so nothing was changed. Please open the Quizzes tab once (or log out and log in again), then try again.';

/** { registrationDelete } — off unless a Super Admin turned it on. */
export async function fetchAdminControls() {
  try {
    const snap = await getDoc(controlsRef(db));
    return { registrationDelete: snap.exists() && snap.data().registrationDelete === true };
  } catch (e) {
    return { registrationDelete: false }; // when in doubt, keep data protected
  }
}

/** Turn deleting registrations on or off (Super Admins only). */
export async function setRegistrationDelete(on, callerUser) {
  if (!isSuperAdminUser(callerUser)) throw new Error('Only Super Admins can change this.');
  const { managerFirestore } = await import('./quiz/quizAdmin');
  const store = managerFirestore();
  if (!store) throw new Error(SESSION_ERROR);
  try {
    await setDoc(controlsRef(store), {
      registrationDelete: on === true,
      updatedBy: String(callerUser?.email || '').trim().toLowerCase(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw new Error(err?.code === 'permission-denied' ? SESSION_ERROR : 'Could not save. Please check your connection and try again.');
  }
  return on === true;
}
