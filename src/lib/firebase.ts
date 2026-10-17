import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocFromServer,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export type UserRole = 'admin' | 'usuario';

export interface FirebaseUserProfile {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedRoutineId?: string;
  createdAt: string;
}

// Convert username into a valid, safe email address for Firebase Auth
export function formatUsernameToEmail(usernameOrEmail: string): string {
  const clean = usernameOrEmail.trim().toLowerCase();
  if (clean.includes('@')) return clean;
  const sanitized = clean.replace(/[^a-z0-9._-]/g, '_');
  return `${sanitized || 'usuario'}@darshanagym.local`;
}

// Test connection on boot as recommended by Firebase skill
export async function validateFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
    return false;
  }
}

// Fetch user profile from Firestore /users/{uid}
export async function fetchUserProfile(uid: string): Promise<FirebaseUserProfile | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as FirebaseUserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch user profile from Firestore:', err);
    return null;
  }
}

// Save or update user profile with role in Firestore
export async function saveUserProfile(profile: FirebaseUserProfile): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', profile.uid);
    await setDoc(userDocRef, profile, { merge: true });
  } catch (err) {
    console.warn('Could not save user profile to Firestore:', err);
  }
}

// Fetch all registered users from Firestore
export async function fetchAllUsers(): Promise<FirebaseUserProfile[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const list: FirebaseUserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as FirebaseUserProfile);
    });
    return list;
  } catch (err) {
    console.warn('Could not fetch all users from Firestore:', err);
    return [];
  }
}

// Sign up new user without requiring an email address (username + password)
export async function registerWithFirebase(
  username: string,
  pass: string,
  role: UserRole = 'usuario'
): Promise<{ user: FirebaseUser; profile: FirebaseUserProfile }> {
  const cleanUsername = username.trim();
  const email = formatUsernameToEmail(cleanUsername);

  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  const user = cred.user;

  const profile: FirebaseUserProfile = {
    uid: user.uid,
    username: cleanUsername,
    email: user.email || email,
    displayName: cleanUsername,
    role,
    createdAt: new Date().toISOString(),
  };

  await saveUserProfile(profile);
  return { user, profile };
}

// Sign in with username (or email) and password
export async function loginWithFirebase(
  usernameOrEmail: string,
  pass: string
): Promise<{ user: FirebaseUser; profile: FirebaseUserProfile }> {
  const clean = usernameOrEmail.trim();
  const email = formatUsernameToEmail(clean);

  const cred = await signInWithEmailAndPassword(auth, email, pass);
  const user = cred.user;

  let profile = await fetchUserProfile(user.uid);
  if (!profile) {
    const isCleanAdmin = clean.toLowerCase().includes('admin');
    profile = {
      uid: user.uid,
      username: clean,
      email: user.email || email,
      displayName: clean,
      role: isCleanAdmin ? 'admin' : 'usuario',
      createdAt: new Date().toISOString(),
    };
    await saveUserProfile(profile);
  }

  return { user, profile };
}

// Sign out
export async function logoutFromFirebase(): Promise<void> {
  await signOut(auth);
}
