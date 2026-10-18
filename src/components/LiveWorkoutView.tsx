import React, { useState, useEffect } from 'react';
import {
  Play,
  Check,
  RotateCcw,
  Clock,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
  Info,
  Timer,
  Plus,
  Flame,
  Award,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useRoutineStore } from '../store/useRoutineStore';
import { Exercise, RoutineDay } from '../types';
import { FullScreenRestTimer } from './FullScreenRestTimer';
import confetti from 'canvas-confetti';

interface LiveWorkoutViewProps {
  onMinimize: () => void;
  onFinish: () => void;
}

export const LiveWorkoutView: React.FC<LiveWorkoutViewProps> = ({ onMinimize, onFinish }) => {
  const activeRoutine = useRoutineStore((s) => s.activeRoutine);
  const exercises = useRoutineStore((s) => s.exercises);
  const activeDayIndex = useRoutineStore((s) => s.activeDayIndex);
  const activeSession = useRoutineStore((s) => s.activeSession);
  const toggleSetForExercise = useRoutineStore((s) => s.toggleSetForExercise);
  const startRestTimer = useRoutineStore((s) => s.startRestTimer);
  const setFullScreenTimerOpen = useRoutineStore((s) => s.setFullScreenTimerOpen);
  const replaceExerciseInDay = useRoutineStore((s) => s.replaceExerciseInDay);

  const currentDay: RoutineDay | undefined = activeRoutine?.days[activeDayIndex] || activeRoutine?.days[0];

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [extraSetsMap, setExtraSetsMap] = useState<Record<string, number>>({});

  // Live stopwatch counter
  useEffect(() => {
    if (!activeSession.startTime) return;
    const interval = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - activeSession.startTime!) / 1000));
      setElapsedSeconds(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession.startTime]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!currentDay || !activeRoutine) return null;

  const dayExercisesData = currentDay.exercise_configs
    .map((config) => {
      const exData = exercises.find((e) => e.id === config.exerciseId);
      return { config, exercise: exData };
    })
    .filter((item): item is { config: typeof currentDay.exercise_configs[0]; exercise: Exercise } => Boolean(item.exercise));

  const totalExercises = dayExercisesData.length;
  const completedExercisesCount = activeSession.completedExerciseIds.length;
  const currentItem = dayExercisesData[currentExerciseIndex] || dayExercisesData[0];

  if (!currentItem) return null;

  const { config, exercise } = currentItem;
  const extraSets = extraSetsMap[exercise.id] || 0;
  const totalSetsForExercise = config.sets + extraSets;
  const completedSets = activeSession.completedSetsMap[exercise.id] || 0;
  const isCurrentExerciseCompleted = activeSession.completedExerciseIds.includes(exercise.id);

  // Alternative exercises lookup
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

  const handleToggleSet = (setNumber: number) => {
    const isAlreadyCompleted = completedSets >= setNumber;

    if (isAlreadyCompleted && completedSets === setNumber) {
      // Toggle off the latest completed set
      toggleSetForExercise(exercise.id, setNumber, totalSetsForExercise);
      return;
    }

    // Mark set as completed
    toggleSetForExercise(exercise.id, setNumber, totalSetsForExercise);

    // If it completed the whole exercise, fire celebratory confetti
    if (setNumber >= totalSetsForExercise) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#9E5325', '#7B3A13', '#10B981'],
        });
      } catch {
        // ignore
      }
    }

    // Automatically trigger full-screen rest timer
    if (config.restSeconds > 0) startRestTimer(config.restSeconds, `${exercise.name} (Serie ${setNumber})`, true);
  };

  const handleAddExtraSet = () => {
    setExtraSetsMap((prev) => ({
      ...prev,
      [exercise.id]: (prev[exercise.id] || 0) + 1,
    }));
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setShowAlternatives(false);
      setShowTips(false);
    }
  };

  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setShowAlternatives(false);
      setShowTips(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#FAF7F2] text-[#1C1917] flex flex-col overflow-y-auto animate-fadeIn select-none">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EAE3D9] px-3.5 sm:px-6 py-3 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#EAE3D9] flex items-center justify-center text-[#9E5325] shrink-0">
              <Flame className="w-4 h-4 fill-current animate-pulse text-[#9E5325]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#9E5325] font-heading flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>ENTRENAMIENTO EN VIVO</span>
                </span>
                <span className="text-[10px] bg-[#FAF7F2] text-[#78716C] px-1.5 py-0.2 rounded border border-[#EAE3D9] font-medium truncate">
                  {currentDay.name}
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-[#1C1917] truncate font-heading uppercase">
                {activeRoutine.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Timer Display */}
            <div className="bg-[#FAF7F2] border border-[#EAE3D9] px-2.5 sm:px-3 py-1 rounded-xl flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black text-[#9E5325]">
              <Clock className="w-3.5 h-3.5 text-[#9E5325] shrink-0" />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>

            {/* Minimize View Button */}
            <button
              onClick={onMinimize}
              className="p-2 hover:bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917] rounded-xl border border-[#EAE3D9] transition-colors"
              title="Minimizar vista en vivo"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Finish Workout Button */}
            <button
              onClick={onFinish}
              className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white text-xs font-bold px-3 py-2 rounded-xl uppercase font-heading tracking-wider flex items-center gap-1 shadow-sm transition-all whitespace-nowrap"
            >
              <Check className="w-4 h-4 stroke-[3px]" />
              <span className="hidden sm:inline">Finalizar</span>
            </button>
          </div>
        </div>

        {/* Global Workout Progress Bar */}
        <div className="max-w-xl mx-auto mt-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#78716C] font-heading mb-1">
            <span>Progreso del Día</span>
            <span>
              {completedExercisesCount} de {totalExercises} ejercicios completados
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#FAF7F2] rounded-full overflow-hidden border border-[#EAE3D9]">
            <div
              className="h-full bg-gradient-to-r from-[#9E5325] to-[#7B3A13] transition-all duration-300 rounded-full"
              style={{
                width: `${totalExercises > 0 ? (completedExercisesCount / totalExercises) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-3.5 sm:px-4 py-4 space-y-4">
        {/* Horizontal Exercises Carousel Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {dayExercisesData.map((item, idx) => {
            const isSelected = idx === currentExerciseIndex;
            const isDone = activeSession.completedExerciseIds.includes(item.exercise.id);
            const setsDone = activeSession.completedSetsMap[item.exercise.id] || 0;

            return (
              <button
                key={item.exercise.id}
                onClick={() => {
                  setCurrentExerciseIndex(idx);
                  setShowAlternatives(false);
                  setShowTips(false);
                }}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all font-heading uppercase flex items-center gap-1.5 select-none shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-md shadow-[#9E5325]/20'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-white text-[#78716C] hover:text-[#1C1917] border border-[#EAE3D9]'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-700 text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                )}
                <span className="truncate max-w-[120px]">{item.exercise.name}</span>
                <span className="text-[10px] opacity-80">
                  ({setsDone}/{item.config.sets})
                </span>
              </button>
            );
          })}
        </div>

        {/* Focused Exercise Active Card */}
        <article className="bg-white rounded-3xl p-4 sm:p-6 border border-[#EAE3D9] shadow-sm">
          {/* Top Badges & Navigation between exercises */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#E7DFD5] bg-[#F8F2EC] text-[#9E5325] capitalize font-heading">
                {exercise.muscle_group}
              </span>
              <span className="text-[11px] text-[#78716C] bg-[#FAF7F2] px-2.5 py-0.5 rounded-full border border-[#EAE3D9] flex items-center gap-1 font-medium capitalize">
                <Dumbbell className="w-3 h-3 text-[#9E5325]" />
                <span>{exercise.equipment}</span>
              </span>
              {isCurrentExerciseCompleted && (
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3px]" />
                  <span>Completado</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handlePrevExercise}
                disabled={currentExerciseIndex === 0}
                className="w-8 h-8 rounded-xl border border-[#EAE3D9] hover:bg-[#FAF7F2] disabled:opacity-30 disabled:hover:bg-white text-[#78716C] flex items-center justify-center transition-colors"
                title="Ejercicio anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-[#78716C] px-1">
                {currentExerciseIndex + 1}/{totalExercises}
              </span>
              <button
                onClick={handleNextExercise}
                disabled={currentExerciseIndex === totalExercises - 1}
                className="w-8 h-8 rounded-xl border border-[#EAE3D9] hover:bg-[#FAF7F2] disabled:opacity-30 disabled:hover:bg-white text-[#78716C] flex items-center justify-center transition-colors"
                title="Siguiente ejercicio"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Exercise Main Title */}
          <h2 className="text-lg sm:text-2xl font-black text-[#1C1917] tracking-tight font-heading leading-tight break-words">
            {exercise.name}
          </h2>

          <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
            {exercise.description}
          </p>

          {config.notes && <p className="text-xs text-[#78716C] mt-3">{config.notes}</p>}
          {/* Rest and Reps Target Bar */}
          <div className="mt-3.5 p-3 bg-[#FAF7F2] rounded-2xl border border-[#EAE3D9] flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] text-[#78716C] uppercase font-bold font-heading block">
                  Objetivo Reps
                </span>
                <span className="text-sm font-black text-[#1C1917] font-mono">
                  {config.reps}{/min|seg|\bs\b/i.test(String(config.reps)) ? '' : ' repeticiones'}
                </span>
              </div>
              <div className="w-px h-8 bg-[#EAE3D9]" />
              <div>
                <span className="text-[10px] text-[#78716C] uppercase font-bold font-heading block">
                  Descanso
                </span>
                <button
                  disabled={config.restSeconds <= 0}
                  onClick={() => startRestTimer(config.restSeconds, exercise.name, true)}
                  className="text-xs font-bold text-[#9E5325] hover:underline flex items-center gap-1 font-heading uppercase"
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>{config.restLabel || `${config.restSeconds} segundos`}</span>
                </button>
              </div>
            </div>

            {/* Quick Actions (Tips & Alternatives) */}
            <div className="flex items-center gap-1.5">
              {alternativeExerciseObjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAlternatives(!showAlternatives)}
                  className="px-2.5 py-1.5 bg-white hover:bg-[#F2E7DC] text-[#9E5325] border border-[#EAE3D9] rounded-xl text-[11px] font-bold font-heading uppercase flex items-center gap-1 transition-colors"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Sustituir</span>
                </button>
              )}

              {exercise.tips && exercise.tips.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTips(!showTips)}
                  className="px-2.5 py-1.5 bg-white hover:bg-[#F2E7DC] text-[#78716C] hover:text-[#1C1917] border border-[#EAE3D9] rounded-xl text-[11px] font-bold font-heading uppercase flex items-center gap-1 transition-colors"
                >
                  <Info className="w-3 h-3" />
                  <span>Técnica</span>
                </button>
              )}
            </div>
          </div>

          {/* Alternative Exercises Selection Drawer */}
          {showAlternatives && alternativeExerciseObjects.length > 0 && (
            <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl animate-fadeIn space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 font-heading block">
                ¿Máquina ocupada? Selecciona un sustituto:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {alternativeExerciseObjects.map((alt) => (
                  <button
                    key={alt.id}
                    onClick={() => {
                      replaceExerciseInDay(currentDay.id, exercise.id, alt.id);
                      setShowAlternatives(false);
                    }}
                    className="p-2.5 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-xl text-left flex items-center justify-between text-xs font-semibold text-[#1C1917] transition-colors"
                  >
                    <span>{alt.name}</span>
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-heading uppercase">
                      Usar este
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exercise Tips Drawer */}
          {showTips && exercise.tips && (
            <div className="mt-3 p-3 bg-[#FAF7F2] border border-[#EAE3D9] rounded-2xl animate-fadeIn space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E5325] font-heading block">
                Puntos Clave de Ejecución:
              </span>
              <ul className="space-y-1">
                {exercise.tips.map((tip, tipIdx) => (
                  <li key={tipIdx} className="text-xs text-[#44403C] flex items-start gap-1.5">
                    <span className="text-[#9E5325] font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        {/* DEDICATED SETS COUNTER & CHECKLIST SECTION */}
        <section aria-label="Contador interactivo de series" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-[#1C1917] uppercase tracking-wider font-heading">
                Series de Entrenamiento
              </h3>
              <p className="text-[11px] text-[#78716C]">
                Toca cada serie al terminarla para registrarla y activar el descanso automático
              </p>
            </div>

            <button
              onClick={handleAddExtraSet}
              className="text-[11px] font-bold text-[#9E5325] hover:text-[#7B3A13] bg-white border border-[#EAE3D9] hover:bg-[#FAF7F2] px-2.5 py-1.5 rounded-xl flex items-center gap-1 font-heading uppercase transition-colors shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Serie</span>
            </button>
          </div>

          {/* List of Sets */}
          <div className="space-y-2">
            {Array.from({ length: totalSetsForExercise }).map((_, setIdx) => {
              const setNumber = setIdx + 1;
              const isDone = completedSets >= setNumber;
              const isNextUp = completedSets === setIdx;

              return (
                <div
                  key={setNumber}
                  onClick={() => handleToggleSet(setNumber)}
                  className={`cursor-pointer rounded-2xl p-3.5 border transition-all duration-200 flex items-center justify-between gap-3 ${
                    isDone
                      ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                      : isNextUp
                      ? 'bg-white border-[#9E5325] ring-2 ring-[#9E5325]/15 shadow-md'
                      : 'bg-white border-[#EAE3D9] hover:border-[#D8C5B3]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Circle Checkbox / Badge */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all shrink-0 ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : isNextUp
                          ? 'bg-[#9E5325] text-white shadow-md shadow-[#9E5325]/25 animate-pulse'
                          : 'bg-[#FAF7F2] text-[#78716C] border border-[#EAE3D9]'
                      }`}
                    >
                      {isDone ? <Check className="w-5 h-5 stroke-[3px]" /> : setNumber}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs sm:text-sm text-[#1C1917] font-heading uppercase">
                          Serie {setNumber}
                        </span>
                        {isNextUp && !isDone && (
                          <span className="text-[10px] bg-[#9E5325]/10 text-[#9E5325] font-bold px-2 py-0.2 rounded-full font-heading uppercase">
                            Turno Actual
                          </span>
                        )}
                        {isDone && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.2 rounded-full font-heading uppercase">
                            Completada
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#78716C] mt-0.5">
                        Objetivo: <span className="font-semibold text-[#44403C]">{config.reps} reps</span> •{' '}
                        {config.restSeconds}s descanso
                      </p>
                    </div>
                  </div>

                  {/* Right Button Action */}
                  <div className="shrink-0">
                    {isDone ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-3 py-1.5 rounded-xl font-heading uppercase flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        <span className="hidden sm:inline">Listo</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#9E5325] border border-[#EAE3D9] px-3 py-1.5 rounded-xl text-xs font-bold font-heading uppercase transition-all shadow-sm"
                      >
                        Marcar Serie
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Navigation between exercises */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            onClick={handlePrevExercise}
            disabled={currentExerciseIndex === 0}
            className="flex-1 min-h-[44px] bg-white hover:bg-[#FAF7F2] disabled:opacity-30 disabled:hover:bg-white text-[#44403C] border border-[#EAE3D9] rounded-2xl text-xs font-bold font-heading uppercase flex items-center justify-center gap-1.5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <button
            onClick={() => setFullScreenTimerOpen(true)}
            className="min-h-[44px] px-3.5 bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#9E5325] border border-[#EAE3D9] rounded-2xl text-xs font-bold font-heading uppercase flex items-center gap-1.5 transition-colors"
            title="Abrir cronómetro de descanso a pantalla completa"
          >
            <Timer className="w-4 h-4" />
            <span className="hidden sm:inline">Cronómetro</span>
          </button>

          <button
            onClick={handleNextExercise}
            disabled={currentExerciseIndex === totalExercises - 1}
            className="flex-1 min-h-[44px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] disabled:opacity-30 text-white rounded-2xl text-xs font-bold font-heading uppercase flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#9E5325]/20"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Embedded Full Screen Rest Timer Overlay */}
      <FullScreenRestTimer
        onNextSet={() => {
          // If exercise is done, move to next exercise
          if (completedSets >= totalSetsForExercise && currentExerciseIndex < totalExercises - 1) {
            handleNextExercise();
          }
        }}
      />
    </div>
  );
};
