import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db, withFirebaseTimeout } from './firebase';
import type { Routine } from '../types';

export async function loadCloudRoutines(): Promise<Routine[]> {
  const snapshot = await withFirebaseTimeout(getDocs(collection(db, 'routines')));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Routine);
}

export async function saveCloudRoutine(routine: Routine, adminUid: string): Promise<void> {
  // Firestore does not accept undefined optional properties, including nested exercises.
  const data = JSON.parse(JSON.stringify({ ...routine, createdBy: adminUid }));
  await withFirebaseTimeout(setDoc(doc(db, 'routines', routine.id), data));
}

export async function deleteCloudRoutine(id: string): Promise<void> {
  await withFirebaseTimeout(deleteDoc(doc(db, 'routines', id)));
}

export async function assignCloudRoutine(uid: string, routineId: string): Promise<void> {
  // Update only the assignment; never replace roles or personal profile fields.
  await withFirebaseTimeout(updateDoc(doc(db, 'users', uid), { assignedRoutineId: routineId }));
}
