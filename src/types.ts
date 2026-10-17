export type MuscleGroup = 'pecho' | 'espalda' | 'piernas' | 'hombros' | 'brazos' | 'core';

export type Equipment = 'ninguno' | 'mancuernas' | 'gimnasio';

export type Difficulty = 'principiante' | 'intermedio' | 'avanzado';

export type Goal = 'fuerza' | 'hipertrofia' | 'perdida_grasa' | 'resistencia';

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  difficulty: Difficulty;
  description: string;
  secondary_muscles?: string[];
  tips?: string[];
  is_default?: boolean;
  created_by?: string;
}

export interface UserAccount {
  username: string;
  password?: string;
  role?: 'admin' | 'usuario';
  accessCode: string;
  createdAt: string;
  profileId: string;
  assignedRoutineId?: string;
  fullName?: string;
}

export interface Profile {
  id: string;
  name: string;
  age?: number;
  weight?: number;
  height?: number;
  level: Difficulty;
  goal: Goal;
  days_per_week: number;
  session_duration: number; // in minutes: 30, 45, 60, 90
  equipment: Equipment;
  created_at?: string;
}

export interface RoutineExerciseConfig {
  exerciseId: string;
  sets: number;
  reps: number | string;
  restSeconds: number;
  alternativeExerciseIds?: string[]; // Hasta 3 ejercicios alternativos por si no cuentan con la máquina o equipo
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  day_of_week: number; // 0 to 6 (or day index 1 to N)
  name: string; // e.g. "Día 1: Push (Pecho, Hombro, Tríceps)"
  focus: string;
  exercise_ids: string[];
  exercise_configs: RoutineExerciseConfig[];
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  goal: Goal;
  difficulty?: Difficulty;
  level?: Difficulty;
  is_default?: boolean;
  created_by?: string;
  days_per_week: number;
  session_duration: number;
  created_at: string;
  days: RoutineDay[];
}

export interface SessionLog {
  id: string;
  user_id: string;
  routine_day_id: string;
  routine_day_name?: string;
  date: string; // ISO date string
  duration_min: number;
  completed_exercises: string[]; // exercise ids
  notes?: string;
}

export interface WorkoutStats {
  totalSessions: number;
  totalMinutes: number;
  streakDays: number;
  weeklyAdherence: number;
}
