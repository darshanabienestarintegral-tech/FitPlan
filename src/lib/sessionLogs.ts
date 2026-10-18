import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, withFirebaseTimeout } from './firebase';
import type { SessionLog } from '../types';

// userId matches the deployed Firestore ownership rules. Keep user_id in the
// application model for existing charts and locally retained session history.
export async function saveCloudSession(log: SessionLog, uid: string): Promise<void> {
  if (log.user_id !== uid) throw new Error('La sesión pertenece a otra cuenta.');
  const { notes, routine_day_name, ...required } = log;
  await withFirebaseTimeout(setDoc(doc(db, 'session_logs', log.id), {
    ...required,
    userId: uid,
    ...(notes !== undefined ? { notes } : {}),
    ...(routine_day_name !== undefined ? { routine_day_name } : {}),
  }));
}

export async function loadCloudSessions(uid: string): Promise<SessionLog[]> {
  const snapshot = await withFirebaseTimeout(getDocs(query(
    collection(db, 'session_logs'), where('userId', '==', uid),
  )));
  return snapshot.docs.map((item) => {
    const { userId, ...data } = item.data();
    return { ...data, id: item.id, user_id: uid } as SessionLog;
  });
}

export async function deleteCloudSession(id: string): Promise<void> {
  await withFirebaseTimeout(deleteDoc(doc(db, 'session_logs', id)));
}
