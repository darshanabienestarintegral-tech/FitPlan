import { beforeEach, afterEach, expect, jest, mock, test } from 'bun:test';
import config from '../firebase-applet-config.json';

const storage = new Map();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
} });
Object.defineProperty(globalThis, 'window', { value: { localStorage: globalThis.localStorage } });
const getFirestore = mock(() => ({}));
const createUser = mock(async () => ({ user: { uid: 'cloud-user', email: 'test@darshanagym.local' } }));
const signIn = mock(async () => ({ user: { uid: 'cloud-user', email: 'test@darshanagym.local' } }));
const setDoc = mock(async () => {});
const getDoc = mock(async () => ({ exists: () => false }));
mock.module('firebase/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
mock.module('firebase/auth', () => ({ getAuth: () => ({}), createUserWithEmailAndPassword: createUser,
  signInWithEmailAndPassword: signIn, signOut: async () => {} }));
mock.module('firebase/firestore', () => ({ getFirestore, doc: () => ({}), getDoc, setDoc,
  collection: () => ({}), getDocFromServer: getDoc, getDocs: async () => ({ forEach: () => {} }) }));
mock.module('../src/lib/supabase', () => ({ supabase: {}, isSupabaseConfigured: false }));
const { saveUserProfile, loginWithFirebase } = await import('../src/lib/firebase');
const { useUserStore } = await import('../src/store/useUserStore');

beforeEach(() => {
  storage.clear();
  useUserStore.setState({ isAuthenticated: false, registeredAccounts: [], currentUser: null,
    profile: null, isLoading: false, error: null });
  createUser.mockClear(); setDoc.mockClear(); signIn.mockClear();
});
afterEach(() => jest.useRealTimers());

test('uses the configured named Firestore database', () => {
  expect(getFirestore.mock.calls[0]?.[1]).toBe(config.firestoreDatabaseId);
});
test('successful registration uses the cloud UID without persisting a password', async () => {
  const result = await useUserStore.getState().registerFirebase('test', 'test-only-password', 'usuario');
  expect(result.success).toBe(true);
  expect(setDoc).toHaveBeenCalledTimes(1);
  expect(useUserStore.getState().currentUser?.uid).toBe('cloud-user');
  expect(useUserStore.getState().registeredAccounts[0].password).toBeUndefined();
  expect(storage.get('fitplan_user_storage')).not.toContain('test-only-password');
});
test('Firebase rejection does not create a local account or authenticate', async () => {
  createUser.mockRejectedValueOnce(Object.assign(new Error('disabled'), { code: 'auth/operation-not-allowed' }));
  const result = await useUserStore.getState().registerFirebase('test', 'test-only-password', 'usuario');
  expect(result.success).toBe(false);
  expect(result.message).toContain('no está habilitado');
  expect(useUserStore.getState().registeredAccounts).toHaveLength(0);
  expect(useUserStore.getState().isAuthenticated).toBe(false);
  expect(useUserStore.getState().isLoading).toBe(false);
});
test('profile write rejection is reported instead of successful registration', async () => {
  setDoc.mockRejectedValueOnce(new Error('permission-denied'));
  const result = await useUserStore.getState().registerFirebase('test', 'test-only-password', 'usuario');
  expect(result.success).toBe(false);
  expect(result.message).toContain('intenta iniciar sesión');
  expect(useUserStore.getState().isLoading).toBe(false);
  expect(useUserStore.getState().registeredAccounts).toHaveLength(0);
});
test('pending profile write releases registration after 15 seconds', async () => {
  jest.useFakeTimers();
  setDoc.mockImplementationOnce(() => new Promise(() => {}));
  const result = useUserStore.getState().registerFirebase('test', 'test-only-password', 'usuario');
  // Let the successful Auth promise advance to the pending Firestore write.
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  jest.advanceTimersByTime(15000);
  expect((await result).success).toBe(false);
  expect(useUserStore.getState().error).toContain('Firebase no respondió');
  expect(useUserStore.getState().isLoading).toBe(false);
});
test('short password is rejected before contacting Firebase and clears loading', async () => {
  expect((await useUserStore.getState().registerFirebase('test', 'short', 'usuario')).success).toBe(false);
  expect(createUser).not.toHaveBeenCalled();
  expect(useUserStore.getState().isLoading).toBe(false);
});
test('failed cloud login cannot fall back to locally stored credentials', async () => {
  useUserStore.setState({ registeredAccounts: [{ username: 'test', password: 'test-only-password' }] });
  signIn.mockRejectedValueOnce(Object.assign(new Error('invalid'), { code: 'auth/invalid-credential' }));
  expect((await useUserStore.getState().loginFirebase('test', 'test-only-password')).success).toBe(false);
  expect(useUserStore.getState().isAuthenticated).toBe(false);
});
test('existing Auth account without a profile recovers as a regular user', async () => {
  const { profile } = await loginWithFirebase('admin_in_name', 'test-only-password');
  expect(profile.uid).toBe('cloud-user');
  expect(profile.role).toBe('usuario');
});
