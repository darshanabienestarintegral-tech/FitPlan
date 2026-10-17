import React from 'react';
import { Play, CheckCircle2, Clock, Dumbbell } from 'lucide-react';
import { RoutineDay, Exercise } from '../types';

interface RoutineDayCardProps {
  day: RoutineDay;
  exercises: Exercise[];
  isActive?: boolean;
  isToday?: boolean;
  hasCompletedRecently?: boolean;
  onStartSession: (dayId: string) => void;
  onViewDetails?: () => void;
}

export const RoutineDayCard: React.FC<RoutineDayCardProps> = ({
  day,
  exercises,
  isActive = false,
  isToday = false,
  hasCompletedRecently = false,
  onStartSession,
  onViewDetails,
}) => {
  const dayExercises = day.exercise_ids
    .map((id) => exercises.find((e) => e.id === id))
    .filter((e): e is Exercise => Boolean(e));

  return (
    <div
      className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-sm ${
        isActive
          ? 'border-[#9E5325] ring-2 ring-[#9E5325]/20 shadow-md'
          : 'border-[#EAE3D9] hover:border-[#D8C5B3]'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-[#9E5325] font-heading break-words">
              {day.name}
            </span>
            {isToday && (
              <span className="text-[10px] bg-[#F8F2EC] text-[#9E5325] font-bold px-2 py-0.5 rounded-full border border-[#E7DFD5] shrink-0 whitespace-nowrap">
                Hoy
              </span>
            )}
            {hasCompletedRecently && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 shrink-0 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3" />
                Completado
              </span>
            )}
          </div>
          <h4 className="text-sm sm:text-base font-bold text-[#1C1917] tracking-tight font-heading break-words">
            {day.focus}
          </h4>
        </div>

        <div className="flex items-center gap-1 text-[11px] sm:text-xs text-[#78716C] bg-[#FAF7F2] px-2 sm:px-2.5 py-1 rounded-xl border border-[#EAE3D9] font-medium shrink-0 whitespace-nowrap">
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#9E5325]" />
          <span>{day.exercise_ids.length * 8}m</span>
        </div>
      </div>

      {/* Exercises list preview */}
      <div className="space-y-1.5 my-3.5">
        {dayExercises.slice(0, 4).map((ex, idx) => (
          <div
            key={`${ex.id}-${idx}`}
            className="flex items-center justify-between text-xs bg-[#FAF7F2] px-3 py-2 rounded-xl border border-[#EAE3D9] text-[#292524] gap-2"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[#9E5325] font-bold font-mono text-[11px] shrink-0">{idx + 1}.</span>
              <span className="truncate font-medium text-xs">{ex.name}</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#78716C] font-semibold capitalize shrink-0 whitespace-nowrap">
              {ex.muscle_group}
            </span>
          </div>
        ))}

        {dayExercises.length > 4 && (
          <div className="text-center text-xs text-[#78716C] pt-0.5 font-medium whitespace-nowrap truncate">
            + {dayExercises.length - 4} ejercicios más
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1.5">
        <button
          onClick={() => onStartSession(day.id)}
          className="flex-1 min-h-[44px] sm:min-h-[48px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] active:scale-[0.98] text-white font-bold px-3 sm:px-4 py-2.5 rounded-xl shadow-md shadow-[#9E5325]/25 flex items-center justify-center gap-2 transition-all font-heading tracking-wide text-xs uppercase whitespace-nowrap"
        >
          <Play className="w-4 h-4 fill-current shrink-0" />
          <span>Entrenar Ahora</span>
        </button>

        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="min-h-[48px] px-3.5 bg-[#FAF7F2] hover:bg-[#F2E7DC] active:scale-95 text-[#78716C] hover:text-[#9E5325] font-medium rounded-xl border border-[#EAE3D9] flex items-center justify-center transition-all"
            title="Ver detalles del día"
          >
            <Dumbbell className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
