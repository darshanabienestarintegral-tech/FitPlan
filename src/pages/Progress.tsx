import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Dumbbell, Clock, TrendingUp, Calendar, Trash2, Award, Settings, Database, RefreshCw, LogOut, KeyRound, LayoutDashboard } from 'lucide-react';
import { useRoutineStore } from '../store/useRoutineStore';
import { useUserStore } from '../store/useUserStore';
import { StatCard } from '../components/StatCard';
import { WeeklySessionsChart } from '../components/WeeklySessionsChart';
import { isSupabaseConfigured } from '../lib/supabase';

export const Progress: React.FC = () => {
  const navigate = useNavigate();
  const profile = useUserStore((s) => s.profile);
  const currentUser = useUserStore((s) => s.currentUser);
  const logout = useUserStore((s) => s.logout);
  const resetUser = useUserStore((s) => s.resetUser);
  const sessionLogs = useRoutineStore((s) => s.sessionLogs);
  const deleteSessionLog = useRoutineStore((s) => s.deleteSessionLog);
  const activeRoutine = useRoutineStore((s) => s.activeRoutine);
  const seedSampleWeeklyLogs = useRoutineStore((s) => s.seedSampleWeeklyLogs);
  const getStats = useRoutineStore((s) => s.getStats);
  const exercises = useRoutineStore((s) => s.exercises);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(localStorage.getItem('fitplan_supabase_url') || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(localStorage.getItem('fitplan_supabase_anon_key') || '');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const stats = getStats();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrlInput.trim() && supabaseKeyInput.trim()) {
      localStorage.setItem('fitplan_supabase_url', supabaseUrlInput.trim());
      localStorage.setItem('fitplan_supabase_anon_key', supabaseKeyInput.trim());
      setSaveSuccessMessage('Credenciales guardadas. Recargando para conectar...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      localStorage.removeItem('fitplan_supabase_url');
      localStorage.removeItem('fitplan_supabase_anon_key');
      setSaveSuccessMessage('Modo local activado.');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleResetApp = () => {
    resetUser();
    navigate('/onboarding');
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24 text-[#1C1917]">
      {/* Top Header */}
      <header className="px-4 pt-6 pb-3 max-w-lg mx-auto flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9E5325] font-heading block truncate">
            MÉTRICAS & RENDIMIENTO
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight font-heading uppercase flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#9E5325] shrink-0" />
            <span className="truncate">Progreso</span>
          </h1>
          <p className="text-xs text-[#78716C] mt-0.5 truncate">
            Registro de constancia, estadísticas y entrenamientos
          </p>
        </div>

        <button
          onClick={() => setShowConfigModal(true)}
          className="min-h-[44px] min-w-[44px] bg-white hover:bg-[#FAF7F2] text-[#78716C] hover:text-[#9E5325] rounded-xl border border-[#EAE3D9] flex items-center justify-center transition-all shadow-sm shrink-0"
          title="Configuración de sincronización Supabase"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-2 space-y-5">
        {/* Key Metrics Grid */}
        <section aria-label="Resumen de Métricas" className="grid grid-cols-2 gap-3">
          <StatCard
            label="Racha Actual"
            value={`${stats.streakDays} días`}
            subtext="Consistencia activa"
            icon={Flame}
          />
          <StatCard
            label="Sesiones"
            value={stats.totalSessions}
            subtext="Entrenamientos hechos"
            icon={Dumbbell}
          />
          <StatCard
            label="Tiempo Total"
            value={`${stats.totalMinutes} min`}
            subtext="De esfuerzo físico"
            icon={Clock}
          />
          <StatCard
            label="Adherencia"
            value={`${stats.weeklyAdherence}%`}
            subtext="De tu meta semanal"
            icon={Award}
          />
        </section>

        {/* Banner to full Dashboard / Panel de Control */}
        <div className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider font-heading text-white/80 block">
              VISTA AVANZADA
            </span>
            <h3 className="text-sm font-black font-heading uppercase truncate">
              Panel de Control Completo
            </h3>
            <p className="text-[11px] text-white/80 mt-0.5 truncate">
              Gráfico interactivo de sesiones semanales con Recharts
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="min-h-[38px] px-3.5 py-1.5 bg-white text-[#9E5325] hover:bg-[#FAF7F2] font-black text-xs uppercase font-heading rounded-xl shadow-md shrink-0 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Abrir Panel</span>
          </button>
        </div>

        {/* Weekly Sessions Chart with Recharts */}
        <section aria-label="Gráfico de Sesiones Semanales con Recharts">
          <WeeklySessionsChart
            sessionLogs={sessionLogs}
            weeklyTargetDays={profile?.days_per_week || 4}
            activeRoutine={activeRoutine}
            onSeedSampleData={seedSampleWeeklyLogs}
          />
        </section>

        {/* User Profile Card */}
        {profile && (
          <section aria-label="Perfil de Entrenamiento" className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE3D9] shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#78716C] font-heading">
                Tu Cuenta y Perfil
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleResetApp}
                  className="text-xs text-[#78716C] hover:text-[#9E5325] font-semibold flex items-center gap-1 min-h-[32px] px-2 py-1 rounded-lg hover:bg-[#FAF7F2] font-heading uppercase"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reconfigurar</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-700 hover:text-rose-800 font-semibold flex items-center gap-1 min-h-[32px] px-2 py-1 rounded-lg hover:bg-rose-50 font-heading uppercase"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-[#9E5325] bg-[#F8F2EC] text-[#9E5325] font-black text-base sm:text-lg flex items-center justify-center font-heading shrink-0">
                {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : (profile.name ? profile.name.charAt(0).toUpperCase() : 'A')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="font-extrabold text-[#1C1917] text-sm sm:text-base truncate font-heading">
                    {currentUser?.username || profile.name}
                  </h3>
                  {currentUser?.accessCode && (
                    <span className="text-[10px] bg-[#FAF7F2] border border-[#EAE3D9] text-[#9E5325] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 shrink-0">
                      <KeyRound className="w-2.5 h-2.5" />
                      {currentUser.accessCode}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] sm:text-xs text-[#78716C]">
                  <span className="bg-[#FAF7F2] px-2 py-0.5 rounded-lg border border-[#EAE3D9] capitalize font-bold text-[#9E5325]">
                    {profile.goal}
                  </span>
                  <span>• {profile.days_per_week} días/sem</span>
                  <span>• {profile.session_duration} min/sesión</span>
                </div>
              </div>
            </div>

            {/* Admin shortcut button */}
            <div className="pt-3 border-t border-[#EAE3D9] flex items-center justify-between">
              <div className="text-xs text-[#78716C]">
                ¿Eres entrenador o administrador?
              </div>
              <button
                onClick={() => navigate('/admin')}
                className="bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#9E5325] border border-[#EAE3D9] text-xs font-bold px-3 py-1.5 rounded-xl uppercase font-heading tracking-wider flex items-center gap-1.5 transition-all"
              >
                <span>Panel Admin</span>
              </button>
            </div>
          </section>
        )}

        {/* Session Logs History */}
        <section aria-label="Historial de Sesiones">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-[#1C1917] tracking-tight flex items-center gap-1.5 font-heading uppercase min-w-0">
              <Calendar className="w-4 h-4 text-[#9E5325] shrink-0" />
              <span className="truncate">Historial de Entrenamientos</span>
            </h3>
            <span className="text-xs font-semibold text-[#78716C] font-mono whitespace-nowrap shrink-0">
              {sessionLogs.length} {sessionLogs.length === 1 ? 'sesión' : 'sesiones'}
            </span>
          </div>

          {sessionLogs.length > 0 ? (
            <div className="space-y-3">
              {sessionLogs.map((log) => {
                const completedExerciseObjects = log.completed_exercises
                  .map((id) => exercises.find((e) => e.id === id))
                  .filter(Boolean);

                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-2xl p-4 border border-[#EAE3D9] shadow-sm transition-all hover:border-[#D8C5B3]"
                  >
                    <div className="flex items-start justify-between gap-2.5 mb-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-[#9E5325] uppercase tracking-wider block font-heading">
                          {formatDate(log.date)}
                        </span>
                        <h4 className="font-bold text-[#1C1917] text-sm sm:text-base mt-0.5 font-heading break-words">
                          {log.routine_day_name || 'Sesión de Entrenamiento'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] sm:text-xs font-bold text-[#9E5325] bg-[#FAF7F2] px-2 sm:px-2.5 py-1 rounded-xl border border-[#EAE3D9]">
                          {log.duration_min} min
                        </span>
                        <button
                          onClick={() => {
                            deleteSessionLog(log.id);
                          }}
                          className="w-8 h-8 rounded-lg hover:bg-rose-50 text-[#A8A29E] hover:text-rose-600 flex items-center justify-center transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Exercises executed in this session */}
                    {completedExerciseObjects.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#EAE3D9]">
                        <span className="text-[11px] text-[#78716C] block mb-1.5 font-semibold uppercase font-heading">
                          Ejercicios completados ({completedExerciseObjects.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {completedExerciseObjects.map((ex, exIdx) => (
                            <span
                              key={`${ex?.id || 'ex'}-${exIdx}`}
                              className="text-[11px] bg-[#FAF7F2] text-[#44403C] px-2 py-0.5 rounded-lg border border-[#EAE3D9] font-medium"
                            >
                              ✓ {ex?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#EAE3D9] my-4 shadow-sm">
              <Dumbbell className="w-10 h-10 text-[#A8A29E] mx-auto mb-2" />
              <h4 className="font-bold text-[#1C1917] text-base font-heading uppercase">Aún no hay sesiones registradas</h4>
              <p className="text-xs text-[#78716C] mt-1 max-w-xs mx-auto">
                Completa tu primer entrenamiento en la sección "Rutina" para empezar a construir tu racha.
              </p>
              <button
                onClick={() => navigate('/rutina')}
                className="mt-4 bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white font-bold text-xs px-5 py-2.5 rounded-xl min-h-[44px] uppercase font-heading tracking-wider"
              >
                Ir a mi Rutina
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Supabase Connection Settings Modal */}
      {showConfigModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#9E5325]" />
                <h3 className="font-black text-lg text-[#1C1917] font-heading uppercase">Base de Datos Supabase</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-[#78716C] hover:text-[#1C1917] p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 text-xs text-[#78716C] space-y-2">
              <p>
                Estado actual:{' '}
                <span
                  className={`font-bold ${
                    isSupabaseConfigured ? 'text-emerald-700' : 'text-[#9E5325]'
                  }`}
                >
                  {isSupabaseConfigured ? 'Conectado a Supabase' : 'Modo Local / Offline (LocalStorage)'}
                </span>
              </p>
              <p className="text-[#78716C]">
                FitPlan funciona 100% de inmediato de forma local sin requerir configuración previa.
                Si tienes un proyecto en Supabase, puedes ingresar tus credenciales para sincronizar tus rutinas en la nube.
              </p>
            </div>

            <form onSubmit={handleSaveSupabaseConfig} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#1C1917] block mb-1 font-heading uppercase">
                  SUPABASE_URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#9E5325]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1C1917] block mb-1 font-heading uppercase">
                  SUPABASE_ANON_KEY
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#9E5325] font-mono"
                />
              </div>

              {saveSuccessMessage && (
                <div className="text-xs font-bold text-emerald-700 text-center py-1">
                  {saveSuccessMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white font-bold py-2.5 rounded-xl text-xs transition-all min-h-[44px] uppercase font-heading tracking-wider"
                >
                  Guardar y Sincronizar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('fitplan_supabase_url');
                    localStorage.removeItem('fitplan_supabase_anon_key');
                    setSupabaseUrlInput('');
                    setSupabaseKeyInput('');
                    setSaveSuccessMessage('Modo local activado.');
                    setTimeout(() => window.location.reload(), 800);
                  }}
                  className="px-3 bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] text-xs font-medium rounded-xl border border-[#EAE3D9]"
                >
                  Modo Local
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
