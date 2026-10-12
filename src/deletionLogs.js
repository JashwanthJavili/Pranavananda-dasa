// Permanent log of participants deleted (hidden) by Super Admins. Entries are written together
// with the hide itself (see deleteParticipant) and can never be changed or deleted.
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { managerFirestore } from './quiz/quizAdmin';

export async function fetchDeletionLogs(max = 500) {
  const store = managerFirestore();
  if (!store) throw new Error('Your secure Super Admin session is not active.');
  const snap = await getDocs(query(collection(store, 'deletionLogs'), orderBy('deletedAt', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
