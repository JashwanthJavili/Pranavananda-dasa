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

  console.log(`\n${pass} passed, ${fail} failed`);
  await Promise.all(apps.map((a) => deleteApp(a)));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
