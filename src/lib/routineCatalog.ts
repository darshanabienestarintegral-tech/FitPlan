import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db, withFirebaseTimeout } from './firebase';
import type { Routine, Exercise } from '../types';

export async function loadCloudRoutines(): Promise<Routine[]> {
  const snapshot = await withFirebaseTimeout(getDocs(collection(db, 'routines')));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Routine);
}

export async function saveCloudRoutine(routine: Routine, adminUid: string, exercises: Exercise[] = []): Promise<void> {
  // Firestore does not accept undefined optional properties, including nested exercises.
  const referenced = new Set(routine.days.flatMap((day) => day.exercise_configs.flatMap((item) => [item.exerciseId, ...(item.alternativeExerciseIds || [])])));
  const library = new Map((routine.exercise_library || []).map((exercise) => [exercise.id, exercise]));
  exercises.filter((exercise) => referenced.has(exercise.id)).forEach((exercise) => library.set(exercise.id, exercise));
  const data = JSON.parse(JSON.stringify({ ...routine, createdBy: adminUid, exercise_library: [...library.values()] }));
  await withFirebaseTimeout(setDoc(doc(db, 'routines', routine.id), data));
}

export async function deleteCloudRoutine(id: string): Promise<void> {
  await withFirebaseTimeout(deleteDoc(doc(db, 'routines', id)));
}

export async function assignCloudRoutine(uid: string, routineId: string): Promise<void> {
  // Update only the assignment; never replace roles or personal profile fields.
  await withFirebaseTimeout(updateDoc(doc(db, 'users', uid), { assignedRoutineId: routineId }));
}
