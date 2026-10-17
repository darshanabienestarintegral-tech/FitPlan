import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Flame, Dumbbell, Clock, Calendar, RefreshCw, ChevronRight, Award, TrendingUp, Users, Sparkles, LogOut, Check, ShieldCheck, Plus, StopCircle, FileDown, Layers, LayoutDashboard, Upload } from 'lucide-react';
import { useUserStore } from '../store/useUserStore';
import { useRoutineStore } from '../store/useRoutineStore';
import { RoutineDayCard } from '../components/RoutineDayCard';
import { StatCard } from '../components/StatCard';
import { BrandLogo } from '../components/BrandLogo';
import { AdminRoutineCreatorModal } from '../components/AdminRoutineCreatorModal';
import { ExportRoutinePdfModal } from '../components/ExportRoutinePdfModal';
import { RoutineCatalogModal } from '../components/RoutineCatalogModal';
import { UploadRoutinePdfModal } from '../components/UploadRoutinePdfModal';
import confetti from 'canvas-confetti';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const profile = useUserStore((s) => s.profile);
  const currentUser = useUserStore((s) => s.currentUser);
  const logout = useUserStore((s) => s.logout);
  const activeRoutine = useRoutineStore((s) => s.activeRoutine);
  const exercises = useRoutineStore((s) => s.exercises);
  const activeDayIndex = useRoutineStore((s) => s.activeDayIndex);
  const setActiveDayIndex = useRoutineStore((s) => s.setActiveDayIndex);
  const activeSession = useRoutineStore((s) => s.activeSession);
  const startSession = useRoutineStore((s) => s.startSession);
  const finishCurrentSession = useRoutineStore((s) => s.finishCurrentSession);
  const cancelSession = useRoutineStore((s) => s.cancelSession);
  const createOrRegenerateRoutine = useRoutineStore((s) => s.createOrRegenerateRoutine);
  const getStats = useRoutineStore((s) => s.getStats);
  const sessionLogs = useRoutineStore((s) => s.sessionLogs);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isUploadPdfModalOpen, setIsUploadPdfModalOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showFinishedAlert, setShowFinishedAlert] = useState(false);
  const stats = getStats();

  useEffect(() => {
    // If logged-in athlete has an assigned routine that isn't active, activate it
    if (currentUser && !currentUser.isAdmin) {
      const account = useUserStore.getState().registeredAccounts.find(
        (a) => a.username.toLowerCase() === currentUser.username.toLowerCase()
      );
      if (account?.assignedRoutineId && (!activeRoutine || activeRoutine.id !== account.assignedRoutineId)) {
        const assigned = useRoutineStore.getState().routines.find((r) => r.id === account.assignedRoutineId);
        if (assigned) {
          useRoutineStore.getState().setActiveRoutineById(account.assignedRoutineId);
          return;
        }
      }
    }

    // If no routine is active yet, generate initial routine based on profile
    if (!activeRoutine && profile) {
      createOrRegenerateRoutine();
    }
  }, [activeRoutine, profile, createOrRegenerateRoutine, currentUser]);

  const todayDay = activeRoutine?.days[activeDayIndex] || activeRoutine?.days[0];
  const isWorkoutActive = Boolean(activeSession.routineDayId);

  const handleStartTodayWorkout = () => {
    if (todayDay) {
      startSession(todayDay.id);
      navigate('/rutina');
    }
  };

  const handleFinishWorkoutFromHome = () => {
    finishCurrentSession();
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#9E5325', '#7B3A13', '#B46536'],
      });
    } catch {
      // ignore
    }
    setShowFinishedAlert(true);
    setTimeout(() => setShowFinishedAlert(false), 3000);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login', { replace: true });
  };

  const handleRegenerate = () => {
    createOrRegenerateRoutine();
    try {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.5 },
        colors: ['#9E5325', '#7B3A13'],
      });
    } catch {}
  };


  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24 text-[#1C1917]">
      {/* Top App Bar with Darshana Brand & Terminar Sesión button */}
      <header className="px-4 pt-4 pb-3 max-w-lg mx-auto border-b border-[#EAE3D9] bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center justify-between gap-2">
          <BrandLogo size="sm" showSubtitle={false} />

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Streak Pill */}
            <div className="flex items-center gap-1 bg-[#FAF7F2] border border-[#EAE3D9] px-2 py-1 rounded-full shadow-sm whitespace-nowrap shrink-0">
              <Flame className="w-3.5 h-3.5 text-[#9E5325] fill-[#9E5325] shrink-0" />
              <span className="font-extrabold text-[#9E5325] text-[11px] sm:text-xs font-heading">
                {stats.streakDays} {stats.streakDays === 1 ? 'DÍA' : 'DÍAS'}
              </span>
            </div>

            {/* Panel de Control Dashboard & Panel Admin buttons */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-[11px] sm:text-xs text-[#9E5325] hover:text-[#7B3A13] bg-[#FAF7F2] hover:bg-[#F2E7DC] px-2 sm:px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] transition-all font-heading font-bold uppercase tracking-wider whitespace-nowrap shrink-0 shadow-xs"
              title="Ir al panel de control con gráfico semanal"
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span>Panel</span>
            </button>

            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1 text-[11px] sm:text-xs text-[#9E5325] hover:text-[#7B3A13] bg-[#F8F2EC] hover:bg-[#F2E7DC] px-2 sm:px-2.5 py-1.5 rounded-xl border border-[#E7DFD5] transition-all font-heading font-bold uppercase tracking-wider whitespace-nowrap shrink-0"
              title="Ir al panel de administración"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Admin</span>
            </button>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-1 text-[11px] sm:text-xs text-[#78716C] hover:text-[#9E5325] bg-white hover:bg-[#FAF7F2] px-2 sm:px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] transition-all font-heading font-semibold uppercase tracking-wider whitespace-nowrap shrink-0"
              title="Terminar sesión de usuario"
            >
              <LogOut className="w-3.5 h-3.5 text-[#9E5325] shrink-0" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-5">
        {/* Active Workout In Progress Notification (Option to finish session directly from home) */}
        {isWorkoutActive && (
          <div className="bg-[#FAF7F2] border-2 border-[#9E5325] rounded-3xl p-4 shadow-md space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full border-2 border-[#9E5325] bg-white text-[#9E5325] flex items-center justify-center font-bold shrink-0">
                  <StopCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E5325] font-heading block truncate">
                    Entrenamiento en Curso
                  </span>
                  <h4 className="text-sm font-bold text-[#1C1917] font-heading truncate">
                    {todayDay?.name || 'Sesión activa'}
                  </h4>
                </div>
              </div>

              <button
                onClick={() => navigate('/rutina')}
                className="bg-white hover:bg-[#F8F2EC] text-[#9E5325] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#EAE3D9] font-heading uppercase whitespace-nowrap shrink-0"
              >
                Ver Rutina
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-[#EAE3D9]">
              <button
                onClick={handleFinishWorkoutFromHome}
                className="flex-1 bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-sm uppercase font-heading tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all whitespace-nowrap"
              >
                <Check className="w-4 h-4 stroke-[3px] shrink-0" />
                <span>Terminar Sesión</span>
              </button>

              <button
                onClick={() => cancelSession()}
                className="bg-white hover:bg-rose-50 text-[#78716C] hover:text-rose-700 text-xs font-bold px-3 py-2.5 rounded-xl border border-[#EAE3D9] transition-all whitespace-nowrap shrink-0"
                title="Descartar entrenamiento actual"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* Finished session alert banner */}
        {showFinishedAlert && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-3 flex items-center gap-2.5 text-xs font-bold animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="break-words">¡Entrenamiento completado y guardado con éxito! Tus estadísticas han sido actualizadas.</span>
          </div>
        )}

        {/* Admin Section: Panel de Gestión y Carga Manual */}
        <div className="bg-white p-4 rounded-3xl border border-[#EAE3D9] shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full border border-[#9E5325] bg-[#FAF7F2] text-[#9E5325] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-[#9E5325] font-bold uppercase tracking-wider font-heading block truncate">
                  Administración del Gimnasio / Entrenador
                </span>
                <h4 className="text-xs font-bold text-[#1C1917] font-heading uppercase truncate">
                  Gestión de Rutinas & Atletas
                </h4>
              </div>
            </div>

            <span className="text-[10px] bg-[#FAF7F2] text-[#78716C] font-semibold px-2 py-0.5 rounded-md border border-[#EAE3D9] whitespace-nowrap shrink-0">
              Admin
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => navigate('/admin')}
              className="bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#9E5325] border border-[#EAE3D9] font-bold text-xs uppercase tracking-wider font-heading py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Panel Completo</span>
            </button>

            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white font-bold text-xs uppercase tracking-wider font-heading py-2.5 px-3 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Crear Rutina Manual</span>
            </button>
          </div>
        </div>

        {/* HERO CARD: Styled after Darshana Poster */}
        {todayDay ? (
          <section
            aria-label="Entrenamiento Principal de Hoy"
            className="relative overflow-hidden bg-white border border-[#EAE3D9] rounded-3xl p-4 sm:p-6 shadow-sm"
          >
            {/* Top Tagline */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#9E5325] font-heading truncate">
                CIENCIA • PRÁCTICA • PERSONAS REALES
              </span>
              <span className="text-[10px] text-[#78716C] font-mono font-medium shrink-0 whitespace-nowrap">
                {activeRoutine?.days_per_week} DÍAS / SEM
              </span>
            </div>

            {/* Routine Name & Origin Badge */}
            {activeRoutine && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#9E5325] to-[#7B3A13] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                  <Dumbbell className="w-3 h-3" />
                  <span>Rutina: {activeRoutine.name}</span>
                </span>
                {(activeRoutine.id.includes('cristian') || activeRoutine.name.toLowerCase().includes('cristian')) && (
                  <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full uppercase">
                    👤 Cristian Aguilera
                  </span>
                )}
                <span className="text-[10px] text-[#78716C] bg-[#FAF7F2] font-semibold px-2 py-0.5 rounded-full border border-[#EAE3D9] uppercase">
                  {activeRoutine.goal} • {activeRoutine.difficulty || activeRoutine.level}
                </span>
              </div>
            )}

            {/* Poster Typography Title */}
            <div className="mb-4">
              <span className="text-[11px] sm:text-xs font-bold tracking-wider text-[#78716C] uppercase font-heading block truncate">
                SESIÓN DE ENTRENAMIENTO
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#1C1917] tracking-tight uppercase font-heading leading-tight break-words">
                {todayDay.name}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-[#9E5325] mt-0.5 break-words">
                {todayDay.focus}
              </p>
            </div>

            {/* 3 Circular Badge Pillars (Direct inspiration from sample poster) */}
            <div className="space-y-2.5 my-4 sm:my-5 bg-[#FAF7F2] p-3.5 sm:p-4 rounded-2xl border border-[#EAE3D9]">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-[1.5px] border-[#9E5325] bg-white text-[#9E5325] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2px]" />
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-[#1C1917] uppercase tracking-normal sm:tracking-wider font-heading break-words leading-tight flex-1 min-w-0">
                  Planificación Basada en Evidencia
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-[1.5px] border-[#9E5325] bg-white text-[#9E5325] flex items-center justify-center shrink-0">
                  <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2px]" />
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-[#1C1917] uppercase tracking-normal sm:tracking-wider font-heading break-words leading-tight flex-1 min-w-0">
                  {todayDay.exercise_ids.length} Ejercicios (Con 3 Alternativas c/u)
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-[1.5px] border-[#9E5325] bg-white text-[#9E5325] flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2px]" />
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-[#1C1917] uppercase tracking-normal sm:tracking-wider font-heading break-words leading-tight flex-1 min-w-0">
                  Duración Óptima: ~{activeRoutine?.session_duration || profile?.session_duration || 45} Minutos
                </div>
              </div>
            </div>

            {/* Motivational Tagline from poster style */}
            <div className="mb-4">
              <div className="text-xs sm:text-sm font-black tracking-tight text-[#1C1917] uppercase font-heading break-words">
                CONVIERTE <span className="text-[#9E5325]">TU PASIÓN</span> EN <span className="text-[#9E5325]">TU DISCIPLINA</span>
              </div>
            </div>

            {/* Darshana Copper Gradient Pill Button */}
            <button
              onClick={handleStartTodayWorkout}
              className="w-full min-h-[48px] sm:min-h-[52px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider sm:tracking-[0.15em] font-heading px-4 sm:px-6 py-3 rounded-2xl shadow-md shadow-[#9E5325]/25 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>EMPEZAR A ENTRENAR AHORA</span>
            </button>

            {/* Handwritten Community Motto */}
            <div className="mt-3.5 pt-3 border-t border-[#EAE3D9] flex flex-wrap items-center justify-between gap-1 text-xs">
              <span className="font-script text-lg sm:text-xl text-[#9E5325] font-bold">
                Más que una rutina, una comunidad.
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#78716C] uppercase tracking-widest font-heading font-semibold shrink-0">
                DARSHANA
              </span>
            </div>
          </section>
        ) : (
          <div className="bg-white rounded-2xl p-6 text-center border border-[#EAE3D9] shadow-sm">
            <p className="text-[#78716C] mb-3">No tienes una rutina activa todavía.</p>
            <button
              onClick={() => navigate('/onboarding')}
              className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white font-bold px-5 py-2.5 rounded-xl min-h-[48px] uppercase tracking-wider font-heading text-xs"
            >
              Crear Rutina en 60 Segundos
            </button>
          </div>
        )}

        {/* Quick Stats Grid */}
        <section aria-label="Tus Estadísticas Clave">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#1C1917] tracking-tight flex items-center gap-2 font-heading uppercase text-xs">
              <Award className="w-4 h-4 text-[#9E5325]" />
              <span>Progreso del Atleta</span>
            </h3>
            <button
              onClick={() => navigate('/progreso')}
              className="text-xs text-[#9E5325] font-bold flex items-center gap-0.5 hover:underline font-heading uppercase tracking-wide"
            >
              Ver más <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <StatCard
              label="Racha"
              value={`${stats.streakDays}d`}
              subtext="en serie"
              icon={Flame}
            />
            <StatCard
              label="Sesiones"
              value={stats.totalSessions}
              subtext="completadas"
              icon={Dumbbell}
            />
            <StatCard
              label="Tiempo"
              value={`${stats.totalMinutes}m`}
              subtext="de esfuerzo"
              icon={Clock}
            />
          </div>
        </section>

        {/* Panel de Control Dashboard Shortcut Card */}
        <section aria-label="Acceso al Panel de Control">
          <div className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white p-4 sm:p-4.5 rounded-3xl shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-wider font-heading text-white/80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                Métricas & Seguimiento Semanal
              </span>
              <h3 className="text-sm sm:text-base font-black font-heading uppercase tracking-tight truncate mt-0.5">
                Panel de Control con Recharts
              </h3>
              <p className="text-[11px] text-white/80 mt-0.5 truncate">
                Visualiza el gráfico de sesiones y minutos completados durante la semana
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="min-h-[42px] px-3.5 sm:px-4 py-2 bg-white text-[#9E5325] hover:bg-[#FAF7F2] font-black text-xs uppercase font-heading rounded-2xl shadow-md shrink-0 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Ver Panel</span>
            </button>
          </div>
        </section>

        {/* Weekly Split Days Explorer */}
        {activeRoutine && (
          <section aria-label="Distribución Semanal">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm font-bold text-[#1C1917] tracking-tight flex items-center gap-1.5 font-heading uppercase">
                  <Calendar className="w-4 h-4 text-[#9E5325] shrink-0" />
                  <span>Plan Semanal</span>
                </h3>
                <h4 className="text-xs sm:text-sm font-black text-[#9E5325] font-heading uppercase tracking-tight mt-0.5 break-words">
                  {activeRoutine.name}
                </h4>
                <p className="text-[11px] text-[#78716C] mt-0.5">
                  Objetivo: <span className="font-semibold text-[#44403C] capitalize">{activeRoutine.goal}</span> •{' '}
                  {activeRoutine.days.length} sesiones por semana • ~{activeRoutine.session_duration || 60}m/sesión
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto flex-wrap">
                <button
                  onClick={() => setIsCatalogModalOpen(true)}
                  className="text-[11px] sm:text-xs text-white bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] px-2.5 py-1.5 rounded-xl flex items-center gap-1 font-heading font-semibold uppercase whitespace-nowrap shrink-0 shadow-sm transition-all"
                  title="Explorar el catálogo de 9 rutinas (Principiante, Intermedio, Avanzado)"
                >
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span>Rutinas</span>
                </button>

                <button
                  onClick={() => setIsPdfModalOpen(true)}
                  className="text-[11px] sm:text-xs text-[#9E5325] hover:text-[#7B3A13] bg-[#FAF7F2] hover:bg-[#F2E7DC] px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] flex items-center gap-1 font-heading font-semibold uppercase whitespace-nowrap shrink-0 transition-colors"
                  title="Exportar rutina a PDF para llevar al gimnasio"
                >
                  <FileDown className="w-3.5 h-3.5 shrink-0" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={() => setIsUploadPdfModalOpen(true)}
                  className="text-[11px] sm:text-xs text-[#9E5325] hover:text-[#7B3A13] bg-[#FAF7F2] hover:bg-[#F2E7DC] px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] flex items-center gap-1 font-heading font-semibold uppercase whitespace-nowrap shrink-0 transition-colors"
                  title="Cargar rutina del alumno desde archivo PDF"
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span>Subir PDF</span>
                </button>

                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="text-[11px] sm:text-xs text-[#9E5325] hover:text-[#7B3A13] bg-[#FAF7F2] hover:bg-[#F2E7DC] px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] flex items-center gap-1 font-heading font-semibold uppercase whitespace-nowrap shrink-0 transition-colors"
                  title="Formulario intuitivo para definir una rutina con ejercicios, series, reps y descansos"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Definir</span>
                </button>

                <button
                  onClick={handleRegenerate}
                  className="text-[11px] sm:text-xs text-[#78716C] hover:text-[#9E5325] bg-white px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] flex items-center gap-1.5 transition-colors min-h-[34px] font-heading font-semibold whitespace-nowrap shrink-0"
                  title="Regenerar con nuevos ejercicios"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>Regenerar</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {activeRoutine.days.map((day, idx) => {
                const isSelected = activeDayIndex === idx;
                const wasCompleted = sessionLogs.some(
                  (log) => log.routine_day_id === day.id
                );

                return (
                  <RoutineDayCard
                    key={day.id}
                    day={day}
                    exercises={exercises}
                    isActive={isSelected}
                    isToday={idx === 0}
                    hasCompletedRecently={wasCompleted}
                    onStartSession={() => {
                      setActiveDayIndex(idx);
                      startSession(day.id);
                      navigate('/rutina');
                    }}
                    onViewDetails={() => {
                      setActiveDayIndex(idx);
                      navigate('/rutina');
                    }}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>


      {/* Custom Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#9E5325] bg-[#F8F2EC] text-[#9E5325] flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-[#1C1917] font-heading uppercase">
                ¿Cerrar Sesión?
              </h3>
              <p className="text-xs text-[#78716C]">
                Podrás volver a ingresar en cualquier momento con tu usuario y contraseña.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 min-h-[44px] bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] font-bold text-xs uppercase tracking-wider font-heading rounded-xl border border-[#EAE3D9] transition-all"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 min-h-[44px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white font-bold text-xs uppercase tracking-wider font-heading rounded-xl shadow-md transition-all"
              >
                Cerrar Sesión
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
        onOpenCreator={() => setIsAdminModalOpen(true)}
      />

      {/* Routine Definition Form Modal */}
      <AdminRoutineCreatorModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Upload Routine PDF Modal */}
      <UploadRoutinePdfModal
        isOpen={isUploadPdfModalOpen}
        onClose={() => setIsUploadPdfModalOpen(false)}
      />
    </div>
  );
};
