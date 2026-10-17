import React, { useEffect, useRef } from 'react';
import { Play, Pause, Plus, RotateCcw, X, Bell } from 'lucide-react';
import { useRoutineStore } from '../store/useRoutineStore';

export const RestTimer: React.FC = () => {
  const activeRestTimer = useRoutineStore((s) => s.activeSession.activeRestTimer);
  const tickRestTimer = useRoutineStore((s) => s.tickRestTimer);
  const pauseRestTimer = useRoutineStore((s) => s.pauseRestTimer);
  const resumeRestTimer = useRoutineStore((s) => s.resumeRestTimer);
  const addRestTimerSeconds = useRoutineStore((s) => s.addRestTimerSeconds);
  const resetRestTimer = useRoutineStore((s) => s.resetRestTimer);

  const hasPlayedBeepRef = useRef(false);

  useEffect(() => {
    if (!activeRestTimer || !activeRestTimer.isRunning) return;
    const interval = setInterval(() => {
      tickRestTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRestTimer?.isRunning, tickRestTimer]);

  useEffect(() => {
    if (activeRestTimer && activeRestTimer.remaining === 0 && !hasPlayedBeepRef.current) {
      hasPlayedBeepRef.current = true;
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);

          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.45);
        }
      } catch (e) {
        console.warn('Audio play error:', e);
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }

    if (activeRestTimer && activeRestTimer.remaining > 0) {
      hasPlayedBeepRef.current = false;
    }
  }, [activeRestTimer]);

  if (!activeRestTimer) return null;

  const minutes = Math.floor(activeRestTimer.remaining / 60);
  const seconds = activeRestTimer.remaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent =
    activeRestTimer.initial > 0
      ? Math.max(0, Math.min(100, ((activeRestTimer.initial - activeRestTimer.remaining) / activeRestTimer.initial) * 100))
      : 0;

  const isCompleted = activeRestTimer.remaining === 0;

  return (
    <aside
      role="region"
      aria-label="Temporizador de descanso"
      className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 bg-white border border-[#EAE3D9] rounded-2xl p-4 shadow-2xl backdrop-blur-xl transition-all duration-300"
    >
      {/* Copper progress bar top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#FAF7F2] rounded-t-2xl overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-full border-[1.5px] flex items-center justify-center font-bold text-sm ${
              isCompleted
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600 animate-pulse'
                : 'border-[#9E5325] bg-[#FAF7F2] text-[#9E5325]'
            }`}
          >
            {isCompleted ? <Bell className="w-5 h-5" /> : '⏱'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#78716C] font-bold uppercase tracking-[0.1em] font-heading">
                {isCompleted ? '¡Descanso Finalizado!' : 'Descanso'}
              </span>
              {activeRestTimer.exerciseName && (
                <span className="text-[11px] text-[#44403C] truncate max-w-[140px] font-medium">
                  • {activeRestTimer.exerciseName}
                </span>
              )}
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-[#1C1917]">
              {formattedTime}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => addRestTimerSeconds(30)}
            className="min-h-[44px] px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#F2E7DC] active:scale-95 text-[#9E5325] text-xs font-bold rounded-xl border border-[#EAE3D9] flex items-center gap-1 transition-all"
            title="Añadir 30 segundos"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>30s</span>
          </button>

          {!isCompleted ? (
            activeRestTimer.isRunning ? (
              <button
                onClick={pauseRestTimer}
                className="w-11 h-11 bg-[#FAF7F2] hover:bg-[#F2E7DC] active:scale-95 text-[#9E5325] rounded-xl border border-[#EAE3D9] flex items-center justify-center transition-all"
                title="Pausar"
              >
                <Pause className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button
                onClick={resumeRestTimer}
                className="w-11 h-11 bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] active:scale-95 text-white font-bold rounded-xl flex items-center justify-center shadow-md shadow-[#9E5325]/20 transition-all"
                title="Continuar"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            )
          ) : (
            <button
              onClick={() => addRestTimerSeconds(60)}
              className="w-11 h-11 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center shadow-md transition-all"
              title="Reiniciar 60s"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={resetRestTimer}
            className="w-10 h-10 hover:bg-[#FAF7F2] active:scale-95 text-[#78716C] hover:text-[#1C1917] rounded-xl flex items-center justify-center transition-all"
            title="Cerrar temporizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
