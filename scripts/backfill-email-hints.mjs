// One-time backfill: create emailHints/{countryCode+mobile} (masked email only) for every
// existing registration, so "Don't remember which email you used?" works for older records.
// New registrations create their hint automatically.
//
// Deploy the Firestore rules first, then run:
//   node scripts/backfill-email-hints.mjs staging
//   node scripts/backfill-email-hints.mjs production
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfigs } from '../src/config/firebaseConfig.js';

// Keep in sync with maskEmail() in src/firebase.js
function maskEmail(email) {
  const [local = '', domain = ''] = String(email || '').trim().toLowerCase().split('@');
  if (!local || !domain) return '';
  let start = 2;
  let end = local.length >= 7 ? 2 : 1;
  if (local.length <= 3) { start = 1; end = 0; }
  else if (local.length <= 4) { end = 0; }
  const hidden = Math.min(8, Math.max(3, local.length - start - end));
  return `${local.slice(0, start)}${'•'.repeat(hidden)}${end ? local.slice(-end) : ''}@${domain}`;
}

const env = process.argv[2];
if (!firebaseConfigs[env]) {
  console.error('Usage: node scripts/backfill-email-hints.mjs <staging|production>');
  process.exit(1);
}

const db = getFirestore(initializeApp(firebaseConfigs[env]));
const snap = await getDocs(collection(db, 'BhagavadGita', 'data', 'registrations'));
let written = 0, skipped = 0, failed = 0;

for (const d of snap.docs) {
  const r = d.data();
  const masked = maskEmail(r.email || r.emailLower);
  if (r.isDeleted || !r.mobileNumberClean || !masked) { skipped++; continue; }
  try {
    await setDoc(doc(db, 'emailHints', `${r.countryCode || '+91'}${r.mobileNumberClean}`), {
      registrationId: d.id,
      maskedEmail: masked,
      updatedAt: serverTimestamp(),
    });
    written++;
  } catch (err) {
    failed++;
    console.warn(`  ${d.id}: ${err.code || err.message}`);
  }
}
console.log(`[${env}] ${snap.size} registrations: ${written} hints written, ${skipped} skipped (deleted / no mobile / no email), ${failed} failed.`);
process.exit(failed ? 1 : 0);
