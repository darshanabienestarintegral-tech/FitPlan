import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Timer, Dumbbell, ShieldAlert, Sparkles, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Exercise } from '../types';

interface ExerciseCardProps {
  exercise: Exercise;
  sets?: number;
  reps?: string | number;
  restSeconds?: number;
  restLabel?: string;
  notes?: string;
  completedSets?: number;
  isCompleted?: boolean;
  isInWorkoutMode?: boolean;
  alternativeExercises?: Exercise[];
  onToggleComplete?: () => void;
  onSetClick?: (setIndex: number) => void;
  onStartRestTimer?: (seconds: number, exerciseName: string) => void;
  onSelectAlternative?: (newExerciseId: string) => void;
}

const equipmentLabelMap: Record<string, string> = {
  ninguno: 'Sin equipo / Corporal',
  mancuernas: 'Mancuernas',
  gimnasio: 'Gimnasio completo',
};

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  sets,
  reps,
  restSeconds = 90,
  restLabel,
  notes,
  completedSets = 0,
  isCompleted = false,
  isInWorkoutMode = false,
  alternativeExercises = [],
  onToggleComplete,
  onSetClick,
  onStartRestTimer,
  onSelectAlternative,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  return (
    <article
      className={`relative bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
        isCompleted
          ? 'border-[#9E5325]/40 bg-[#FAF7F2] opacity-95'
          : 'border-[#EAE3D9] hover:border-[#D8C5B3]'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {exercise.is_default ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 whitespace-nowrap shrink-0">
                  Predeterminado
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-800 whitespace-nowrap shrink-0">
                  Personalizado
                </span>
              )}
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#E7DFD5] bg-[#F8F2EC] text-[#9E5325] capitalize font-heading whitespace-nowrap shrink-0">
                {exercise.muscle_group}
              </span>
              <span className="text-[11px] text-[#78716C] bg-[#FAF7F2] px-2.5 py-0.5 rounded-full border border-[#EAE3D9] flex items-center gap-1 font-medium whitespace-nowrap shrink-0">
                <Dumbbell className="w-3 h-3 text-[#9E5325] shrink-0" />
                <span>{equipmentLabelMap[exercise.equipment]}</span>
              </span>
              <span className="text-[11px] text-[#78716C] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#EAE3D9] capitalize font-medium whitespace-nowrap shrink-0">
                {exercise.difficulty}
              </span>
            </div>

            <h3
              className={`text-sm sm:text-base md:text-lg font-bold leading-snug tracking-tight font-heading break-words ${
                isCompleted ? 'line-through text-[#A8A29E]' : 'text-[#1C1917]'
              }`}
            >
              {exercise.name}
            </h3>

            {notes && <p className="mt-2 text-xs text-[#78716C] whitespace-pre-wrap">{notes}</p>}
            {/* Target Sets & Reps if routine item */}
            {sets && reps && (
              <div className="mt-2.5 flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs sm:text-sm">
                <div className="flex items-center gap-1 font-bold text-[#9E5325] bg-[#FAF7F2] px-2.5 sm:px-3 py-1 rounded-xl border border-[#EAE3D9] text-xs sm:text-sm whitespace-nowrap shrink-0">
                  <span>{sets} series</span>
                  <span className="text-[#A8A29E]">×</span>
                  <span>{reps}{/min|seg|\bs\b/i.test(String(reps)) ? '' : ' reps'}</span>
                </div>

                {onStartRestTimer && restSeconds > 0 && (
                  <button
                    onClick={() => onStartRestTimer(restSeconds, exercise.name)}
                    className="flex items-center gap-1 text-[11px] sm:text-xs text-[#78716C] hover:text-[#9E5325] bg-[#FAF7F2] hover:bg-[#F4ECE3] px-2.5 sm:px-3 py-1 rounded-xl border border-[#EAE3D9] active:scale-95 transition-all min-h-[30px] font-medium whitespace-nowrap shrink-0"
                    title="Iniciar temporizador de descanso"
                  >
                    <Timer className="w-3.5 h-3.5 text-[#9E5325] shrink-0" />
                    <span>{restLabel || `${restSeconds}s descanso`}</span>
                  </button>
                )}

                {restSeconds === 0 && restLabel && <span className="text-xs text-[#78716C]">{restLabel}</span>}
                {/* Alternative switch trigger button */}
                {alternativeExercises.length > 0 && onSelectAlternative && (
                  <button
                    type="button"
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    className={`flex items-center gap-1 text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-xl border transition-all min-h-[30px] font-heading uppercase tracking-wide font-semibold whitespace-nowrap shrink-0 ${
                      showAlternatives
                        ? 'bg-[#9E5325] text-white border-[#9E5325]'
                        : 'bg-white text-[#9E5325] border-[#D8C5B3] hover:bg-[#FAF7F2]'
                    }`}
                    title="Ver hasta 3 alternativas si no cuentas con el equipo o la máquina está ocupada"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>Alternativas ({alternativeExercises.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Toggle Complete Checkbox in workout mode */}
          {isInWorkoutMode && onToggleComplete && (
            <button
              onClick={onToggleComplete}
              className={`min-w-[48px] min-h-[48px] rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 ${
                isCompleted
                  ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-md shadow-[#9E5325]/25'
                  : 'bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] border border-[#EAE3D9]'
              }`}
              aria-label={isCompleted ? 'Marcar ejercicio incompleto' : 'Marcar ejercicio completado'}
            >
              <Check className={`w-6 h-6 stroke-[3px] ${isCompleted ? 'stroke-white' : 'stroke-[#A8A29E]'}`} />
            </button>
          )}
        </div>

        {/* Set checklist pills in workout mode */}
        {isInWorkoutMode && sets && sets > 0 && (
          <div className="mt-4 pt-3 border-t border-[#EAE3D9] flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wide font-heading whitespace-nowrap shrink-0">
              Series completadas:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {Array.from({ length: sets }).map((_, idx) => {
                const isSetDone = idx < completedSets;
                return (
                  <button
                    key={idx}
                    onClick={() => onSetClick && onSetClick(idx)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs font-black flex items-center justify-center transition-all active:scale-90 shrink-0 ${
                      isSetDone
                        ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-sm'
                        : 'bg-[#FAF7F2] text-[#78716C] border border-[#EAE3D9] hover:border-[#9E5325]'
                    }`}
                    title={`Serie ${idx + 1}`}
                  >
                    {isSetDone ? '✓' : idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Up to 3 Alternative Exercises Panel */}
        {showAlternatives && alternativeExercises.length > 0 && onSelectAlternative && (
          <div className="mt-3.5 pt-3 border-t border-[#EAE3D9] bg-[#FAF7F2] -mx-4 -mb-4 p-4 sm:p-5 rounded-b-2xl border-t space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#9E5325] uppercase tracking-wider font-heading flex items-center gap-1.5 min-w-0">
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">¿No cuentas con la máquina?</span>
              </span>
              <span className="text-[10px] text-[#78716C] font-semibold whitespace-nowrap shrink-0">
                Hasta 3 opciones
              </span>
            </div>

            <div className="space-y-2">
              {alternativeExercises.slice(0, 3).map((alt, altIdx) => (
                <div
                  key={`${alt.id}-${altIdx}`}
                  className="bg-white rounded-xl p-3 border border-[#EAE3D9] flex items-center justify-between gap-3 shadow-sm hover:border-[#D8C5B3] transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-[#9E5325] bg-[#F8F2EC] px-2 py-0.5 rounded-full border border-[#E7DFD5] whitespace-nowrap shrink-0">
                        {equipmentLabelMap[alt.equipment]}
                      </span>
                      <span className="text-[10px] text-[#78716C] capitalize font-medium whitespace-nowrap shrink-0">
                        {alt.difficulty}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1C1917] truncate font-heading">
                      {alt.name}
                    </h4>
                    <p className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">
                      {alt.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectAlternative(alt.id);
                      setShowAlternatives(false);
                    }}
                    className="shrink-0 bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] text-white font-bold text-[11px] uppercase tracking-wider font-heading px-3 py-2 rounded-xl shadow-sm min-h-[36px] active:scale-95 transition-all whitespace-nowrap"
                  >
                    Usar Este
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Details */}
        <div className="mt-3 pt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full text-xs text-[#78716C] hover:text-[#9E5325] py-1 transition-colors min-h-[36px] font-semibold"
          >
            <span>{isExpanded ? 'Ocultar técnica y consejos' : 'Ver técnica y consejos'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-[#9E5325]" /> : <ChevronDown className="w-4 h-4 text-[#9E5325]" />}
          </button>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-[#EAE3D9] space-y-3 text-xs sm:text-sm animate-fadeIn">
              <p className="text-[#44403C] leading-relaxed font-normal">
                {exercise.description}
              </p>

              {exercise.tips && exercise.tips.length > 0 && (
                <div className="bg-[#FAF7F2] rounded-2xl p-3.5 border border-[#EAE3D9] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#9E5325] uppercase tracking-wider font-heading">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Claves de Ejecución:</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-[#57534E] space-y-1 pl-1">
                    {exercise.tips.map((tip, idx) => (
                      <li key={idx} className="leading-snug">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-[#78716C]">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#9E5325]" />
                  <span className="font-medium">Músculos secundarios:</span>
                  <span className="text-[#1C1917] font-semibold">
                    {exercise.secondary_muscles.join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
