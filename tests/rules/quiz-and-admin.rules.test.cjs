// Firestore rules tests for the weekly quizzes and admin records.
// Runs ONLY against the local Firebase emulators with made-up data (project "demo-gfy"),
// never against staging or production. Run with:  npm run test:rules
const req = require;
const { initializeApp, deleteApp } = req('firebase/app');
const {
  getAuth, connectAuthEmulator, sendSignInLinkToEmail, signInWithEmailLink,
  createUserWithEmailAndPassword, sendEmailVerification,
} = req('firebase/auth');
const {
  getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection,
  writeBatch, serverTimestamp, query, where, Timestamp,
} = req('firebase/firestore');

const PROJECT = 'demo-gfy';
const FS = 'http://127.0.0.1:8180';
const AUTH = 'http://127.0.0.1:9199';
// Safety: "demo-" projects only exist inside the emulators, so this can never touch real data
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/;
if (!PROJECT.startsWith('demo-') || !LOCAL.test(FS) || !LOCAL.test(AUTH)) {
  throw new Error('Rules tests must run against the local emulators only.');
}
let n = 0;
const apps = [];
function client() {
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT, authDomain: 'localhost' }, `q${n++}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8180);
  return { app, auth, db };
}

// Admin writes that bypass rules (emulator "owner" token)
async function ownerSet(path, fields) {
  const toValue = (v) => (typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) });
  const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toValue(v)])) };
  const res = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ownerSet ${path}: ${res.status} ${await res.text()}`);
}

async function oob(email, type) {
  const { oobCodes } = await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)).json();
  return oobCodes.filter((o) => o.email === email && o.requestType === type).pop();
}

async function verifiedPasswordUser(c, email) {
  const { user } = await createUserWithEmailAndPassword(c.auth, email, 'Secret#123');
  await sendEmailVerification(user);
  const code = await oob(email, 'VERIFY_EMAIL');
  await fetch(code.oobLink.replace('http://127.0.0.1:9199', AUTH));
  await user.reload();
  await user.getIdToken(true);
  return user;
}

async function linkedStudent(c, email, regId, mobile) {
  await sendSignInLinkToEmail(c.auth, email, { url: 'http://localhost:3000/?portal=1', handleCodeInApp: true });
  const code = await oob(email, 'EMAIL_SIGNIN');
  const { user } = await signInWithEmailLink(c.auth, email, code.oobLink);
  const b = writeBatch(c.db);
  b.set(doc(c.db, 'portalLinks', regId), { uid: user.uid, email, mobileClean: mobile, countryCode: '+91', createdAt: serverTimestamp() });
  b.set(doc(c.db, 'portalAccounts', user.uid), { registrationId: regId, email, createdAt: serverTimestamp() });
  await b.commit();
  return user;
}

let pass = 0, fail = 0;
async function expect(name, fn, ok) {
  try {
    await fn();
    if (ok) { pass++; console.log('  PASS', name); } else { fail++; console.log('  FAIL (was allowed)', name); }
  } catch (e) {
    if (!ok) { pass++; console.log('  PASS (denied)', name); } else { fail++; console.log('  FAIL', name, '->', e.code || e.message); }
  }
}

const H = 3600 * 1000;
const ts = (msFromNow) => Timestamp.fromMillis(Date.now() + msFromNow);

function quizData(mgrEmail, over = {}) {
  return {
    title: 'Week 1: Arjuna\'s Dilemma', weekNumber: 1, description: 'Chapter 1', instructions: 'Choose one answer.',
    opensAt: ts(-H), closesAt: ts(24 * H), maxAttempts: 1, scorePolicy: 'best',
    questions: [
      { id: 'q1', type: 'mcq', text: 'Who spoke the Gita?', options: [{ id: 'a', text: 'Krishna' }, { id: 'b', text: 'Arjuna' }] },
      { id: 'q2', type: 'mcq', text: 'Where?', options: [{ id: 'a', text: 'Kurukshetra' }, { id: 'b', text: 'Ayodhya' }] },
    ],
    questionCount: 2, published: true, publishedAt: serverTimestamp(),
    createdAt: serverTimestamp(), createdBy: mgrEmail, updatedAt: serverTimestamp(), updatedBy: mgrEmail,
    ...over,
  };
}
const keyData = { answers: { q1: 'a', q2: 'a' }, explanations: { q1: 'BG 2.2' }, updatedAt: serverTimestamp() };

function submit(c, uid, quizId, regId, nAttempt, answers = { q1: 'a', q2: 'b' }, extra = {}) {
  const b = writeBatch(c.db);
  const pid = `${quizId}_${regId}`;
  b.set(doc(c.db, 'quizAttempts', `${pid}_${nAttempt}`), {
    quizId, registrationId: regId, uid, attemptNumber: nAttempt, answers, submittedAt: serverTimestamp(), ...extra,
  });
  if (nAttempt === 1) {
    b.set(doc(c.db, 'quizProgress', pid), {
      quizId, registrationId: regId, uid, attempts: 1, finished: false,
      firstSubmittedAt: serverTimestamp(), lastSubmittedAt: serverTimestamp(),
    });
  } else {
    b.update(doc(c.db, 'quizProgress', pid), { attempts: nAttempt, lastSubmittedAt: serverTimestamp() });
  }
  return b.commit();
}

(async () => {
  const stamp = Date.now();
  const MGR = `manager${stamp}@example.com`;
  const A = `arjuna${stamp}@example.com`, B = `bhima${stamp}@example.com`;
  const RA = `BG26-9${String(stamp).slice(-4)}`, RB = `BG26-8${String(stamp).slice(-4)}`;
  await ownerSet(`BhagavadGita/data/registrations/${RA}`, { registrationId: RA, email: A, emailLower: A, mobileNumberClean: '9000000001', countryCode: '+91' });
  await ownerSet(`BhagavadGita/data/registrations/${RB}`, { registrationId: RB, email: B, emailLower: B, mobileNumberClean: '9000000002', countryCode: '+91' });
  await ownerSet(`quizManagers/${MGR}`, { name: 'Test Manager' });

  const mgr = client(); await verifiedPasswordUser(mgr, MGR);
  const outsider = client(); await verifiedPasswordUser(outsider, `outsider${stamp}@example.com`);
  const unverifiedMgr = client(); await createUserWithEmailAndPassword(unverifiedMgr.auth, `x${stamp}@example.com`, 'Secret#123');
  const sa = client(); const ua = await linkedStudent(sa, A, RA, '9000000001');
  const sb = client(); const ub = await linkedStudent(sb, B, RB, '9000000002');

  console.log('Quiz managers');
  await expect('manager reads own quizManagers entry', () => getDoc(doc(mgr.db, 'quizManagers', MGR)), true);
  await expect('manager cannot add a quiz manager', () => setDoc(doc(mgr.db, 'quizManagers', 'evil@example.com'), { name: 'x' }), false);
  await expect('student cannot read quizManagers list', () => getDocs(collection(sa.db, 'quizManagers')), false);

  console.log('Creating quizzes');
  const Q1 = `quiz1_${stamp}`, Q2 = `quiz2_${stamp}`, QD = `draft_${stamp}`, QU = `upcoming_${stamp}`, QC = `closed_${stamp}`;
  await expect('outsider (verified, not a manager) cannot create a quiz', () => setDoc(doc(outsider.db, 'portalQuizzes', 'x'), quizData(`outsider${stamp}@example.com`)), false);
  await expect('student cannot create a quiz', () => setDoc(doc(sa.db, 'portalQuizzes', 'x'), quizData(A)), false);
  await expect('manager creates a published quiz', () => setDoc(doc(mgr.db, 'portalQuizzes', Q1), quizData(MGR)), true);
  await expect('manager writes its key', () => setDoc(doc(mgr.db, 'portalQuizKeys', Q1), keyData), true);
  await expect('manager creates a retake quiz (2 attempts)', () => setDoc(doc(mgr.db, 'portalQuizzes', Q2), quizData(MGR, { maxAttempts: 2, title: 'Week 2' })), true);
  await setDoc(doc(mgr.db, 'portalQuizKeys', Q2), keyData);
  await expect('manager creates a draft', () => setDoc(doc(mgr.db, 'portalQuizzes', QD), quizData(MGR, { published: false, publishedAt: null })), true);
  await setDoc(doc(mgr.db, 'portalQuizKeys', QD), keyData);
  await expect('manager creates an upcoming quiz', () => setDoc(doc(mgr.db, 'portalQuizzes', QU), quizData(MGR, { opensAt: ts(48 * H), closesAt: ts(72 * H) })), true);
  await expect('manager creates a closed quiz', () => setDoc(doc(mgr.db, 'portalQuizzes', QC), quizData(MGR, { opensAt: ts(-48 * H), closesAt: ts(-24 * H) })), true);
  await expect('publishing without an opening time is refused', () => setDoc(doc(mgr.db, 'portalQuizzes', 'noopen'), quizData(MGR, { opensAt: null })), false);
  await expect('quiz with an unknown field is refused', () => setDoc(doc(mgr.db, 'portalQuizzes', 'extra'), quizData(MGR, { answers: { q1: 'a' } })), false);
  await expect('maxAttempts above 5 is refused', () => setDoc(doc(mgr.db, 'portalQuizzes', 'many'), quizData(MGR, { maxAttempts: 9 })), false);
  await expect('unverified user cannot create a quiz', () => setDoc(doc(unverifiedMgr.db, 'portalQuizzes', 'u'), quizData(`x${stamp}@example.com`)), false);

  console.log('Student reads');
  await expect('student reads a published quiz', () => getDoc(doc(sa.db, 'portalQuizzes', Q1)), true);
  await expect('student lists published quizzes', () => getDocs(query(collection(sa.db, 'portalQuizzes'), where('published', '==', true))), true);
  await expect('student cannot read a draft', () => getDoc(doc(sa.db, 'portalQuizzes', QD)), false);
  await expect('student cannot list all quizzes', () => getDocs(collection(sa.db, 'portalQuizzes')), false);
  await expect('unlinked verified user cannot read quizzes', () => getDoc(doc(outsider.db, 'portalQuizzes', Q1)), false);
  await expect('student cannot read the key before attempting', () => getDoc(doc(sa.db, 'portalQuizKeys', Q1)), false);
  await expect('student cannot list keys', () => getDocs(collection(sa.db, 'portalQuizKeys')), false);

  console.log('Submitting (1 attempt allowed)');
  await expect('attempt with a score field is refused', () => submit(sa, ua.uid, Q1, RA, 1, undefined, { score: 2 }), false);
  await expect('student B cannot submit for student A', () => submit(sb, ub.uid, Q1, RA, 1), false);
  await expect('student B cannot submit with A\'s uid', () => submit(sb, ua.uid, Q1, RA, 1), false);
  await expect('too many answers are refused', () => submit(sa, ua.uid, Q1, RA, 1, { q1: 'a', q2: 'a', q3: 'a' }), false);
  await expect('progress without an attempt is refused', () => setDoc(doc(sa.db, 'quizProgress', `${Q1}_${RA}`), {
    quizId: Q1, registrationId: RA, uid: ua.uid, attempts: 1, finished: false, firstSubmittedAt: serverTimestamp(), lastSubmittedAt: serverTimestamp(),
  }), false);
  await expect('negative time taken is refused', () => submit(sa, ua.uid, Q1, RA, 1, undefined, { timeTakenSec: -5 }), false);
  await expect('time taken as text is refused', () => submit(sa, ua.uid, Q1, RA, 1, undefined, { timeTakenSec: '4:32' }), false);
  await expect('absurd time taken is refused', () => submit(sa, ua.uid, Q1, RA, 1, undefined, { timeTakenSec: 99999999 }), false);
  await expect('student A submits attempt 1 (with time taken)', () => submit(sa, ua.uid, Q1, RA, 1, undefined, { timeTakenSec: 272 }), true);
  await expect('second attempt beyond the limit is refused', () => submit(sa, ua.uid, Q1, RA, 2), false);
  await expect('re-submitting attempt 1 (overwrite) is refused', () => setDoc(doc(sa.db, 'quizAttempts', `${Q1}_${RA}_1`), {
    quizId: Q1, registrationId: RA, uid: ua.uid, attemptNumber: 1, answers: { q1: 'a', q2: 'a' }, submittedAt: serverTimestamp(),
  }), false);
  await expect('changing answers on attempt 1 is refused', () => updateDoc(doc(sa.db, 'quizAttempts', `${Q1}_${RA}_1`), { answers: { q1: 'a', q2: 'a' } }), false);
  await expect('deleting an attempt is refused', () => deleteDoc(doc(sa.db, 'quizAttempts', `${Q1}_${RA}_1`)), false);
  await expect('resetting progress attempts is refused', () => updateDoc(doc(sa.db, 'quizProgress', `${Q1}_${RA}`), { attempts: 0 }), false);
  await expect('deleting progress is refused', () => deleteDoc(doc(sa.db, 'quizProgress', `${Q1}_${RA}`)), false);
  await expect('student A reads the key after the last attempt', () => getDoc(doc(sa.db, 'portalQuizKeys', Q1)), true);
  await expect('student A reads own progress', () => getDocs(query(collection(sa.db, 'quizProgress'), where('uid', '==', ua.uid))), true);
  await expect('student A reads own attempts', () => getDocs(query(collection(sa.db, 'quizAttempts'), where('uid', '==', ua.uid), where('quizId', '==', Q1))), true);
  await expect('student B cannot read A\'s attempt', () => getDoc(doc(sb.db, 'quizAttempts', `${Q1}_${RA}_1`)), false);
  await expect('student B cannot read A\'s progress', () => getDoc(doc(sb.db, 'quizProgress', `${Q1}_${RA}`)), false);
  await expect('student B cannot list everyone\'s progress', () => getDocs(query(collection(sb.db, 'quizProgress'), where('quizId', '==', Q1))), false);
  await expect('student B cannot read the key (has not attempted)', () => getDoc(doc(sb.db, 'portalQuizKeys', Q1)), false);
  await expect('student cannot change the key', () => setDoc(doc(sa.db, 'portalQuizKeys', Q1), keyData), false);
  await expect('student cannot edit the quiz', () => updateDoc(doc(sa.db, 'portalQuizzes', Q1), { title: 'hacked' }), false);

  console.log('Retakes (2 attempts)');
  await expect('B attempt 1', () => submit(sb, ub.uid, Q2, RB, 1), true);
  await expect('B cannot read key with an attempt left', () => getDoc(doc(sb.db, 'portalQuizKeys', Q2)), false);
  await expect('B cannot skip to attempt 3', () => submit(sb, ub.uid, Q2, RB, 3), false);
  await expect('B attempt 2', () => submit(sb, ub.uid, Q2, RB, 2), true);
  await expect('B reads key after the last attempt', () => getDoc(doc(sb.db, 'portalQuizKeys', Q2)), true);
  await expect('B attempt 3 is refused', () => submit(sb, ub.uid, Q2, RB, 3), false);
  await expect('A attempt 1 on the retake quiz', () => submit(sa, ua.uid, Q2, RA, 1), true);
  await expect('A cannot un-finish or set attempts while finishing', () => updateDoc(doc(sa.db, 'quizProgress', `${Q2}_${RA}`), { finished: true, attempts: 5 }), false);
  await expect('A finishes early', () => updateDoc(doc(sa.db, 'quizProgress', `${Q2}_${RA}`), { finished: true }), true);
  await expect('A reads key after finishing', () => getDoc(doc(sa.db, 'portalQuizKeys', Q2)), true);
  await expect('A cannot retake after finishing', () => submit(sa, ua.uid, Q2, RA, 2), false);

  console.log('Availability');
  await expect('upcoming quiz cannot be submitted', () => submit(sa, ua.uid, QU, RA, 1), false);
  await expect('closed quiz cannot be submitted', () => submit(sa, ua.uid, QC, RA, 1), false);
  await expect('draft quiz cannot be submitted', () => submit(sa, ua.uid, QD, RA, 1), false);
  await updateDoc(doc(mgr.db, 'portalQuizzes', Q1), { published: false, updatedAt: serverTimestamp(), updatedBy: MGR });
  await expect('unpublished quiz cannot be submitted', () => submit(sb, ub.uid, Q1, RB, 1), false);
  await expect('student cannot read an unpublished quiz', () => getDoc(doc(sb.db, 'portalQuizzes', Q1)), false);

  console.log('Manager tracking & history');
  await expect('manager lists progress for a quiz', () => getDocs(query(collection(mgr.db, 'quizProgress'), where('quizId', '==', Q1))), true);
  await expect('manager lists attempts for a quiz', () => getDocs(query(collection(mgr.db, 'quizAttempts'), where('quizId', '==', Q1))), true);
  await expect('outsider cannot list progress', () => getDocs(query(collection(outsider.db, 'quizProgress'), where('quizId', '==', Q1))), false);
  await expect('manager cannot rewrite a student attempt', () => updateDoc(doc(mgr.db, 'quizAttempts', `${Q1}_${RA}_1`), { answers: {} }), false);
  await expect('manager cannot delete progress', () => deleteDoc(doc(mgr.db, 'quizProgress', `${Q1}_${RA}`)), false);
  await expect('manager cannot delete a once-published quiz', () => deleteDoc(doc(mgr.db, 'portalQuizzes', Q1)), false);
  await expect('manager cannot delete its key', () => deleteDoc(doc(mgr.db, 'portalQuizKeys', Q1)), false);
  await expect('manager cannot reset publishedAt', () => updateDoc(doc(mgr.db, 'portalQuizzes', Q1), { publishedAt: null, updatedAt: serverTimestamp(), updatedBy: MGR }), false);
  await expect('manager re-publishes (publishedAt unchanged)', () => updateDoc(doc(mgr.db, 'portalQuizzes', Q1), { published: true, updatedAt: serverTimestamp(), updatedBy: MGR }), true);
  await expect('manager cannot spoof updatedBy', () => updateDoc(doc(mgr.db, 'portalQuizzes', Q1), { updatedBy: 'someone@else.com', updatedAt: serverTimestamp() }), false);
  await expect('manager deletes a never-published draft key', () => deleteDoc(doc(mgr.db, 'portalQuizKeys', QD)), true);
  await expect('manager deletes a never-published draft', () => deleteDoc(doc(mgr.db, 'portalQuizzes', QD)), true);

  console.log('Super Admin role (no quizManagers entry)');
  const SA = `super${stamp}@example.com`, AD = `coord${stamp}@example.com`, RV = `revoked${stamp}@example.com`;
  const adminId = (e) => e.replace(/[^a-z0-9]/g, '_');
  await ownerSet(`BhagavadGita/data/admins/${adminId(SA)}`, { email: SA, role: 'Super Admin', status: 'Active' });
  await ownerSet(`BhagavadGita/data/admins/${adminId(AD)}`, { email: AD, role: 'Admin', status: 'Active' });
  await ownerSet(`BhagavadGita/data/admins/${adminId(RV)}`, { email: RV, role: 'Super Admin', status: 'Revoked' });
  const fake = client(); await createUserWithEmailAndPassword(fake.auth, SA, 'Secret#123');
  await expect('unverified account on a Super Admin\'s email is refused', () => getDocs(query(collection(fake.db, 'portalQuizKeys'))), false);
  const SAv = `v${SA}`;
  await ownerSet(`BhagavadGita/data/admins/${adminId(SAv)}`, { email: SAv, role: 'Super Admin', status: 'Active' });
  const sup = client(); await verifiedPasswordUser(sup, SAv);
  const coord = client(); await verifiedPasswordUser(coord, AD);
  const rev = client(); await verifiedPasswordUser(rev, RV);
  await expect('verified Super Admin can list keys (manager probe)', () => getDocs(query(collection(sup.db, 'portalQuizKeys'))), true);
  await expect('Super Admin creates a quiz', () => setDoc(doc(sup.db, 'portalQuizzes', `sa_${stamp}`), quizData(SAv, { published: false, publishedAt: null })), true);
  await expect('Super Admin reads tracking', () => getDocs(query(collection(sup.db, 'quizProgress'), where('quizId', '==', Q2))), true);
  await expect('regular Admin cannot manage quizzes', () => setDoc(doc(coord.db, 'portalQuizzes', `ad_${stamp}`), quizData(AD, { published: false, publishedAt: null })), false);
  await expect('regular Admin cannot read keys', () => getDocs(query(collection(coord.db, 'portalQuizKeys'))), false);
  await expect('revoked Super Admin cannot manage quizzes', () => getDocs(query(collection(rev.db, 'portalQuizKeys'))), false);
  await expect('student still cannot read keys', () => getDocs(query(collection(sb.db, 'portalQuizKeys'))), false);
  const qa = client(); await createUserWithEmailAndPassword(qa.auth, `${adminId(SA)}@gfy-quiz.invalid`, 'Secret#123');
  await expect('quiz-access account of a Super Admin can manage', () => getDocs(query(collection(qa.db, 'portalQuizKeys'))), true);
  await expect('quiz-access account writes with its own updatedBy', () => setDoc(doc(qa.db, 'portalQuizzes', `qa_${stamp}`), quizData(`${adminId(SA)}@gfy-quiz.invalid`, { published: false, publishedAt: null })), true);
  const qc = client(); await createUserWithEmailAndPassword(qc.auth, `${adminId(AD)}@gfy-quiz.invalid`, 'Secret#123');
  await expect('quiz-access account of a regular Admin is refused', () => getDocs(query(collection(qc.db, 'portalQuizKeys'))), false);
  const qn = client(); await createUserWithEmailAndPassword(qn.auth, `nobody_here@gfy-quiz.invalid`, 'Secret#123');
  await expect('quiz-access account with no admin record is refused', () => getDocs(query(collection(qn.db, 'portalQuizKeys'))), false);

  console.log('Answers stay hidden while a submission is still possible');
  const QG = `grace_${stamp}`;
  await setDoc(doc(mgr.db, 'portalQuizzes', QG), quizData(MGR, { opensAt: ts(-H), closesAt: ts(-30 * 1000), maxAttempts: 2 }));
  await setDoc(doc(mgr.db, 'portalQuizKeys', QG), keyData);
  await expect('student submits attempt 1 in the 2-minute grace after closing', () => submit(sa, ua.uid, QG, RA, 1), true);
  await expect('answers are NOT readable during the grace (attempt 2 still possible)', () => getDoc(doc(sa.db, 'portalQuizKeys', QG)), false);
  await expect('a student who never attempted cannot read the answers', () => getDoc(doc(sb.db, 'portalQuizKeys', QG)), false);
  const QO = `open_${stamp}`;
  await setDoc(doc(mgr.db, 'portalQuizzes', QO), quizData(MGR, { maxAttempts: 2 }));
  await setDoc(doc(mgr.db, 'portalQuizKeys', QO), keyData);
  await expect('student cannot read the answers of an open quiz before submitting', () => getDoc(doc(sb.db, 'portalQuizKeys', QO)), false);
  await expect('student with a retake left cannot read the answers', () => submit(sb, ub.uid, QO, RB, 1).then(() => getDoc(doc(sb.db, 'portalQuizKeys', QO))), false);
  {
    const pub = await getDoc(doc(sa.db, 'portalQuizzes', QG));
    const leaked = JSON.stringify(pub.data()).includes('"answers"');
    leaked ? fail++ : pass++;
    console.log(leaked ? '  FAIL' : '  PASS', 'the quiz a student reads contains no answers');
  }

  console.log('Tracking cache sync (only what changed since the last load)');
  const since = Timestamp.fromMillis(Date.now() - 24 * H);
  await expect('manager reads progress changed since a time', () => getDocs(query(collection(mgr.db, 'quizProgress'), where('lastSubmittedAt', '>=', since))), true);
  await expect('manager reads attempts submitted since a time', () => getDocs(query(collection(mgr.db, 'quizAttempts'), where('submittedAt', '>=', since))), true);
  await expect('manager reads all progress (daily full refresh)', () => getDocs(collection(mgr.db, 'quizProgress')), true);
  await expect('student cannot read all recent attempts', () => getDocs(query(collection(sb.db, 'quizAttempts'), where('submittedAt', '>=', since))), false);
  {
    const recent = await getDocs(query(collection(mgr.db, 'quizAttempts'), where('submittedAt', '>=', since)));
    const ok = recent.docs.some((d) => d.id === `${Q1}_${RA}_1`);
    ok ? pass++ : fail++;
    console.log(ok ? '  PASS' : '  FAIL', 'a new attempt shows up in the "changed since" read');
  }

  console.log('Admin records (only a signed-in Super Admin may touch Super Admin records)');
  const anon = client();
  const ADM = (id) => doc(anon.db, 'BhagavadGita', 'data', 'admins', id);
  const NEWAD = `newcoord${stamp}`, NEWSA = `newsuper${stamp}`;
  await expect('anyone can still add a regular Admin (open until Phase 2)', () => setDoc(ADM(NEWAD), { email: `${NEWAD}@example.com`, role: 'Admin', status: 'Active' }), true);
  await expect('anyone cannot create a Super Admin record', () => setDoc(ADM(NEWSA), { email: `${NEWSA}@example.com`, role: 'Super Admin', status: 'Active' }), false);
  await expect('anyone cannot promote an Admin to Super Admin', () => setDoc(ADM(NEWAD), { role: 'Super Admin' }, { merge: true }), false);
  await expect('anyone cannot change a Super Admin password', () => setDoc(ADM(adminId(SA)), { passwordHash: 'x' }, { merge: true }), false);
  await expect('anyone cannot revoke a Super Admin', () => setDoc(ADM(adminId(SA)), { status: 'Revoked' }, { merge: true }), false);
  await expect('anyone cannot delete a Super Admin', () => deleteDoc(ADM(adminId(SA))), false);
  await expect('a signed-in outsider cannot create a Super Admin', () => setDoc(doc(outsider.db, 'BhagavadGita', 'data', 'admins', NEWSA), { email: 'x@example.com', role: 'Super Admin' }), false);
  await expect('a regular Admin\'s quiz account cannot promote anyone', () => setDoc(doc(qc.db, 'BhagavadGita', 'data', 'admins', NEWAD), { role: 'Super Admin' }, { merge: true }), false);
  const QADM = (id) => doc(qa.db, 'BhagavadGita', 'data', 'admins', id);
  await expect('Super Admin (quiz account) adds a Super Admin', () => setDoc(QADM(NEWSA), { email: `${NEWSA}@example.com`, role: 'Super Admin', status: 'Active' }), true);
  await expect('Super Admin (quiz account) promotes an Admin', () => setDoc(QADM(NEWAD), { role: 'Super Admin' }, { merge: true }), true);
  await expect('Super Admin (quiz account) changes a Super Admin password', () => setDoc(QADM(NEWSA), { passwordHash: 'y' }, { merge: true }), true);
  await expect('Super Admin (quiz account) removes a Super Admin', () => deleteDoc(QADM(NEWSA)), true);
  await expect('registrations are still open to the registration form', () => setDoc(doc(anon.db, 'BhagavadGita', 'data', 'registrations', `T${stamp}`), { fullName: 'Test' }), true);
  await expect('the settings document is still writable', () => setDoc(doc(anon.db, 'BhagavadGita', 'data'), { testFlag: stamp }, { merge: true }), true);

  console.log('Quiz ratings (optional, one per student per quiz)');
  const rating = (quizId, regId, over = {}) => ({
    quizId, registrationId: regId, quizTitle: 'Week 1: Arjuna\'s Dilemma', weekNumber: 1, rating: 5, ratedAt: serverTimestamp(), ...over,
  });
  const RATE = (c, id) => doc(c.db, 'quizRatings', id);
  await expect('student A rates a quiz they submitted', () => setDoc(RATE(sa, `${Q1}_${RA}`), rating(Q1, RA)), true);
  await expect('student A changes their rating', () => setDoc(RATE(sa, `${Q1}_${RA}`), rating(Q1, RA, { rating: 4 })), true);
  await expect('6 stars is refused', () => setDoc(RATE(sa, `${Q1}_${RA}`), rating(Q1, RA, { rating: 6 })), false);
  await expect('0 stars is refused', () => setDoc(RATE(sa, `${Q1}_${RA}`), rating(Q1, RA, { rating: 0 })), false);
  await expect('a fractional rating is refused', () => setDoc(RATE(sa, `${Q1}_${RA}`), rating(Q1, RA, { rating: 4.5 })), false);
  await expect('a rating as text is refused', () => setDoc(RATE(sa, `${Q1}_${RA}`), rating(Q1, RA, { rating: '5' })), false);
  await expect('a wrong quiz title is refused', () => setDoc(RATE(sa, `${Q1}_${RA}`), rating(Q1, RA, { quizTitle: 'Something else' })), false);
  await expect('a wrong week number is refused', () => setDoc(RATE(sa, `${Q1}_${RA}`), rating(Q1, RA, { weekNumber: 7 })), false);
  await expect('an extra field is refused', () => setDoc(RATE(sa, `${Q1}_${RA}`), rating(Q1, RA, { comment: 'x' })), false);
  await expect('a client-chosen time is refused', () => setDoc(RATE(sa, `${Q1}_${RA}`), rating(Q1, RA, { ratedAt: ts(-H) })), false);
  await expect('student B cannot rate a quiz they never submitted', () => setDoc(RATE(sb, `${Q1}_${RB}`), rating(Q1, RB)), false);
  await expect('student B cannot rate as student A', () => setDoc(RATE(sb, `${Q1}_${RA}`), rating(Q1, RA)), false);
  await expect('student B cannot write their rating under A\'s id', () => setDoc(RATE(sb, `${Q1}_${RA}`), rating(Q1, RB)), false);
  await expect('an unlinked user cannot rate', () => setDoc(RATE(outsider, `${Q1}_${RA}`), rating(Q1, RA)), false);
  await expect('a signed-out visitor cannot rate', () => setDoc(RATE(anon, `${Q1}_${RA}`), rating(Q1, RA)), false);
  await expect('student A cannot delete their rating', () => deleteDoc(RATE(sa, `${Q1}_${RA}`)), false);
  await expect('student B rates the retake quiz after submitting', () => setDoc(RATE(sb, `${Q2}_${RB}`), rating(Q2, RB, { quizTitle: 'Week 2', rating: 3 })), true);
  await expect('every admin can read the ratings', () => getDocs(collection(anon.db, 'quizRatings')), true);

  console.log('Suggestions with a rating (private: Super Admins and the writer only)');
  const fb = (quizId, regId, over = {}) => ({ quizId, registrationId: regId, comment: 'More questions from chapter 2, please.', updatedAt: serverTimestamp(), ...over });
  const FB = (c, id) => doc(c.db, 'quizFeedback', id);
  await expect('student A sends a suggestion with their rating', () => setDoc(FB(sa, `${Q1}_${RA}`), fb(Q1, RA)), true);
  await expect('student A updates their suggestion', () => setDoc(FB(sa, `${Q1}_${RA}`), fb(Q1, RA, { comment: 'Clearer instructions.' })), true);
  await expect('student A reads their own suggestion', () => getDoc(FB(sa, `${Q1}_${RA}`)), true);
  await expect('an empty suggestion is refused', () => setDoc(FB(sa, `${Q1}_${RA}`), fb(Q1, RA, { comment: '' })), false);
  await expect('a suggestion over 1000 characters is refused', () => setDoc(FB(sa, `${Q1}_${RA}`), fb(Q1, RA, { comment: 'x'.repeat(1001) })), false);
  await expect('a suggestion with an extra field is refused', () => setDoc(FB(sa, `${Q1}_${RA}`), fb(Q1, RA, { rating: 1 })), false);
  await expect('a suggestion without a rating is refused', () => setDoc(FB(sa, `${QG}_${RA}`), fb(QG, RA)), false);
  await expect('student B cannot write as student A', () => setDoc(FB(sb, `${Q1}_${RA}`), fb(Q1, RA)), false);
  await expect('student B cannot read A\'s suggestion', () => getDoc(FB(sb, `${Q1}_${RA}`)), false);
  await expect('a signed-out visitor cannot read suggestions', () => getDocs(collection(anon.db, 'quizFeedback')), false);
  await expect('a signed-out visitor cannot read one suggestion', () => getDoc(FB(anon, `${Q1}_${RA}`)), false);
  await expect('a regular Admin cannot read suggestions', () => getDocs(collection(qc.db, 'quizFeedback')), false);
  await expect('a student cannot list suggestions', () => getDocs(collection(sa.db, 'quizFeedback')), false);
  await expect('a Super Admin reads all suggestions', () => getDocs(collection(qa.db, 'quizFeedback')), true);
  await expect('nobody can delete a suggestion', () => deleteDoc(FB(sa, `${Q1}_${RA}`)), false);

  console.log('Profile edits by Super Admins (append-only log)');
  const QA_ACCOUNT = `${adminId(SA)}@gfy-quiz.invalid`;
  const editLog = (regId, over = {}) => ({
    registrationId: regId, participantName: 'Arjuna', changes: [{ field: 'mobile', label: 'Mobile number', from: '+91 9000000001', to: '+91 9000000011' }],
    changedFields: ['mobile'], reason: 'As requested', helpRequestId: 'abc', helpReference: 'HR-ABC123',
    editedByEmail: SA, editedByName: 'Super', editedByAccount: QA_ACCOUNT, editedAt: serverTimestamp(), ...over,
  });
  const edit = (c, regId, logOver = {}, regUpdate = { updatedAt: serverTimestamp() }) => {
    const b = writeBatch(c.db);
    if (regUpdate) b.update(doc(c.db, 'BhagavadGita', 'data', 'registrations', regId), regUpdate);
    b.set(doc(collection(c.db, 'profileEditLogs')), editLog(regId, logOver));
    return b.commit();
  };
  await expect('Super Admin reads whether a participant set up the portal', () => getDoc(doc(qa.db, 'portalLinks', RA)), true);
  await expect('another student cannot read that', () => getDoc(doc(sb.db, 'portalLinks', RA)), false);

  const HINT = '+919000000001';
  await setDoc(doc(anon.db, 'emailHints', HINT), { registrationId: RA, maskedEmail: 'ar•••••a1@example.com', updatedAt: serverTimestamp() });
  await expect('a hint that still matches its registration cannot be deleted', () => deleteDoc(doc(anon.db, 'emailHints', HINT)), false);

  await expect('Super Admin changes details with a log entry', () => edit(qa, RA, {}, { mobileNumberClean: '9000000011', mobile: '9000000011', updatedAt: serverTimestamp() }), true);
  await expect('the old mobile number\'s hint can now be removed', () => deleteDoc(doc(anon.db, 'emailHints', HINT)), true);
  await expect('a log entry without the registration change is refused', () => edit(qa, RA, {}, null), false);
  await expect('a log naming another admin as the editor is refused', () => edit(qa, RA, { editedByEmail: AD }), false);
  await expect('a log with someone else\'s account is refused', () => edit(qa, RA, { editedByAccount: `${adminId(AD)}@gfy-quiz.invalid` }), false);
  await expect('a log with a client-chosen time is refused', () => edit(qa, RA, { editedAt: ts(-H) }), false);
  await expect('a log with no changes is refused', () => edit(qa, RA, { changes: [], changedFields: [] }), false);
  await expect('a log with an extra field is refused', () => edit(qa, RA, { approved: true }), false);
  await expect('a log for a registration that does not exist is refused', () => edit(qa, `NOPE${stamp}`, {}, null), false);
  await expect('a regular Admin\'s account cannot write the log', () => edit(qc, RA, { editedByEmail: AD, editedByAccount: `${adminId(AD)}@gfy-quiz.invalid` }), false);
  await expect('a quiz manager who is not a Super Admin cannot write the log', () => edit(mgr, RA, { editedByEmail: MGR, editedByAccount: MGR }), false);
  await expect('a student cannot write the log', () => edit(sa, RA, { editedByEmail: A, editedByAccount: A }), false);
  await expect('a signed-out visitor cannot write the log', () => edit(anon, RA, { editedByEmail: SA }), false);
  await expect('a verified real-email Super Admin can edit', () => edit(sup, RB, { editedByEmail: SAv, editedByAccount: SAv }), true);
  {
    const logs = await getDocs(collection(qa.db, 'profileEditLogs'));
    const first = logs.docs[0];
    await expect('Super Admin reads the log', () => Promise.resolve(logs), true);
    await expect('nobody can change a log entry', () => updateDoc(doc(qa.db, 'profileEditLogs', first.id), { reason: 'changed' }), false);
    // (Super Admins may only clear it with the staging wipe, tested at the end)
    await expect('a regular Admin cannot delete a log entry', () => deleteDoc(doc(qc.db, 'profileEditLogs', first.id)), false);
    await expect('a student cannot delete a log entry', () => deleteDoc(doc(sa.db, 'profileEditLogs', first.id)), false);
  }
  await expect('a regular Admin cannot read the log', () => getDocs(collection(qc.db, 'profileEditLogs')), false);
  await expect('a student cannot read the log', () => getDocs(collection(sa.db, 'profileEditLogs')), false);
  await expect('a signed-out visitor cannot read the log', () => getDocs(collection(anon.db, 'profileEditLogs')), false);

  console.log('Password reset by another Super Admin: fresh quiz access (quizAccount)');
  {
    const SR = `reset${stamp}@example.com`;
    const SRID = adminId(SR);
    await ownerSet(`BhagavadGita/data/admins/${SRID}`, { email: SR, role: 'Super Admin', status: 'Active' });
    const oldQa = client(); await createUserWithEmailAndPassword(oldQa.auth, `${SRID}@gfy-quiz.invalid`, 'OldPass#1');
    await expect('before a reset, the usual quiz account works', () => getDocs(query(collection(oldQa.db, 'portalQuizKeys'))), true);
    const early = client(); await createUserWithEmailAndPassword(early.auth, `${SRID}__abcd1234@gfy-quiz.invalid`, 'Evil#1234');
    await expect('a renewed-looking account the record does not name is refused', () => getDocs(query(collection(early.db, 'portalQuizKeys'))), false);
    const RENEWED = `${SRID}__k3j9x2pq@gfy-quiz.invalid`;
    const fresh = client(); await createUserWithEmailAndPassword(fresh.auth, RENEWED, 'NewPass#1');
    await expect('a regular Admin cannot name a quiz account on a Super Admin', () => setDoc(doc(qc.db, 'BhagavadGita', 'data', 'admins', SRID), { quizAccount: RENEWED }, { merge: true }), false);
    await expect('a visitor cannot set quizAccount on a regular Admin', () => setDoc(doc(anon.db, 'BhagavadGita', 'data', 'admins', NEWAD), { quizAccount: `${NEWAD}__abcd1234@gfy-quiz.invalid` }, { merge: true }), false);
    await expect('a visitor cannot create an admin record with quizAccount', () => setDoc(doc(anon.db, 'BhagavadGita', 'data', 'admins', `x${NEWAD}`), { email: 'x@example.com', role: 'Admin', quizAccount: 'x__abcd1234@gfy-quiz.invalid' }), false);
    await expect('a visitor can still edit other fields of a regular Admin', () => setDoc(doc(anon.db, 'BhagavadGita', 'data', 'admins', `y${NEWAD}`), { email: 'y@example.com', role: 'Admin', status: 'Active' }), true);
    await expect('Super Admin resets the password and names the fresh quiz account', () => setDoc(doc(qa.db, 'BhagavadGita', 'data', 'admins', SRID), { passwordHash: 'new', quizAccount: RENEWED }, { merge: true }), true);
    await expect('the fresh quiz account works', () => getDocs(query(collection(fresh.db, 'portalQuizKeys'))), true);
    await expect('the old quiz account (old password) stops working', () => getDocs(query(collection(oldQa.db, 'portalQuizKeys'))), false);
    await expect('another renewed-looking account is still refused', () => getDocs(query(collection(early.db, 'portalQuizKeys'))), false);
    await expect('the fresh account can manage admin records', () => setDoc(doc(fresh.db, 'BhagavadGita', 'data', 'admins', SRID), { name: 'Reset' }, { merge: true }), true);
    await expect('the fresh account edits details with a log in its name', () => edit(fresh, RA, { editedByEmail: SR, editedByAccount: RENEWED }), true);
    await expect('the fresh account cannot log as another admin', () => edit(fresh, RA, { editedByEmail: SA, editedByAccount: RENEWED }), false);
    await ownerSet(`BhagavadGita/data/admins/${SRID}`, { email: SR, role: 'Super Admin', status: 'Revoked', quizAccount: RENEWED });
    await expect('a revoked Super Admin\'s fresh account is refused', () => getDocs(query(collection(fresh.db, 'portalQuizKeys'))), false);
  }

  console.log('Leftovers of a deleted registration can be cleared (live ones cannot)');
  const LOGIN_B = '+919000000002';
  await expect('student B saves their mobile login', () => setDoc(doc(sb.db, 'portalLogins', LOGIN_B), {
    uid: ub.uid, salt: 's', iv: 'i', data: 'd', updatedAt: serverTimestamp(),
  }), true);
  await expect('a live mobile login cannot be deleted by a visitor', () => deleteDoc(doc(anon.db, 'portalLogins', LOGIN_B)), false);
  await expect('a live claim cannot be deleted', () => deleteDoc(doc(anon.db, 'portalLinks', RB)), false);
  await expect('a live account pointer cannot be deleted by its owner', () => deleteDoc(doc(sb.db, 'portalAccounts', ub.uid)), false);
  {
    // An admin deletes registration RB
    const res = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/BhagavadGita/data/registrations/${RB}`, {
      method: 'DELETE', headers: { Authorization: 'Bearer owner' },
    });
    if (!res.ok) throw new Error(`owner delete: ${res.status}`);
  }
  await expect('another student cannot delete B\'s account pointer', () => deleteDoc(doc(sa.db, 'portalAccounts', ub.uid)), false);
  await expect('the leftover mobile login can now be removed', () => deleteDoc(doc(anon.db, 'portalLogins', LOGIN_B)), true);
  await expect('the leftover claim can now be removed', () => deleteDoc(doc(anon.db, 'portalLinks', RB)), true);
  await expect('a regular Admin cannot remove the leftover account pointer', () => deleteDoc(doc(qc.db, 'portalAccounts', ub.uid)), false);
  await expect('a Super Admin removes the leftover account pointer with the registration', () => deleteDoc(doc(qa.db, 'portalAccounts', ub.uid)), true);
  await expect('student A\'s live records are still protected', () => deleteDoc(doc(anon.db, 'portalLinks', RA)), false);

  console.log('Registrations are never erased; a delete only hides the record and is logged');
  const RD = `BG26-7${String(stamp).slice(-4)}`;
  const ND = `nakula${stamp}@example.com`;
  await ownerSet(`BhagavadGita/data/registrations/${RD}`, { registrationId: RD, fullName: 'Nakula', email: ND, mobileNumberClean: '9000000003', countryCode: '+91', status: 'Confirmed' });
  const REG = (c, id = RD) => doc(c.db, 'BhagavadGita', 'data', 'registrations', id);
  const delLog = (over = {}) => ({
    registrationId: RD, participantName: 'Nakula', participantEmail: ND, participantMobile: '+91 9000000003', reason: 'Duplicate',
    deletedByEmail: SA, deletedByName: 'Super', deletedByAccount: QA_ACCOUNT, deletedAt: serverTimestamp(), ...over,
  });
  const hide = (c, logOver = {}) => {
    const b = writeBatch(c.db);
    b.update(REG(c), { isDeleted: true, status: 'Deleted', deletedAt: serverTimestamp() });
    b.set(doc(collection(c.db, 'deletionLogs')), delLog(logOver));
    return b.commit();
  };
  const logOnly = (c, over = {}) => setDoc(doc(collection(c.db, 'deletionLogs')), delLog(over));
  await expect('a visitor can still register', () => setDoc(REG(anon, `BG26-6${String(stamp).slice(-4)}`), { fullName: 'New', createdAt: serverTimestamp() }), true);
  await expect('details can still be updated (admin edits)', () => updateDoc(REG(anon), { city: 'Mathura' }), true);
  await expect('a visitor cannot erase a registration', () => deleteDoc(REG(anon)), false);
  await expect('a student cannot erase a registration', () => deleteDoc(REG(sa)), false);
  await expect('a regular Admin cannot erase a registration', () => deleteDoc(REG(qc)), false);
  await expect('a visitor cannot hide (delete) a registration', () => updateDoc(REG(anon), { isDeleted: true }), false);
  await expect('a regular Admin cannot hide a registration', () => hide(qc, { deletedByEmail: AD, deletedByAccount: `${adminId(AD)}@gfy-quiz.invalid` }), false);
  await expect('a student cannot hide a registration or write the log', () => hide(sa, { deletedByEmail: A, deletedByAccount: A }), false);
  await expect('a log without hiding the registration is refused', () => logOnly(qa), false);
  await expect('a log naming another admin is refused', () => hide(qa, { deletedByEmail: AD }), false);
  await expect('a log with someone else\'s account is refused', () => hide(qa, { deletedByAccount: `${adminId(AD)}@gfy-quiz.invalid` }), false);
  await expect('a log with a client-chosen time is refused', () => hide(qa, { deletedAt: ts(-H) }), false);
  await expect('a log with an extra field is refused', () => hide(qa, { approved: true }), false);
  await expect('the registration is still visible after the refused attempts', async () => {
    if ((await getDoc(REG(anon))).data().isDeleted) throw new Error('hidden');
  }, true);
  await expect('Super Admin hides a registration together with a log entry', () => hide(qa), true);
  await expect('the hidden registration is kept, so its number stays taken', async () => {
    const s = await getDoc(REG(anon));
    if (!s.exists() || s.data().isDeleted !== true || s.data().fullName !== 'Nakula') throw new Error('not kept');
  }, true);
  await expect('a second log for an already hidden registration is refused', () => logOnly(qa), false);
  {
    const logs = await getDocs(collection(qa.db, 'deletionLogs'));
    await expect('Super Admin reads the deletion log (one entry)', async () => { if (logs.size !== 1) throw new Error(`${logs.size} entries`); }, true);
    const first = logs.docs[0];
    await expect('even a Super Admin cannot change a log entry', () => updateDoc(doc(qa.db, 'deletionLogs', first.id), { reason: 'changed' }), false);
    await expect('even a Super Admin cannot delete a log entry', () => deleteDoc(doc(qa.db, 'deletionLogs', first.id)), false);
    await expect('a visitor cannot delete a log entry', () => deleteDoc(doc(anon.db, 'deletionLogs', first.id)), false);
  }
  await expect('a regular Admin cannot read the deletion log', () => getDocs(collection(qc.db, 'deletionLogs')), false);
  await expect('a student cannot read the deletion log', () => getDocs(collection(sa.db, 'deletionLogs')), false);
  await expect('a visitor cannot read the deletion log', () => getDocs(collection(anon.db, 'deletionLogs')), false);

  console.log('Registration numbers are never reused (the app\'s own numbering code)');
  {
    const { initializeApp: initApp } = await import('firebase/app');
    const fsm = await import('firebase/firestore');
    const { pathToFileURL } = require('url');
    const nums = await import(pathToFileURL(require('path').join(__dirname, '..', '..', 'src', 'registrationNumbers.js')).href);
    const store = (name) => {
      const d = fsm.getFirestore(initApp({ apiKey: 'demo-key', projectId: PROJECT }, name));
      fsm.connectFirestoreEmulator(d, '127.0.0.1', 8180);
      return d;
    };
    const ndb = store(`nums${stamp}`);
    const make = (name, d = ndb) => nums.createRegistrationWithNewNumber(d, { fullName: name, createdAt: fsm.serverTimestamp() });
    const n = nums.registrationNumber;
    const owner = (path, method, body, mask) => fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}${mask ? `?updateMask.fieldPaths=${mask}` : ''}`, {
      method, headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: body && JSON.stringify(body),
    }).then((r) => { if (!r.ok) throw new Error(`owner ${method} ${path}: ${r.status}`); });
    const same = (a, b) => async () => { if (a !== b) throw new Error(`got ${a}, expected ${b}`); };

    const first = await make('First');
    const second = await make('Second');
    await expect('the next registration gets the next number', same(n(second), n(first) + 1), true);
    await owner(`BhagavadGita/data/registrations/${second}`, 'PATCH', { fields: { isDeleted: { booleanValue: true } } }, 'isDeleted');
    const third = await make('Third');
    await expect('a hidden registration\'s number is not given again', same(n(third), n(second) + 1), true);
    await owner(`BhagavadGita/data/registrations/${third}`, 'DELETE');
    const fourth = await make('Fourth');
    await expect('even an erased latest number is not given again', same(n(fourth), n(third) + 1), true);
    await owner('BhagavadGita/data/meta/registrationCounter', 'PATCH', { fields: { last: { integerValue: '0' } } });
    const fifth = await make('Fifth');
    await expect('a counter set back to 0 does not cause reuse', same(n(fifth), n(fourth) + 1), true);
    await ownerSet(`BhagavadGita/data/registrations/BG26-${n(fifth) + 1}`, { fullName: 'Already there' });
    const sixth = await make('Sixth');
    await expect('a number that is already taken is skipped', same(n(sixth), n(fifth) + 2), true);
    {
      const ids = await Promise.all(Array.from({ length: 8 }, (_, i) => make(`Same moment ${i}`, store(`par${stamp}_${i}`))));
      const got = ids.map(n).sort((a, b) => a - b);
      const want = Array.from({ length: 8 }, (_, i) => n(sixth) + 1 + i);
      await expect('8 people registering at the same moment get 8 different numbers, in order', same(got.join(','), want.join(',')), true);
    }
    {
      const dead = store(`dead${stamp}`);
      await fsm.terminate(dead);
      await expect('when the latest number cannot be read, nothing is guessed or saved', async () => {
        try { await make('Offline', dead); } catch (e) { if (e.name === 'RegistrationNumberError') return; throw e; }
        throw new Error('a number was given out');
      }, true);
    }
  }

  console.log('Staging test-data wipe (Super Admins, staging project only)');
  // Runs last: it deletes what the tests above created
  await expect('a student cannot delete their attempt', () => deleteDoc(doc(sa.db, 'quizAttempts', `${Q1}_${RA}_1`)), false);
  await expect('a regular Admin cannot delete attempts', () => deleteDoc(doc(qc.db, 'quizAttempts', `${Q1}_${RA}_1`)), false);
  await expect('a quiz manager who is not a Super Admin cannot delete attempts', () => deleteDoc(doc(mgr.db, 'quizAttempts', `${Q1}_${RA}_1`)), false);
  await expect('a signed-out visitor cannot list portal logins', () => getDocs(collection(anon.db, 'portalLogins')), false);
  await expect('a student cannot list email hints', () => getDocs(collection(sa.db, 'emailHints')), false);
  await expect('Super Admin lists portal accounts for the wipe', () => getDocs(collection(qa.db, 'portalAccounts')), true);
  await expect('Super Admin lists portal logins for the wipe', () => getDocs(collection(qa.db, 'portalLogins')), true);
  await expect('Super Admin lists email hints for the wipe', () => getDocs(collection(qa.db, 'emailHints')), true);
  for (const name of ['quizFeedback', 'quizRatings', 'quizAttempts', 'quizProgress', 'portalQuizKeys', 'portalQuizzes', 'profileEditLogs', 'portalLogins', 'portalAccounts', 'portalLinks', 'emailHints']) {
    await expect(`Super Admin wipes ${name}`, async () => {
      const snap = await getDocs(collection(qa.db, name));
      const b = writeBatch(qa.db);
      snap.docs.forEach((d) => b.delete(d.ref));
      await b.commit();
      const after = await getDocs(collection(qa.db, name));
      if (!after.empty) throw new Error(`${after.size} left`);
    }, true);
  }
  {
    // Rules decide by the project the sign-in token was issued for
    const rules = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
    const ok = /request\.auth\.token\.aud in \['gitaforyouth-stg', 'demo-gfy'\]/.test(rules) && !/forseva-21d12'\]/.test(rules);
    ok ? pass++ : fail++;
    console.log(ok ? '  PASS' : '  FAIL', 'the wipe is limited to the staging (and emulator) project, never production');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await Promise.all(apps.map((a) => deleteApp(a)));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
