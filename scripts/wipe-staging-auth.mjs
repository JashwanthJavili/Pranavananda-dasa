// STAGING ONLY: delete every student sign-in account (Firebase Authentication) so testing can
// start fresh. Admin sign-ins are kept: anyone with an admin record, their quiz-access
// accounts (<doc id>@gfy-quiz.invalid) and quizManagers entries.
// Use together with Settings -> Danger zone -> "Delete all staging data", which clears the
// database (the website cannot delete other people's sign-in accounts).
//
// Needs a service account key for the STAGING project, downloaded by you from:
//   Firebase console -> gitaforyouth-stg -> Project settings -> Service accounts -> Generate new private key
// Keep that file outside this repo and never commit it. Then:
//   node scripts/wipe-staging-auth.mjs <path-to-key.json>          (dry run: only lists what would go)
//   node scripts/wipe-staging-auth.mjs <path-to-key.json> --yes    (deletes)
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const STAGING = 'gitaforyouth-stg';
const [keyPath, flag] = process.argv.slice(2);
if (!keyPath) {
  console.error('Usage: node scripts/wipe-staging-auth.mjs <path-to-staging-service-account.json> [--yes]');
  process.exit(1);
}

const key = JSON.parse(readFileSync(keyPath, 'utf8'));
// Safety: refuse anything but the staging project, whatever key is given
if (key.project_id !== STAGING) {
  console.error(`Refusing to run: this key is for "${key.project_id}", not the staging project "${STAGING}".`);
  process.exit(1);
}
const app = initializeApp({ credential: cert(key), projectId: STAGING });
const auth = getAuth(app);
const db = getFirestore(app);

// Who to keep
const lower = (e) => String(e || '').trim().toLowerCase();
const docIdOf = (email) => lower(email).replace(/[^a-z0-9]/g, '_');
const admins = await db.collection('BhagavadGita').doc('data').collection('admins').get();
const keepEmails = new Set();
const keepQuizIds = new Set();
admins.docs.forEach((d) => {
  const a = d.data();
  if (a.isDeleted) return;
  if (a.email) keepEmails.add(lower(a.email));
  keepQuizIds.add(d.id);
  if (a.email) keepQuizIds.add(docIdOf(a.email));
});
(await db.collection('quizManagers').get()).docs.forEach((d) => keepEmails.add(lower(d.id)));

const isAdmin = (u) => {
  const e = lower(u.email);
  if (!e) return false;
  if (keepEmails.has(e)) return true;
  const quiz = e.match(/^([a-z0-9_]+)@gfy-quiz\.invalid$/);
  return Boolean(quiz && keepQuizIds.has(quiz[1]));
};

// Every account, a page at a time
const remove = [];
let kept = 0;
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  page.users.forEach((u) => (isAdmin(u) ? kept++ : remove.push(u)));
  pageToken = page.pageToken;
} while (pageToken);

console.log(`Project: ${STAGING}`);
console.log(`Admin sign-ins kept: ${kept}`);
console.log(`Student sign-ins to delete: ${remove.length}`);
remove.slice(0, 20).forEach((u) => console.log(`  - ${u.email || u.phoneNumber || u.uid}`));
if (remove.length > 20) console.log(`  … and ${remove.length - 20} more`);

if (flag !== '--yes') {
  console.log('\nDry run only. Nothing was deleted. Add --yes to delete these accounts.');
  process.exit(0);
}

let deleted = 0;
let failed = 0;
for (let i = 0; i < remove.length; i += 1000) {
  const res = await auth.deleteUsers(remove.slice(i, i + 1000).map((u) => u.uid));
  deleted += res.successCount;
  failed += res.failureCount;
}
console.log(`\nDeleted ${deleted} student sign-in account${deleted === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}.`);
process.exit(failed ? 1 : 0);
