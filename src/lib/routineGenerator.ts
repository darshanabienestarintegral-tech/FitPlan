import { Exercise, Goal, Equipment, Routine, RoutineDay, RoutineExerciseConfig } from '../types';
import seedExercises from '../data/exercises.seed.json';

interface GeneratorOptions {
  userId: string;
  goal: Goal;
  daysPerWeek: number;
  sessionDuration: number; // 30, 45, 60, 90
  equipment: Equipment;
  routineName?: string;
}

export function getGoalParameters(goal: Goal): { sets: number; reps: string; restSeconds: number } {
  switch (goal) {
    case 'fuerza':
      return { sets: 5, reps: '5', restSeconds: 180 };
    case 'hipertrofia':
      return { sets: 4, reps: '10', restSeconds: 90 };
    case 'perdida_grasa':
      return { sets: 3, reps: '15', restSeconds: 45 };
    case 'resistencia':
      return { sets: 3, reps: '20', restSeconds: 30 };
    default:
      return { sets: 4, reps: '10', restSeconds: 90 };
  }
}

export function filterExercisesByEquipment(exercises: Exercise[], userEquipment: Equipment): Exercise[] {
  if (userEquipment === 'ninguno') {
    return exercises.filter((ex) => ex.equipment === 'ninguno');
  }
  if (userEquipment === 'mancuernas') {
    return exercises.filter((ex) => ex.equipment === 'ninguno' || ex.equipment === 'mancuernas');
  }
  // gimnasio: can use any
  return exercises;
}

interface DayPlanTemplate {
  name: string;
  focus: string;
  targetMuscles: ('pecho' | 'espalda' | 'piernas' | 'hombros' | 'brazos' | 'core')[];
}

function getSplitTemplates(daysPerWeek: number): DayPlanTemplate[] {
  switch (daysPerWeek) {
    case 2:
      return [
        {
          name: 'Día 1: Full Body A',
          focus: 'Cuerpo Completo (Énfasis Pecho y Piernas)',
          targetMuscles: ['pecho', 'piernas', 'espalda', 'hombros', 'core', 'brazos'],
        },
        {
          name: 'Día 2: Full Body B',
          focus: 'Cuerpo Completo (Énfasis Espalda y Brazos)',
          targetMuscles: ['espalda', 'piernas', 'pecho', 'brazos', 'hombros', 'core'],
        },
      ];
    case 3:
      return [
        {
          name: 'Día 1: Push (Empuje)',
          focus: 'Pecho, Hombros y Tríceps',
          targetMuscles: ['pecho', 'hombros', 'brazos', 'pecho', 'hombros', 'core'],
        },
        {
          name: 'Día 2: Pull (Tracción)',
          focus: 'Espalda, Bíceps y Core',
          targetMuscles: ['espalda', 'brazos', 'espalda', 'core', 'espalda', 'core'],
        },
        {
          name: 'Día 3: Legs (Pierna)',
          focus: 'Cuádriceps, Isquiotibiales, Glúteos y Abdomen',
          targetMuscles: ['piernas', 'piernas', 'piernas', 'piernas', 'core', 'core'],
        },
      ];
    case 4:
      return [
        {
          name: 'Día 1: Upper A (Tren Superior)',
          focus: 'Pecho, Espalda y Deltoides',
          targetMuscles: ['pecho', 'espalda', 'hombros', 'brazos', 'pecho', 'espalda'],
        },
        {
          name: 'Día 2: Lower A (Tren Inferior)',
          focus: 'Cuádriceps, Glúteos y Core',
          targetMuscles: ['piernas', 'piernas', 'piernas', 'core', 'piernas', 'core'],
        },
        {
          name: 'Día 3: Upper B (Tren Superior)',
          focus: 'Espalda, Pecho, Hombros y Brazos',
          targetMuscles: ['espalda', 'pecho', 'hombros', 'brazos', 'espalda', 'brazos'],
        },
        {
          name: 'Día 4: Lower B (Tren Inferior)',
          focus: 'Cadena Posterior, Isquios y Abdomen',
          targetMuscles: ['piernas', 'piernas', 'piernas', 'core', 'piernas', 'core'],
        },
      ];
    case 5:
      return [
        {
          name: 'Día 1: Push A',
          focus: 'Pecho, Hombros y Tríceps',
          targetMuscles: ['pecho', 'hombros', 'brazos', 'pecho', 'hombros', 'brazos'],
        },
        {
          name: 'Día 2: Pull A',
          focus: 'Espalda, Bíceps y Core',
          targetMuscles: ['espalda', 'brazos', 'espalda', 'core', 'brazos', 'core'],
        },
        {
          name: 'Día 3: Legs A',
          focus: 'Piernas completas y Pantorrillas',
          targetMuscles: ['piernas', 'piernas', 'piernas', 'piernas', 'core', 'piernas'],
        },
        {
          name: 'Día 4: Upper Power',
          focus: 'Pecho, Espalda y Brazos',
          targetMuscles: ['pecho', 'espalda', 'hombros', 'brazos', 'pecho', 'espalda'],
        },
        {
          name: 'Día 5: Lower & Core',
          focus: 'Tren Inferior y Abdominales',
          targetMuscles: ['piernas', 'piernas', 'piernas', 'core', 'core', 'piernas'],
        },
      ];
    case 6:
    default:
      return [
        {
          name: 'Día 1: Push A',
          focus: 'Pecho, Hombros y Tríceps',
          targetMuscles: ['pecho', 'hombros', 'brazos', 'pecho', 'hombros', 'brazos'],
        },
        {
          name: 'Día 2: Pull A',
          focus: 'Espalda, Bíceps y Core',
          targetMuscles: ['espalda', 'brazos', 'espalda', 'core', 'brazos', 'core'],
        },
        {
          name: 'Día 3: Legs A',
          focus: 'Cuádriceps y Glúteos',
          targetMuscles: ['piernas', 'piernas', 'piernas', 'piernas', 'core', 'piernas'],
        },
        {
          name: 'Día 4: Push B',
          focus: 'Hombros y Pecho Volumen',
          targetMuscles: ['hombros', 'pecho', 'brazos', 'hombros', 'pecho', 'brazos'],
        },
        {
          name: 'Día 5: Pull B',
          focus: 'Espalda Densidad y Bíceps',
          targetMuscles: ['espalda', 'brazos', 'espalda', 'brazos', 'core', 'espalda'],
        },
        {
          name: 'Día 6: Legs B',
          focus: 'Isquios, Glúteos y Gemelos',
          targetMuscles: ['piernas', 'piernas', 'piernas', 'core', 'piernas', 'core'],
        },
      ];
  }
}

export function generateRoutine(
  options: GeneratorOptions,
  allExercises: Exercise[] = seedExercises as Exercise[]
): Routine {
  const { userId, goal, daysPerWeek, sessionDuration, equipment } = options;
  const filteredPool = filterExercisesByEquipment(allExercises, equipment);

  // Exercise count rule: min(6, round(sessionDuration / 10))
  const exercisesPerSession = Math.min(6, Math.max(3, Math.round(sessionDuration / 10)));
  const goalConfig = getGoalParameters(goal);
  const templates = getSplitTemplates(daysPerWeek);

  const routineId = `routine-${Date.now()}`;
  const days: RoutineDay[] = templates.map((template, dayIndex) => {
    const dayId = `day-${routineId}-${dayIndex + 1}`;
    const selectedExercises: Exercise[] = [];
    const usedIds = new Set<string>();

    const musclesToSelect = template.targetMuscles.slice(0, exercisesPerSession);

    // Pick exercise for each targeted muscle slot
    musclesToSelect.forEach((targetMuscle) => {
      // Find eligible exercises for this muscle not yet used in this day
      const eligible = filteredPool.filter(
        (ex) => ex.muscle_group === targetMuscle && !usedIds.has(ex.id)
      );

      let chosen: Exercise | undefined;
      if (eligible.length > 0) {
        // Pick one (randomly or in sequence)
        chosen = eligible[Math.floor(Math.random() * eligible.length)];
      } else {
        // Fallback to any exercise in filtered pool not used today
        const anyFallback = filteredPool.filter((ex) => !usedIds.has(ex.id));
        if (anyFallback.length > 0) {
          chosen = anyFallback[Math.floor(Math.random() * anyFallback.length)];
        } else {
          // Fallback to any exercise in allExercises not used today
          const anyGlobalFallback = allExercises.filter((ex) => !usedIds.has(ex.id));
          if (anyGlobalFallback.length > 0) {
            chosen = anyGlobalFallback[Math.floor(Math.random() * anyGlobalFallback.length)];
          }
        }
      }

      if (chosen && !usedIds.has(chosen.id)) {
        usedIds.add(chosen.id);
        selectedExercises.push(chosen);
      }
    });

    // If still less than exercisesPerSession, fill up with unused exercises without duplicating
    while (selectedExercises.length < exercisesPerSession) {
      const remainingFiltered = filteredPool.filter((ex) => !usedIds.has(ex.id));
      if (remainingFiltered.length > 0) {
        const nextEx = remainingFiltered[0];
        usedIds.add(nextEx.id);
        selectedExercises.push(nextEx);
      } else {
        const remainingGlobal = allExercises.filter((ex) => !usedIds.has(ex.id));
        if (remainingGlobal.length > 0) {
          const nextEx = remainingGlobal[0];
          usedIds.add(nextEx.id);
          selectedExercises.push(nextEx);
        } else {
          break;
        }
      }
    }

    const exercise_configs: RoutineExerciseConfig[] = selectedExercises.map((ex) => {
      // Buscar hasta 3 ejercicios alternativos del mismo grupo muscular
      // Priorizando opciones de diferente equipamiento (sin equipo, mancuernas, gimnasio)
      const sameMusclePool = allExercises.filter(
        (other) => other.id !== ex.id && other.muscle_group === ex.muscle_group
      );

      const altNone = sameMusclePool.find((o) => o.equipment === 'ninguno');
      const altDumbbell = sameMusclePool.find((o) => o.equipment === 'mancuernas' && o.id !== altNone?.id);
      const altGym = sameMusclePool.find(
        (o) => o.equipment === 'gimnasio' && o.id !== altNone?.id && o.id !== altDumbbell?.id
      );

      const alternatives: string[] = [];
      if (altNone) alternatives.push(altNone.id);
      if (altDumbbell) alternatives.push(altDumbbell.id);
      if (altGym) alternatives.push(altGym.id);

      // Si aún hay menos de 3, completar con variantes del mismo músculo
      sameMusclePool.forEach((other) => {
        if (alternatives.length < 3 && !alternatives.includes(other.id)) {
          alternatives.push(other.id);
        }
      });

      return {
        exerciseId: ex.id,
        sets: goalConfig.sets,
        reps: goalConfig.reps,
        restSeconds: goalConfig.restSeconds,
        alternativeExerciseIds: alternatives.slice(0, 3),
      };
    });

    return {
      id: dayId,
      routine_id: routineId,
      day_of_week: dayIndex,
      name: template.name,
      focus: template.focus,
      exercise_ids: selectedExercises.map((e) => e.id),
      exercise_configs,
    };
  });

  const goalName =
    goal === 'fuerza'
      ? 'Fuerza Pura'
      : goal === 'hipertrofia'
      ? 'Hipertrofia Muscular'
      : goal === 'perdida_grasa'
      ? 'Pérdida de Grasa'
      : 'Resistencia Funcional';

  return {
    id: routineId,
    user_id: userId,
    name: options.routineName || `Plan ${goalName} (${daysPerWeek} días)`,
    goal,
    days_per_week: daysPerWeek,
    session_duration: sessionDuration,
    created_at: new Date().toISOString(),
    days,
  };
}
