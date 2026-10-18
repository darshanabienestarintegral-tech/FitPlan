import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Exercise, Routine, RoutineDay, SessionLog, WorkoutStats } from '../types';
import seedExercises from '../data/exercises.seed.json';
import { defaultSeedRoutines } from '../data/defaultRoutines';
import { generateRoutine } from '../lib/routineGenerator';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useUserStore } from './useUserStore';
import { saveCloudSession, loadCloudSessions, deleteCloudSession } from '../lib/sessionLogs';
import { loadCloudRoutines, saveCloudRoutine, deleteCloudRoutine } from '../lib/routineCatalog';

const routineSyncTasks = new Map<string, Promise<boolean>>();
const sessionSyncTasks = new Map<string, Promise<void>>();

interface WorkoutSessionState {
  routineDayId: string | null;
  startTime: number | null;
  completedExerciseIds: string[];
  completedSetsMap: Record<string, number>; // exerciseId -> number of completed sets
  activeRestTimer: {
    remaining: number;
    initial: number;
    isRunning: boolean;
    exerciseName?: string;
  } | null;
}

interface RoutineState {
  exercises: Exercise[];
  routines: Routine[];
  pendingRoutineIds: string[];
  syncedRoutineIds: string[];
  deletedRoutineIds: string[];
  routineSyncError: string | null;
  isSyncingRoutines: boolean;
  syncRoutineCatalog: () => Promise<boolean>;
  activeRoutine: Routine | null;
  activeDayIndex: number;
  sessionLogs: SessionLog[];
  syncedSessionLogIds: string[];
  deletedSessionLogs: Record<string, string>; // log ID -> owner UID
  sessionSyncError: string | null;
  sessionSyncUserId: string | null;
  isSyncingSessions: boolean;
  syncSessionHistory: () => Promise<void>;
  activeSession: WorkoutSessionState;
  isLiveWorkoutOpen: boolean;
  isFullScreenTimerOpen: boolean;

  // Actions
  createOrRegenerateRoutine: () => Routine | null;
  addCustomRoutine: (routine: Routine, makeActive?: boolean) => void;
  updateRoutine: (routineId: string, updatedRoutine: Routine) => void;
  canEditRoutine: (routineId: string) => { allowed: boolean; reason?: string };
  canDeleteRoutine: (routineId: string) => { allowed: boolean; reason?: string };
  deleteRoutine: (routineId: string) => boolean;
  setActiveRoutineById: (routineId: string) => void;
  replaceExerciseInDay: (dayId: string, oldExerciseId: string, newExerciseId: string) => void;
  addExerciseToLibrary: (exercise: Exercise) => void;
  updateExerciseInLibrary: (exerciseId: string, updatedExercise: Exercise) => void;
  canDeleteExercise: (exerciseId: string) => { allowed: boolean; reason?: string };
  deleteExerciseFromLibrary: (exerciseId: string) => boolean;
  setActiveDayIndex: (index: number) => void;
  startSession: (dayId: string) => void;
  openLiveWorkout: () => void;
  closeLiveWorkout: () => void;
  setFullScreenTimerOpen: (open: boolean) => void;
  toggleExerciseCompleted: (exerciseId: string) => void;
  incrementSetCompleted: (exerciseId: string, maxSets: number) => void;
  decrementSetCompleted: (exerciseId: string) => void;
  toggleSetForExercise: (exerciseId: string, setIndex: number, totalSets: number) => void;
  startRestTimer: (seconds: number, exerciseName?: string, openFullScreen?: boolean) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  addRestTimerSeconds: (seconds: number) => void;
  resetRestTimer: () => void;
  tickRestTimer: () => void;
  finishCurrentSession: (durationMin?: number, notes?: string) => SessionLog | null;
  cancelSession: () => void;
  deleteSessionLog: (logId: string) => void;
  addSessionLogDirectly: (log: SessionLog) => void;
  seedSampleWeeklyLogs: () => void;
  getStats: () => WorkoutStats;
  syncRoutineToSupabase: (routine: Routine) => Promise<void>;
  syncSessionLogsToSupabase: (log: SessionLog) => Promise<void>;
}

const initialSessionState: WorkoutSessionState = {
  routineDayId: null,
  startTime: null,
  completedExerciseIds: [],
  completedSetsMap: {},
  activeRestTimer: null,
};

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set, get) => ({
      exercises: (seedExercises as Exercise[]).map((e) => ({ ...e, is_default: true })),
      routines: defaultSeedRoutines,
      pendingRoutineIds: [],
      syncedRoutineIds: [],
      deletedRoutineIds: [],
      routineSyncError: null,
      isSyncingRoutines: false,
      syncRoutineCatalog: async () => {
        const user = useUserStore.getState().currentUser;
        if (!user?.uid || !useUserStore.getState().isAuthenticated) return false;
        const existing = routineSyncTasks.get(user.uid);
        if (existing) {
          await existing;
          return useUserStore.getState().currentUser?.uid === user.uid ? get().syncRoutineCatalog() : false;
        }
        const task = (async () => {
          set({ isSyncingRoutines: true, routineSyncError: null });
          try {
            if (user.isAdmin) {
              const seedIds = new Set(defaultSeedRoutines.map((routine) => routine.id));
              // Migrate this administrator's locally created routines on first sync.
              const pending = get().routines.filter((routine) => !get().deletedRoutineIds.includes(routine.id) &&
                (get().pendingRoutineIds.includes(routine.id) || (!seedIds.has(routine.id) &&
                  !get().syncedRoutineIds.includes(routine.id) && (routine.user_id === user.uid ||
                    routine.created_by?.toLowerCase() === user.username.toLowerCase()))));
              for (const routine of pending) {
                if (useUserStore.getState().currentUser?.uid !== user.uid) return false;
                await saveCloudRoutine(routine, user.uid!, get().exercises);
                set((state) => ({
                  syncedRoutineIds: [...new Set([...state.syncedRoutineIds, routine.id])],
                  // Preserve a newer edit made while the older snapshot was uploading.
                  pendingRoutineIds: state.routines.find((item) => item.id === routine.id) === routine
                    ? state.pendingRoutineIds.filter((id) => id !== routine.id) : state.pendingRoutineIds,
                }));
              }
              for (const id of get().deletedRoutineIds) {
                if (useUserStore.getState().currentUser?.uid !== user.uid) return false;
                await deleteCloudRoutine(id);
              }
            }
            const remote = await loadCloudRoutines();
            if (useUserStore.getState().currentUser?.uid !== user.uid) return false;
            set((state) => {
              const combined = new Map(state.routines.filter((routine) => !state.syncedRoutineIds.includes(routine.id) ||
                state.pendingRoutineIds.includes(routine.id)).map((routine) => [routine.id, routine]));
              remote.forEach((routine) => {
                if (!state.pendingRoutineIds.includes(routine.id)) combined.set(routine.id, routine);
              });
              // Seed defaults remain available even when they have no cloud document.
              defaultSeedRoutines.forEach((routine) => { if (!combined.has(routine.id)) combined.set(routine.id, routine); });
              const routines = [...combined.values()].filter((routine) => !state.deletedRoutineIds.includes(routine.id));
              const account = useUserStore.getState().registeredAccounts.find((item) => item.profileId === user.uid);
              const assigned = routines.find((routine) => routine.id === account?.assignedRoutineId);
              const exerciseLibrary = new Map(state.exercises.map((exercise) => [exercise.id, exercise]));
              remote.flatMap((routine) => routine.exercise_library || []).forEach((exercise) => exerciseLibrary.set(exercise.id, exercise));
              return {
                routines,
                exercises: [...exerciseLibrary.values()],
                activeRoutine: assigned || routines.find((routine) => routine.id === state.activeRoutine?.id) || routines[0] || null,
                syncedRoutineIds: [...new Set([...state.syncedRoutineIds, ...remote.map((routine) => routine.id)])],
              };
            });
            return true;
          } catch (error) {
            console.warn('Could not synchronize routine catalog:', error);
            if (useUserStore.getState().currentUser?.uid === user.uid) set({ routineSyncError: 'No se pudieron sincronizar las rutinas. Los cambios locales se conservan; reintenta antes de cerrar el navegador.' });
            return false;
          } finally {
            if (useUserStore.getState().currentUser?.uid === user.uid) set({ isSyncingRoutines: false });
          }
        })();
        routineSyncTasks.set(user.uid, task);
        try { return await task; } finally { routineSyncTasks.delete(user.uid); }
      },
      activeRoutine:
        defaultSeedRoutines.find((r) => r.id === 'routine-cristian-aguilera') || defaultSeedRoutines[0],
      activeDayIndex: 0,
      sessionLogs: [],
      syncedSessionLogIds: [],
      deletedSessionLogs: {},
      sessionSyncError: null,
      sessionSyncUserId: null,
      isSyncingSessions: false,

      syncSessionHistory: async () => {
        const uid = useUserStore.getState().currentUser?.uid;
        if (!uid || !useUserStore.getState().isAuthenticated) return;
        const existing = sessionSyncTasks.get(uid);
        if (existing) {
          await existing;
          // A session may have been added while the previous request ran.
          if (useUserStore.getState().currentUser?.uid === uid) await get().syncSessionHistory();
          return;
        }
        const task = (async () => {
          set({ isSyncingSessions: true, sessionSyncError: null, sessionSyncUserId: uid });
          try {
            const localLogs = get().sessionLogs.filter((log) =>
              log.user_id === uid && !get().syncedSessionLogIds.includes(log.id) &&
              get().deletedSessionLogs[log.id] !== uid);
            for (const log of localLogs) {
              if (useUserStore.getState().currentUser?.uid !== uid) return;
              await saveCloudSession(log, uid);
              set((state) => ({ syncedSessionLogIds: [...new Set([...state.syncedSessionLogIds, log.id])] }));
            }
            // Retain deletion markers locally so delayed reads never resurrect a removed log.
            for (const [id, owner] of Object.entries(get().deletedSessionLogs)) {
              if (owner !== uid) continue;
              if (useUserStore.getState().currentUser?.uid !== uid) return;
              await deleteCloudSession(id);
            }
            const remoteLogs = await loadCloudSessions(uid);
            if (useUserStore.getState().currentUser?.uid !== uid) return;
            set((state) => {
              const pending = state.sessionLogs.filter((log) => log.user_id === uid &&
                !state.syncedSessionLogIds.includes(log.id));
              const merged = new Map(remoteLogs.map((log) => [log.id, log]));
              pending.forEach((log) => merged.set(log.id, log));
              const ownLogs = [...merged.values()].filter((log) => state.deletedSessionLogs[log.id] !== uid);
              return {
                sessionLogs: [...state.sessionLogs.filter((log) => log.user_id !== uid), ...ownLogs]
                  .sort((a, b) => b.date.localeCompare(a.date)),
                syncedSessionLogIds: [...new Set([...state.syncedSessionLogIds, ...remoteLogs.map((log) => log.id)])],
              };
            });
          } catch (error) {
            console.warn('Could not synchronize workout history:', error);
            if (useUserStore.getState().currentUser?.uid === uid) {
              set({ sessionSyncError: 'No se pudo sincronizar el progreso con Internet. Los cambios locales siguen en este navegador. Reintenta antes de cerrarlo.' });
            }
          } finally {
            if (get().sessionSyncUserId === uid) set({ isSyncingSessions: false });
          }
        })();
        sessionSyncTasks.set(uid, task);
        try { await task; } finally { sessionSyncTasks.delete(uid); }
      },
      activeSession: initialSessionState,
      isLiveWorkoutOpen: false,
      isFullScreenTimerOpen: false,

      openLiveWorkout: () => set({ isLiveWorkoutOpen: true }),
      closeLiveWorkout: () => set({ isLiveWorkoutOpen: false }),
      setFullScreenTimerOpen: (open: boolean) => set({ isFullScreenTimerOpen: open }),

      createOrRegenerateRoutine: () => {
        const userProfile = useUserStore.getState().profile;
        if (!userProfile) return null;

        const newRoutine = generateRoutine(
          {
            userId: userProfile.id,
            goal: userProfile.goal,
            daysPerWeek: userProfile.days_per_week,
            sessionDuration: userProfile.session_duration || 45,
            equipment: userProfile.equipment,
          },
          get().exercises
        );

        set((state) => ({
          routines: [newRoutine, ...state.routines.filter((r) => r.id !== newRoutine.id)],
          activeRoutine: newRoutine,
          pendingRoutineIds: useUserStore.getState().currentUser?.isAdmin ? [...get().pendingRoutineIds, newRoutine.id] : get().pendingRoutineIds,
          activeDayIndex: 0,
          activeSession: initialSessionState,
        }));

        // Fire async sync if configured
        void get().syncRoutineCatalog();
        get().syncRoutineToSupabase(newRoutine);

        return newRoutine;
      },

      addCustomRoutine: (routine: Routine, makeActive = true) => {
        const currentUser = useUserStore.getState().currentUser;
        const profile = useUserStore.getState().profile;
        const formattedRoutine: Routine = {
          ...routine,
          is_default: routine.is_default ?? false,
          created_by: routine.created_by || currentUser?.username || 'usuario',
          user_id: routine.user_id || profile?.id || currentUser?.username || 'usuario',
        };

        set((state) => {
          const updatedRoutines = [formattedRoutine, ...state.routines.filter((r) => r.id !== formattedRoutine.id)];
          return {
            routines: updatedRoutines,
            pendingRoutineIds: currentUser?.isAdmin ? [...new Set([...state.pendingRoutineIds, formattedRoutine.id])] : state.pendingRoutineIds,
            activeRoutine: makeActive ? formattedRoutine : state.activeRoutine || formattedRoutine,
            activeDayIndex: 0,
            activeSession: makeActive ? initialSessionState : state.activeSession,
          };
        });

        void get().syncRoutineCatalog();
        get().syncRoutineToSupabase(formattedRoutine);
      },

      updateRoutine: (routineId: string, updatedRoutine: Routine) => {
        const check = get().canEditRoutine(routineId);
        if (!check.allowed) {
          console.warn(`[Permiso de Edición Denegado] ${check.reason}`);
          return;
        }

        set((state) => {
          const updatedRoutines = state.routines.map((r) => (r.id === routineId ? updatedRoutine : r));
          const isActive = state.activeRoutine?.id === routineId;
          return {
            routines: updatedRoutines,
            pendingRoutineIds: useUserStore.getState().currentUser?.isAdmin ? [...new Set([...state.pendingRoutineIds, routineId])] : state.pendingRoutineIds,
            activeRoutine: isActive ? updatedRoutine : state.activeRoutine,
          };
        });

        void get().syncRoutineCatalog();
        get().syncRoutineToSupabase(updatedRoutine);
      },

      canEditRoutine: (routineId: string) => {
        const currentUser = useUserStore.getState().currentUser;
        const isAdmin = Boolean(currentUser?.isAdmin);
        const routine = get().routines.find((r) => r.id === routineId);
        if (!routine) return { allowed: false, reason: 'Rutina no encontrada' };

        // Rutinas predeterminadas o creadas por admin (incluyendo la rutina de Cristian Aguilera)
        if (routine.is_default || routine.created_by === 'admin' || routine.id === 'routine-cristian-aguilera') {
          if (isAdmin) {
            return { allowed: true };
          }
          return {
            allowed: false,
            reason: 'Esta rutina predeterminada de Cristian Aguilera está protegida. Solo el administrador de la aplicación puede editarla.',
          };
        }

        if (isAdmin) {
          return { allowed: true };
        }

        const profile = useUserStore.getState().profile;
        const currentUsername = currentUser?.username?.toLowerCase();
        const isCreatedBySelf =
          (currentUsername && routine.created_by?.toLowerCase() === currentUsername) ||
          (currentUsername && routine.user_id?.toLowerCase() === currentUsername) ||
          (profile?.id && routine.user_id === profile.id);

        if (isCreatedBySelf) {
          return { allowed: true };
        }

        return {
          allowed: false,
          reason: 'Solo el administrador o el creador de la rutina pueden editarla.',
        };
      },

      canDeleteRoutine: (routineId: string) => {
        const currentUser = useUserStore.getState().currentUser;
        const isAdmin = Boolean(currentUser?.isAdmin);
        const routine = get().routines.find((r) => r.id === routineId);
        if (!routine) return { allowed: false, reason: 'Rutina no encontrada' };

        if (routine.is_default) {
          if (isAdmin) {
            return { allowed: true };
          }
          return {
            allowed: false,
            reason: 'Esta rutina es predeterminada de la aplicación. Solo el administrador puede eliminarla.',
          };
        }

        // Rutina creada por atleta / personalizada
        if (isAdmin) {
          return { allowed: true };
        }

        const profile = useUserStore.getState().profile;
        const currentUsername = currentUser?.username?.toLowerCase();
        const isCreatedBySelf =
          (currentUsername && routine.created_by?.toLowerCase() === currentUsername) ||
          (currentUsername && routine.user_id?.toLowerCase() === currentUsername) ||
          (profile?.id && routine.user_id === profile.id);

        if (isCreatedBySelf) {
          return { allowed: true };
        }

        return {
          allowed: false,
          reason: 'Los usuarios comunes solo pueden eliminar rutinas creadas por ellos mismos.',
        };
      },

      deleteRoutine: (routineId: string): boolean => {
        const check = get().canDeleteRoutine(routineId);
        if (!check.allowed) {
          console.warn(`[Permiso Denegado] ${check.reason}`);
          return false;
        }

        set((state) => {
          const remainingRoutines = state.routines.filter((r) => r.id !== routineId);
          const nextActive = state.activeRoutine?.id === routineId ? (remainingRoutines[0] || null) : state.activeRoutine;
          return {
            routines: remainingRoutines,
            deletedRoutineIds: useUserStore.getState().currentUser?.isAdmin ? [...new Set([...state.deletedRoutineIds, routineId])] : state.deletedRoutineIds,
            activeRoutine: nextActive,
            activeDayIndex: 0,
          };
        });
        void get().syncRoutineCatalog();
        return true;
      },

      setActiveRoutineById: (routineId: string) => {
        const routines = get().routines;
        let target = routines.find((r) => r.id === routineId);
        if (!target && routineId.includes('cristian')) {
          target = routines.find((r) => r.id.includes('cristian') || r.name.toLowerCase().includes('cristian'));
        }
        if (!target) {
          target = routines.find((r) => r.name.toLowerCase() === routineId.toLowerCase());
        }

        if (target) {
          const currentUser = useUserStore.getState().currentUser;
          if (currentUser?.username) {
            void useUserStore.getState().assignRoutineToAccount(currentUser.username, target.id).catch(() => {});
          }
          set({
            activeRoutine: target,
            activeDayIndex: 0,
            activeSession: initialSessionState,
          });
        }
      },

      addExerciseToLibrary: (exercise: Exercise) => {
        const currentUser = useUserStore.getState().currentUser;
        const formattedExercise: Exercise = {
          ...exercise,
          is_default: exercise.is_default ?? false,
          created_by: exercise.created_by || currentUser?.username || 'usuario',
        };
        set((state) => {
          const exists = state.exercises.some((e) => e.id === formattedExercise.id);
          if (exists) return state;
          return {
            exercises: [formattedExercise, ...state.exercises],
          };
        });
      },

      updateExerciseInLibrary: (exerciseId: string, updatedExercise: Exercise) => {
        set((state) => ({
          exercises: state.exercises.map((e) => (e.id === exerciseId ? updatedExercise : e)),
        }));
      },

      canDeleteExercise: (exerciseId: string) => {
        const currentUser = useUserStore.getState().currentUser;
        const isAdmin = Boolean(currentUser?.isAdmin);
        const exercise = get().exercises.find((e) => e.id === exerciseId);
        if (!exercise) return { allowed: false, reason: 'Ejercicio no encontrado' };

        if (exercise.is_default) {
          if (isAdmin) {
            return { allowed: true };
          }
          return {
            allowed: false,
            reason: 'Este ejercicio es predeterminado de la aplicación. Solo el administrador puede eliminarlo.',
          };
        }

        // Ejercicio personalizado creado por usuario
        if (isAdmin) {
          return { allowed: true };
        }

        const currentUsername = currentUser?.username?.toLowerCase();
        const isCreatedBySelf =
          Boolean(currentUsername && exercise.created_by?.toLowerCase() === currentUsername);

        if (isCreatedBySelf) {
          return { allowed: true };
        }

        return {
          allowed: false,
          reason: 'Los usuarios comunes solo pueden eliminar ejercicios creados por ellos mismos.',
        };
      },

      deleteExerciseFromLibrary: (exerciseId: string): boolean => {
        const check = get().canDeleteExercise(exerciseId);
        if (!check.allowed) {
          console.warn(`[Permiso Denegado] ${check.reason}`);
          return false;
        }

        set((state) => ({
          exercises: state.exercises.filter((e) => e.id !== exerciseId),
        }));
        return true;
      },

      replaceExerciseInDay: (dayId: string, oldExerciseId: string, newExerciseId: string) => {
        const { activeRoutine, activeSession, exercises } = get();
        if (!activeRoutine) return;

        const updatedDays = activeRoutine.days.map((day) => {
          if (day.id !== dayId) return day;

          // Replace exercise_ids
          const updatedExerciseIds = day.exercise_ids.map((id) => (id === oldExerciseId ? newExerciseId : id));

          // Replace in exercise_configs
          const updatedConfigs = day.exercise_configs.map((config) => {
            if (config.exerciseId !== oldExerciseId) return config;

            // Generate alternatives for the new exercise
            const newEx = exercises.find((e) => e.id === newExerciseId);
            const remainingAlts = (config.alternativeExerciseIds || [])
              .filter((id) => id !== newExerciseId);
            if (!remainingAlts.includes(oldExerciseId)) {
              remainingAlts.push(oldExerciseId);
            }

            return {
              ...config,
              exerciseId: newExerciseId,
              alternativeExerciseIds: remainingAlts.slice(0, 3),
            };
          });

          return {
            ...day,
            exercise_ids: updatedExerciseIds,
            exercise_configs: updatedConfigs,
          };
        });

        const updatedRoutine = {
          ...activeRoutine,
          days: updatedDays,
        };

        // Update activeSession if oldExerciseId was in progress
        const updatedCompletedIds = activeSession.completedExerciseIds.map((id) =>
          id === oldExerciseId ? newExerciseId : id
        );
        const updatedCompletedSets = { ...activeSession.completedSetsMap };
        if (updatedCompletedSets[oldExerciseId] !== undefined) {
          updatedCompletedSets[newExerciseId] = updatedCompletedSets[oldExerciseId];
          delete updatedCompletedSets[oldExerciseId];
        }

        set({
          activeRoutine: updatedRoutine,
          routines: get().routines.map((r) => (r.id === updatedRoutine.id ? updatedRoutine : r)),
          activeSession: {
            ...activeSession,
            completedExerciseIds: updatedCompletedIds,
            completedSetsMap: updatedCompletedSets,
          },
        });
      },

      setActiveDayIndex: (index: number) => {
        set({ activeDayIndex: index });
      },

      startSession: (dayId: string) => {
        set({
          activeSession: {
            routineDayId: dayId,
            startTime: Date.now(),
            completedExerciseIds: [],
            completedSetsMap: {},
            activeRestTimer: null,
          },
          isLiveWorkoutOpen: true,
          isFullScreenTimerOpen: false,
        });
      },

      toggleExerciseCompleted: (exerciseId: string) => {
        const { activeSession } = get();
        const currentCompleted = activeSession.completedExerciseIds;
        const isCompleted = currentCompleted.includes(exerciseId);

        const updated = isCompleted
          ? currentCompleted.filter((id) => id !== exerciseId)
          : [...currentCompleted, exerciseId];

        set({
          activeSession: {
            ...activeSession,
            completedExerciseIds: updated,
          },
        });
      },

      incrementSetCompleted: (exerciseId: string, maxSets: number) => {
        const { activeSession } = get();
        const currentSets = activeSession.completedSetsMap[exerciseId] || 0;
        const nextSets = Math.min(maxSets, currentSets + 1);

        const isFullyDone = nextSets >= maxSets;
        const completedIds = isFullyDone
          ? Array.from(new Set([...activeSession.completedExerciseIds, exerciseId]))
          : activeSession.completedExerciseIds;

        set({
          activeSession: {
            ...activeSession,
            completedSetsMap: {
              ...activeSession.completedSetsMap,
              [exerciseId]: nextSets,
            },
            completedExerciseIds: completedIds,
          },
        });
      },

      decrementSetCompleted: (exerciseId: string) => {
        const { activeSession } = get();
        const currentSets = activeSession.completedSetsMap[exerciseId] || 0;
        const nextSets = Math.max(0, currentSets - 1);

        set({
          activeSession: {
            ...activeSession,
            completedSetsMap: {
              ...activeSession.completedSetsMap,
              [exerciseId]: nextSets,
            },
            completedExerciseIds: activeSession.completedExerciseIds.filter((id) => id !== exerciseId),
          },
        });
      },

      toggleSetForExercise: (exerciseId: string, setIndex: number, totalSets: number) => {
        const { activeSession } = get();
        const currentCompletedCount = activeSession.completedSetsMap[exerciseId] || 0;

        let nextSets: number;
        // If clicking the last completed set, toggle it off
        if (currentCompletedCount === setIndex) {
          nextSets = Math.max(0, setIndex - 1);
        } else {
          // Otherwise complete up to setIndex
          nextSets = Math.min(totalSets, Math.max(0, setIndex));
        }

        const isFullyDone = nextSets >= totalSets;
        const completedIds = isFullyDone
          ? Array.from(new Set([...activeSession.completedExerciseIds, exerciseId]))
          : activeSession.completedExerciseIds.filter((id) => id !== exerciseId);

        set({
          activeSession: {
            ...activeSession,
            completedSetsMap: {
              ...activeSession.completedSetsMap,
              [exerciseId]: nextSets,
            },
            completedExerciseIds: completedIds,
          },
        });
      },

      startRestTimer: (seconds: number, exerciseName?: string, openFullScreen = true) => {
        set((state) => ({
          isFullScreenTimerOpen: openFullScreen,
          activeSession: {
            ...state.activeSession,
            activeRestTimer: {
              remaining: seconds,
              initial: seconds,
              isRunning: true,
              exerciseName,
            },
          },
        }));
      },

      pauseRestTimer: () => {
        set((state) => {
          if (!state.activeSession.activeRestTimer) return state;
          return {
            activeSession: {
              ...state.activeSession,
              activeRestTimer: {
                ...state.activeSession.activeRestTimer,
                isRunning: false,
              },
            },
          };
        });
      },

      resumeRestTimer: () => {
        set((state) => {
          if (!state.activeSession.activeRestTimer) return state;
          return {
            activeSession: {
              ...state.activeSession,
              activeRestTimer: {
                ...state.activeSession.activeRestTimer,
                isRunning: true,
              },
            },
          };
        });
      },

      addRestTimerSeconds: (seconds: number) => {
        set((state) => {
          if (!state.activeSession.activeRestTimer) return state;
          const newRemaining = state.activeSession.activeRestTimer.remaining + seconds;
          return {
            activeSession: {
              ...state.activeSession,
              activeRestTimer: {
                ...state.activeSession.activeRestTimer,
                remaining: newRemaining,
                initial: Math.max(state.activeSession.activeRestTimer.initial, newRemaining),
              },
            },
          };
        });
      },

      resetRestTimer: () => {
        set((state) => ({
          activeSession: {
            ...state.activeSession,
            activeRestTimer: null,
          },
        }));
      },

      tickRestTimer: () => {
        set((state) => {
          const timer = state.activeSession.activeRestTimer;
          if (!timer || !timer.isRunning) return state;

          if (timer.remaining <= 1) {
            // Timer finished
            return {
              activeSession: {
                ...state.activeSession,
                activeRestTimer: {
                  ...timer,
                  remaining: 0,
                  isRunning: false,
                },
              },
            };
          }

          return {
            activeSession: {
              ...state.activeSession,
              activeRestTimer: {
                ...timer,
                remaining: timer.remaining - 1,
              },
            },
          };
        });
      },

      finishCurrentSession: (durationMinOverride?: number, notes?: string) => {
        const { activeSession, activeRoutine, sessionLogs } = get();
        const userProfile = useUserStore.getState().profile;
        if (!activeSession.routineDayId || !activeRoutine) return null;

        const currentDay = activeRoutine.days.find((d) => d.id === activeSession.routineDayId);
        const calcDuration = activeSession.startTime
          ? Math.max(1, Math.round((Date.now() - activeSession.startTime) / (1000 * 60)))
          : activeRoutine.session_duration || 45;

        const actualDuration = durationMinOverride || calcDuration;

        const newLog: SessionLog = {
          id: `log-${crypto.randomUUID()}`,
          user_id: userProfile?.id || activeRoutine.user_id,
          routine_day_id: activeSession.routineDayId,
          routine_day_name: currentDay?.name || 'Día de entrenamiento',
          date: new Date().toISOString(),
          duration_min: actualDuration,
          completed_exercises: activeSession.completedExerciseIds,
          notes,
        };

        const updatedLogs = [newLog, ...sessionLogs];

        set({
          sessionLogs: updatedLogs,
          activeSession: initialSessionState,
          isLiveWorkoutOpen: false,
          isFullScreenTimerOpen: false,
        });

        void get().syncSessionHistory();
        get().syncSessionLogsToSupabase(newLog);

        return newLog;
      },

      cancelSession: () => {
        set({
          activeSession: initialSessionState,
          isLiveWorkoutOpen: false,
          isFullScreenTimerOpen: false,
        });
      },

      deleteSessionLog: (logId: string) => {
        const log = get().sessionLogs.find((item) => item.id === logId);
        const uid = useUserStore.getState().currentUser?.uid;
        if (!log || (uid && log.user_id !== uid)) return;
        set((state) => ({
          sessionLogs: state.sessionLogs.filter((item) => item.id !== logId),
          deletedSessionLogs: { ...state.deletedSessionLogs, [logId]: log.user_id },
        }));
        void get().syncSessionHistory();
      },

      addSessionLogDirectly: (log: SessionLog) => {
        set((state) => ({
          sessionLogs: [log, ...state.sessionLogs],
        }));
        void get().syncSessionHistory();
        get().syncSessionLogsToSupabase(log);
      },

      seedSampleWeeklyLogs: () => {
        const { activeRoutine, sessionLogs } = get();
        const userProfile = useUserStore.getState().profile;
        const userId = userProfile?.id || activeRoutine?.user_id || 'usuario';

        // Calculate Monday of current week
        const now = new Date();
        const currentDayOfWeek = now.getDay();
        const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + distanceToMonday);
        monday.setHours(18, 30, 0, 0);

        // Days of week: Mon, Wed, Fri (or up to today)
        const daysToSeed = [0, 2, 4]; // Monday, Wednesday, Friday
        const daysRoutine = activeRoutine?.days || [];

        const newSampleLogs: SessionLog[] = daysToSeed.map((dayOffset, index) => {
          const logDate = new Date(monday);
          logDate.setDate(monday.getDate() + dayOffset);

          const rDay = daysRoutine[index % (daysRoutine.length || 1)];
          const exerciseIds = rDay?.exercise_ids || ['ex-02', 'ex-04', 'ex-18'];

          return {
            id: `sample-log-${Date.now()}-${index}`,
            user_id: userId,
            routine_day_id: rDay?.id || `sample-day-${index}`,
            routine_day_name: rDay?.name || `Día ${index + 1}: Entrenamiento Programado`,
            date: logDate.toISOString(),
            duration_min: 45 + (index % 3) * 5,
            completed_exercises: exerciseIds,
            notes: 'Sesión completada con excelente intensidad y técnica limpia.',
          };
        });

        // Avoid adding duplicates if already present for those dates
        const existingDates = new Set(sessionLogs.map((l) => l.date.split('T')[0]));
        const filteredNew = newSampleLogs.filter((l) => !existingDates.has(l.date.split('T')[0]));

        if (filteredNew.length === 0) {
          // If already populated, add one today or toggle
          const todayLog: SessionLog = {
            id: `sample-today-${Date.now()}`,
            user_id: userId,
            routine_day_id: daysRoutine[0]?.id || 'day-today',
            routine_day_name: daysRoutine[0]?.name || 'Sesión Rápida de Hoy',
            date: new Date().toISOString(),
            duration_min: 50,
            completed_exercises: daysRoutine[0]?.exercise_ids || ['ex-01', 'ex-02'],
            notes: 'Entrenamiento de hoy completado al 100%.',
          };
          set((state) => ({ sessionLogs: [todayLog, ...state.sessionLogs] }));
        } else {
          set((state) => ({ sessionLogs: [...filteredNew, ...state.sessionLogs] }));
        }
      },

      getStats: (): WorkoutStats => {
        const user = useUserStore.getState();
        const ownerId = user.currentUser?.uid || user.profile?.id;
        const logs = get().sessionLogs.filter((log) => log.user_id === ownerId);
        const totalSessions = logs.length;
        const totalMinutes = logs.reduce((acc, curr) => acc + (curr.duration_min || 0), 0);

        if (totalSessions === 0) {
          return {
            totalSessions: 0,
            totalMinutes: 0,
            streakDays: 0,
            weeklyAdherence: 0,
          };
        }

        // Streak calculation (consecutive days or recent frequency)
        const dateStrings = Array.from(
          new Set(logs.map((l) => l.date.split('T')[0]))
        ).sort().reverse();

        let streak = 0;
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // If today or yesterday has a session, count streak backwards
        if (dateStrings.includes(todayStr) || dateStrings.includes(yesterday)) {
          streak = 1;
          let checkDate = new Date(dateStrings[0]);
          for (let i = 1; i < dateStrings.length; i++) {
            const prevExpected = new Date(checkDate.getTime() - 86400000).toISOString().split('T')[0];
            if (dateStrings[i] === prevExpected) {
              streak++;
              checkDate = new Date(dateStrings[i]);
            } else {
              break;
            }
          }
        }

        // Calculate weekly adherence based on target days
        const userProfile = useUserStore.getState().profile;
        const targetWeekly = userProfile?.days_per_week || 3;
        const now = Date.now();
        const sevenDaysAgo = now - 7 * 86400000;
        const sessionsThisWeek = logs.filter(
          (l) => new Date(l.date).getTime() >= sevenDaysAgo
        ).length;
        const weeklyAdherence = Math.min(100, Math.round((sessionsThisWeek / targetWeekly) * 100));

        return {
          totalSessions,
          totalMinutes,
          streakDays: streak,
          weeklyAdherence,
        };
      },

      syncRoutineToSupabase: async (routine: Routine) => {
        if (!isSupabaseConfigured) return;
        try {
          await supabase.from('routines').upsert({
            id: routine.id,
            user_id: routine.user_id,
            name: routine.name,
            created_at: routine.created_at,
          });

          // Insert routine days
          for (const day of routine.days) {
            await supabase.from('routine_days').upsert({
              id: day.id,
              routine_id: routine.id,
              day_of_week: day.day_of_week,
              exercise_ids: day.exercise_ids,
            });
          }
        } catch (err) {
          console.warn('Could not sync routine to Supabase:', err);
        }
      },

      syncSessionLogsToSupabase: async (log: SessionLog) => {
        if (!isSupabaseConfigured) return;
        try {
          await supabase.from('session_logs').insert({
            id: log.id,
            user_id: log.user_id,
            routine_day_id: log.routine_day_id,
            date: log.date,
            duration_min: log.duration_min,
            completed_exercises: log.completed_exercises,
          });
        } catch (err) {
          console.warn('Could not sync session log to Supabase:', err);
        }
      },
    }),
    {
      name: 'fitplan_routine_storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isSyncingRoutines = false;
          state.routineSyncError = null;
          state.isSyncingSessions = false;
          state.sessionSyncUserId = null;
          state.sessionSyncError = null;
          // Guarantee all default routines (including Cristian Aguilera) are present and updated in store
          const cristianOfficial = defaultSeedRoutines.find((r) => r.id === 'routine-cristian-aguilera');
          const existingIds = new Set((state.routines || []).map((r) => r.id));
          const missingDefaults = defaultSeedRoutines.filter((r) => !existingIds.has(r.id));
          if (missingDefaults.length > 0) {
            state.routines = [...(state.routines || []), ...missingDefaults];
          }

          // Always ensure Cristian Aguilera routine is up to date and present
          if (cristianOfficial) {
            state.routines = (state.routines || []).map((r) =>
              r.id === 'routine-cristian-aguilera' && !state.syncedRoutineIds?.includes(r.id) && !state.pendingRoutineIds?.includes(r.id) ? cristianOfficial : r
            );
          }

          // Ensure default flags on routines
          state.routines = (state.routines || []).map((r) => {
            const isDef = defaultSeedRoutines.some((d) => d.id === r.id && d.is_default);
            return isDef ? { ...r, is_default: true } : r;
          });

          // Ensure default activeRoutine if none is set
          if (!state.activeRoutine) {
            state.activeRoutine = cristianOfficial || state.routines?.[0] || null;
          } else {
            // Keep activeRoutine in sync with updated routines list
            const matchedInRoutines = (state.routines || []).find((r) => r.id === state.activeRoutine?.id);
            if (matchedInRoutines) {
              state.activeRoutine = matchedInRoutines;
            }
          }

          // Guarantee all seed exercises (including ex-36 to ex-46) are present in library
          const existingExIds = new Set((state.exercises || []).map((e) => e.id));
          const missingExercises = (seedExercises as Exercise[]).filter((e) => !existingExIds.has(e.id));
          if (missingExercises.length > 0) {
            state.exercises = [
              ...(state.exercises || []),
              ...missingExercises.map((e) => ({ ...e, is_default: true })),
            ];
          }

          // Guarantee default flags on seed exercises
          state.exercises = (state.exercises || []).map((ex) => {
            const isDef = (seedExercises as Exercise[]).some((s) => s.id === ex.id);
            return isDef ? { ...ex, is_default: true } : ex;
          });

          if (state.activeRoutine) {
            const cleanedDays = state.activeRoutine.days.map((day) => {
              const seen = new Set<string>();
              const cleanConfigs: typeof day.exercise_configs = [];
              const cleanIds: string[] = [];
              day.exercise_configs.forEach((cfg) => {
                if (!seen.has(cfg.exerciseId)) {
                  seen.add(cfg.exerciseId);
                  cleanConfigs.push(cfg);
                  cleanIds.push(cfg.exerciseId);
                }
              });
              return {
                ...day,
                exercise_ids: cleanIds,
                exercise_configs: cleanConfigs,
              };
            });
            state.activeRoutine = { ...state.activeRoutine, days: cleanedDays };
          }
        }
      },
    }
  )
);
