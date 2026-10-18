import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Dumbbell,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Search,
  ArrowUp,
  ArrowDown,
  Copy,
  Clock,
  Layers,
  Flame,
  Zap,
  CheckCircle2,
  Info,
  Sliders,
  Filter,
} from 'lucide-react';
import { Difficulty, Exercise, Goal, Routine, RoutineDay, RoutineExerciseConfig, MuscleGroup, Equipment } from '../types';
import { useRoutineStore } from '../store/useRoutineStore';
import { useUserStore } from '../store/useUserStore';
import confetti from 'canvas-confetti';

export interface RoutineDefinitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoutine?: Routine | null;
}

interface DraftExerciseConfig {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
}

interface DraftDay {
  name: string;
  focus: string;
  exercises: DraftExerciseConfig[];
}

const REP_PRESETS = ['5x5', '8-10', '10-12', '12-15', '15-20', 'Al fallo'];
const REST_PRESETS = [30, 45, 60, 90, 120, 180];
const SET_PRESETS = [3, 4, 5];

export const RoutineDefinitionModal: React.FC<RoutineDefinitionModalProps> = ({
  isOpen,
  onClose,
  initialRoutine,
}) => {
  const exercises = useRoutineStore((s) => s.exercises);
  const addCustomRoutine = useRoutineStore((s) => s.addCustomRoutine);
  const updateRoutine = useRoutineStore((s) => s.updateRoutine);
  const addExerciseToLibrary = useRoutineStore((s) => s.addExerciseToLibrary);
  const profile = useUserStore((s) => s.profile);
  const currentUser = useUserStore((s) => s.currentUser);
  const isAdmin = Boolean(currentUser?.isAdmin);

  // Form State
  const [routineName, setRoutineName] = useState(
    initialRoutine?.name || (isAdmin ? 'Rutina Maestra Darshana' : 'Mi Rutina Personalizada')
  );
  const [goal, setGoal] = useState<Goal>(initialRoutine?.goal || 'hipertrofia');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initialRoutine?.difficulty || initialRoutine?.level || 'intermedio'
  );
  const [isDefaultRoutine, setIsDefaultRoutine] = useState<boolean>(
    Boolean(initialRoutine?.is_default ?? isAdmin)
  );
  const [duration, setDuration] = useState<number>(initialRoutine?.session_duration || 45);
  const [makeActiveImmediately, setMakeActiveImmediately] = useState<boolean>(true);

  // Days state
  const [days, setDays] = useState<DraftDay[]>(() => {
    if (initialRoutine && initialRoutine.days.length > 0) {
      return initialRoutine.days.map((d) => ({
        name: d.name,
        focus: d.focus || 'Enfoque General',
        exercises: (d.exercise_configs || []).map((c) => ({
          exerciseId: c.exerciseId,
          sets: c.sets || 4,
          reps: String(c.reps || '10'),
          restSeconds: c.restSeconds || 90,
        })),
      }));
    }
    return [
      {
        name: 'Día 1: Empuje (Push)',
        focus: 'Pecho, Hombro y Tríceps',
        exercises: [
          { exerciseId: 'ex-02', sets: 4, reps: '10-12', restSeconds: 90 },
          { exerciseId: 'ex-01', sets: 4, reps: '12-15', restSeconds: 60 },
          { exerciseId: 'ex-18', sets: 3, reps: '10', restSeconds: 60 },
        ],
      },
      {
        name: 'Día 2: Tirón (Pull)',
        focus: 'Espalda, Trapecio y Bíceps',
        exercises: [
          { exerciseId: 'ex-07', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'ex-09', sets: 4, reps: '10-12', restSeconds: 75 },
          { exerciseId: 'ex-23', sets: 3, reps: '12', restSeconds: 60 },
        ],
      },
      {
        name: 'Día 3: Pierna & Core',
        focus: 'Cuádriceps, Isquios y Abdomen',
        exercises: [
          { exerciseId: 'ex-12', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'ex-14', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'ex-28', sets: 3, reps: '45s', restSeconds: 45 },
        ],
      },
    ];
  });

  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draftRoutineId, setDraftRoutineId] = useState(() => `routine-custom-${crypto.randomUUID()}`);
  const [successBanner, setSuccessBanner] = useState('');

  // Exercise Picker Drawer / Modal state
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('todos');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('todos');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Quick custom exercise inline in picker
  const [showCustomExForm, setShowCustomExForm] = useState(false);
  const [customExName, setCustomExName] = useState('');
  const [customExMuscle, setCustomExMuscle] = useState<MuscleGroup>('pecho');
  const [customExEquip, setCustomExEquip] = useState<Equipment>('mancuernas');

  // Sync form state when modal opens or initialRoutine changes
  useEffect(() => {
    if (!isOpen) return;
    setDraftRoutineId(`routine-custom-${crypto.randomUUID()}`);
    setIsSaving(false);
    if (initialRoutine) {
      setRoutineName(initialRoutine.name);
      setGoal(initialRoutine.goal);
      setDifficulty(initialRoutine.difficulty || initialRoutine.level || 'intermedio');
      setIsDefaultRoutine(Boolean(initialRoutine.is_default));
      setDuration(initialRoutine.session_duration || 45);
      if (initialRoutine.days && initialRoutine.days.length > 0) {
        setDays(
          initialRoutine.days.map((d) => ({
            name: d.name,
            focus: d.focus || 'Enfoque General',
            exercises: (d.exercise_configs || []).map((c) => ({
              exerciseId: c.exerciseId,
              sets: c.sets || 4,
              reps: String(c.reps || '10'),
              restSeconds: c.restSeconds || 90,
            })),
          }))
        );
      }
    }
  }, [isOpen, initialRoutine]);

  const currentDay = days[activeDayIndex] || days[0];

  // ==========================================
  // QUICK TEMPLATES AUTO-FILL
  // ==========================================
  const handleApplyTemplate = (templateType: 'ppl' | 'upper_lower' | 'fullbody' | 'strength5x5') => {
    if (templateType === 'ppl') {
      setRoutineName('Rutina Empuje / Tirón / Pierna');
      setGoal('hipertrofia');
      setDifficulty('intermedio');
      setDuration(55);
      setDays([
        {
          name: 'Día 1: Empuje (Pecho, Hombro, Tríceps)',
          focus: 'Pectoral mayor, deltoides anterior/lateral y tríceps',
          exercises: [
            { exerciseId: 'ex-02', sets: 4, reps: '8-10', restSeconds: 90 },
            { exerciseId: 'ex-04', sets: 3, reps: '12', restSeconds: 60 },
            { exerciseId: 'ex-18', sets: 4, reps: '10', restSeconds: 90 },
            { exerciseId: 'ex-24', sets: 3, reps: '12-15', restSeconds: 60 },
          ],
        },
        {
          name: 'Día 2: Tirón (Espalda y Bíceps)',
          focus: 'Dorsal ancho, romboides y flexores de codo',
          exercises: [
            { exerciseId: 'ex-08', sets: 4, reps: '8-10', restSeconds: 90 },
            { exerciseId: 'ex-09', sets: 4, reps: '10-12', restSeconds: 75 },
            { exerciseId: 'ex-07', sets: 3, reps: '10', restSeconds: 60 },
            { exerciseId: 'ex-23', sets: 3, reps: '10-12', restSeconds: 60 },
          ],
        },
        {
          name: 'Día 3: Pierna & Core (Tren Inferior)',
          focus: 'Cuádriceps, cadena posterior y estabilidad central',
          exercises: [
            { exerciseId: 'ex-13', sets: 4, reps: '8-10', restSeconds: 120 },
            { exerciseId: 'ex-14', sets: 4, reps: '10', restSeconds: 90 },
            { exerciseId: 'ex-12', sets: 3, reps: '12', restSeconds: 75 },
            { exerciseId: 'ex-28', sets: 3, reps: '45s', restSeconds: 45 },
          ],
        },
      ]);
      setActiveDayIndex(0);
      setSuccessBanner('¡Plantilla Empuje/Tirón/Pierna cargada!');
      setTimeout(() => setSuccessBanner(''), 2500);
    } else if (templateType === 'upper_lower') {
      setRoutineName('Rutina Torso / Pierna 4 Días');
      setGoal('hipertrofia');
      setDifficulty('intermedio');
      setDuration(50);
      setDays([
        {
          name: 'Día 1: Torso Pesado (Fuerza)',
          focus: 'Pectoral, dorsal y empujes principales',
          exercises: [
            { exerciseId: 'ex-03', sets: 4, reps: '6-8', restSeconds: 120 },
            { exerciseId: 'ex-08', sets: 4, reps: '6-8', restSeconds: 120 },
            { exerciseId: 'ex-18', sets: 3, reps: '8-10', restSeconds: 90 },
            { exerciseId: 'ex-23', sets: 3, reps: '10', restSeconds: 60 },
          ],
        },
        {
          name: 'Día 2: Pierna Pesada (Fuerza)',
          focus: 'Sentadillas, bisagra de cadera y gemelos',
          exercises: [
            { exerciseId: 'ex-13', sets: 4, reps: '6-8', restSeconds: 120 },
            { exerciseId: 'ex-14', sets: 4, reps: '8-10', restSeconds: 90 },
            { exerciseId: 'ex-12', sets: 3, reps: '10', restSeconds: 75 },
            { exerciseId: 'ex-28', sets: 3, reps: '45s', restSeconds: 45 },
          ],
        },
        {
          name: 'Día 3: Torso Volumen (Hipertrofia)',
          focus: 'Congestión, aislamiento y fibras rápidas',
          exercises: [
            { exerciseId: 'ex-02', sets: 4, reps: '10-12', restSeconds: 75 },
            { exerciseId: 'ex-09', sets: 4, reps: '10-12', restSeconds: 75 },
            { exerciseId: 'ex-19', sets: 3, reps: '15', restSeconds: 45 },
            { exerciseId: 'ex-24', sets: 3, reps: '12-15', restSeconds: 60 },
          ],
        },
        {
          name: 'Día 4: Pierna Volumen & Core',
          focus: 'Glúteos, cuádriceps y abdomen',
          exercises: [
            { exerciseId: 'ex-12', sets: 4, reps: '12', restSeconds: 75 },
            { exerciseId: 'ex-11', sets: 3, reps: '15', restSeconds: 45 },
            { exerciseId: 'ex-14', sets: 3, reps: '12', restSeconds: 75 },
            { exerciseId: 'ex-28', sets: 4, reps: '60s', restSeconds: 45 },
          ],
        },
      ]);
      setActiveDayIndex(0);
      setSuccessBanner('¡Plantilla Torso / Pierna cargada!');
      setTimeout(() => setSuccessBanner(''), 2500);
    } else if (templateType === 'fullbody') {
      setRoutineName('Rutina Full Body Funcional 3 Días');
      setGoal('hipertrofia');
      setDifficulty('principiante');
      setDuration(45);
      setDays([
        {
          name: 'Día 1: Full Body A',
          focus: 'Sentadilla, Empuje y Tracción',
          exercises: [
            { exerciseId: 'ex-12', sets: 3, reps: '10-12', restSeconds: 90 },
            { exerciseId: 'ex-02', sets: 3, reps: '10-12', restSeconds: 90 },
            { exerciseId: 'ex-07', sets: 3, reps: '10-12', restSeconds: 75 },
            { exerciseId: 'ex-28', sets: 3, reps: '45s', restSeconds: 45 },
          ],
        },
        {
          name: 'Día 2: Full Body B',
          focus: 'Bisagra, Hombros y Espalda',
          exercises: [
            { exerciseId: 'ex-14', sets: 3, reps: '10', restSeconds: 90 },
            { exerciseId: 'ex-18', sets: 3, reps: '10-12', restSeconds: 75 },
            { exerciseId: 'ex-09', sets: 3, reps: '10-12', restSeconds: 75 },
            { exerciseId: 'ex-01', sets: 3, reps: '12-15', restSeconds: 60 },
          ],
        },
        {
          name: 'Día 3: Full Body C',
          focus: 'Piernas completas y Brazos',
          exercises: [
            { exerciseId: 'ex-11', sets: 3, reps: '15', restSeconds: 60 },
            { exerciseId: 'ex-04', sets: 3, reps: '12', restSeconds: 60 },
            { exerciseId: 'ex-23', sets: 3, reps: '12', restSeconds: 60 },
            { exerciseId: 'ex-24', sets: 3, reps: '12', restSeconds: 60 },
          ],
        },
      ]);
      setActiveDayIndex(0);
      setSuccessBanner('¡Plantilla Full Body cargada!');
      setTimeout(() => setSuccessBanner(''), 2500);
    } else if (templateType === 'strength5x5') {
      setRoutineName('Rutina Fuerza Pura 5x5 Darshana');
      setGoal('fuerza');
      setDifficulty('avanzado');
      setDuration(60);
      setDays([
        {
          name: 'Día 1: Fuerza A (Banca & Sentadilla)',
          focus: 'Máxima carga y recuperación neuromuscular',
          exercises: [
            { exerciseId: 'ex-13', sets: 5, reps: '5x5', restSeconds: 180 },
            { exerciseId: 'ex-03', sets: 5, reps: '5x5', restSeconds: 180 },
            { exerciseId: 'ex-08', sets: 5, reps: '5x5', restSeconds: 120 },
          ],
        },
        {
          name: 'Día 2: Fuerza B (Militar & Bisagra)',
          focus: 'Press estricto y peso muerto',
          exercises: [
            { exerciseId: 'ex-13', sets: 5, reps: '5x5', restSeconds: 180 },
            { exerciseId: 'ex-18', sets: 5, reps: '5x5', restSeconds: 120 },
            { exerciseId: 'ex-14', sets: 3, reps: '5', restSeconds: 180 },
          ],
        },
        {
          name: 'Día 3: Fuerza C (Tracción y Estabilidad)',
          focus: 'Dominadas pesadas y pecho',
          exercises: [
            { exerciseId: 'ex-13', sets: 5, reps: '5x5', restSeconds: 180 },
            { exerciseId: 'ex-03', sets: 5, reps: '5x5', restSeconds: 180 },
            { exerciseId: 'ex-06', sets: 4, reps: '5x5', restSeconds: 120 },
          ],
        },
      ]);
      setActiveDayIndex(0);
      setSuccessBanner('¡Plantilla Fuerza 5x5 cargada!');
      setTimeout(() => setSuccessBanner(''), 2500);
    }
  };

  // ==========================================
  // DAY OPERATIONS
  // ==========================================
  const handleAddDay = () => {
    const newDayNumber = days.length + 1;
    const newDay: DraftDay = {
      name: `Día ${newDayNumber}: Especial`,
      focus: 'Enfoque General',
      exercises: [
        { exerciseId: 'ex-01', sets: 4, reps: '10-12', restSeconds: 60 },
        { exerciseId: 'ex-02', sets: 4, reps: '10', restSeconds: 90 },
      ],
    };
    setDays([...days, newDay]);
    setActiveDayIndex(days.length);
  };

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) {
      setErrorMsg('La rutina debe tener al menos 1 día de entrenamiento.');
      return;
    }
    const updated = days.filter((_, i) => i !== index);
    setDays(updated);
    setActiveDayIndex(Math.max(0, index - 1));
  };

  const handleDuplicateDay = (index: number) => {
    const target = days[index];
    const cloned: DraftDay = {
      name: `${target.name} (Copia)`,
      focus: target.focus,
      exercises: target.exercises.map((e) => ({ ...e })),
    };
    const updated = [...days];
    updated.splice(index + 1, 0, cloned);
    setDays(updated);
    setActiveDayIndex(index + 1);
  };

  // ==========================================
  // EXERCISE OPERATIONS INSIDE ACTIVE DAY
  // ==========================================
  const handleAddExerciseToCurrentDay = (exerciseId: string) => {
    const updated = [...days];
    updated[activeDayIndex].exercises.push({
      exerciseId,
      sets: 4,
      reps: '10-12',
      restSeconds: 90,
    });
    setDays(updated);
    setJustAddedId(exerciseId);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  const handleRemoveExercise = (exIdx: number) => {
    const updated = [...days];
    if (updated[activeDayIndex].exercises.length <= 1) {
      setErrorMsg('Cada día debe tener al menos 1 ejercicio.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    updated[activeDayIndex].exercises.splice(exIdx, 1);
    setDays(updated);
  };

  const handleDuplicateExercise = (exIdx: number) => {
    const updated = [...days];
    const item = updated[activeDayIndex].exercises[exIdx];
    updated[activeDayIndex].exercises.splice(exIdx + 1, 0, { ...item });
    setDays(updated);
  };

  const handleMoveExercise = (exIdx: number, direction: 'up' | 'down') => {
    const list = [...days[activeDayIndex].exercises];
    const targetIdx = direction === 'up' ? exIdx - 1 : exIdx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[exIdx];
    list[exIdx] = list[targetIdx];
    list[targetIdx] = temp;

    const updated = [...days];
    updated[activeDayIndex].exercises = list;
    setDays(updated);
  };

  // Fast update individual values
  const handleUpdateExerciseValue = (
    exIdx: number,
    field: keyof DraftExerciseConfig,
    value: string | number
  ) => {
    const updated = [...days];
    updated[activeDayIndex].exercises[exIdx] = {
      ...updated[activeDayIndex].exercises[exIdx],
      [field]: value,
    };
    setDays(updated);
  };

  // Batch actions for whole active day
  const handleApplyRestToAll = (seconds: number) => {
    const updated = [...days];
    updated[activeDayIndex].exercises = updated[activeDayIndex].exercises.map((e) => ({
      ...e,
      restSeconds: seconds,
    }));
    setDays(updated);
  };

  const handleApplySetsToAll = (setsCount: number) => {
    const updated = [...days];
    updated[activeDayIndex].exercises = updated[activeDayIndex].exercises.map((e) => ({
      ...e,
      sets: setsCount,
    }));
    setDays(updated);
  };

  // Quick custom exercise registration
  const handleCreateCustomExercise = () => {
    if (!customExName.trim()) return;
    const newEx: Exercise = {
      id: `ex-custom-${Date.now()}`,
      name: customExName.trim(),
      muscle_group: customExMuscle,
      equipment: customExEquip,
      difficulty: 'intermedio',
      description: 'Ejercicio personalizado definido por el usuario.',
      is_default: false,
      created_by: initialRoutine?.created_by || currentUser?.username || 'usuario',
    };
    addExerciseToLibrary(newEx);
    handleAddExerciseToCurrentDay(newEx.id);
    setCustomExName('');
    setShowCustomExForm(false);
  };

  // Filtered exercises for the Quick Picker Drawer
  const filteredPickerExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (selectedMuscle !== 'todos' && ex.muscle_group !== selectedMuscle) return false;
      if (selectedEquipment !== 'todos' && ex.equipment !== selectedEquipment) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ex.name.toLowerCase().includes(q);
        const matchesMuscle = ex.muscle_group.toLowerCase().includes(q);
        const matchesEquip = ex.equipment.toLowerCase().includes(q);
        return matchesName || matchesMuscle || matchesEquip;
      }
      return true;
    });
  }, [exercises, selectedMuscle, selectedEquipment, searchQuery]);

  // Total exercises across entire routine
  const totalExercisesCount = days.reduce((sum, d) => sum + d.exercises.length, 0);

  // ==========================================
  // SAVE ROUTINE
  // ==========================================
  const handleSaveRoutine = async () => {
    if (isSaving) return;
    setErrorMsg('');
    if (!routineName.trim()) {
      setErrorMsg('Por favor ingresa un nombre para tu rutina.');
      return;
    }
    if (days.length === 0) {
      setErrorMsg('Debes incluir al menos un día de entrenamiento.');
      return;
    }
    for (let i = 0; i < days.length; i++) {
      if (days[i].exercises.length === 0) {
        setErrorMsg(`El ${days[i].name} no tiene ningún ejercicio asignado.`);
        setActiveDayIndex(i);
        return;
      }
    }

    if (initialRoutine) {
      if ((initialRoutine.is_default || initialRoutine.id === 'routine-cristian-aguilera' || initialRoutine.created_by === 'admin') && !isAdmin) {
        setErrorMsg('Esta rutina predeterminada de Cristian Aguilera está protegida. Solo el administrador de la aplicación puede editarla.');
        return;
      }
    }

    const routineId = initialRoutine ? initialRoutine.id : draftRoutineId;

    // Build RoutineDay array with automatic equipment alternatives
    const builtDays: RoutineDay[] = days.map((d, dIdx) => {
      const dayId = `day-${routineId}-${dIdx + 1}`;
      const configs: RoutineExerciseConfig[] = d.exercises.map((item) => {
        const fullEx = exercises.find((e) => e.id === item.exerciseId);
        const pool = exercises.filter(
          (other) => other.id !== item.exerciseId && other.muscle_group === fullEx?.muscle_group
        );

        const altNone = pool.find((o) => o.equipment === 'ninguno');
        const altDumbbell = pool.find((o) => o.equipment === 'mancuernas' && o.id !== altNone?.id);
        const altGym = pool.find((o) => o.equipment === 'gimnasio' && o.id !== altNone?.id && o.id !== altDumbbell?.id);

        const alts: string[] = [];
        if (altNone) alts.push(altNone.id);
        if (altDumbbell) alts.push(altDumbbell.id);
        if (altGym) alts.push(altGym.id);

        pool.forEach((o) => {
          if (alts.length < 3 && !alts.includes(o.id)) {
            alts.push(o.id);
          }
        });

        return {
          exerciseId: item.exerciseId,
          sets: Number(item.sets) || 4,
          reps: String(item.reps || '10').trim(),
          restSeconds: Number(item.restSeconds) || 90,
          alternativeExerciseIds: alts.slice(0, 3),
        };
      });

      return {
        id: dayId,
        routine_id: routineId,
        day_of_week: dIdx,
        name: d.name.trim() || `Día ${dIdx + 1}`,
        focus: d.focus.trim() || 'Enfoque General',
        exercise_ids: d.exercises.map((e) => e.exerciseId),
        exercise_configs: configs,
      };
    });

    const finalRoutine: Routine = {
      id: routineId,
      user_id: initialRoutine?.user_id || profile?.id || currentUser?.username || 'usuario',
      created_by: currentUser?.username || 'usuario',
      is_default: Boolean(isAdmin && isDefaultRoutine),
      name: routineName.trim(),
      goal,
      difficulty,
      level: difficulty,
      days_per_week: days.length,
      session_duration: duration,
      created_at: initialRoutine?.created_at || new Date().toISOString(),
      days: builtDays,
    };

    setIsSaving(true);
    if (initialRoutine) {
      updateRoutine(finalRoutine.id, finalRoutine);
    } else {
      addCustomRoutine(finalRoutine, makeActiveImmediately);
    }
    if (currentUser?.uid && isAdmin) {
      const saved = await useRoutineStore.getState().syncRoutineCatalog();
      if (!saved) {
        setIsSaving(false);
        setErrorMsg('La rutina sigue en este navegador, pero no se pudo guardar en Internet. Reintenta antes de cerrar.');
        return;
      }
    }
    setIsSaving(false);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9E5325', '#7B3A13', '#D99B6A', '#22C55E'],
      });
    } catch {
      // ignore
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white border border-[#EAE3D9] rounded-3xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl my-auto animate-scaleUp overflow-hidden">
        {/* ========================================================= */}
        {/* MODAL HEADER */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 border-b border-[#EAE3D9] bg-[#FAF7F2] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE3D9] text-[#9E5325] flex items-center justify-center shadow-sm shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E5325] font-heading">
                  DARSHANA FITNESS • FORMULARIO INTUITIVO
                </span>
                {isAdmin ? (
                  <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded-md">
                    Modo Administrador
                  </span>
                ) : (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.2 rounded-md">
                    Plan Personal
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#1C1917] font-heading uppercase tracking-tight truncate">
                {initialRoutine ? 'Editar Rutina de Entrenamiento' : 'Definir Rutina de Entrenamiento'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-[#EAE3D9] text-[#78716C] hover:text-[#1C1917] flex items-center justify-center transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* QUICK TEMPLATES BANNER */}
        {/* ========================================================= */}
        <div className="px-4 py-2.5 bg-[#F8F2EC] border-b border-[#EAE3D9] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider font-heading text-[#9E5325] shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 fill-[#9E5325]" />
            Plantillas Rápidas:
          </span>
          <button
            type="button"
            onClick={() => handleApplyTemplate('ppl')}
            className="text-[11px] bg-white hover:bg-[#FAF7F2] text-[#1C1917] border border-[#EAE3D9] font-bold px-2.5 py-1 rounded-lg shrink-0 transition-all font-heading uppercase"
          >
            Empuje / Tirón / Pierna (3d)
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('upper_lower')}
            className="text-[11px] bg-white hover:bg-[#FAF7F2] text-[#1C1917] border border-[#EAE3D9] font-bold px-2.5 py-1 rounded-lg shrink-0 transition-all font-heading uppercase"
          >
            Torso / Pierna (4d)
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('fullbody')}
            className="text-[11px] bg-white hover:bg-[#FAF7F2] text-[#1C1917] border border-[#EAE3D9] font-bold px-2.5 py-1 rounded-lg shrink-0 transition-all font-heading uppercase"
          >
            Full Body (3d)
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('strength5x5')}
            className="text-[11px] bg-white hover:bg-[#FAF7F2] text-[#1C1917] border border-[#EAE3D9] font-bold px-2.5 py-1 rounded-lg shrink-0 transition-all font-heading uppercase"
          >
            Fuerza 5x5
          </button>
        </div>

        {/* ========================================================= */}
        {/* NOTIFICATIONS & ALERTS */}
        {/* ========================================================= */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-scaleUp">
            <Info className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successBanner && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-scaleUp">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCROLLABLE BODY */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* 1. SECCIÓN: INFORMACIÓN PRINCIPAL */}
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE3D9] space-y-3.5">
            <div>
              <label className="font-black text-[#1C1917] block mb-1 uppercase font-heading text-[11px] tracking-wide">
                Nombre de la Rutina
              </label>
              <input
                type="text"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                placeholder="Ej. Plan Hipertrofia & Fuerza Máxima"
                className="w-full bg-white border border-[#EAE3D9] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1917] font-bold focus:outline-none focus:border-[#9E5325] focus:ring-1 focus:ring-[#9E5325]"
              />
            </div>

            {/* Objetivo de Entrenamiento */}
            <div>
              <label className="font-black text-[#1C1917] block mb-1.5 uppercase font-heading text-[11px] tracking-wide">
                Objetivo Principal
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'hipertrofia' as Goal, label: 'Hipertrofia', desc: '8-12 reps' },
                  { id: 'fuerza' as Goal, label: 'Fuerza Pura', desc: '3-6 reps' },
                  { id: 'perdida_grasa' as Goal, label: 'Pérdida Grasa', desc: '12-15 reps' },
                  { id: 'resistencia' as Goal, label: 'Resistencia', desc: '15-20 reps' },
                ].map((item) => {
                  const isSelected = goal === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white border-[#7B3A13] shadow-sm font-bold'
                          : 'bg-white border-[#EAE3D9] text-[#1C1917] hover:bg-[#F8F2EC]'
                      }`}
                    >
                      <div className="font-heading uppercase text-xs tracking-tight">{item.label}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          isSelected ? 'text-white/80' : 'text-[#78716C]'
                        }`}
                      >
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nivel y Duración */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-black text-[#1C1917] block mb-1 uppercase font-heading text-[11px] tracking-wide">
                  Nivel de Dificultad
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['principiante', 'intermedio', 'avanzado'] as Difficulty[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`py-2 px-1 rounded-xl text-center text-xs font-heading font-bold uppercase transition-all ${
                        difficulty === lvl
                          ? lvl === 'principiante'
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : lvl === 'intermedio'
                            ? 'bg-amber-700 text-white shadow-sm'
                            : 'bg-rose-700 text-white shadow-sm'
                          : 'bg-white border border-[#EAE3D9] text-[#78716C] hover:text-[#1C1917]'
                      }`}
                    >
                      {lvl === 'principiante' ? 'Principiante' : lvl === 'intermedio' ? 'Medio' : 'Avanzado'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-black text-[#1C1917] block mb-1 uppercase font-heading text-[11px] tracking-wide">
                  Duración por Sesión
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[30, 45, 60, 90].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setDuration(min)}
                      className={`py-2 rounded-xl text-center text-xs font-heading font-bold uppercase transition-all ${
                        duration === min
                          ? 'bg-[#1C1917] text-white shadow-sm'
                          : 'bg-white border border-[#EAE3D9] text-[#78716C] hover:text-[#1C1917]'
                      }`}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Opciones Avanzadas / Admin */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EAE3D9]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={makeActiveImmediately}
                  onChange={(e) => setMakeActiveImmediately(e.target.checked)}
                  className="accent-[#9E5325] w-4 h-4 rounded"
                />
                <span className="font-bold text-[#1C1917] text-xs">
                  Establecer como mi rutina activa ahora
                </span>
              </label>

              {isAdmin && (
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50/50">
                  <input
                    type="checkbox"
                    checked={isDefaultRoutine}
                    onChange={(e) => setIsDefaultRoutine(e.target.checked)}
                    className="accent-[#9E5325] w-4 h-4 rounded"
                  />
                  <span className="font-bold text-amber-900 text-xs font-heading uppercase">
                    Predeterminada del Gym (Solo admin puede borrarla)
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. SECCIÓN: DÍAS DE ENTRENAMIENTO */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-[#1C1917] uppercase tracking-wider font-heading text-xs">
                  Días del Plan ({days.length})
                </span>
                <span className="text-[11px] text-[#78716C]">
                  • {totalExercisesCount} ejercicios en total
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddDay}
                className="text-xs bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#9E5325] border border-[#EAE3D9] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 font-heading uppercase transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Añadir Día</span>
              </button>
            </div>

            {/* Horizontal Day Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {days.map((dayItem, dIdx) => {
                const isActive = activeDayIndex === dIdx;
                return (
                  <button
                    key={dIdx}
                    type="button"
                    onClick={() => setActiveDayIndex(dIdx)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold font-heading uppercase transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-md'
                        : 'bg-white hover:bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917] border border-[#EAE3D9]'
                    }`}
                  >
                    <span>{dayItem.name || `Día ${dIdx + 1}`}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#EAE3D9] text-[#78716C]'
                      }`}
                    >
                      {dayItem.exercises.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current Day Configuration Card */}
            {currentDay && (
              <div className="bg-white rounded-2xl border border-[#EAE3D9] p-3.5 sm:p-4 space-y-4 shadow-sm">
                {/* Day Header Inputs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-3 border-b border-[#EAE3D9]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                    <div>
                      <span className="text-[10px] font-bold text-[#78716C] uppercase font-heading block mb-1">
                        Nombre del Día
                      </span>
                      <input
                        type="text"
                        value={currentDay.name}
                        onChange={(e) => {
                          const updated = [...days];
                          updated[activeDayIndex].name = e.target.value;
                          setDays(updated);
                        }}
                        placeholder="Ej. Día 1: Pecho y Tríceps"
                        className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-3 py-1.5 text-xs text-[#1C1917] font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#78716C] uppercase font-heading block mb-1">
                        Enfoque Muscular
                      </span>
                      <input
                        type="text"
                        value={currentDay.focus}
                        onChange={(e) => {
                          const updated = [...days];
                          updated[activeDayIndex].focus = e.target.value;
                          setDays(updated);
                        }}
                        placeholder="Ej. Pectoral, Hombro anterior y Tríceps"
                        className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-3 py-1.5 text-xs text-[#1C1917]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleDuplicateDay(activeDayIndex)}
                      className="p-2 text-[#78716C] hover:text-[#9E5325] hover:bg-[#FAF7F2] rounded-xl border border-[#EAE3D9] transition-colors"
                      title="Duplicar este día"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {days.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDay(activeDayIndex)}
                        className="p-2 text-[#78716C] hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-[#EAE3D9] transition-colors"
                        title="Eliminar este día"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Day Batch Actions Tool Bar */}
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EAE3D9] flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-[#9E5325] uppercase font-heading flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5" />
                      Ajustes rápidos para este día:
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#78716C]">Descanso:</span>
                      {[60, 90, 120].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => handleApplyRestToAll(sec)}
                          className="px-2 py-0.5 bg-white hover:bg-[#F2E7DC] text-[#1C1917] border border-[#EAE3D9] rounded-md text-[10px] font-bold"
                          title={`Aplicar ${sec}s de descanso a todos los ejercicios de este día`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 pl-1">
                      <span className="text-[10px] text-[#78716C]">Series:</span>
                      {[3, 4, 5].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleApplySetsToAll(st)}
                          className="px-2 py-0.5 bg-white hover:bg-[#F2E7DC] text-[#1C1917] border border-[#EAE3D9] rounded-md text-[10px] font-bold"
                          title={`Aplicar ${st} series a todos los ejercicios de este día`}
                        >
                          {st}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsExercisePickerOpen(true)}
                    className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 font-heading uppercase ml-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Ejercicios</span>
                  </button>
                </div>

                {/* Exercises List in Current Day */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-[#78716C] uppercase font-heading block">
                    Ejercicios del {currentDay.name} ({currentDay.exercises.length}):
                  </span>

                  {currentDay.exercises.map((item, exIdx) => {
                    const exData = exercises.find((e) => e.id === item.exerciseId);
                    return (
                      <div
                        key={`${item.exerciseId}-${exIdx}`}
                        className="bg-[#FAF7F2] p-3 sm:p-3.5 rounded-2xl border border-[#EAE3D9] space-y-3 transition-all hover:border-[#9E5325]/40"
                      >
                        {/* Top: Exercise Identity, Order and Remove */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-lg bg-[#EAE3D9] text-[#78716C] font-bold text-xs flex items-center justify-center shrink-0">
                              #{exIdx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-black text-[#1C1917] text-xs font-heading truncate">
                                {exData?.name || item.exerciseId}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-[#78716C] flex-wrap">
                                <span className="capitalize">{exData?.muscle_group || 'Músculo'}</span>
                                <span>•</span>
                                <span className="capitalize">{exData?.equipment || 'Equipo'}</span>
                                {exData?.difficulty && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{exData.difficulty}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveExercise(exIdx, 'up')}
                              disabled={exIdx === 0}
                              className="p-1 rounded text-[#78716C] hover:text-[#1C1917] disabled:opacity-30"
                              title="Subir orden"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveExercise(exIdx, 'down')}
                              disabled={exIdx === currentDay.exercises.length - 1}
                              className="p-1 rounded text-[#78716C] hover:text-[#1C1917] disabled:opacity-30"
                              title="Bajar orden"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateExercise(exIdx)}
                              className="p-1 rounded text-[#78716C] hover:text-[#9E5325]"
                              title="Duplicar este ejercicio"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(exIdx)}
                              className="p-1 rounded text-[#A8A29E] hover:text-rose-600"
                              title="Quitar ejercicio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Fast Parameters Grid: Series, Reps, Rest */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-[#EAE3D9]/60">
                          {/* 1. SERIES STEPPER & PRESETS */}
                          <div className="bg-white p-2.5 rounded-xl border border-[#EAE3D9]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-[#78716C] uppercase font-heading">
                                Series
                              </span>
                              <div className="flex items-center gap-1">
                                {SET_PRESETS.map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => handleUpdateExerciseValue(exIdx, 'sets', p)}
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                      item.sets === p
                                        ? 'bg-[#9E5325] text-white'
                                        : 'bg-[#FAF7F2] text-[#78716C] hover:bg-[#EAE3D9]'
                                    }`}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateExerciseValue(exIdx, 'sets', Math.max(1, item.sets - 1))
                                }
                                className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-[#EAE3D9] text-[#1C1917] font-black text-sm flex items-center justify-center transition-colors"
                              >
                                -
                              </button>
                              <span className="text-sm font-black font-heading text-[#1C1917]">
                                {item.sets}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateExerciseValue(exIdx, 'sets', Math.min(10, item.sets + 1))
                                }
                                className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-[#EAE3D9] text-[#1C1917] font-black text-sm flex items-center justify-center transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 2. REPETICIONES INPUT & PRESETS */}
                          <div className="bg-white p-2.5 rounded-xl border border-[#EAE3D9]">
                            <span className="text-[10px] font-bold text-[#78716C] uppercase font-heading block mb-1">
                              Repeticiones
                            </span>
                            <input
                              type="text"
                              value={item.reps}
                              onChange={(e) => handleUpdateExerciseValue(exIdx, 'reps', e.target.value)}
                              placeholder="Ej. 10-12"
                              className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-lg px-2.5 py-1 text-xs text-[#1C1917] font-bold text-center mb-1.5"
                            />
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                              {REP_PRESETS.map((rp) => (
                                <button
                                  key={rp}
                                  type="button"
                                  onClick={() => handleUpdateExerciseValue(exIdx, 'reps', rp)}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
                                    item.reps === rp
                                      ? 'bg-[#9E5325] text-white font-bold'
                                      : 'bg-[#FAF7F2] text-[#78716C] hover:bg-[#EAE3D9]'
                                  }`}
                                >
                                  {rp}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 3. DESCANSO SELECTOR WITH VISUAL PILLS */}
                          <div className="bg-white p-2.5 rounded-xl border border-[#EAE3D9]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-[#78716C] uppercase font-heading flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#9E5325]" />
                                Descanso
                              </span>
                              <span className="text-[10px] font-bold text-[#9E5325]">
                                {item.restSeconds}s
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {REST_PRESETS.map((rst) => (
                                <button
                                  key={rst}
                                  type="button"
                                  onClick={() => handleUpdateExerciseValue(exIdx, 'restSeconds', rst)}
                                  className={`py-1 rounded text-center text-[10px] font-bold transition-all ${
                                    item.restSeconds === rst
                                      ? 'bg-[#9E5325] text-white shadow-xs'
                                      : 'bg-[#FAF7F2] text-[#78716C] hover:bg-[#EAE3D9]'
                                  }`}
                                >
                                  {rst}s
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Exercise CTA Button */}
                  <button
                    type="button"
                    onClick={() => setIsExercisePickerOpen(true)}
                    className="w-full py-3 bg-white hover:bg-[#FAF7F2] border-2 border-dashed border-[#D8C5B3] hover:border-[#9E5325] rounded-2xl text-[#9E5325] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4 stroke-[3px]" />
                    <span>+ Añadir Más Ejercicios a {currentDay.name}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL FOOTER */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 border-t border-[#EAE3D9] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAF7F2] rounded-b-3xl shrink-0">
          <div className="flex items-center gap-3 text-xs text-[#78716C] font-medium">
            <span>
              Resumen:{' '}
              <strong className="text-[#1C1917]">
                {days.length} {days.length === 1 ? 'Día' : 'Días'}
              </strong>
            </span>
            <span>•</span>
            <span>
              <strong className="text-[#1C1917]">{totalExercisesCount}</strong> ejercicios
            </span>
            <span>•</span>
            <span>
              ~<strong className="text-[#1C1917]">{duration}</strong> min / sesión
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 min-h-[44px] bg-white hover:bg-[#FAF7F2] text-[#78716C] rounded-xl border border-[#EAE3D9] font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveRoutine}
              className="flex-1 sm:flex-none min-h-[44px] px-6 bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] text-white font-bold text-xs uppercase tracking-wider font-heading rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3px]" />
              <span>{isSaving ? 'Guardando en Internet…' : 'Guardar rutina'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* QUICK EXERCISE PICKER DRAWER / MODAL */}
      {/* ========================================================= */}
      {isExercisePickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white border border-[#EAE3D9] rounded-3xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl my-auto animate-scaleUp overflow-hidden">
            {/* Picker Header */}
            <div className="p-4 border-b border-[#EAE3D9] bg-[#FAF7F2] flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-[#9E5325] uppercase tracking-wider font-heading block">
                  AÑADIR A: {currentDay.name}
                </span>
                <h3 className="text-sm sm:text-base font-black text-[#1C1917] font-heading uppercase truncate">
                  Buscador Rápido de Ejercicios
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExercisePickerOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-[#EAE3D9] text-[#78716C] flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Picker Search and Filters */}
            <div className="p-3.5 border-b border-[#EAE3D9] bg-white space-y-2.5 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar ejercicio (ej. Banca, Sentadilla, Curl, Dominadas...)"
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-[#9E5325]"
                />
              </div>

              {/* Muscle Chips Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'pecho', label: 'Pecho' },
                  { id: 'espalda', label: 'Espalda' },
                  { id: 'piernas', label: 'Piernas' },
                  { id: 'hombros', label: 'Hombros' },
                  { id: 'brazos', label: 'Brazos' },
                  { id: 'core', label: 'Core' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMuscle(m.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold font-heading uppercase whitespace-nowrap transition-all ${
                      selectedMuscle === m.id
                        ? 'bg-[#9E5325] text-white shadow-xs'
                        : 'bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Picker Exercise List */}
            <div className="p-3.5 overflow-y-auto space-y-2 flex-1 text-xs">
              {filteredPickerExercises.map((ex) => {
                const countInDay = currentDay.exercises.filter((e) => e.exerciseId === ex.id).length;
                const wasJustAdded = justAddedId === ex.id;
                return (
                  <div
                    key={ex.id}
                    className="p-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2] hover:bg-white transition-all flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#1C1917] font-heading">{ex.name}</span>
                        {countInDay > 0 && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            {countInDay} en el día
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#78716C] mt-0.5 flex items-center gap-1.5">
                        <span className="capitalize">{ex.muscle_group}</span>
                        <span>•</span>
                        <span className="capitalize">{ex.equipment}</span>
                        <span>•</span>
                        <span className="capitalize">{ex.difficulty}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddExerciseToCurrentDay(ex.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold font-heading uppercase text-xs transition-all flex items-center gap-1 shrink-0 ${
                        wasJustAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white hover:bg-[#9E5325] text-[#9E5325] hover:text-white border border-[#9E5325]'
                      }`}
                    >
                      {wasJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          <span>¡Añadido!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Añadir</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}

              {filteredPickerExercises.length === 0 && (
                <div className="text-center py-8 text-[#78716C]">
                  <p className="font-medium">No se encontraron ejercicios con ese criterio.</p>
                </div>
              )}

              {/* Inline Custom Exercise Creator */}
              <div className="pt-2">
                {!showCustomExForm ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomExForm(true)}
                    className="w-full py-2 bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] hover:text-[#1C1917] rounded-xl border border-dashed border-[#D8C5B3] font-bold text-xs"
                  >
                    + ¿No encuentras tu ejercicio? Crear uno personalizado
                  </button>
                ) : (
                  <div className="p-3 bg-white border border-[#EAE3D9] rounded-2xl space-y-2">
                    <span className="font-black text-[#1C1917] text-xs font-heading uppercase block">
                      Crear Ejercicio Rápido
                    </span>
                    <input
                      type="text"
                      value={customExName}
                      onChange={(e) => setCustomExName(e.target.value)}
                      placeholder="Nombre del nuevo ejercicio"
                      className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-2.5 py-1.5 text-xs text-[#1C1917]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={customExMuscle}
                        onChange={(e) => setCustomExMuscle(e.target.value as MuscleGroup)}
                        className="bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-2 py-1 text-xs"
                      >
                        <option value="pecho">Pecho</option>
                        <option value="espalda">Espalda</option>
                        <option value="piernas">Piernas</option>
                        <option value="hombros">Hombros</option>
                        <option value="brazos">Brazos</option>
                        <option value="core">Core</option>
                      </select>
                      <select
                        value={customExEquip}
                        onChange={(e) => setCustomExEquip(e.target.value as Equipment)}
                        className="bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-2 py-1 text-xs"
                      >
                        <option value="mancuernas">Mancuernas</option>
                        <option value="gimnasio">Gimnasio</option>
                        <option value="ninguno">Peso Corporal</option>
                      </select>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCreateCustomExercise}
                        className="flex-1 py-1.5 bg-[#9E5325] text-white font-bold rounded-xl text-xs uppercase font-heading"
                      >
                        Guardar y Añadir
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomExForm(false)}
                        className="px-3 py-1.5 bg-[#FAF7F2] text-[#78716C] rounded-xl text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Picker Footer */}
            <div className="p-3.5 border-t border-[#EAE3D9] bg-[#FAF7F2] flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-[#78716C]">
                Total en este día:{' '}
                <strong className="text-[#1C1917]">{currentDay.exercises.length}</strong> ejercicios
              </span>
              <button
                type="button"
                onClick={() => setIsExercisePickerOpen(false)}
                className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white font-bold text-xs px-4 py-2 rounded-xl font-heading uppercase shadow-sm"
              >
                Listo / Volver a la Rutina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
