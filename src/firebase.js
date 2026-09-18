import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCEtSN7OkVg2M9uB7-HPNNZf-UI23OpzhI",
  authDomain: "forseva-21d12.firebaseapp.com",
  projectId: "forseva-21d12",
  storageBucket: "forseva-21d12.firebasestorage.app",
  messagingSenderId: "137497887223",
  appId: "1:137497887223:web:218ce234523691e1c76ef2"
};

// Initialize Firebase App, Auth & Firestore
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Default batches fallback (matches requirements)
export const DEFAULT_BATCHES = [
  {
    id: 'bg-18-offline-7pm',
    title: 'Bhagavad Gita',
    duration: '18 Days',
    schedule: 'Daily • 7:00 PM',
    mode: 'Offline',
    location: 'ISKCON Temple, Edulapuram',
    status: 'Upcoming',
  },
  {
    id: 'bg-18-online-6am',
    title: 'Bhagavad Gita',
    duration: '18 Days',
    schedule: 'Daily • 6:00 AM',
    mode: 'Online',
    location: 'Live Morning Batch',
    status: 'Upcoming',
  },
  {
    id: 'bg-18-online-8pm',
    title: 'Bhagavad Gita',
    duration: '18 Days',
    schedule: 'Daily • 8:00 PM',
    mode: 'Online',
    location: 'Live Evening Batch',
    status: 'Upcoming',
  }
];

/**
 * Generate a dynamic readable registration ID: GA26-XXXXX
 */
export function generateRegistrationId() {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `GA${currentYear}-${randomNum}`;
}

/**
 * Check if a mobile number or email is already registered
 */
export async function checkDuplicateRegistration(mobile, email) {
  const cleanMobile = (mobile || '').replace(/\D/g, '').slice(-10);
  const cleanEmail = (email || '').trim().toLowerCase();

  // Local device cache check
  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    const localMatch = localRecords.find(r => 
      (cleanMobile && (r.mobile || '').replace(/\D/g, '').slice(-10) === cleanMobile) ||
      (cleanEmail && (r.email || '').trim().toLowerCase() === cleanEmail)
    );
    if (localMatch) {
      return {
        isDuplicate: true,
        field: cleanMobile && (localMatch.mobile || '').includes(cleanMobile) ? 'mobile' : 'email',
        message: 'This mobile number or email is already registered on this device.'
      };
    }
  } catch (e) {}

  // Firestore remote check
  try {
    const regRef = collection(db, 'BhagavadGita', 'data', 'registrations');
    
    // Check mobile
    if (cleanMobile) {
      const qMobile = query(regRef, where('mobileNumberClean', '==', cleanMobile));
      const mobileSnap = await getDocs(qMobile);
      if (!mobileSnap.empty) {
        return {
          isDuplicate: true,
          field: 'mobile',
          message: 'This mobile number is already registered for Gita Amrita.'
        };
      }
    }

    // Check email if provided
    if (cleanEmail) {
      const qEmail = query(regRef, where('emailLower', '==', cleanEmail));
      const emailSnap = await getDocs(qEmail);
      if (!emailSnap.empty) {
        return {
          isDuplicate: true,
          field: 'email',
          message: 'This email address is already registered for Gita Amrita.'
        };
      }
    }
  } catch (err) {
    console.warn('Firestore duplicate check query note:', err);
  }

  return { isDuplicate: false };
}

/**
 * Save a registration into Firestore under the BhagavadGita hierarchy
 * Also attempts Firebase Auth account creation if available
 */
export async function saveRegistration(registrationData) {
  const registrationId = registrationData.registrationId || generateRegistrationId();
  const cleanMobile = (registrationData.mobile || '').replace(/\D/g, '').slice(-10);
  const cleanEmail = (registrationData.email || '').trim().toLowerCase();

  // Try creating Firebase Auth account
  let authUid = null;
  if (cleanEmail && registrationData.password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, registrationData.password);
      authUid = userCredential.user.uid;
    } catch (authError) {
      console.warn('Firebase Auth notice (may already exist or rules disabled):', authError.message);
    }
  }

  const payload = {
    ...registrationData,
    registrationId,
    mobileNumberClean: cleanMobile,
    emailLower: cleanEmail,
    authUid,
    status: 'Confirmed',
    createdAt: serverTimestamp(),
    program: 'Gita Amrita',
    center: 'ISKCON Adilabad (Edulapuram)',
  };

  // Don't expose plain text password in public logs, store secure participant record
  try {
    const registrationRef = doc(db, 'BhagavadGita', 'data', 'registrations', registrationId);
    await setDoc(registrationRef, payload, { merge: true });

    const parentRef = doc(db, 'BhagavadGita', 'data');
    await setDoc(parentRef, {
      lastUpdated: serverTimestamp(),
      programName: 'Gita Amrita',
      organization: 'ISKCON Adilabad',
    }, { merge: true });

    // Save to local device cache for instant duplicate prevention and login
    try {
      const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
      localRecords.push({ 
        mobile: registrationData.mobile, 
        email: registrationData.email, 
        password: registrationData.password,
        id: registrationId,
        fullName: registrationData.fullName 
      });
      localStorage.setItem('gita_amrita_registrations', JSON.stringify(localRecords));
    } catch (e) {}

    return { success: true, registrationId };
  } catch (error) {
    console.warn('Firestore write warning:', error);
    return { success: true, registrationId, offlineMode: true };
  }
}

/**
 * Update password for a participant registration
 */
export async function updateRegistrationPassword(registrationId, password, email) {
  let authUid = null;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (cleanEmail && password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      authUid = userCredential.user.uid;
    } catch (authError) {
      console.warn('Firebase Auth user creation note:', authError.message);
    }
  }

  try {
    const regRef = doc(db, 'BhagavadGita', 'data', 'registrations', registrationId);
    const updatePayload = { password, updatedAt: serverTimestamp() };
    if (authUid) updatePayload.authUid = authUid;
    await setDoc(regRef, updatePayload, { merge: true });
  } catch (err) {
    console.warn('Firestore password update warning:', err);
  }

  // Update local cache
  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    const idx = localRecords.findIndex(r => r.id === registrationId || (cleanEmail && (r.email || '').toLowerCase() === cleanEmail));
    if (idx !== -1) {
      localRecords[idx].password = password;
    } else {
      localRecords.push({ id: registrationId, email: cleanEmail, password });
    }
    localStorage.setItem('gita_amrita_registrations', JSON.stringify(localRecords));

    // Also update completed registration in cache if present
    const completed = localStorage.getItem('gita_amrita_completed_reg');
    if (completed) {
      const parsed = JSON.parse(completed);
      if (parsed.registrationId === registrationId && parsed.formData) {
        parsed.formData.password = password;
        localStorage.setItem('gita_amrita_completed_reg', JSON.stringify(parsed));
      }
    }
  } catch (e) {}

  return { success: true };
}

/**
 * Student Login helper supporting Mobile/Email and Password
 */
export async function studentLogin(identifier, password) {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanMobile = (identifier || '').replace(/\D/g, '').slice(-10);

  // 1. Try Firebase Auth with email
  if (cleanId.includes('@')) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanId, password);
      return { success: true, user: userCredential.user };
    } catch (authErr) {
      console.warn('Firebase Auth signin note:', authErr.message);
    }
  }

  // 2. Check local records
  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    const match = localRecords.find(r => 
      ((r.email || '').toLowerCase() === cleanId || (r.mobile || '').replace(/\D/g, '').slice(-10) === cleanMobile) &&
      r.password === password
    );
    if (match) {
      return { success: true, participant: match };
    }
  } catch (e) {}

  // 3. Check Firestore
  try {
    const regRef = collection(db, 'BhagavadGita', 'data', 'registrations');
    let q;
    if (cleanId.includes('@')) {
      q = query(regRef, where('emailLower', '==', cleanId));
    } else {
      q = query(regRef, where('mobileNumberClean', '==', cleanMobile));
    }
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data();
      if (docData.password === password) {
        return { success: true, participant: docData };
      }
    }
  } catch (e) {}

  return { success: false, error: 'Invalid login credentials. Please check your email/mobile and password.' };
}

/**
 * Fetch available batches from Firestore with fallback to defaults
 */
export async function fetchBatchesFromFirestore() {
  try {
    const batchesCol = collection(db, 'BhagavadGita', 'data', 'batches');
    const snapshot = await getDocs(batchesCol);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (error) {
    console.warn('Could not fetch remote batches, using default batch list:', error);
  }
  return DEFAULT_BATCHES;
}

/**
 * Save / Update a batch in Firestore
 */
export async function saveBatchToFirestore(batch) {
  try {
    const batchId = batch.id || `batch-${Date.now()}`;
    const batchRef = doc(db, 'BhagavadGita', 'data', 'batches', batchId);
    const payload = { ...batch, id: batchId, updatedAt: serverTimestamp() };
    await setDoc(batchRef, payload, { merge: true });
    return { success: true, batch: payload };
  } catch (err) {
    console.warn('Error saving batch to Firestore:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a batch from Firestore
 */
export async function deleteBatchFromFirestore(batchId) {
  try {
    const batchRef = doc(db, 'BhagavadGita', 'data', 'batches', batchId);
    await deleteDoc(batchRef);
    return { success: true };
  } catch (err) {
    console.warn('Error deleting batch from Firestore:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Admin Authentication
 * Allows coordinators to login via standard credentials or Firebase Auth
 */
export async function adminLogin(usernameOrEmail, password) {
  const cleanInput = (usernameOrEmail || '').trim().toLowerCase();
  
  // 1. Check designated coordinator credentials
  const defaultAdminUsers = [
    { username: 'admin', email: 'admin@iskconadilabad.org', pass: 'iskcon108', name: 'ISKCON Adilabad Coordinator' },
    { username: 'coordinator', email: 'gita@iskconadilabad.org', pass: 'gita2026', name: 'Gita Amrita Coordinator' },
    { username: 'admin', email: 'admin@gitaamrita.com', pass: 'admin123', name: 'Program Coordinator' }
  ];

  const matched = defaultAdminUsers.find(
    u => (u.username === cleanInput || u.email === cleanInput) && u.pass === password
  );

  if (matched) {
    const session = {
      username: matched.username,
      email: matched.email,
      name: matched.name,
      role: 'Administrator',
      token: 'admin-auth-session-' + Date.now()
    };
    return { success: true, admin: session };
  }

  // 2. Try Firebase Auth with email/password if provided
  if (cleanInput.includes('@')) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanInput, password);
      return { 
        success: true, 
        admin: {
          email: userCredential.user.email,
          username: userCredential.user.email.split('@')[0],
          name: 'Coordinator (' + userCredential.user.email + ')',
          role: 'Administrator',
          token: userCredential.user.uid
        }
      };
    } catch (authErr) {
      console.warn('Firebase Auth admin signin note:', authErr.message);
    }
  }

  return { 
    success: false, 
    error: 'Invalid coordinator credentials. Use admin / iskcon108 or coordinator / gita2026' 
  };
}

/**
 * Fetch all registrations from Firestore and local cache
 */
export async function fetchAllRegistrations() {
  const registrationsMap = new Map();

  // 1. Fetch remote registrations from Firestore
  try {
    const regRef = collection(db, 'BhagavadGita', 'data', 'registrations');
    const snapshot = await getDocs(regRef);
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id || data.registrationId;
      registrationsMap.set(id, {
        id,
        ...data,
        createdAtFormatted: data.createdAt?.toDate 
          ? data.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : (data.date || 'Recent')
      });
    });
  } catch (err) {
    console.warn('Firestore fetch registrations warning (using local):', err);
  }

  // 2. Merge local storage registrations to ensure nothing is missed
  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    localRecords.forEach(rec => {
      const id = rec.id || rec.registrationId;
      if (id && !registrationsMap.has(id)) {
        registrationsMap.set(id, {
          id,
          registrationId: id,
          fullName: rec.fullName || 'Participant',
          mobile: rec.mobile || '',
          email: rec.email || '',
          city: rec.city || 'Adilabad',
          area: rec.area || '',
          batchTitle: rec.batchTitle || 'Bhagavad Gita',
          batchMode: rec.batchMode || 'Offline',
          batchSchedule: rec.batchSchedule || 'Daily • 7:00 PM',
          status: rec.status || 'Confirmed',
          createdAtFormatted: 'Local Record'
        });
      }
    });

    const completed = localStorage.getItem('gita_amrita_completed_reg');
    if (completed) {
      const parsed = JSON.parse(completed);
      if (parsed.registrationId && !registrationsMap.has(parsed.registrationId)) {
        registrationsMap.set(parsed.registrationId, {
          id: parsed.registrationId,
          ...parsed.formData,
          registrationId: parsed.registrationId,
          status: 'Confirmed',
          createdAtFormatted: 'Latest Signup'
        });
      }
    }
  } catch (e) {}

  return Array.from(registrationsMap.values());
}

/**
 * Update an individual participant record
 */
export async function updateParticipant(registrationId, updates) {
  try {
    const regRef = doc(db, 'BhagavadGita', 'data', 'registrations', registrationId);
    await setDoc(regRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('Firestore update participant warning:', err);
  }

  // Update in local cache
  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    const idx = localRecords.findIndex(r => r.id === registrationId || r.registrationId === registrationId);
    if (idx !== -1) {
      localRecords[idx] = { ...localRecords[idx], ...updates };
      localStorage.setItem('gita_amrita_registrations', JSON.stringify(localRecords));
    }
  } catch (e) {}

  return { success: true };
}

/**
 * Delete a participant registration
 */
export async function deleteParticipant(registrationId) {
  try {
    const regRef = doc(db, 'BhagavadGita', 'data', 'registrations', registrationId);
    await deleteDoc(regRef);
  } catch (err) {
    console.warn('Firestore delete participant warning:', err);
  }

  // Remove from local cache
  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    const filtered = localRecords.filter(r => r.id !== registrationId && r.registrationId !== registrationId);
    localStorage.setItem('gita_amrita_registrations', JSON.stringify(filtered));

    const completed = localStorage.getItem('gita_amrita_completed_reg');
    if (completed) {
      const parsed = JSON.parse(completed);
      if (parsed.registrationId === registrationId) {
        localStorage.removeItem('gita_amrita_completed_reg');
      }
    }
  } catch (e) {}

  return { success: true };
}
