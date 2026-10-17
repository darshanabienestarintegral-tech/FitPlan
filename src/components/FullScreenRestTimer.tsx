import React, { useEffect, useRef } from 'react';
import { Play, Pause, Plus, Minus, X, Bell, Minimize2, Check, ArrowRight, Sparkles } from 'lucide-react';
import { useRoutineStore } from '../store/useRoutineStore';

interface FullScreenRestTimerProps {
  onNextSet?: () => void;
}

export const FullScreenRestTimer: React.FC<FullScreenRestTimerProps> = ({ onNextSet }) => {
  const isFullScreenTimerOpen = useRoutineStore((s) => s.isFullScreenTimerOpen);
  const setFullScreenTimerOpen = useRoutineStore((s) => s.setFullScreenTimerOpen);
  const activeRestTimer = useRoutineStore((s) => s.activeSession.activeRestTimer);
  const tickRestTimer = useRoutineStore((s) => s.tickRestTimer);
  const pauseRestTimer = useRoutineStore((s) => s.pauseRestTimer);
  const resumeRestTimer = useRoutineStore((s) => s.resumeRestTimer);
  const addRestTimerSeconds = useRoutineStore((s) => s.addRestTimerSeconds);
  const resetRestTimer = useRoutineStore((s) => s.resetRestTimer);

  const hasPlayedBeepRef = useRef(false);

  // Tick timer every second
  useEffect(() => {
    if (!activeRestTimer || !activeRestTimer.isRunning) return;
    const interval = setInterval(() => {
      tickRestTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRestTimer?.isRunning, tickRestTimer]);

  // Audio tone and vibration when counter hits zero
  useEffect(() => {
    if (activeRestTimer && activeRestTimer.remaining === 0 && !hasPlayedBeepRef.current) {
      hasPlayedBeepRef.current = true;
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          // Triple harmonic celebratory gym beep
          [0, 0.15, 0.3].forEach((delay, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(idx === 2 ? 880 : 660, ctx.currentTime + delay);
            gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.15);
          });
        }
      } catch (e) {
        console.warn('Audio play error:', e);
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([250, 100, 250, 100, 300]);
        } catch {
          // ignore
        }
      }
    }

    if (activeRestTimer && activeRestTimer.remaining > 0) {
      hasPlayedBeepRef.current = false;
    }
  }, [activeRestTimer]);

  if (!isFullScreenTimerOpen || !activeRestTimer) return null;

  const minutes = Math.floor(activeRestTimer.remaining / 60);
  const seconds = activeRestTimer.remaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const initial = activeRestTimer.initial > 0 ? activeRestTimer.initial : 60;
  const progressRatio = Math.max(0, Math.min(1, activeRestTimer.remaining / initial));
  const isCompleted = activeRestTimer.remaining === 0;

  // Circular progress math
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const handleSkipOrComplete = () => {
    resetRestTimer();
    setFullScreenTimerOpen(false);
    if (onNextSet) {
      onNextSet();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Temporizador de descanso a pantalla completa"
      className="fixed inset-0 z-50 bg-[#121110]/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8 text-white select-none animate-fadeIn"
    >
      {/* Top Bar with Gym Branding and Minimize Control */}
      <div className="flex items-center justify-between gap-3 max-w-lg w-full mx-auto pt-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9E5325] animate-ping" />
          <span className="text-[11px] sm:text-xs font-black tracking-widest text-[#D99B6A] font-heading uppercase">
            DARSHANA GYM • RECUPERACIÓN
          </span>
        </div>

        <button
          onClick={() => setFullScreenTimerOpen(false)}
          className="min-h-[40px] px-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all font-heading uppercase"
          title="Minimizar a temporizador flotante"
        >
          <Minimize2 className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Minimizar</span>
        </button>
      </div>

      {/* Main Center Area: Giant Clock & Circular Ring */}
      <div className="flex flex-col items-center justify-center my-auto max-w-lg w-full mx-auto text-center px-2 py-4">
        {/* Exercise name caption */}
        <div className="mb-4">
          <span className="text-xs sm:text-sm uppercase tracking-wider text-[#A8A29E] font-heading font-semibold block">
            {isCompleted ? '¡TIEMPO DE DESCANSO CUMPLIDO!' : 'DESCANSO ENTRE SERIES'}
          </span>
          <h2 className="text-base sm:text-xl font-bold text-white font-heading mt-0.5 truncate max-w-xs sm:max-w-md">
            {activeRestTimer.exerciseName || 'Ejercicio en curso'}
          </h2>
        </div>

        {/* Circular Display */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
            {/* Background ring */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-white/10"
            />
            {/* Animated progress ring */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-500 ${
                isCompleted
                  ? 'text-emerald-500'
                  : 'text-[#9E5325]'
              }`}
            />
          </svg>

          {/* Time digits in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-5xl sm:text-6xl font-black font-mono tracking-tight transition-transform ${
                isCompleted ? 'text-emerald-400 scale-105 animate-pulse' : 'text-white'
              }`}
            >
              {formattedTime}
            </span>
            <span className="text-[11px] sm:text-xs text-stone-400 font-heading uppercase tracking-widest mt-1">
              {isCompleted ? '¡A ENTRENAR!' : activeRestTimer.isRunning ? 'RECUPERANDO' : 'PAUSADO'}
            </span>
          </div>
        </div>

        {/* Quick Add/Subtract Rest Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 mt-4">
          <button
            onClick={() => addRestTimerSeconds(-15)}
            disabled={activeRestTimer.remaining <= 15}
            className="min-h-[44px] px-3.5 bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-white/10 text-stone-200 text-xs font-bold rounded-2xl border border-white/10 transition-all font-heading"
            title="Restar 15 segundos"
          >
            -15s
          </button>
          <button
            onClick={() => addRestTimerSeconds(15)}
            className="min-h-[44px] px-3.5 bg-white/10 hover:bg-white/15 active:scale-95 text-stone-200 text-xs font-bold rounded-2xl border border-white/10 transition-all font-heading"
            title="Sumar 15 segundos"
          >
            +15s
          </button>
          <button
            onClick={() => addRestTimerSeconds(30)}
            className="min-h-[44px] px-4 bg-[#9E5325]/40 hover:bg-[#9E5325]/60 active:scale-95 text-[#F2E7DC] text-xs font-bold rounded-2xl border border-[#9E5325]/50 transition-all font-heading"
            title="Sumar 30 segundos"
          >
            +30s
          </button>
        </div>
      </div>

      {/* Bottom Main Action Controls */}
      <div className="max-w-md w-full mx-auto space-y-2.5 pb-2">
        <div className="flex items-center gap-2.5">
          {/* Pause / Resume Button */}
          {activeRestTimer.isRunning ? (
            <button
              onClick={pauseRestTimer}
              className="flex-1 min-h-[52px] bg-white/10 hover:bg-white/15 text-white font-black text-xs sm:text-sm uppercase tracking-wider font-heading rounded-2xl border border-white/15 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Pause className="w-4 h-4 fill-current shrink-0" />
              <span>Pausar</span>
            </button>
          ) : (
            <button
              onClick={resumeRestTimer}
              className="flex-1 min-h-[52px] bg-[#9E5325] hover:bg-[#B46536] text-white font-black text-xs sm:text-sm uppercase tracking-wider font-heading rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-[#9E5325]/30"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>Reanudar</span>
            </button>
          )}

          {/* Skip / Next Set Button */}
          <button
            onClick={handleSkipOrComplete}
            className={`flex-1 min-h-[52px] font-black text-xs sm:text-sm uppercase tracking-wider font-heading rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl ${
              isCompleted
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30 ring-2 ring-emerald-300'
                : 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#B46536] text-white shadow-[#9E5325]/40'
            }`}
          >
            {isCompleted ? (
              <>
                <Check className="w-5 h-5 stroke-[3px] shrink-0" />
                <span>¡Empezar Serie!</span>
              </>
            ) : (
              <>
                <span>Listo / Siguiente Serie</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </>
            )}
          </button>
        </div>

        {/* Secondary close button */}
        <button
          onClick={() => {
            resetRestTimer();
            setFullScreenTimerOpen(false);
          }}
          className="w-full text-center text-[11px] text-stone-400 hover:text-white py-1 font-heading uppercase tracking-wider transition-colors"
        >
          Descartar temporizador de descanso
        </button>
      </div>
    </div>
  );
};
