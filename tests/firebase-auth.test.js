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
const cloudRoutines = new Map();
const cloudUsers = new Map();
const table = (path) => ({ session_logs: cloudSessions, routines: cloudRoutines, users: cloudUsers })[path];
const writeDocument = async (ref, data) => { table(ref.path).set(ref.id, structuredClone(data)); };
const setDoc = mock(writeDocument);
const updateDoc = mock(async (ref, data) => {
  if (!table(ref.path).has(ref.id)) throw new Error('not-found');
  table(ref.path).set(ref.id, { ...table(ref.path).get(ref.id), ...structuredClone(data) });
});
const getDocs = mock(async (request) => ({ docs: [...table(request.path).entries()]
  .filter(([, data]) => !request.constraint || data[request.constraint.field] === request.constraint.value)
  .map(([id, data]) => ({ id, data: () => structuredClone(data) })) }));
const deleteDoc = mock(async (ref) => { table(ref.path).delete(ref.id); });
const getDoc = mock(async (ref) => ({ exists: () => table(ref.path).has(ref.id), data: () => structuredClone(table(ref.path).get(ref.id)) }));
mock.module('firebase/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
mock.module('firebase/auth', () => ({ getAuth: () => ({}), createUserWithEmailAndPassword: createUser,
  signInWithEmailAndPassword: signIn, signOut: async () => {} }));
mock.module('firebase/firestore', () => ({ getFirestore, doc: (_db, path, id) => ({ path, id }), getDoc, setDoc, updateDoc, deleteDoc,
  collection: (_db, path) => ({ path }), query: (ref, constraint) => ({ ...ref, constraint }),
  where: (field, operator, value) => ({ field, operator, value }), getDocFromServer: getDoc, getDocs }));
mock.module('../src/lib/supabase', () => ({ supabase: {}, isSupabaseConfigured: false }));
const { saveUserProfile, loginWithFirebase } = await import('../src/lib/firebase');
const { useUserStore } = await import('../src/store/useUserStore');
const { useRoutineStore } = await import('../src/store/useRoutineStore');
const seedRoutines = useRoutineStore.getState().routines;

beforeEach(() => {
  storage.clear();
  useUserStore.setState({ isAuthenticated: false, registeredAccounts: [], currentUser: null,
    profile: null, isLoading: false, error: null });
  createUser.mockClear(); setDoc.mockClear(); signIn.mockClear();
  setDoc.mockImplementation(writeDocument);
  cloudSessions.clear(); cloudUsers.clear(); cloudRoutines.clear();
  updateDoc.mockClear();
  useRoutineStore.setState({ routines: seedRoutines, activeRoutine: seedRoutines[0], pendingRoutineIds: [],
    syncedRoutineIds: [], deletedRoutineIds: [], routineSyncError: null, isSyncingRoutines: false,
    sessionLogs: [], syncedSessionLogIds: [], deletedSessionLogs: {},
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

const cloudProfile = (uid, username, role = 'usuario') => ({ uid, username, displayName: username,
  email: `${username}@darshanagym.local`, role, createdAt: new Date().toISOString() });
function signInAdmin() {
  signInLocally('admin-uid');
  useUserStore.setState({ currentUser: { uid: 'admin-uid', username: 'Jamil', role: 'admin', isAdmin: true } });
}
function adminRoutine() {
  return { ...seedRoutines[0], id: 'routine-admin-test', user_id: 'admin-uid', created_by: 'Jamil',
    name: 'Prueba Darshana', days: seedRoutines[0].days.map((day) => ({ ...day,
      exercise_configs: day.exercise_configs.map((config) => ({ ...config, sets: 3 })) })) };
}
test('administrator roster loads all Firebase accounts with current roles', async () => {
  signInAdmin();
  cloudUsers.set('admin-uid', cloudProfile('admin-uid', 'Jamil', 'admin'));
  cloudUsers.set('cloud-user', cloudProfile('cloud-user', 'prueba_fitplan'));
  await useUserStore.getState().syncCloudAccounts();
  expect(useUserStore.getState().registeredAccounts).toHaveLength(2);
  expect(useUserStore.getState().registeredAccounts.find((account) => account.username === 'Jamil').role).toBe('admin');
  expect(useUserStore.getState().registeredAccounts.find((account) => account.username === 'prueba_fitplan').profileId).toBe('cloud-user');
});
test('regular accounts load only their own profile metadata', async () => {
  signInLocally();
  cloudUsers.set('cloud-user', cloudProfile('cloud-user', 'test'));
  cloudUsers.set('other-user', cloudProfile('other-user', 'other'));
  await useUserStore.getState().syncCloudAccounts();
  expect(useUserStore.getState().registeredAccounts).toHaveLength(1);
  expect(useUserStore.getState().registeredAccounts[0].profileId).toBe('cloud-user');
});
test('admin-created routine and assignment survive a fresh student browser', async () => {
  signInAdmin();
  cloudUsers.set('admin-uid', cloudProfile('admin-uid', 'Jamil', 'admin'));
  cloudUsers.set('cloud-user', cloudProfile('cloud-user', 'prueba_fitplan'));
  await useUserStore.getState().syncCloudAccounts();
  useRoutineStore.getState().addCustomRoutine(adminRoutine(), false);
  expect(await useRoutineStore.getState().syncRoutineCatalog()).toBe(true);
  await useUserStore.getState().assignRoutineToAccount('prueba_fitplan', 'routine-admin-test');
  expect(cloudUsers.get('cloud-user').assignedRoutineId).toBe('routine-admin-test');
  expect(cloudUsers.get('cloud-user').role).toBe('usuario');
  expect(cloudRoutines.get('routine-admin-test').createdBy).toBe('admin-uid');
  // A fresh device has no administrator catalog or locally assigned account.
  signInLocally();
  useUserStore.setState({ registeredAccounts: [] });
  useRoutineStore.setState({ routines: seedRoutines, activeRoutine: seedRoutines[0], syncedRoutineIds: [], pendingRoutineIds: [] });
  await useUserStore.getState().syncCloudAccounts();
  expect(await useRoutineStore.getState().syncRoutineCatalog()).toBe(true);
  expect(useRoutineStore.getState().activeRoutine.id).toBe('routine-admin-test');
  expect(useRoutineStore.getState().activeRoutine.days[0].exercise_configs[0].sets).toBe(3);
});
test('failed cloud assignment does not claim success or update the local assignment', async () => {
  signInAdmin();
  cloudUsers.set('cloud-user', cloudProfile('cloud-user', 'prueba_fitplan'));
  await useUserStore.getState().syncCloudAccounts();
  updateDoc.mockRejectedValueOnce(new Error('permission-denied'));
  await expect(useUserStore.getState().assignRoutineToAccount('prueba_fitplan', 'routine-admin-test')).rejects.toThrow();
  expect(useUserStore.getState().registeredAccounts[0].assignedRoutineId).toBeUndefined();
  expect(useUserStore.getState().accountsSyncError).toContain('No se pudo guardar');
});
test('regular users cannot assign a routine to another account', async () => {
  signInLocally();
  useUserStore.setState({ registeredAccounts: [{ username: 'other', profileId: 'other-user' }] });
  await expect(useUserStore.getState().assignRoutineToAccount('other', 'any-routine')).rejects.toThrow();
  expect(updateDoc).not.toHaveBeenCalled();
});
test('local administrator routines are migrated without overwriting them with default seeds', async () => {
  signInAdmin();
  const routine = adminRoutine();
  useRoutineStore.setState({ routines: [...seedRoutines, routine] });
  await useRoutineStore.getState().syncRoutineCatalog();
  expect(cloudRoutines.get(routine.id).name).toBe('Prueba Darshana');
  useRoutineStore.setState({ routines: seedRoutines, syncedRoutineIds: [], pendingRoutineIds: [] });
  await useRoutineStore.getState().syncRoutineCatalog();
  expect(useRoutineStore.getState().routines.find((item) => item.id === routine.id).days[0].exercise_configs[0].sets).toBe(3);
});
test('cloud routine edits and deletes survive catalog reloads', async () => {
  signInAdmin();
  useRoutineStore.getState().addCustomRoutine(adminRoutine(), false);
  await useRoutineStore.getState().syncRoutineCatalog();
  const updated = { ...useRoutineStore.getState().routines.find((item) => item.id === 'routine-admin-test'), name: 'Edited routine' };
  useRoutineStore.getState().updateRoutine(updated.id, updated);
  await useRoutineStore.getState().syncRoutineCatalog();
  expect(cloudRoutines.get(updated.id).name).toBe('Edited routine');
  expect(useRoutineStore.getState().deleteRoutine(updated.id)).toBe(true);
  await useRoutineStore.getState().syncRoutineCatalog();
  expect(cloudRoutines.has(updated.id)).toBe(false);
});

test('failed routine upload retains pending edits for a successful retry', async () => {
  signInAdmin();
  setDoc.mockImplementation(async () => { throw new Error('offline'); });
  useRoutineStore.getState().addCustomRoutine(adminRoutine(), false);
  expect(await useRoutineStore.getState().syncRoutineCatalog()).toBe(false);
  expect(useRoutineStore.getState().pendingRoutineIds).toContain('routine-admin-test');
  expect(useRoutineStore.getState().routines.some((routine) => routine.id === 'routine-admin-test')).toBe(true);
  expect(useRoutineStore.getState().routineSyncError).toContain('reintenta');
  setDoc.mockImplementation(writeDocument);
  expect(await useRoutineStore.getState().syncRoutineCatalog()).toBe(true);
  expect(useRoutineStore.getState().pendingRoutineIds).not.toContain('routine-admin-test');
  expect(cloudRoutines.size).toBe(1);
});
test('student catalog refresh never uploads pending administrator edits', async () => {
  signInLocally();
  useRoutineStore.setState({ routines: [...seedRoutines, adminRoutine()], pendingRoutineIds: ['routine-admin-test'] });
  await useRoutineStore.getState().syncRoutineCatalog();
  expect(cloudRoutines.size).toBe(0);
});

test('imported custom exercise definitions and instructions travel with the cloud routine', async () => {
  signInAdmin();
  const baseExercises = useRoutineStore.getState().exercises;
  const custom = { ...baseExercises[0], id: 'pdf-custom-exercise', name: 'Imported movement', is_default: false };
  useRoutineStore.getState().addExerciseToLibrary(custom);
  const routine = adminRoutine();
  routine.days = [{ ...routine.days[0], exercise_ids: [custom.id], exercise_configs: [{exerciseId: custom.id,
    sets: 3, reps: '10 por lado', restSeconds: 0, restLabel: 'No especificado', notes: 'Sostener 5 segundos.'}] }];
  useRoutineStore.getState().addCustomRoutine(routine, false);
  await useRoutineStore.getState().syncRoutineCatalog();
  expect(cloudRoutines.get(routine.id).exercise_library.some(ex=>ex.id===custom.id)).toBe(true);
  signInLocally();
  useRoutineStore.setState({ routines: seedRoutines, syncedRoutineIds: [], pendingRoutineIds: [], exercises: baseExercises });
  await useRoutineStore.getState().syncRoutineCatalog();
  expect(useRoutineStore.getState().exercises.find(ex=>ex.id===custom.id).name).toBe('Imported movement');
  expect(useRoutineStore.getState().routines.find(r=>r.id===routine.id).days[0].exercise_configs[0].notes).toBe('Sostener 5 segundos.');
});
