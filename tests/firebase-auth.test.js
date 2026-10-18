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
const cloudSessions = new Map();
const writeDocument = async (ref, data) => {
  if (ref.path === 'session_logs') cloudSessions.set(ref.id, structuredClone(data));
};
const setDoc = mock(writeDocument);
const getDocs = mock(async (request) => ({ docs: [...cloudSessions.entries()]
  .filter(([, data]) => data.userId === request.constraint.value)
  .map(([id, data]) => ({ id, data: () => structuredClone(data) })) }));
const deleteDoc = mock(async (ref) => { cloudSessions.delete(ref.id); });
const getDoc = mock(async () => ({ exists: () => false }));
mock.module('firebase/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
mock.module('firebase/auth', () => ({ getAuth: () => ({}), createUserWithEmailAndPassword: createUser,
  signInWithEmailAndPassword: signIn, signOut: async () => {} }));
mock.module('firebase/firestore', () => ({ getFirestore, doc: (_db, path, id) => ({ path, id }), getDoc, setDoc, deleteDoc,
  collection: (_db, path) => ({ path }), query: (ref, constraint) => ({ ...ref, constraint }),
  where: (field, operator, value) => ({ field, operator, value }), getDocFromServer: getDoc, getDocs }));
mock.module('../src/lib/supabase', () => ({ supabase: {}, isSupabaseConfigured: false }));
const { saveUserProfile, loginWithFirebase } = await import('../src/lib/firebase');
const { useUserStore } = await import('../src/store/useUserStore');
const { useRoutineStore } = await import('../src/store/useRoutineStore');

beforeEach(() => {
  storage.clear();
  useUserStore.setState({ isAuthenticated: false, registeredAccounts: [], currentUser: null,
    profile: null, isLoading: false, error: null });
  createUser.mockClear(); setDoc.mockClear(); signIn.mockClear();
  setDoc.mockImplementation(writeDocument);
  cloudSessions.clear();
  useRoutineStore.setState({ sessionLogs: [], syncedSessionLogIds: [], deletedSessionLogs: {},
    sessionSyncError: null, sessionSyncUserId: null, isSyncingSessions: false });
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

const sampleLog = (uid = 'cloud-user') => ({ id: 'log-test', user_id: uid, routine_day_id: 'day-test',
  date: new Date().toISOString(), duration_min: 5, completed_exercises: ['ex-01'] });
function signInLocally(uid = 'cloud-user') {
  useUserStore.setState({ isAuthenticated: true, currentUser: { uid, username: uid, role: 'usuario' },
    profile: { id: uid } });
}
test('finished workout is written to Firestore with the ownership field required by rules', async () => {
  signInLocally();
  const store = useRoutineStore.getState();
  store.startSession(store.activeRoutine.days[0].id);
  store.toggleExerciseCompleted(store.activeRoutine.days[0].exercise_ids[0]);
  const log = store.finishCurrentSession(5);
  await useRoutineStore.getState().syncSessionHistory();
  expect(cloudSessions.get(log.id).userId).toBe('cloud-user');
  expect(cloudSessions.get(log.id).duration_min).toBe(5);
  expect(cloudSessions.get(log.id).completed_exercises).toHaveLength(1);
  expect(cloudSessions.get(log.id)).not.toHaveProperty('notes');
});
test('a fresh browser restores session counts and minutes from cloud history', async () => {
  signInLocally();
  useRoutineStore.setState({ sessionLogs: [sampleLog()] });
  await useRoutineStore.getState().syncSessionHistory();
  // Discard local history, as closing all private windows does.
  useRoutineStore.setState({ sessionLogs: [], syncedSessionLogIds: [] });
  await useRoutineStore.getState().syncSessionHistory();
  expect(useRoutineStore.getState().sessionLogs).toHaveLength(1);
  expect(useRoutineStore.getState().getStats().totalMinutes).toBe(5);
  expect(useRoutineStore.getState().getStats().totalSessions).toBe(1);
});
test('upload failure retains local progress and exposes a retryable error', async () => {
  signInLocally();
  useRoutineStore.setState({ sessionLogs: [sampleLog()] });
  setDoc.mockImplementation(async () => { throw new Error('offline'); });
  await useRoutineStore.getState().syncSessionHistory();
  expect(useRoutineStore.getState().sessionLogs).toHaveLength(1);
  expect(useRoutineStore.getState().syncedSessionLogIds).toHaveLength(0);
  expect(useRoutineStore.getState().sessionSyncError).toContain('Reintenta');
  setDoc.mockImplementation(writeDocument);
  await useRoutineStore.getState().syncSessionHistory();
  expect(useRoutineStore.getState().sessionSyncError).toBeNull();
  expect(cloudSessions.size).toBe(1);
});
test('switching accounts cannot display or upload another account history', async () => {
  signInLocally('other-user');
  useRoutineStore.setState({ sessionLogs: [sampleLog('cloud-user')] });
  await useRoutineStore.getState().syncSessionHistory();
  expect(cloudSessions.size).toBe(0);
  expect(useRoutineStore.getState().getStats().totalSessions).toBe(0);
});
test('session deletion reaches the cloud and remains deleted after a fresh load', async () => {
  signInLocally();
  useRoutineStore.setState({ sessionLogs: [sampleLog()] });
  await useRoutineStore.getState().syncSessionHistory();
  useRoutineStore.getState().deleteSessionLog('log-test');
  await useRoutineStore.getState().syncSessionHistory();
  expect(cloudSessions.size).toBe(0);
  useRoutineStore.setState({ sessionLogs: [], syncedSessionLogIds: [], deletedSessionLogs: {} });
  await useRoutineStore.getState().syncSessionHistory();
  expect(useRoutineStore.getState().sessionLogs).toHaveLength(0);
});
test('repeated syncs and retries never duplicate a completed session', async () => {
  signInLocally();
  useRoutineStore.setState({ sessionLogs: [sampleLog()] });
  await Promise.all([useRoutineStore.getState().syncSessionHistory(), useRoutineStore.getState().syncSessionHistory()]);
  expect(cloudSessions.size).toBe(1);
  expect(useRoutineStore.getState().sessionLogs).toHaveLength(1);
});
