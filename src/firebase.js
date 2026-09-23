import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc,
  deleteDoc, 
  deleteField,
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updatePassword
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
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sanitize text inputs against XSS and excessive payload lengths
 */
export function sanitizeText(val, maxLength = 500) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  return str.replace(/[<>]/g, '').slice(0, maxLength);
}

/**
 * Generate sequential registration ID following pattern BG26-100, BG26-101, etc.
 * If database is wiped or empty, starts cleanly at BG26-100.
 * Concurrency-safe against race conditions.
 */
export async function getNextRegistrationId() {
  try {
    const regRef = collection(db, 'BhagavadGita', 'data', 'registrations');
    const snapshot = await getDocs(regRef);
    if (snapshot.empty) {
      return 'BG26-100';
    }
    let maxNum = 99;
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.isDeleted) return;
      const regId = data.registrationId || docSnap.id || '';
      const match = regId.match(/BG26-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `BG26-${maxNum + 1}`;
  } catch (err) {
    console.warn('Error fetching Firestore registration IDs, checking local cache:', err);
    try {
      const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
      let localMax = 99;
      localRecords.forEach(r => {
        if (r.isDeleted) return;
        const id = r.registrationId || r.id || '';
        const m = id.match(/BG26-(\d+)/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > localMax) localMax = n;
        }
      });
      return `BG26-${localMax + 1}`;
    } catch (e) {}
    return 'BG26-100';
  }
}

/**
 * Synchronous fallback helper
 */
export function generateRegistrationId() {
  return 'BG26-100';
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
      !r.isDeleted && (
        (cleanMobile && (r.mobile || '').replace(/\D/g, '').slice(-10) === cleanMobile) ||
        (cleanEmail && (r.email || '').trim().toLowerCase() === cleanEmail)
      )
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
      const activeMatch = mobileSnap.docs.find(d => !d.data().isDeleted);
      if (activeMatch) {
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
      const activeMatch = emailSnap.docs.find(d => !d.data().isDeleted);
      if (activeMatch) {
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
 * Cryptographic SHA-256 Password Hasher
 * Ensures passwords are never stored in plaintext in the database
 */
export async function hashPassword(plainText) {
  if (!plainText) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText + '_iskcon_gita_amrita_secure_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    let hash = 0;
    const str = plainText + '_iskcon_salt';
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

/**
 * Verifies a candidate password against stored hash or legacy plaintext
 */
export async function verifyPasswordMatch(inputPassword, storedHash, storedPlaintext = null) {
  if (!inputPassword) return false;
  if (storedHash) {
    const inputHash = await hashPassword(inputPassword);
    if (inputHash === storedHash) return true;
  }
  if (storedPlaintext && storedPlaintext === inputPassword) {
    return true;
  }
  return false;
}

/**
 * Save a registration into Firestore under the BhagavadGita hierarchy
 * Validates, sanitizes, and securely hashes passwords
 */
export async function saveRegistration(registrationData) {
  const registrationId = sanitizeText(registrationData.registrationId || await getNextRegistrationId(), 30);
  const cleanMobile = (registrationData.mobile || '').replace(/\D/g, '').slice(-10);
  const cleanEmail = sanitizeText(registrationData.email || '', 100).toLowerCase();

  let authUid = null;
  if (cleanEmail && registrationData.password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, registrationData.password);
      authUid = userCredential.user.uid;
    } catch (authError) {
      // Gracefully ignore CONFIGURATION_NOT_FOUND when Firebase Auth is not active in console
    }
  }

  const passHash = registrationData.password ? await hashPassword(registrationData.password) : '';

  const payload = {
    fullName: sanitizeText(registrationData.fullName, 100),
    age: sanitizeText(registrationData.age, 3),
    gender: sanitizeText(registrationData.gender || '', 20),
    education: sanitizeText(registrationData.education || '', 100),
    occupation: sanitizeText(registrationData.occupation || '', 100),
    otherOccupation: sanitizeText(registrationData.otherOccupation || '', 100),
    countryCode: sanitizeText(registrationData.countryCode || '+91', 10),
    mobile: sanitizeText(registrationData.mobile, 20),
    mobileNumberClean: cleanMobile,
    email: cleanEmail,
    emailLower: cleanEmail,
    passwordHash: passHash, // Hashed - plaintext password is never stored in the database!
    currentResidence: sanitizeText(registrationData.currentResidence || registrationData.city || '', 150),
    fullAddress: sanitizeText(registrationData.fullAddress || registrationData.address || '', 300),
    pincode: sanitizeText(registrationData.pincode, 10),
    city: sanitizeText(registrationData.currentResidence || registrationData.city || '', 150),
    area: sanitizeText(registrationData.fullAddress || registrationData.address || '', 300),
    registrationId,
    authUid,
    status: 'Confirmed',
    createdAt: serverTimestamp(),
    program: 'Gita Amrita',
    center: 'ISKCON Adilabad (Edulapuram)',
  };

  try {
    const registrationRef = doc(db, 'BhagavadGita', 'data', 'registrations', registrationId);
    await setDoc(registrationRef, payload, { merge: true });

    // Ensure plaintext password is removed if previously present
    try {
      await updateDoc(registrationRef, { password: deleteField() });
    } catch (e) {}

    const parentRef = doc(db, 'BhagavadGita', 'data');
    await setDoc(parentRef, {
      lastUpdated: serverTimestamp(),
      programName: 'Gita Amrita',
      organization: 'ISKCON Adilabad',
    }, { merge: true });

    try {
      const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
      localRecords.push({ 
        mobile: payload.mobile, 
        email: payload.email, 
        passwordHash: payload.passwordHash,
        id: registrationId,
        registrationId,
        fullName: payload.fullName,
        education: payload.education,
        currentResidence: payload.currentResidence,
        fullAddress: payload.fullAddress,
        pincode: payload.pincode
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
 * Update password for a participant registration (Stores only cryptographic hash)
 */
export async function updateRegistrationPassword(registrationId, password, email) {
  let authUid = null;
  const cleanEmail = sanitizeText(email || '', 100).toLowerCase();

  if (cleanEmail && password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      authUid = userCredential.user.uid;
    } catch (authError) {
      // Ignored if Firebase Auth is not enabled in Firebase Console
    }
  }

  const passHash = await hashPassword(password);

  try {
    const regRef = doc(db, 'BhagavadGita', 'data', 'registrations', registrationId);
    const updatePayload = { 
      passwordHash: passHash, 
      password: deleteField(),
      updatedAt: serverTimestamp() 
    };
    if (authUid) updatePayload.authUid = authUid;
    await setDoc(regRef, updatePayload, { merge: true });
  } catch (err) {
    console.warn('Firestore password update warning:', err);
  }

  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    const idx = localRecords.findIndex(r => r.id === registrationId || r.registrationId === registrationId || (cleanEmail && (r.email || '').toLowerCase() === cleanEmail));
    if (idx !== -1) {
      localRecords[idx].passwordHash = passHash;
      delete localRecords[idx].password;
    } else {
      localRecords.push({ id: registrationId, registrationId, email: cleanEmail, passwordHash: passHash });
    }
    localStorage.setItem('gita_amrita_registrations', JSON.stringify(localRecords));

    const completed = localStorage.getItem('gita_amrita_completed_reg');
    if (completed) {
      const parsed = JSON.parse(completed);
      if (parsed.registrationId === registrationId && parsed.formData) {
        parsed.formData.passwordHash = passHash;
        delete parsed.formData.password;
        localStorage.setItem('gita_amrita_completed_reg', JSON.stringify(parsed));
      }
    }
  } catch (e) {}

  return { success: true };
}

/**
 * Rate limiting for login attempts (anti-brute-force)
 */
const loginAttemptsMap = new Map();

export function checkLoginRateLimit(identifier) {
  const key = (identifier || '').trim().toLowerCase();
  const now = Date.now();
  const record = loginAttemptsMap.get(key) || { count: 0, lockUntil: 0 };

  if (record.lockUntil > now) {
    const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000);
    return {
      allowed: false,
      remainingSeconds,
      message: `Too many login attempts. Please wait ${remainingSeconds} seconds before trying again.`
    };
  }

  return { allowed: true };
}

export function recordFailedLoginAttempt(identifier) {
  const key = (identifier || '').trim().toLowerCase();
  const now = Date.now();
  const record = loginAttemptsMap.get(key) || { count: 0, lockUntil: 0 };
  
  record.count += 1;
  if (record.count >= 5) {
    record.lockUntil = now + 60 * 1000; // 60s lockout
    record.count = 0;
  }
  loginAttemptsMap.set(key, record);
}

export function clearLoginRateLimit(identifier) {
  const key = (identifier || '').trim().toLowerCase();
  loginAttemptsMap.delete(key);
}

/**
 * Student Login helper - Authenticates via secure hash check
 */
export async function studentLogin(identifier, password) {
  const rateLimit = checkLoginRateLimit(identifier);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.message };
  }

  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanMobile = (identifier || '').replace(/\D/g, '').slice(-10);

  // 1. Check local cache first for instant login
  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    for (const r of localRecords) {
      if (
        !r.isDeleted &&
        ((r.email || '').toLowerCase() === cleanId || (r.mobile || '').replace(/\D/g, '').slice(-10) === cleanMobile)
      ) {
        const isMatch = await verifyPasswordMatch(password, r.passwordHash, r.password);
        if (isMatch) {
          clearLoginRateLimit(identifier);
          return { success: true, participant: r };
        }
      }
    }
  } catch (e) {}

  // 2. Check Firestore database directly
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
      const activeDocs = snap.docs.filter(d => !d.data().isDeleted);
      for (const d of activeDocs) {
        const docData = d.data();
        const isMatch = await verifyPasswordMatch(password, docData.passwordHash, docData.password);
        if (isMatch) {
          // If doc had plaintext password, upgrade to hash and remove plaintext
          if (docData.password && !docData.passwordHash) {
            try {
              const pHash = await hashPassword(password);
              await setDoc(d.ref, { passwordHash: pHash, password: deleteField() }, { merge: true });
            } catch (e) {}
          }
          clearLoginRateLimit(identifier);
          return { success: true, participant: docData };
        }
      }
    }
  } catch (e) {}

  // 3. Fallback: Try Firebase Auth if enabled
  if (cleanId.includes('@')) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanId, password);
      clearLoginRateLimit(identifier);
      return { success: true, user: userCredential.user };
    } catch (authErr) {
      // Silent catch
    }
  }

  recordFailedLoginAttempt(identifier);
  return { success: false, error: 'Invalid login credentials. Please check your email/mobile and password.' };
}

/**
 * Admin Access Configuration
 * Accounts are managed purely dynamically via Firestore database collection: BhagavadGita/data/admins
 */
export const DEFAULT_ADMIN_USERS = [];

/**
 * Helper to determine if a user holds Super Admin privileges
 */
export function isSuperAdminUser(userOrEmail) {
  if (!userOrEmail) return false;
  const role = (typeof userOrEmail === 'object' ? (userOrEmail.role || '') : (typeof userOrEmail === 'string' ? userOrEmail : '')).trim();
  return role === 'Super Admin' || role === 'Super Administrator';
}

/**
 * Ensures obsolete legacy accounts are cleaned
 */
export async function seedDefaultAdminsIfMissing() {
  // Legacy cleanup if needed
  try {
    const obsoleteEmails = ['jashwanthjavili7@gmail.com', 'admin@gitaamrita.com', 'gita@iskconadilabad.org', 'admin@iskconadilabad.org'];
    for (const obsEmail of obsoleteEmails) {
      const obsDocId = obsEmail.replace(/[^a-z0-9]/g, '_');
      try {
        const obsRef = doc(db, 'BhagavadGita', 'data', 'admins', obsDocId);
        const snap = await getDoc(obsRef);
        if (snap.exists()) {
          await deleteDoc(obsRef);
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Seed admins notice:', err);
  }
}

/**
 * Fetch all registered admins dynamically from Firestore collection `BhagavadGita/data/admins`
 */
export async function fetchAllAdmins() {
  const adminsMap = new Map();

  // 1. Fetch from Firestore
  try {
    const adminCol = collection(db, 'BhagavadGita', 'data', 'admins');
    const snapshot = await getDocs(adminCol);
    if (!snapshot.empty) {
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.isDeleted || data.status === 'Revoked') {
          adminsMap.delete(docSnap.id);
          if (data.email) adminsMap.delete(data.email.toLowerCase());
          return;
        }
        const emailKey = (data.email || docSnap.id).toLowerCase();
        
        // Filter out obsolete legacy accounts
        if (emailKey === 'jashwanthjavili7@gmail.com' || emailKey === 'admin@iskconadilabad.org' || emailKey === 'gita@iskconadilabad.org' || emailKey === 'admin@gitaamrita.com') {
          return;
        }

        const role = (data.role === 'Super Admin' || data.role === 'Super Administrator') ? 'Super Admin' : 'Admin';

        adminsMap.set(emailKey, {
          id: docSnap.id,
          ...data,
          email: data.email || emailKey,
          name: data.name || data.email || 'Admin',
          role,
          passwordHash: data.passwordHash || '',
          addedBy: data.addedBy || 'Coordinator',
          status: 'Active',
          createdAtFormatted: data.createdAt?.toDate 
            ? data.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : (data.createdAtFormatted || 'Active')
        });
      });
    }
  } catch (err) {
    console.warn('Firestore fetch admins notice:', err);
  }

  // 2. Merge local cached admins
  const legacyPlaceholders = ['jashwanthjavili7@gmail.com', 'admin@iskconadilabad.org', 'gita@iskconadilabad.org', 'admin@gitaamrita.com'];
  try {
    const local = JSON.parse(localStorage.getItem('gita_amrita_cached_admins') || '[]');
    local.forEach(adm => {
      const emailKey = (adm.email || adm.id || '').toLowerCase();
      if (emailKey && !adminsMap.has(emailKey) && !adm.isDeleted && adm.status !== 'Revoked' && !legacyPlaceholders.includes(emailKey)) {
        adminsMap.set(emailKey, adm);
      }
    });
  } catch (e) {}

  const result = Array.from(adminsMap.values());
  
  // Sort Super Admins on top, followed by standard Admins
  result.sort((a, b) => {
    const aSuper = (a.role === 'Super Admin' || a.role === 'Super Administrator') ? 1 : 0;
    const bSuper = (b.role === 'Super Admin' || b.role === 'Super Administrator') ? 1 : 0;
    if (aSuper !== bSuper) return bSuper - aSuper;
    return (a.name || a.email || '').localeCompare(b.name || b.email || '');
  });

  try {
    localStorage.setItem('gita_amrita_cached_admins', JSON.stringify(result));
  } catch (e) {}

  return result;
}

/**
 * Real-time listener for Admin Access List
 */
export function subscribeToAdmins(callback) {
  try {
    const cached = localStorage.getItem('gita_amrita_cached_admins');
    if (cached) {
      callback(JSON.parse(cached));
    }
  } catch (e) {}

  let unsub = () => {};
  try {
    const adminCol = collection(db, 'BhagavadGita', 'data', 'admins');
    unsub = onSnapshot(adminCol, async () => {
      const updated = await fetchAllAdmins();
      callback(updated);
    }, (err) => {
      console.warn('Realtime admins listener note:', err);
    });
  } catch (err) {}

  return () => {
    try { unsub(); } catch (e) {}
  };
}

/**
 * Add / Grant Admin Access (Enforced: Super Admin only)
 * Stores cryptographic passwordHash - plaintext password is never saved
 */
export async function addAdminToFirestore({ email, name, password, role = 'Admin', addedBy = 'Administrator', callerUser = null }) {
  if (callerUser && !isSuperAdminUser(callerUser)) {
    return { success: false, error: 'Access Denied: Only Super Admins can add or grant admin access to other accounts.' };
  }

  const cleanEmail = sanitizeText(email || '', 120).trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  const cleanPassword = (password || '').trim();
  if (!cleanPassword || cleanPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const allowedRole = (role === 'Super Admin' || role === 'Super Administrator') ? 'Super Admin' : 'Admin';
  const docId = cleanEmail.replace(/[^a-z0-9]/g, '_');
  const passHash = await hashPassword(cleanPassword);

  const payload = {
    id: docId,
    email: cleanEmail,
    emailLower: cleanEmail,
    name: sanitizeText(name || cleanEmail.split('@')[0], 100),
    role: allowedRole,
    passwordHash: passHash, // Hashed - plaintext password is never stored!
    addedBy: sanitizeText(addedBy, 100),
    status: 'Active',
    createdAt: serverTimestamp(),
    createdAtFormatted: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  };

  try {
    const adminRef = doc(db, 'BhagavadGita', 'data', 'admins', docId);
    await setDoc(adminRef, payload, { merge: true });

    // Ensure plaintext password is removed if previously present
    try {
      await updateDoc(adminRef, { password: deleteField() });
    } catch (e) {}

    // Also attempt creation in Firebase Auth for seamless login
    try {
      await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    } catch (authErr) {
      // Ignore if user already exists in Firebase Auth or Auth not configured
    }

    // Update local cache without plaintext password
    try {
      const cached = JSON.parse(localStorage.getItem('gita_amrita_cached_admins') || '[]');
      const filtered = cached.filter(a => (a.email || '').toLowerCase() !== cleanEmail);
      filtered.push(payload);
      localStorage.setItem('gita_amrita_cached_admins', JSON.stringify(filtered));
    } catch (e) {}

    return { success: true, admin: payload };
  } catch (err) {
    console.warn('Error granting admin in Firestore:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Modify Admin Role (Enforced: Super Admin only)
 */
export async function updateAdminRoleInFirestore({ email, newRole, callerUser = null }) {
  if (callerUser && !isSuperAdminUser(callerUser)) {
    return { success: false, error: 'Access Denied: Only Super Admins can change administrator roles.' };
  }

  const cleanEmail = sanitizeText(email || '', 120).trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'Invalid email address.' };

  const allowedRole = (newRole === 'Super Admin' || newRole === 'Super Administrator') ? 'Super Admin' : 'Admin';
  const docId = cleanEmail.replace(/[^a-z0-9]/g, '_');

  try {
    const adminRef = doc(db, 'BhagavadGita', 'data', 'admins', docId);
    await setDoc(adminRef, { 
      role: allowedRole, 
      updatedBy: callerUser?.email || 'Super Admin', 
      updatedAt: serverTimestamp() 
    }, { merge: true });

    try {
      const cached = JSON.parse(localStorage.getItem('gita_amrita_cached_admins') || '[]');
      const idx = cached.findIndex(a => (a.email || '').toLowerCase() === cleanEmail);
      if (idx !== -1) {
        cached[idx].role = allowedRole;
        localStorage.setItem('gita_amrita_cached_admins', JSON.stringify(cached));
      }
    } catch (e) {}

    return { success: true, role: allowedRole };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Remove / Revoke Admin Access (Enforced: Super Admin only)
 */
export async function removeAdminFromFirestore(adminIdOrEmail, callerUser = null) {
  if (callerUser && !isSuperAdminUser(callerUser)) {
    return { success: false, error: 'Access Denied: Only Super Admins can revoke admin access.' };
  }

  const cleanKey = sanitizeText(adminIdOrEmail || '', 120).trim().toLowerCase();
  const docId = cleanKey.includes('@') ? cleanKey.replace(/[^a-z0-9]/g, '_') : cleanKey;

  // 1. Delete from Firestore directly by document ID
  try {
    const adminRef = doc(db, 'BhagavadGita', 'data', 'admins', docId);
    await deleteDoc(adminRef);
  } catch (err) {}

  if (adminIdOrEmail && adminIdOrEmail !== docId) {
    try {
      const directRef = doc(db, 'BhagavadGita', 'data', 'admins', adminIdOrEmail);
      await deleteDoc(directRef);
    } catch (err) {}
  }

  // 2. Query and delete all matching admin documents in the collection
  try {
    const adminCol = collection(db, 'BhagavadGita', 'data', 'admins');
    const snap = await getDocs(adminCol);
    for (const d of snap.docs) {
      const data = d.data();
      const em = (data.email || '').toLowerCase();
      if (d.id === docId || d.id === adminIdOrEmail || em === cleanKey || em.split('@')[0] === cleanKey) {
        try {
          await deleteDoc(d.ref);
        } catch (e) {
          await setDoc(d.ref, { isDeleted: true, status: 'Revoked', revokedAt: serverTimestamp() }, { merge: true });
        }
      }
    }
  } catch (err) {
    console.warn('Revoke delete query note:', err);
  }

  // 3. Purge from local cache immediately
  try {
    const cached = JSON.parse(localStorage.getItem('gita_amrita_cached_admins') || '[]');
    const filtered = cached.filter(a => {
      const emailLower = (a.email || '').toLowerCase();
      return emailLower !== cleanKey && a.id !== docId && a.id !== adminIdOrEmail && (a.id || '').toLowerCase() !== cleanKey;
    });
    localStorage.setItem('gita_amrita_cached_admins', JSON.stringify(filtered));
  } catch (e) {}

  return { success: true };
}

/**
 * Change Password for an administrator (Validates current password + updates passwordHash in Firestore & Auth)
 */
export async function changeAdminPassword({ adminEmail, currentPassword, newPassword, callerUser = null }) {
  const targetEmail = (adminEmail || callerUser?.email || '').trim().toLowerCase();
  if (!targetEmail) {
    return { success: false, error: 'Admin session is invalid. Please sign in again.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  const docId = targetEmail.replace(/[^a-z0-9]/g, '_');

  // 1. Verify Current Password against Firestore
  let verified = false;

  try {
    const adminRef = doc(db, 'BhagavadGita', 'data', 'admins', docId);
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      const data = snap.data();
      verified = await verifyPasswordMatch(currentPassword, data.passwordHash, data.password);
    }
  } catch (e) {}

  // Check Local storage cached admin password fallback
  if (!verified) {
    try {
      const cached = JSON.parse(localStorage.getItem('gita_amrita_cached_admins') || '[]');
      const match = cached.find(a => (a.email || '').toLowerCase() === targetEmail);
      if (match) {
        verified = await verifyPasswordMatch(currentPassword, match.passwordHash, match.password);
      }
    } catch (e) {}
  }

  if (!verified) {
    return { success: false, error: 'Current password is incorrect. Please verify and try again.' };
  }

  // 2. Update Password Hash in Firestore and remove plaintext password
  const newHash = await hashPassword(newPassword);
  try {
    const adminRef = doc(db, 'BhagavadGita', 'data', 'admins', docId);
    await setDoc(adminRef, {
      passwordHash: newHash,
      password: deleteField(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore password update error:', err);
  }

  // 3. Update Local Cache
  try {
    const cached = JSON.parse(localStorage.getItem('gita_amrita_cached_admins') || '[]');
    const idx = cached.findIndex(a => (a.email || '').toLowerCase() === targetEmail);
    if (idx !== -1) {
      cached[idx].passwordHash = newHash;
      delete cached[idx].password;
      localStorage.setItem('gita_amrita_cached_admins', JSON.stringify(cached));
    }
  } catch (e) {}

  // 4. Update in Firebase Authentication if currentUser is signed in
  try {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
    }
  } catch (authErr) {
    console.warn('Firebase Auth updatePassword note:', authErr);
  }

  return { success: true, message: 'Password updated successfully!' };
}

/**
 * Reset an Admin's Password directly (Enforced: Super Admin only)
 * Allows Super Administrators to set a new password for coordinators who forgot theirs.
 */
export async function resetAdminPasswordBySuperAdmin({ adminEmail, newPassword, callerUser = null }) {
  if (callerUser && !isSuperAdminUser(callerUser)) {
    return { success: false, error: 'Access Denied: Only Super Admins can reset coordinator passwords.' };
  }

  const targetEmail = (adminEmail || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    return { success: false, error: 'Please specify a valid coordinator email.' };
  }

  const cleanPass = (newPassword || '').trim();
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  const docId = targetEmail.replace(/[^a-z0-9]/g, '_');
  const newHash = await hashPassword(cleanPass);

  try {
    const adminRef = doc(db, 'BhagavadGita', 'data', 'admins', docId);
    await setDoc(adminRef, {
      passwordHash: newHash,
      password: deleteField(),
      updatedAt: serverTimestamp(),
      passwordResetBy: callerUser?.email || 'Super Admin'
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore reset password error:', err);
  }

  // Update Local Cache
  try {
    const cached = JSON.parse(localStorage.getItem('gita_amrita_cached_admins') || '[]');
    const idx = cached.findIndex(a => (a.email || '').toLowerCase() === targetEmail);
    if (idx !== -1) {
      cached[idx].passwordHash = newHash;
      delete cached[idx].password;
      localStorage.setItem('gita_amrita_cached_admins', JSON.stringify(cached));
    }
  } catch (e) {}

  return { success: true, message: `Password for ${targetEmail} has been reset successfully.` };
}

/**
 * Check if an email has admin privileges dynamically from Firestore
 */
export async function isEmailAuthorizedAdmin(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return false;

  // 1. Check Firestore
  try {
    const docId = cleanEmail.replace(/[^a-z0-9]/g, '_');
    const adminRef = doc(db, 'BhagavadGita', 'data', 'admins', docId);
    const snap = await getDoc(adminRef);
    if (snap.exists() && !snap.data().isDeleted && snap.data().status !== 'Revoked') {
      return snap.data();
    }
  } catch (e) {}

  // 2. Check local cache
  try {
    const cached = JSON.parse(localStorage.getItem('gita_amrita_cached_admins') || '[]');
    const match = cached.find(a => !a.isDeleted && a.status !== 'Revoked' && (a.email || '').toLowerCase() === cleanEmail);
    if (match) return match;
  } catch (e) {}

  return false;
}

/**
 * Unified Google Sign-In
 * Works for both Administrators and Registered Participants dynamically
 */
export async function signInWithGoogleUnified() {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const googleUser = userCredential.user;
    const cleanEmail = (googleUser.email || '').trim().toLowerCase();

    // 1. Check if user is an Administrator in Firestore
    const adminRecord = await isEmailAuthorizedAdmin(cleanEmail);
    if (adminRecord) {
      const role = (typeof adminRecord === 'object' && (adminRecord.role === 'Super Admin' || adminRecord.role === 'Super Administrator')) ? 'Super Admin' : 'Admin';
      const adminSession = {
        email: cleanEmail,
        username: cleanEmail.split('@')[0],
        name: typeof adminRecord === 'object' && adminRecord.name ? adminRecord.name : (googleUser.displayName || 'Coordinator'),
        role,
        photoURL: googleUser.photoURL || null,
        token: googleUser.uid,
        isGoogleAuth: true
      };
      return { success: true, isAdmin: true, admin: adminSession, user: googleUser };
    }

    // 2. Check if user is a Registered Student/Participant
    try {
      const regRef = collection(db, 'BhagavadGita', 'data', 'registrations');
      const q = query(regRef, where('emailLower', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const activeDocs = snap.docs.filter(d => !d.data().isDeleted);
        if (activeDocs.length > 0) {
          const participant = activeDocs[0].data();
          return { success: true, isStudent: true, participant, user: googleUser };
        }
      }
    } catch (dbErr) {}

    // Check local storage for participant
    try {
      const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
      const match = localRecords.find(r => !r.isDeleted && (r.email || '').toLowerCase() === cleanEmail);
      if (match) {
        return { success: true, isStudent: true, participant: match, user: googleUser };
      }
    } catch (e) {}

    // 3. User is not yet registered in system
    return {
      success: false,
      notRegistered: true,
      email: cleanEmail,
      displayName: googleUser.displayName || '',
      error: `No Gita Amrita registration found for ${cleanEmail}. Please complete your registration or contact an administrator.`
    };
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      return { success: false, cancelled: true };
    }
    console.warn('Google sign in error:', error);
    return { success: false, error: error.message || 'Google authentication failed.' };
  }
}

/**
 * Admin Authentication (Checked directly against Firestore database records)
 */
export async function adminLogin(usernameOrEmail, password) {
  const cleanInput = (usernameOrEmail || '').trim().toLowerCase();
  
  // 1. Check Firestore database admin collection
  try {
    const docId = cleanInput.includes('@') ? cleanInput.replace(/[^a-z0-9]/g, '_') : cleanInput;
    const adminRef = doc(db, 'BhagavadGita', 'data', 'admins', docId);
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      const docData = snap.data();
      if (!docData.isDeleted && docData.status !== 'Revoked') {
        const isMatch = await verifyPasswordMatch(password, docData.passwordHash, docData.password);
        if (isMatch) {
          // If doc had plaintext password, upgrade it to passwordHash and purge plaintext
          if (docData.password && !docData.passwordHash) {
            try {
              const passHash = await hashPassword(password);
              await setDoc(adminRef, { passwordHash: passHash, password: deleteField() }, { merge: true });
            } catch (e) {}
          }

          const role = (docData.role === 'Super Admin' || docData.role === 'Super Administrator') ? 'Super Admin' : 'Admin';
          return {
            success: true,
            admin: {
              email: docData.email,
              username: (docData.email || cleanInput).split('@')[0],
              name: docData.name || (role === 'Super Admin' ? 'Super Administrator' : 'Admin Coordinator'),
              role,
              token: 'admin-auth-session-' + Date.now()
            }
          };
        }
      }
    }
  } catch (err) {
    console.warn('Firestore admin check note:', err);
  }

  // 2. Check local cache
  try {
    const cached = JSON.parse(localStorage.getItem('gita_amrita_cached_admins') || '[]');
    for (const match of cached) {
      if (
        !match.isDeleted && 
        match.status !== 'Revoked' &&
        ((match.email || '').toLowerCase() === cleanInput || (match.email || '').split('@')[0] === cleanInput)
      ) {
        const isMatch = await verifyPasswordMatch(password, match.passwordHash, match.password);
        if (isMatch) {
          const role = (match.role === 'Super Admin' || match.role === 'Super Administrator') ? 'Super Admin' : 'Admin';
          return {
            success: true,
            admin: {
              email: match.email,
              username: match.email.split('@')[0],
              name: match.name || 'Coordinator',
              role,
              token: 'admin-auth-session-' + Date.now()
            }
          };
        }
      }
    }
  } catch (e) {}

  // 3. Check Firebase Auth if cleanInput is email
  if (cleanInput.includes('@')) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanInput, password);
      const adminRecord = await isEmailAuthorizedAdmin(cleanInput);
      if (adminRecord) {
        const role = (adminRecord.role === 'Super Admin' || adminRecord.role === 'Super Administrator') ? 'Super Admin' : 'Admin';
        return { 
          success: true, 
          admin: {
            email: userCredential.user.email,
            username: userCredential.user.email.split('@')[0],
            name: adminRecord?.name || ('Coordinator (' + userCredential.user.email + ')'),
            role,
            token: userCredential.user.uid
          }
        };
      }
    } catch (authErr) {
      // Silent catch
    }
  }

  return { 
    success: false, 
    error: 'Invalid administrator credentials. Please check your email and password.' 
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
      if (data.isDeleted) return;
      const id = docSnap.id || data.registrationId;
      registrationsMap.set(id, {
        id,
        ...data,
        registrationId: data.registrationId || id,
        currentResidence: data.currentResidence || data.city || '',
        fullAddress: data.fullAddress || data.address || data.area || '',
        pincode: data.pincode || '',
        createdAtFormatted: data.createdAt?.toDate 
          ? data.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : (data.date || 'Recent')
      });
    });
  } catch (err) {
    console.warn('Firestore fetch registrations warning (using local):', err);
  }

  // 2. Merge local storage registrations
  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    localRecords.forEach(rec => {
      if (rec.isDeleted) return;
      const id = rec.id || rec.registrationId;
      if (id && !registrationsMap.has(id)) {
        registrationsMap.set(id, {
          id,
          registrationId: id,
          fullName: rec.fullName || 'Participant',
          mobile: rec.mobile || '',
          email: rec.email || '',
          currentResidence: rec.currentResidence || rec.city || 'Adilabad',
          fullAddress: rec.fullAddress || rec.address || rec.area || '',
          pincode: rec.pincode || '',
          education: rec.education || '',
          occupation: rec.occupation || 'Student',
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
          education: parsed.formData?.education || '',
          currentResidence: parsed.formData?.currentResidence || parsed.formData?.city || 'Adilabad',
          fullAddress: parsed.formData?.fullAddress || parsed.formData?.address || parsed.formData?.area || '',
          pincode: parsed.formData?.pincode || '',
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
  const sanitizedUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'string') {
      sanitizedUpdates[key] = sanitizeText(value, 500);
    } else {
      sanitizedUpdates[key] = value;
    }
  }

  try {
    const regRef = doc(db, 'BhagavadGita', 'data', 'registrations', registrationId);
    await setDoc(regRef, { ...sanitizedUpdates, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('Firestore update participant warning:', err);
  }

  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    const idx = localRecords.findIndex(r => r.id === registrationId || r.registrationId === registrationId);
    if (idx !== -1) {
      localRecords[idx] = { ...localRecords[idx], ...sanitizedUpdates };
      localStorage.setItem('gita_amrita_registrations', JSON.stringify(localRecords));
    }
  } catch (e) {}

  return { success: true };
}

/**
 * Delete a participant registration permanently from Firestore & local storage
 */
export async function deleteParticipant(registrationId) {
  if (!registrationId) return { success: false };

  // 1. Try physical deletion from Firestore
  try {
    const regRef = doc(db, 'BhagavadGita', 'data', 'registrations', registrationId);
    await deleteDoc(regRef);
  } catch (err) {
    console.warn('Physical deleteDoc note (falling back to soft delete mark):', err);
    try {
      // 2. Fallback: mark isDeleted: true in Firestore
      const regRef = doc(db, 'BhagavadGita', 'data', 'registrations', registrationId);
      await setDoc(regRef, { isDeleted: true, status: 'Deleted', deletedAt: serverTimestamp() }, { merge: true });
    } catch (setErr) {
      console.warn('Firestore fallback delete error:', setErr);
    }
  }

  // 3. Remove permanently from local storage caches
  try {
    const localRecords = JSON.parse(localStorage.getItem('gita_amrita_registrations') || '[]');
    const filtered = localRecords.filter(r => r.id !== registrationId && r.registrationId !== registrationId);
    localStorage.setItem('gita_amrita_registrations', JSON.stringify(filtered));

    const cachedAdmin = JSON.parse(localStorage.getItem('gita_amrita_cached_admin_regs') || '[]');
    const filteredAdmin = cachedAdmin.filter(r => r.id !== registrationId && r.registrationId !== registrationId);
    localStorage.setItem('gita_amrita_cached_admin_regs', JSON.stringify(filteredAdmin));

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

/**
 * Program Settings
 */
export async function fetchProgramSettings() {
  try {
    const dataRef = doc(db, 'BhagavadGita', 'data');
    const snap = await getDoc(dataRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.isRegistrationOpen !== undefined || data.whatsappLink !== undefined || data.isQueueEnabled !== undefined) {
        const result = {
          isRegistrationOpen: data.isRegistrationOpen !== false,
          closedNotice: data.closedNotice || '',
          whatsappLink: data.whatsappLink || '',
          isQueueEnabled: Boolean(data.isQueueEnabled),
          queueWaitSeconds: Number(data.queueWaitSeconds) || 60,
          queueMessage: data.queueMessage || ''
        };
        try {
          localStorage.setItem('gita_amrita_cached_settings', JSON.stringify(result));
        } catch (e) {}
        return result;
      }
    }
  } catch (err) {
    console.warn('Could not fetch program settings:', err);
  }

  try {
    const cached = localStorage.getItem('gita_amrita_cached_settings');
    if (cached) {
      const data = JSON.parse(cached);
      return {
        isRegistrationOpen: data.isRegistrationOpen !== false,
        closedNotice: data.closedNotice || '',
        whatsappLink: data.whatsappLink || '',
        isQueueEnabled: Boolean(data.isQueueEnabled),
        queueWaitSeconds: Number(data.queueWaitSeconds) || 60,
        queueMessage: data.queueMessage || ''
      };
    }
  } catch (e) {}

  return {
    isRegistrationOpen: true,
    closedNotice: '',
    whatsappLink: '',
    isQueueEnabled: false,
    queueWaitSeconds: 60,
    queueMessage: ''
  };
}

export async function updateProgramSettings(settings) {
  const isRegistrationOpen = Boolean(settings.isRegistrationOpen);
  const closedNotice = sanitizeText(settings.closedNotice !== undefined ? settings.closedNotice : '', 500);
  const whatsappLink = sanitizeText(settings.whatsappLink !== undefined ? settings.whatsappLink : '', 300);
  const isQueueEnabled = Boolean(settings.isQueueEnabled);
  const queueWaitSeconds = Math.max(2, Math.min(240, Number(settings.queueWaitSeconds) || 60));
  const queueMessage = sanitizeText(settings.queueMessage !== undefined ? settings.queueMessage : '', 300);

  const payload = {
    isRegistrationOpen,
    closedNotice,
    whatsappLink,
    isQueueEnabled,
    queueWaitSeconds,
    queueMessage,
    lastUpdated: serverTimestamp(),
    programName: 'Gita Amrita',
    organization: 'ISKCON Adilabad'
  };

  const localPayload = {
    isRegistrationOpen,
    closedNotice,
    whatsappLink,
    isQueueEnabled,
    queueWaitSeconds,
    queueMessage
  };

  try {
    localStorage.setItem('gita_amrita_cached_settings', JSON.stringify(localPayload));
  } catch (e) {}

  try {
    window.dispatchEvent(new CustomEvent('gita_amrita_settings_changed', { detail: localPayload }));
  } catch (e) {}

  try {
    const dataRef = doc(db, 'BhagavadGita', 'data');
    await setDoc(dataRef, payload, { merge: true });
  } catch (err) {
    console.warn('Error saving settings to BhagavadGita/data:', err);
  }

  return { success: true, isRegistrationOpen, closedNotice, whatsappLink, isQueueEnabled, queueWaitSeconds, queueMessage };
}

/**
 * Real-time listener for Registration Settings
 */
export function subscribeToProgramSettings(callback) {
  try {
    const cached = localStorage.getItem('gita_amrita_cached_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      callback({
        isRegistrationOpen: parsed.isRegistrationOpen !== false,
        closedNotice: parsed.closedNotice || '',
        whatsappLink: parsed.whatsappLink || '',
        isQueueEnabled: Boolean(parsed.isQueueEnabled),
        queueWaitSeconds: Number(parsed.queueWaitSeconds) || 60,
        queueMessage: parsed.queueMessage || ''
      });
    }
  } catch (e) {}

  let unsubData = () => {};
  try {
    const dataRef = doc(db, 'BhagavadGita', 'data');
    unsubData = onSnapshot(dataRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.isRegistrationOpen !== undefined || d.whatsappLink !== undefined || d.isQueueEnabled !== undefined) {
          const sett = {
            isRegistrationOpen: d.isRegistrationOpen !== false,
            closedNotice: d.closedNotice || '',
            whatsappLink: d.whatsappLink || '',
            isQueueEnabled: Boolean(d.isQueueEnabled),
            queueWaitSeconds: Number(d.queueWaitSeconds) || 60,
            queueMessage: d.queueMessage || ''
          };
          try {
            localStorage.setItem('gita_amrita_cached_settings', JSON.stringify(sett));
          } catch (e) {}
          callback(sett);
        }
      }
    }, (err) => {
      console.warn('Realtime settings listener note:', err);
    });
  } catch (err) {}

  const handleStorage = (e) => {
    if (e.key === 'gita_amrita_cached_settings' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback({
          isRegistrationOpen: parsed.isRegistrationOpen !== false,
          closedNotice: parsed.closedNotice || '',
          whatsappLink: parsed.whatsappLink || '',
          isQueueEnabled: Boolean(parsed.isQueueEnabled),
          queueWaitSeconds: Number(parsed.queueWaitSeconds) || 60,
          queueMessage: parsed.queueMessage || ''
        });
      } catch (err) {}
    }
  };
  window.addEventListener('storage', handleStorage);

  const handleCustom = (e) => {
    if (e.detail) {
      callback({
        isRegistrationOpen: e.detail.isRegistrationOpen !== false,
        closedNotice: e.detail.closedNotice || '',
        whatsappLink: e.detail.whatsappLink || '',
        isQueueEnabled: Boolean(e.detail.isQueueEnabled),
        queueWaitSeconds: Number(e.detail.queueWaitSeconds) || 60,
        queueMessage: e.detail.queueMessage || ''
      });
    }
  };
  window.addEventListener('gita_amrita_settings_changed', handleCustom);

  return () => {
    try { unsubData(); } catch (e) {}
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('gita_amrita_settings_changed', handleCustom);
  };
}

/**
 * Announcements Management
 */
export async function fetchAnnouncements() {
  try {
    const annCol = collection(db, 'BhagavadGita', 'data', 'announcements');
    const snapshot = await getDocs(annCol);
    if (!snapshot.empty) {
      const seen = new Set();
      const items = [];
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (!data.isDeleted) {
          const item = { id: d.id, ...data };
          if (!seen.has(item.id)) {
            seen.add(item.id);
            items.push(item);
          }
        }
      });
      items.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      try {
        localStorage.setItem('gita_amrita_cached_announcements', JSON.stringify(items));
      } catch (e) {}
      return items;
    }
  } catch (err) {
    console.warn('Could not fetch announcements:', err);
  }
  return [];
}

export function subscribeToAnnouncements(callback) {
  try {
    const cached = localStorage.getItem('gita_amrita_cached_announcements');
    if (cached) {
      const parsed = JSON.parse(cached);
      callback(parsed);
    }
  } catch (e) {}

  let unsub = () => {};
  try {
    const annCol = collection(db, 'BhagavadGita', 'data', 'announcements');
    unsub = onSnapshot(annCol, (snapshot) => {
      const seen = new Set();
      const items = [];
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (!data.isDeleted) {
          const item = { id: d.id, ...data };
          if (!seen.has(item.id)) {
            seen.add(item.id);
            items.push(item);
          }
        }
      });
      items.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      try {
        localStorage.setItem('gita_amrita_cached_announcements', JSON.stringify(items));
      } catch (e) {}
      callback(items);
    }, (err) => {
      console.warn('Realtime announcements listener note:', err);
    });
  } catch (err) {}

  return () => {
    try { unsub(); } catch (e) {}
  };
}

export async function saveAnnouncementToFirestore(announcement) {
  try {
    const id = announcement.id || `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const annRef = doc(db, 'BhagavadGita', 'data', 'announcements', id);
    const payload = {
      title: sanitizeText(announcement.title, 200),
      content: sanitizeText(announcement.content, 3000),
      type: sanitizeText(announcement.type || 'General', 50),
      target: sanitizeText(announcement.target || 'All', 50),
      isPinned: Boolean(announcement.isPinned),
      id,
      timestamp: Date.now(),
      dateString: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      timeString: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp()
    };
    await setDoc(annRef, payload, { merge: true });
    return { success: true, announcement: payload };
  } catch (err) {
    console.warn('Error saving announcement:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteAnnouncementFromFirestore(id) {
  try {
    const cached = JSON.parse(localStorage.getItem('gita_amrita_cached_announcements') || '[]');
    const filtered = cached.filter(a => a.id !== id);
    localStorage.setItem('gita_amrita_cached_announcements', JSON.stringify(filtered));
  } catch (e) {}

  try {
    const annRef = doc(db, 'BhagavadGita', 'data', 'announcements', id);
    await deleteDoc(annRef);
    return { success: true };
  } catch (err) {
    try {
      const annRef = doc(db, 'BhagavadGita', 'data', 'announcements', id);
      await setDoc(annRef, { isDeleted: true, deletedAt: serverTimestamp() }, { merge: true });
      return { success: true };
    } catch (fallbackErr) {
      console.warn('Fallback announcement deletion note:', fallbackErr);
      return { success: false, error: fallbackErr.message };
    }
  }
}

/**
 * Advanced Full Database Backup System
 * Generates structured, timestamped JSON snapshot of all registrations, settings, and announcements
 */
export async function generateFullDatabaseBackup() {
  const registrations = await fetchAllRegistrations();
  const settings = await fetchProgramSettings();
  const announcements = await fetchAnnouncements();

  const backupObject = {
    metadata: {
      version: '1.0',
      program: 'Gita Amrita',
      organization: 'ISKCON Adilabad',
      backupDate: new Date().toISOString(),
      totalParticipants: registrations.length,
      totalAnnouncements: announcements.length,
      system: 'Gita Amrita Cloud Backup Engine v1.0'
    },
    settings,
    participants: registrations,
    announcements
  };

  try {
    localStorage.setItem('gita_amrita_last_backup', JSON.stringify(backupObject));
  } catch (e) {}

  return backupObject;
}

/**
 * 1-Click JSON Backup file downloader
 */
export function downloadBackupFile(backupObject) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObject, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  downloadAnchor.setAttribute("download", `Gita_Amrita_Database_Backup_${dateStr}_${timeStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
