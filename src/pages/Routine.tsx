import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Check, RotateCcw, Award, Dumbbell, FileDown, Printer, Layers, Plus } from 'lucide-react';
import { useRoutineStore } from '../store/useRoutineStore';
import { useUserStore } from '../store/useUserStore';
import { ExerciseCard } from '../components/ExerciseCard';
import { RestTimer } from '../components/RestTimer';
import { ExportRoutinePdfModal } from '../components/ExportRoutinePdfModal';
import { RoutineCatalogModal } from '../components/RoutineCatalogModal';
import { AdminRoutineCreatorModal } from '../components/AdminRoutineCreatorModal';
import { Exercise } from '../types';
import confetti from 'canvas-confetti';

export const Routine: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useUserStore((s) => s.currentUser);
  const profile = useUserStore((s) => s.profile);
  const activeRoutine = useRoutineStore((s) => s.activeRoutine);
  const exercises = useRoutineStore((s) => s.exercises);
  const activeDayIndex = useRoutineStore((s) => s.activeDayIndex);
  const setActiveDayIndex = useRoutineStore((s) => s.setActiveDayIndex);
  const activeSession = useRoutineStore((s) => s.activeSession);
  const startSession = useRoutineStore((s) => s.startSession);
  const toggleExerciseCompleted = useRoutineStore((s) => s.toggleExerciseCompleted);
  const incrementSetCompleted = useRoutineStore((s) => s.incrementSetCompleted);
  const startRestTimer = useRoutineStore((s) => s.startRestTimer);
  const finishCurrentSession = useRoutineStore((s) => s.finishCurrentSession);
  const cancelSession = useRoutineStore((s) => s.cancelSession);
  const replaceExerciseInDay = useRoutineStore((s) => s.replaceExerciseInDay);

  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [lastFinishedSummary, setLastFinishedSummary] = useState<{
    duration: number;
    completedCount: number;
    dayName: string;
  } | null>(null);

  const currentDay = activeRoutine?.days[activeDayIndex] || activeRoutine?.days[0];
  const isWorkoutInProgress = Boolean(activeSession.routineDayId && activeSession.routineDayId === currentDay?.id);

  // Live timer for active workout session
  useEffect(() => {
    if (!isWorkoutInProgress || !activeSession.startTime) {
      setSessionElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (activeSession.startTime || Date.now())) / 1000);
      setSessionElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorkoutInProgress, activeSession.startTime]);

  const formatElapsedTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartWorkout = () => {
    if (currentDay) {
      startSession(currentDay.id);
    }
  };

  const handleFinishWorkout = () => {
    if (!currentDay) return;
    const durationMin = Math.max(1, Math.round(sessionElapsedSeconds / 60));
    const completedCount = activeSession.completedExerciseIds.length;
    const dayName = currentDay.name;

    finishCurrentSession(durationMin);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9E5325', '#7B3A13', '#B46536', '#FAF7F2'],
      });
    } catch {
      // ignore
    }

    setLastFinishedSummary({
      duration: durationMin,
      completedCount,
      dayName,
    });
    setShowFinishedModal(true);
  };

  if (!activeRoutine || !currentDay) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] p-6 text-center flex flex-col items-center justify-center">
        <Dumbbell className="w-12 h-12 text-[#9E5325] mx-auto mb-3 opacity-60" />
        <h2 className="text-xl font-bold text-[#1C1917] mb-2 font-heading">No hay rutina activa</h2>
        <p className="text-[#78716C] text-sm mb-4">Crea tu plan personalizado en menos de 60 segundos.</p>
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white font-bold px-5 py-3 rounded-xl min-h-[48px] uppercase font-heading text-xs"
        >
          Crear Rutina
        </button>
      </div>
    );
  }

  const dayExercisesData = currentDay.exercise_configs
    .map((config) => {
      const exData = exercises.find((e) => e.id === config.exerciseId);
      return {
        config,
        exercise: exData,
      };
    })
    .filter((item): item is { config: typeof currentDay.exercise_configs[0]; exercise: NonNullable<typeof item.exercise> } => Boolean(item.exercise));

  const totalExercises = dayExercisesData.length;
  const completedExercisesCount = activeSession.completedExerciseIds.length;
  const completionPercentage = totalExercises > 0 ? Math.round((completedExercisesCount / totalExercises) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-28 text-[#1C1917]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EAE3D9] px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-black text-[#1C1917] tracking-tight font-heading uppercase truncate">
              {activeRoutine.name}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-[#9E5325] font-bold uppercase tracking-wider font-heading truncate">
              {activeRoutine.goal} • {activeRoutine.days_per_week} días por semana
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isWorkoutInProgress && (
              <div className="flex items-center gap-1.5 bg-[#F8F2EC] border border-[#E7DFD5] px-2.5 py-1 rounded-xl shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#9E5325] animate-ping" />
                <div className="text-xs font-mono font-bold text-[#9E5325]">
                  {formatElapsedTime(sessionElapsedSeconds)}
                </div>
              </div>
            )}

            <button
              onClick={() => setIsCatalogModalOpen(true)}
              className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white text-xs font-bold font-heading flex items-center gap-1.5 transition-all shadow-sm active:scale-95 whitespace-nowrap"
              title="Explorar el catálogo de 9 rutinas (Principiante, Intermedio, Avanzado)"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Rutinas</span>
              <span className="sm:hidden text-[10px] uppercase font-bold">Planes</span>
            </button>

            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#9E5325] hover:text-[#7B3A13] text-xs font-bold font-heading flex items-center gap-1.5 transition-all shadow-sm active:scale-95 whitespace-nowrap"
              title="Exportar rutina a PDF para llevar al gimnasio"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden text-[10px] uppercase font-bold">PDF</span>
            </button>

            <button
              onClick={() => setIsCreatorModalOpen(true)}
              className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#EAE3D9] bg-white hover:bg-[#FAF7F2] text-[#9E5325] hover:text-[#7B3A13] text-xs font-bold font-heading flex items-center gap-1.5 transition-all shadow-sm active:scale-95 whitespace-nowrap"
              title="Formulario intuitivo para definir una nueva rutina"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Definir</span>
              <span className="sm:hidden text-[10px] uppercase font-bold">+</span>
            </button>
          </div>
        </div>

        {/* Days selector tabs */}
        <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
          {activeRoutine.days.map((day, idx) => {
            const isSelected = idx === activeDayIndex;
            return (
              <button
                key={day.id}
                onClick={() => setActiveDayIndex(idx)}
                className={`min-h-[38px] sm:min-h-[44px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none font-heading uppercase tracking-wider shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-md shadow-[#9E5325]/20'
                    : 'bg-white text-[#78716C] hover:text-[#1C1917] border border-[#EAE3D9]'
                }`}
              >
                Día {idx + 1}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Day Summary & Status Banner */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE3D9] shadow-sm">
          <div className="flex items-start justify-between gap-2.5 mb-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#9E5325] font-heading break-words">
                {currentDay.name}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[#1C1917] tracking-tight mt-0.5 font-heading break-words">
                {currentDay.focus}
              </h2>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#78716C] uppercase font-heading whitespace-nowrap block">Progreso</span>
              <div className="text-sm font-bold text-[#1C1917] whitespace-nowrap">
                {completedExercisesCount}/{totalExercises}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-[#FAF7F2] rounded-full overflow-hidden mt-2 mb-4 border border-[#EAE3D9]">
            <div
              className="h-full bg-gradient-to-r from-[#9E5325] to-[#7B3A13] transition-all duration-300 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          {/* Mode switch button */}
          {!isWorkoutInProgress ? (
            <button
              onClick={handleStartWorkout}
              className="w-full min-h-[48px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider sm:tracking-[0.1em] font-heading px-4 sm:px-5 py-3 rounded-xl shadow-md shadow-[#9E5325]/25 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>INICIAR ENTRENAMIENTO DE HOY</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleFinishWorkout}
                className="flex-1 min-h-[48px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider sm:tracking-[0.1em] font-heading px-3 sm:px-4 py-3 rounded-xl shadow-md shadow-[#9E5325]/25 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
              >
                <Check className="w-5 h-5 stroke-[3px] shrink-0" />
                <span>FINALIZAR ENTRENAMIENTO</span>
              </button>

              <button
                onClick={() => {
                  cancelSession();
                }}
                className="min-h-[48px] px-3 bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] hover:text-rose-600 rounded-xl border border-[#EAE3D9] text-xs font-semibold transition-colors shrink-0"
                title="Descartar sesión actual"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}

          {/* Quick PDF export link */}
          <div className="mt-3.5 pt-3 border-t border-[#F2EAE0] flex items-center justify-between gap-2 text-[11px] text-[#78716C]">
            <span className="truncate">¿Prefieres entrenar con hoja impresa?</span>
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="text-[#9E5325] hover:text-[#7B3A13] font-bold font-heading uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:underline"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Exercises Checklist */}
        <section aria-label="Lista de Ejercicios del Día" className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#78716C] px-1 font-bold uppercase tracking-wider font-heading gap-2">
            <span className="truncate">Ejercicios Programados</span>
            <span className="whitespace-nowrap shrink-0">{dayExercisesData.length} en total</span>
          </div>

          {dayExercisesData.map(({ config, exercise }, index) => {
            const isCompleted = activeSession.completedExerciseIds.includes(exercise.id);
            const completedSets = activeSession.completedSetsMap[exercise.id] || 0;

            // Look up up to 3 alternative exercises for this exercise
            const altIds = config.alternativeExerciseIds && config.alternativeExerciseIds.length > 0
              ? config.alternativeExerciseIds
              : exercises
                  .filter((e) => e.id !== exercise.id && e.muscle_group === exercise.muscle_group)
                  .map((e) => e.id)
                  .slice(0, 3);

            const alternativeExerciseObjects = altIds
              .map((id) => exercises.find((e) => e.id === id))
              .filter((e): e is Exercise => Boolean(e))
              .slice(0, 3);

            return (
              <ExerciseCard
                key={`${exercise.id}-${index}`}
                exercise={exercise}
                sets={config.sets}
                reps={config.reps}
                restSeconds={config.restSeconds}
                completedSets={completedSets}
                isCompleted={isCompleted}
                isInWorkoutMode={isWorkoutInProgress}
                alternativeExercises={alternativeExerciseObjects}
                onSelectAlternative={(newExId) => {
                  if (currentDay) {
                    replaceExerciseInDay(currentDay.id, exercise.id, newExId);
                  }
                }}
                onToggleComplete={() => toggleExerciseCompleted(exercise.id)}
                onSetClick={() => {
                  incrementSetCompleted(exercise.id, config.sets);
                  startRestTimer(config.restSeconds, exercise.name);
                }}
                onStartRestTimer={(seconds, name) => startRestTimer(seconds, name)}
              />
            );
          })}
        </section>
      </main>

      {/* Persistent floating rest timer */}
      <RestTimer />

      {/* Session Finished Congratulations Modal */}
      {showFinishedModal && lastFinishedSummary && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-scaleUp">
            <div className="w-16 h-16 rounded-full border-2 border-[#9E5325] bg-[#F8F2EC] text-[#9E5325] font-black flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8" />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-widest text-[#9E5325] font-heading">
              ¡Excelente Disciplina!
            </span>
            <h3 className="text-2xl font-black text-[#1C1917] mt-1 mb-2 font-heading uppercase">
              Sesión Completada
            </h3>
            <p className="text-xs text-[#78716C] mb-5">
              {lastFinishedSummary.dayName} guardado con éxito.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE3D9]">
              <div>
                <span className="text-[10px] text-[#78716C] uppercase font-heading font-semibold">Duración</span>
                <div className="text-lg font-black text-[#1C1917]">
                  {lastFinishedSummary.duration} min
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[#78716C] uppercase font-heading font-semibold">Ejercicios</span>
                <div className="text-lg font-black text-[#9E5325]">
                  {lastFinishedSummary.completedCount}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowFinishedModal(false);
                  navigate('/progreso');
                }}
                className="w-full min-h-[48px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] text-white font-bold text-xs uppercase tracking-wider font-heading rounded-xl shadow-md transition-all"
              >
                Ver Mi Progreso y Racha
              </button>
              <button
                onClick={() => {
                  setShowFinishedModal(false);
                  navigate('/');
                }}
                className="w-full min-h-[48px] bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] font-semibold text-xs rounded-xl transition-all"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Routine PDF Modal */}
      {activeRoutine && (
        <ExportRoutinePdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          routine={activeRoutine}
          exercises={exercises}
          athleteName={profile?.name || currentUser?.username}
        />
      )}

      {/* Routine Catalog Modal */}
      <RoutineCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        onOpenCreator={() => setIsCreatorModalOpen(true)}
      />

      {/* Routine Creator Modal */}
      <AdminRoutineCreatorModal
        isOpen={isCreatorModalOpen}
        onClose={() => setIsCreatorModalOpen(false)}
      />
    </div>
  );
};
