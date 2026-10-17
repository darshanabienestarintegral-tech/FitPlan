import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Calendar, Clock, Dumbbell, ArrowRight, ArrowLeft, Check, Sparkles, Zap } from 'lucide-react';
import { Goal, Equipment, Difficulty } from '../types';
import { useUserStore } from '../store/useUserStore';
import { useRoutineStore } from '../store/useRoutineStore';
import { BrandLogo } from '../components/BrandLogo';
import confetti from 'canvas-confetti';

interface OnboardingFormData {
  name: string;
  level: Difficulty;
  goal: Goal;
  days_per_week: number;
  session_duration: number;
  equipment: Equipment;
}

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useUserStore((s) => s.currentUser);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const createOrRegenerateRoutine = useRoutineStore((s) => s.createOrRegenerateRoutine);

  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<OnboardingFormData>({
    name: currentUser?.username || '',
    level: 'principiante',
    goal: 'hipertrofia',
    days_per_week: 3,
    session_duration: 45,
    equipment: 'mancuernas',
  });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const goalsList: { id: Goal; title: string; desc: string; icon: string; specs: string }[] = [
    {
      id: 'fuerza',
      title: 'Fuerza Pura',
      desc: 'Levantar más peso y aumentar tu fuerza máxima',
      icon: '🏋️‍♂️',
      specs: '5x5 repeticiones • 180s descanso',
    },
    {
      id: 'hipertrofia',
      title: 'Hipertrofia Muscular',
      desc: 'Aumentar masa muscular y definición estética',
      icon: '💪',
      specs: '4x10 repeticiones • 90s descanso',
    },
    {
      id: 'perdida_grasa',
      title: 'Pérdida de Grasa',
      desc: 'Quemar calorías manteniendo tono muscular',
      icon: '🔥',
      specs: '3x15 repeticiones • 45s descanso',
    },
    {
      id: 'resistencia',
      title: 'Resistencia Funcional',
      desc: 'Mejorar capacidad pulmonar, agilidad y vigor',
      icon: '⚡',
      specs: '3x20 repeticiones • 30s descanso',
    },
  ];

  const daysOptions = [
    { days: 2, label: '2 días / sem', split: 'Full Body A / B' },
    { days: 3, label: '3 días / sem', split: 'Push / Pull / Legs (Recomendado)' },
    { days: 4, label: '4 días / sem', split: 'Upper / Lower x2' },
    { days: 5, label: '5 días / sem', split: 'PPL + Upper / Lower' },
    { days: 6, label: '6 días / sem', split: 'PPL x2 (Intensivo)' },
  ];

  const durationOptions = [
    { minutes: 30, label: '30 min', sub: '3 ejercicios clave • Rápido' },
    { minutes: 45, label: '45 min', sub: '5 ejercicios • Balance ideal' },
    { minutes: 60, label: '60 min', sub: '6 ejercicios • Completo' },
    { minutes: 90, label: '90 min', sub: '6 ejercicios de alto volumen' },
  ];

  const equipmentOptions: { id: Equipment; title: string; desc: string; icon: string }[] = [
    {
      id: 'ninguno',
      title: 'Sin Equipamiento',
      desc: 'Calistenia pura, flexiones, sentadillas y peso corporal en casa.',
      icon: '🤸‍♂️',
    },
    {
      id: 'mancuernas',
      title: 'Mancuernas en Casa',
      desc: 'Juego de mancuernas ajustables o fijas y peso corporal.',
      icon: '🧱',
    },
    {
      id: 'gimnasio',
      title: 'Gimnasio Completo',
      desc: 'Acceso a barras, poleas, máquinas y mancuernas completas.',
      icon: '🏟️',
    },
  ];

  const handleFinish = async () => {
    setIsGenerating(true);
    await completeOnboarding(formData);
    createOrRegenerateRoutine();

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#9E5325', '#803C15', '#B46536', '#FAF7F2'],
      });
    } catch {
      // ignore
    }

    setTimeout(() => {
      setIsGenerating(false);
      navigate('/rutina');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Top Header & Progress Indicator */}
      <header className="pt-4 pb-2">
        <div className="flex items-center justify-between mb-4 border-b border-[#EAE3D9] pb-3">
          <BrandLogo size="sm" showSubtitle={false} />
          <div className="text-[10px] font-bold text-[#78716C] bg-white px-3 py-1 rounded-full border border-[#EAE3D9] font-heading uppercase tracking-widest">
            PASO {step} DE 4
          </div>
        </div>

        {/* 4 Steps progress bar */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13]' : 'bg-[#EAE3D9]'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Content Card */}
      <main className="my-auto py-4">
        {/* Step 1: Objetivo */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#9E5325] uppercase tracking-[0.2em] mb-1 font-heading">
                <Target className="w-3.5 h-3.5" />
                <span>Paso 1: Tu Meta Principal</span>
              </div>
              <h1 className="text-2xl font-black text-[#1C1917] tracking-tight font-heading uppercase">
                ¿Qué deseas lograr?
              </h1>
              <p className="text-xs text-[#78716C] mt-1">
                Ajustaremos series, repeticiones y descansos basados en evidencia científica.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {goalsList.map((g) => {
                const isSelected = formData.goal === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setFormData({ ...formData, goal: g.id })}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 min-h-[58px] active:scale-[0.99] flex items-center gap-3.5 ${
                      isSelected
                        ? 'bg-white border-[#9E5325] ring-2 ring-[#9E5325]/20 shadow-sm'
                        : 'bg-white/70 border-[#EAE3D9] hover:border-[#D8C5B3]'
                    }`}
                  >
                    <div className="text-2xl p-2 rounded-xl bg-[#FAF7F2] border border-[#EAE3D9]">
                      {g.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1C1917] text-base font-heading">{g.title}</span>
                        {isSelected && <Check className="w-5 h-5 text-[#9E5325] stroke-[3px]" />}
                      </div>
                      <p className="text-xs text-[#78716C] mt-0.5">{g.desc}</p>
                      <div className="text-[11px] font-mono font-bold text-[#9E5325] mt-1">
                        {g.specs}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Días por semana */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#9E5325] uppercase tracking-[0.2em] mb-1 font-heading">
                <Calendar className="w-3.5 h-3.5" />
                <span>Paso 2: Frecuencia</span>
              </div>
              <h1 className="text-2xl font-black text-[#1C1917] tracking-tight font-heading uppercase">
                ¿Cuántos días por semana?
              </h1>
              <p className="text-xs text-[#78716C] mt-1">
                Generaremos una división anatómica que no sobrecargue tus articulaciones.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {daysOptions.map((opt) => {
                const isSelected = formData.days_per_week === opt.days;
                return (
                  <button
                    key={opt.days}
                    onClick={() => setFormData({ ...formData, days_per_week: opt.days })}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 min-h-[54px] flex items-center justify-between active:scale-[0.99] ${
                      isSelected
                        ? 'bg-white border-[#9E5325] ring-2 ring-[#9E5325]/20 shadow-sm'
                        : 'bg-white/70 border-[#EAE3D9] hover:border-[#D8C5B3]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[#1C1917] text-base font-heading">
                        {opt.label}
                      </div>
                      <span className="text-xs text-[#9E5325] font-semibold block mt-0.5">
                        {opt.split}
                      </span>
                    </div>

                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                        isSelected
                          ? 'bg-[#9E5325] border-[#9E5325] text-white font-bold'
                          : 'border-[#D8C5B3] bg-[#FAF7F2]'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3px]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Duración por sesión */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#9E5325] uppercase tracking-[0.2em] mb-1 font-heading">
                <Clock className="w-3.5 h-3.5" />
                <span>Paso 3: Tiempo Disponible</span>
              </div>
              <h1 className="text-2xl font-black text-[#1C1917] tracking-tight font-heading uppercase">
                ¿Cuánto tiempo por sesión?
              </h1>
              <p className="text-xs text-[#78716C] mt-1">
                Calcularemos los ejercicios óptimos con base en tu disponibilidad.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {durationOptions.map((d) => {
                const isSelected = formData.session_duration === d.minutes;
                return (
                  <button
                    key={d.minutes}
                    onClick={() => setFormData({ ...formData, session_duration: d.minutes })}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 min-h-[96px] flex flex-col justify-between active:scale-95 ${
                      isSelected
                        ? 'bg-white border-[#9E5325] ring-2 ring-[#9E5325]/20 shadow-sm'
                        : 'bg-white/70 border-[#EAE3D9] hover:border-[#D8C5B3]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-[#1C1917] font-heading">{d.label}</span>
                      {isSelected && <Check className="w-5 h-5 text-[#9E5325] stroke-[3px]" />}
                    </div>
                    <span className="text-xs text-[#78716C] leading-tight font-medium">{d.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Equipamiento y Perfil */}
        {step === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#9E5325] uppercase tracking-[0.2em] mb-1 font-heading">
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Paso 4: Equipamiento</span>
              </div>
              <h1 className="text-2xl font-black text-[#1C1917] tracking-tight font-heading uppercase">
                ¿Dónde vas a entrenar?
              </h1>
              <p className="text-xs text-[#78716C] mt-1">
                Filtraremos únicamente los ejercicios ejecutables con tus materiales.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {equipmentOptions.map((eq) => {
                const isSelected = formData.equipment === eq.id;
                return (
                  <button
                    key={eq.id}
                    onClick={() => setFormData({ ...formData, equipment: eq.id })}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 min-h-[58px] flex items-center gap-3.5 active:scale-[0.99] ${
                      isSelected
                        ? 'bg-white border-[#9E5325] ring-2 ring-[#9E5325]/20 shadow-sm'
                        : 'bg-white/70 border-[#EAE3D9] hover:border-[#D8C5B3]'
                    }`}
                  >
                    <span className="text-2xl p-2 rounded-xl bg-[#FAF7F2] border border-[#EAE3D9]">
                      {eq.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1C1917] text-base font-heading">{eq.title}</span>
                        {isSelected && <Check className="w-5 h-5 text-[#9E5325] stroke-[3px]" />}
                      </div>
                      <p className="text-xs text-[#78716C] mt-0.5">{eq.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 bg-white p-4 rounded-2xl border border-[#EAE3D9] space-y-2">
              <label className="text-xs font-bold text-[#1C1917] block font-heading uppercase tracking-wide">
                Tu nombre o apodo deportivo
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Carlos o Laura"
                className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#9E5325] focus:bg-white"
              />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Buttons */}
      <footer className="pt-4 pb-2 border-t border-[#EAE3D9]">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              disabled={isGenerating}
              className="min-h-[48px] px-4 bg-white hover:bg-[#FAF7F2] active:scale-95 text-[#78716C] hover:text-[#1C1917] font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all border border-[#EAE3D9] font-heading text-xs uppercase"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 min-h-[48px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] active:scale-[0.98] text-white font-bold px-5 py-3 rounded-2xl shadow-md shadow-[#9E5325]/25 flex items-center justify-center gap-2 transition-all font-heading text-xs uppercase tracking-wider"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isGenerating}
              className="flex-1 min-h-[48px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] active:scale-[0.98] text-white font-black px-5 py-3 rounded-2xl shadow-md shadow-[#9E5325]/30 flex items-center justify-center gap-2 transition-all font-heading text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Generando tu plan en segundos...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  <span>Generar Mi Rutina Ahora</span>
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
