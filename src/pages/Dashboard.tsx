import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Flame,
  Clock,
  Dumbbell,
  Play,
  TrendingUp,
  Award,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  FileDown,
  Layers,
  ChevronRight,
  ShieldCheck,
  User,
  Zap,
  Upload,
  Check,
  Edit3,
  Lock,
  LogOut,
  BarChart3,
  ListOrdered,
} from 'lucide-react';
import { useRoutineStore } from '../store/useRoutineStore';
import { useUserStore } from '../store/useUserStore';
import { WeeklySessionsChart } from '../components/WeeklySessionsChart';
import { UploadRoutinePdfModal } from '../components/UploadRoutinePdfModal';
import { ExportRoutinePdfModal } from '../components/ExportRoutinePdfModal';
import { RoutineDefinitionModal } from '../components/RoutineDefinitionModal';
import { Routine, SessionLog } from '../types';
import confetti from 'canvas-confetti';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const profile = useUserStore((s) => s.profile);
  const currentUser = useUserStore((s) => s.currentUser);
  const logout = useUserStore((s) => s.logout);

  const activeRoutine = useRoutineStore((s) => s.activeRoutine);
  const activeDayIndex = useRoutineStore((s) => s.activeDayIndex);
  const routines = useRoutineStore((s) => s.routines);
  const sessionLogs = useRoutineStore((s) => s.sessionLogs);
  const exercises = useRoutineStore((s) => s.exercises);
  const startSession = useRoutineStore((s) => s.startSession);
  const openLiveWorkout = useRoutineStore((s) => s.openLiveWorkout);
  const setActiveRoutineById = useRoutineStore((s) => s.setActiveRoutineById);
  const deleteSessionLog = useRoutineStore((s) => s.deleteSessionLog);
  const addSessionLogDirectly = useRoutineStore((s) => s.addSessionLogDirectly);
  const getStats = useRoutineStore((s) => s.getStats);

  const isAdmin = Boolean(currentUser?.isAdmin || currentUser?.role === 'admin');
  const userRole = currentUser?.role || (isAdmin ? 'admin' : 'usuario');

  // Modals state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isPdfUploadOpen, setIsPdfUploadOpen] = useState(false);
  const [pdfToExport, setPdfToExport] = useState<Routine | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  // Manual Session Form state
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualDuration, setManualDuration] = useState(45);
  const [manualDayId, setManualDayId] = useState(activeRoutine?.days[0]?.id || '');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSuccessAlert, setManualSuccessAlert] = useState('');

  // Routine Filter state for Dashboard
  const [routineTab, setRoutineTab] = useState<'all' | 'assigned' | 'general'>('all');
  const registeredAccounts = useUserStore((s) => s.registeredAccounts);

  // Filter routines by current user role and preferences
  const userFilteredRoutines = useMemo(() => {
    const currentUsername = currentUser?.username?.toLowerCase() || '';
    const currentUid = currentUser?.uid || '';
    const myAccount = registeredAccounts.find(
      (a) => a.username.toLowerCase() === currentUsername
    );
    const assignedRoutineId = myAccount?.assignedRoutineId;

    return routines.filter((r) => {
      const isPersonal =
        !r.is_default ||
        r.id.includes('cristian') ||
        r.id.includes('carlos') ||
        r.id.includes('valeria') ||
        r.id.includes('custom') ||
        r.id.includes('pdf') ||
        r.name.toLowerCase().includes('cristian') ||
        r.name.toLowerCase().includes('carlos') ||
        r.name.toLowerCase().includes('valeria') ||
        r.user_id !== 'admin';

      const isDirectlyAssignedOrActive =
        r.id === assignedRoutineId ||
        r.id === activeRoutine?.id ||
        (currentUsername && r.user_id?.toLowerCase() === currentUsername) ||
        (currentUsername && r.created_by?.toLowerCase() === currentUsername) ||
        (currentUid && r.user_id === currentUid);

      if (routineTab === 'assigned') {
        // Show assigned, active, and custom/athlete routines so users can use them
        return Boolean(isDirectlyAssignedOrActive);
      }
      if (routineTab === 'general') {
        return r.is_default && !isPersonal;
      }
      // 'all' shows all routines
      return true;
    }).sort((a, b) => {
      // Prioritize active routine first, then Cristian Aguilera
      if (a.id === activeRoutine?.id) return -1;
      if (b.id === activeRoutine?.id) return 1;
      const aIsCristian = a.id.includes('cristian') || a.name.toLowerCase().includes('cristian');
      const bIsCristian = b.id.includes('cristian') || b.name.toLowerCase().includes('cristian');
      if (aIsCristian && !bIsCristian) return -1;
      if (!aIsCristian && bIsCristian) return 1;
      return 0;
    });
  }, [routines, currentUser, isAdmin, routineTab, registeredAccounts, activeRoutine]);

  // Each account sees its own workout history, including on shared browsers.
  const userSessionLogs = useMemo(() => sessionLogs.filter(
    (log) => log.user_id === (currentUser?.uid || profile?.id)
  ), [sessionLogs, currentUser?.uid, profile?.id]);

  const stats = getStats();
  const currentRoutineDay = activeRoutine?.days[activeDayIndex] || activeRoutine?.days[0];

  const handleStartTodayWorkout = () => {
    if (!currentRoutineDay) {
      navigate('/rutina');
      return;
    }
    startSession(currentRoutineDay.id);
    openLiveWorkout();
    navigate('/rutina');
  };

  const handleActivateRoutine = (routineId: string) => {
    setActiveRoutineById(routineId);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#9E5325', '#7B3A13', '#22C55E'],
      });
    } catch {
      // ignore
    }
  };

  const handleSaveManualSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoutine) return;

    const chosenDay =
      activeRoutine.days.find((d) => d.id === manualDayId) || currentRoutineDay || activeRoutine.days[0];

    const newLog: SessionLog = {
      id: `manual-log-${Date.now()}`,
      user_id: currentUser?.uid || profile?.id || currentUser?.username || 'usuario',
      routine_day_id: chosenDay?.id || 'manual-day',
      routine_day_name: chosenDay?.name || 'Entrenamiento Registrado',
      date: new Date(manualDate + 'T12:00:00').toISOString(),
      duration_min: Number(manualDuration) || 45,
      completed_exercises: chosenDay?.exercise_ids || [],
      notes: manualNotes.trim() || 'Sesión registrada manualmente desde el Panel de Control',
    };

    addSessionLogDirectly(newLog);

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#9E5325', '#7B3A13', '#22C55E'],
      });
    } catch {
      // ignore
    }

    setManualSuccessAlert('¡Sesión guardada! El gráfico de progreso se ha actualizado.');
    setTimeout(() => {
      setManualSuccessAlert('');
      setIsManualModalOpen(false);
    }, 1200);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4 text-center">
        <div className="bg-white p-6 rounded-3xl border border-[#EAE3D9] max-w-sm w-full space-y-3 shadow-sm">
          <ShieldCheck className="w-10 h-10 text-[#9E5325] mx-auto" />
          <h2 className="text-base font-black font-heading uppercase text-[#1C1917]">
            Sesión no iniciada
          </h2>
          <p className="text-xs text-[#78716C]">
            Para acceder al panel de rutinas y progreso, ingresa con tu usuario o regístrate.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-[#9E5325] hover:bg-[#7B3A13] text-white text-xs font-bold py-2.5 rounded-xl uppercase font-heading transition-colors"
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-28 text-[#1C1917]">
      {/* Top Header with User and Role Information */}
      <header className="px-4 pt-6 pb-4 max-w-4xl mx-auto border-b border-[#EAE3D9]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9E5325] font-heading">
                DARSHANA FITNESS • DASHBOARD PRINCIPAL
              </span>

              {/* Role Badge */}
              {isAdmin ? (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full font-heading uppercase flex items-center gap-1 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Rol: Administrador (Gestión de Archivos)</span>
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full font-heading uppercase flex items-center gap-1 shadow-xs">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Rol: Usuario (Visualización y Entrenamiento)</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight font-heading uppercase flex items-center gap-2 mt-1">
              <LayoutDashboard className="w-6 h-6 text-[#9E5325]" />
              <span>Panel de Rutinas y Progreso</span>
            </h1>

            <p className="text-xs text-[#78716C] mt-0.5">
              Conectado como <strong className="text-[#1C1917]">{currentUser?.username || profile?.name || 'Atleta'}</strong>
              {currentUser?.email ? ` (${currentUser.email})` : ''}
            </p>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {isAdmin && (
              <button
                onClick={() => setIsPdfUploadOpen(true)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#9E5325]/30 bg-white hover:bg-[#FAF7F2] text-[#9E5325] text-xs font-bold font-heading uppercase tracking-wide flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                title="Cargar archivo PDF con rutina de alumno"
              >
                <Upload className="w-4 h-4 text-[#9E5325]" />
                <span>Subir PDF</span>
              </button>
            )}

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white text-xs font-bold font-heading uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>+ Registrar Sesión</span>
            </button>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#EAE3D9] bg-white hover:bg-rose-50 text-[#78716C] hover:text-rose-700 text-xs font-bold font-heading uppercase flex items-center gap-1 transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-7">
        {/* ======================================================== */}
        {/* SECTION 1: RUTINAS DISPONIBLES FILTRADAS POR EL USUARIO */}
        {/* ======================================================== */}
        <section aria-label="Rutinas Disponibles">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-[#1C1917] font-heading uppercase tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#9E5325]" />
                  <span>Rutinas Disponibles ({userFilteredRoutines.length})</span>
                </h2>
                <span className="text-[10px] bg-[#FAF7F2] text-[#9E5325] font-bold px-2 py-0.5 rounded-full border border-[#EAE3D9] uppercase font-heading">
                  Filtradas para {currentUser?.username || 'tu usuario'}
                </span>
              </div>
              <p className="text-xs text-[#78716C] mt-0.5">
                {isAdmin
                  ? 'Vista de Administrador: Gestión de archivos, edición y asignación a alumnos'
                  : 'Planes asignados a tu perfil y rutinas del gimnasio listas para entrenar'}
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto scrollbar-none">
              <button
                onClick={() => setRoutineTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-heading uppercase tracking-wider transition-all whitespace-nowrap ${
                  routineTab === 'all'
                    ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-xs'
                    : 'bg-white text-[#78716C] border border-[#EAE3D9]'
                }`}
              >
                Todas ({isAdmin ? routines.length : userFilteredRoutines.length})
              </button>
              <button
                onClick={() => setRoutineTab('assigned')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-heading uppercase tracking-wider transition-all whitespace-nowrap ${
                  routineTab === 'assigned'
                    ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-xs'
                    : 'bg-white text-[#78716C] border border-[#EAE3D9]'
                }`}
              >
                {isAdmin ? 'De Alumnos' : 'Mis Asignadas'}
              </button>
              <button
                onClick={() => setRoutineTab('general')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-heading uppercase tracking-wider transition-all whitespace-nowrap ${
                  routineTab === 'general'
                    ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-xs'
                    : 'bg-white text-[#78716C] border border-[#EAE3D9]'
                }`}
              >
                Generales
              </button>
            </div>
          </div>

          {/* Highlight Banner for Currently Active Routine */}
          {activeRoutine && (
            <div className="mb-4 bg-gradient-to-r from-[#1C1917] via-stone-900 to-[#2A2421] text-white p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3px]" />
                    <span>Rutina Activa en tu Perfil</span>
                  </span>
                  {(activeRoutine.id.includes('cristian') || activeRoutine.name.toLowerCase().includes('cristian')) && (
                    <span className="text-[10px] bg-[#9E5325] text-white px-2.5 py-0.5 rounded-full font-bold uppercase">
                      👤 Alumno: Cristian Aguilera
                    </span>
                  )}
                  <span className="text-[10px] text-stone-300 uppercase font-mono">
                    {activeRoutine.goal} • {activeRoutine.days_per_week} días • ~{activeRoutine.session_duration || 60}m
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black font-heading uppercase text-white truncate">
                  {activeRoutine.name}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5 truncate">
                  Sesión lista: <strong className="text-stone-200">{currentRoutineDay?.name || activeRoutine.days[0]?.name}</strong>
                </p>
              </div>

              <button
                onClick={handleStartTodayWorkout}
                className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white px-4 py-2.5 rounded-2xl text-xs font-bold font-heading uppercase flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Entrenar Hoy</span>
              </button>
            </div>
          )}

          {/* Routine Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {userFilteredRoutines.map((routine) => {
              const isActive = activeRoutine?.id === routine.id;
              const isCristian =
                routine.id.includes('cristian') || routine.name.toLowerCase().includes('cristian');
              const totalExercises = routine.days.reduce(
                (acc, day) => acc + (day.exercise_configs?.length || day.exercise_ids?.length || 0),
                0
              );

              return (
                <div
                  key={routine.id}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between shadow-xs ${
                    isActive ? 'border-[#9E5325] ring-2 ring-[#9E5325]/15 shadow-sm' : 'border-[#EAE3D9]'
                  }`}
                >
                  <div>
                    {/* Top Chips */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCristian && (
                          <span className="text-[10px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white font-black px-2 py-0.5 rounded-full shadow-xs uppercase">
                            👤 Alumno: Cristian Aguilera
                          </span>
                        )}
                        <span className="text-[10px] bg-[#FAF7F2] text-[#78716C] border border-[#EAE3D9] px-2 py-0.5 rounded-full font-bold uppercase">
                          {routine.goal}
                        </span>
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold uppercase">
                          {routine.difficulty || routine.level}
                        </span>
                      </div>

                      {isActive && (
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Activa</span>
                        </span>
                      )}
                    </div>

                    {/* Routine Name */}
                    <h3 className="text-sm sm:text-base font-black text-[#1C1917] font-heading uppercase tracking-tight">
                      {routine.name}
                    </h3>

                    {/* Details */}
                    <div className="flex items-center gap-3 text-xs text-[#78716C] mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#9E5325]" />
                        <strong>{routine.days_per_week}</strong> días/sem
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#9E5325]" />
                        ~<strong>{routine.session_duration || 60}</strong> min
                      </span>
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5 text-[#9E5325]" />
                        <strong>{totalExercises}</strong> ejercicios
                      </span>
                    </div>

                    {/* Days Pill List */}
                    <div className="mt-3 space-y-1 pt-2.5 border-t border-[#EAE3D9]/60">
                      {routine.days.map((day, dIdx) => (
                        <div
                          key={dIdx}
                          className="text-[11px] text-[#78716C] flex items-center justify-between py-0.5"
                        >
                          <span className="font-semibold truncate">
                            {dIdx + 1}. {day.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#A8A29E] shrink-0 ml-1">
                            {day.exercise_configs?.length || day.exercise_ids?.length || 0} ex
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-[#EAE3D9] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPdfToExport(routine)}
                        className="p-2 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] hover:text-[#9E5325] transition-colors"
                        title="Ver y exportar PDF imprimible"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => setEditingRoutine(routine)}
                          className="px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#9E5325] text-xs font-bold uppercase font-heading flex items-center gap-1 transition-colors"
                          title="Editar rutina (Acceso Administrador)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isActive ? (
                        <button
                          onClick={() => handleActivateRoutine(routine.id)}
                          className="bg-white hover:bg-[#FAF7F2] text-[#9E5325] border border-[#EAE3D9] px-3 py-1.5 rounded-xl text-xs font-bold font-heading uppercase flex items-center gap-1 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Activar</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                          Seleccionada
                        </span>
                      )}

                      <button
                        onClick={() => {
                          if (!isActive) handleActivateRoutine(routine.id);
                          navigate('/rutina');
                        }}
                        className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold font-heading uppercase flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Entrenar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 2: PROGRESO DE LAS SESIONES REALIZADAS          */}
        {/* ======================================================== */}
        <section aria-label="Progreso y Seguimiento de Sesiones" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#1C1917] font-heading uppercase tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#9E5325]" />
                <span>Progreso de Sesiones Realizadas</span>
              </h2>
              <p className="text-xs text-[#78716C] mt-0.5">
                Métricas semanales y registro de constancia en el entrenamiento
              </p>
            </div>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="self-start sm:self-auto bg-white border border-[#EAE3D9] hover:bg-[#FAF7F2] text-[#9E5325] text-xs font-bold px-3 py-1.5 rounded-xl uppercase font-heading flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Añadir Sesión</span>
            </button>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3D9] shadow-xs">
              <span className="text-[10px] font-bold text-[#78716C] uppercase font-heading block">
                Sesiones Hechas
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-[#1C1917] font-heading">
                  {userSessionLogs.length}
                </span>
                <span className="text-xs text-[#78716C]">totales</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3D9] shadow-xs">
              <span className="text-[10px] font-bold text-[#78716C] uppercase font-heading block">
                Tiempo Total
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-[#9E5325] font-heading">
                  {userSessionLogs.reduce((acc, log) => acc + (log.duration_min || 0), 0)}
                </span>
                <span className="text-xs text-[#78716C]">minutos</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3D9] shadow-xs">
              <span className="text-[10px] font-bold text-[#78716C] uppercase font-heading block">
                Meta Semanal
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-[#1C1917] font-heading">
                  {profile?.days_per_week || 3}
                </span>
                <span className="text-xs text-[#78716C]">días / sem</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3D9] shadow-xs">
              <span className="text-[10px] font-bold text-[#78716C] uppercase font-heading block">
                Consistencia
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-emerald-700 font-heading">
                  {stats.weeklyAdherence}%
                </span>
                <span className="text-xs text-emerald-600">constancia</span>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Weekly Chart */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE3D9] shadow-xs">
            <WeeklySessionsChart
              sessionLogs={userSessionLogs}
              weeklyTargetDays={profile?.days_per_week || 3}
              activeRoutine={activeRoutine}
              onQuickLogSession={() => setIsManualModalOpen(true)}
            />
          </div>

          {/* Recent Training Sessions History */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE3D9] shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-xs sm:text-sm font-black text-[#1C1917] font-heading uppercase tracking-wide flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-[#9E5325]" />
                <span>Historial de Sesiones Registradas ({userSessionLogs.length})</span>
              </h3>
            </div>

            {userSessionLogs.length === 0 ? (
              <div className="text-center py-8 px-4 bg-[#FAF7F2] rounded-2xl border border-[#EAE3D9]">
                <Dumbbell className="w-8 h-8 text-[#A8A29E] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-[#1C1917] uppercase font-heading">
                  Aún no has registrado sesiones
                </p>
                <p className="text-[11px] text-[#78716C] mt-0.5">
                  Inicia un entrenamiento con el temporizador o añade una sesión manual para ver tu evolución.
                </p>
                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="mt-3 bg-[#9E5325] text-white text-xs font-bold px-3 py-1.5 rounded-xl uppercase font-heading"
                >
                  Registrar Primera Sesión
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {userSessionLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-[#FAF7F2] hover:bg-[#F8F2EC] rounded-2xl border border-[#EAE3D9] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#1C1917] font-heading uppercase">
                          {log.routine_day_name}
                        </span>
                        <span className="text-[10px] bg-white border border-[#EAE3D9] px-2 py-0.5 rounded-md font-bold text-[#9E5325]">
                          {log.duration_min} minutos
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78716C] mt-0.5">
                        {formatDate(log.date)} • {log.completed_exercises?.length || 0} ejercicios completados
                      </p>
                      {log.notes && (
                        <p className="text-[11px] text-[#1C1917] mt-1 bg-white/70 p-1.5 rounded-lg border border-[#EAE3D9]/60 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => deleteSessionLog(log.id)}
                      className="p-1.5 text-[#A8A29E] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors self-end sm:self-center shrink-0"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Manual Session Registration Modal */}
      {isManualModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white border border-[#EAE3D9] rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D9]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#EAE3D9] text-[#9E5325] flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[3px]" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#1C1917] font-heading uppercase">
                    Registrar Sesión Manual
                  </h3>
                  <p className="text-[10px] text-[#78716C]">Añade tu entrenamiento al progreso</p>
                </div>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-[#FAF7F2] text-[#78716C] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {manualSuccessAlert && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-scaleUp">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{manualSuccessAlert}</span>
              </div>
            )}

            <form onSubmit={handleSaveManualSession} className="space-y-3.5 mt-3 text-xs">
              <div>
                <label className="font-bold text-[#1C1917] block mb-1 uppercase font-heading text-[10px]">
                  Fecha del Entrenamiento
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl p-2.5 text-xs text-[#1C1917]"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1917] block mb-1 uppercase font-heading text-[10px]">
                  Día o Tipo de Rutina
                </label>
                <select
                  value={manualDayId}
                  onChange={(e) => setManualDayId(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl p-2.5 text-xs text-[#1C1917] font-medium"
                >
                  {activeRoutine?.days.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                  <option value="extra-cardio">Sesión Extra • Cardio / HIIT</option>
                  <option value="extra-fuerza">Sesión Extra • Fuerza General</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1C1917] block mb-1 uppercase font-heading text-[10px]">
                  Duración en Minutos
                </label>
                <div className="flex items-center gap-1.5">
                  {[30, 45, 60, 75, 90].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setManualDuration(min)}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-xs uppercase font-heading transition-all ${
                        manualDuration === min
                          ? 'bg-[#9E5325] text-white shadow-xs'
                          : 'bg-[#FAF7F2] text-[#78716C] border border-[#EAE3D9]'
                      }`}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1C1917] block mb-1 uppercase font-heading text-[10px]">
                  Notas / Sensaciones (Opcional)
                </label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ej. Buena progresión en cargas..."
                  rows={2}
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl p-2 text-xs text-[#1C1917]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#EAE3D9]">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 min-h-[40px] bg-[#FAF7F2] text-[#78716C] rounded-xl border border-[#EAE3D9] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[40px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white font-bold font-heading uppercase text-xs rounded-xl shadow-md"
                >
                  Guardar Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Routine PDF Modal (Admin Access) */}
      <UploadRoutinePdfModal
        isOpen={isPdfUploadOpen}
        onClose={() => setIsPdfUploadOpen(false)}
      />

      {/* Export Routine PDF Modal */}
      {pdfToExport && (
        <ExportRoutinePdfModal
          isOpen={Boolean(pdfToExport)}
          onClose={() => setPdfToExport(null)}
          routine={pdfToExport}
          exercises={exercises}
          athleteName={currentUser?.username || profile?.name}
        />
      )}

      {/* Routine Definition Modal (Admin editing) */}
      {editingRoutine && (
        <RoutineDefinitionModal
          isOpen={Boolean(editingRoutine)}
          onClose={() => setEditingRoutine(null)}
          initialRoutine={editingRoutine}
        />
      )}
    </div>
  );
};
