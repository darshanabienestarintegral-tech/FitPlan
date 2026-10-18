import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Calendar,
  Dumbbell,
  KeyRound,
  Users,
  Plus,
  Edit3,
  Trash2,
  Check,
  ArrowLeft,
  Search,
  Save,
  AlertCircle,
  Copy,
  CheckCircle2,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Layers,
  BookOpen,
  Sparkles,
  User,
  FileDown,
  Upload,
} from 'lucide-react';
import { useRoutineStore } from '../store/useRoutineStore';
import { useUserStore } from '../store/useUserStore';
import { ExportRoutinePdfModal } from '../components/ExportRoutinePdfModal';
import { RoutineDefinitionModal } from '../components/RoutineDefinitionModal';
import { UploadRoutinePdfModal } from '../components/UploadRoutinePdfModal';
import {
  Exercise,
  Goal,
  Routine,
  RoutineDay,
  RoutineExerciseConfig,
  MuscleGroup,
  Equipment,
  Difficulty,
  UserAccount,
} from '../types';
import { BrandLogo } from '../components/BrandLogo';
import confetti from 'canvas-confetti';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useUserStore((s) => s.currentUser);
  const adminAccessCodes = useUserStore((s) => s.adminAccessCodes);
  const createAdminCode = useUserStore((s) => s.createAdminCode);
  const deleteAdminCode = useUserStore((s) => s.deleteAdminCode);
  const registeredAccounts = useUserStore((s) => s.registeredAccounts);
  const assignRoutineToAccount = useUserStore((s) => s.assignRoutineToAccount);
  const createAccountByAdmin = useUserStore((s) => s.createAccountByAdmin);
  const deleteAccount = useUserStore((s) => s.deleteAccount);

  const routines = useRoutineStore((s) => s.routines);
  const activeRoutine = useRoutineStore((s) => s.activeRoutine);
  const exercises = useRoutineStore((s) => s.exercises);
  const addCustomRoutine = useRoutineStore((s) => s.addCustomRoutine);
  const updateRoutine = useRoutineStore((s) => s.updateRoutine);
  const deleteRoutine = useRoutineStore((s) => s.deleteRoutine);
  const setActiveRoutineById = useRoutineStore((s) => s.setActiveRoutineById);
  const addExerciseToLibrary = useRoutineStore((s) => s.addExerciseToLibrary);
  const updateExerciseInLibrary = useRoutineStore((s) => s.updateExerciseInLibrary);
  const deleteExerciseFromLibrary = useRoutineStore((s) => s.deleteExerciseFromLibrary);

  // Admin access gate state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(Boolean(currentUser?.isAdmin));
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pdfModalRoutine, setPdfModalRoutine] = useState<{ routine: Routine; athleteName?: string } | null>(null);

  // Active tab in Admin
  const [activeTab, setActiveTab] = useState<'routines' | 'exercises' | 'codes' | 'users'>('routines');

  // Routine editing/defining modal state
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [isPdfUploadOpen, setIsPdfUploadOpen] = useState(false);
  const [routineEditSuccess, setRoutineEditSuccess] = useState('');
  const [routineFilterLevel, setRoutineFilterLevel] = useState<'todos' | Difficulty | 'custom'>('todos');
  const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null);

  const filteredAdminRoutines = useMemo(() => {
    return routines.filter((r) => {
      if (routineFilterLevel === 'todos') return true;
      if (routineFilterLevel === 'custom') {
        return (
          !r.is_default ||
          r.id.includes('cristian') ||
          r.id.includes('carlos') ||
          r.id.includes('valeria') ||
          r.id.includes('custom') ||
          r.id.includes('manual') ||
          r.name.toLowerCase().includes('cristian') ||
          r.name.toLowerCase().includes('carlos') ||
          r.name.toLowerCase().includes('valeria') ||
          r.user_id !== 'admin'
        );
      }
      return r.difficulty === routineFilterLevel || r.level === routineFilterLevel;
    }).sort((a, b) => {
      if (routineFilterLevel === 'custom') {
        const aIsCristian = a.id.includes('cristian') || a.name.toLowerCase().includes('cristian');
        const bIsCristian = b.id.includes('cristian') || b.name.toLowerCase().includes('cristian');
        if (aIsCristian && !bIsCristian) return -1;
        if (!aIsCristian && bIsCristian) return 1;
      }
      return 0;
    });
  }, [routines, routineFilterLevel]);

  // Exercise creating/editing modal state
  const [editingExercise, setEditingExercise] = useState<Partial<Exercise> | null>(null);
  const [isNewExercise, setIsNewExercise] = useState(false);

  // New admin code state
  const [newCodeInput, setNewCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter exercises in catalog tab
  const [exerciseSearch, setExerciseSearch] = useState('');

  // User management state
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newAthleteUsername, setNewAthleteUsername] = useState('');
  const [newAthleteFullName, setNewAthleteFullName] = useState('');
  const [newAthletePassword, setNewAthletePassword] = useState('');
  const [newAthleteCode, setNewAthleteCode] = useState('');
  const [newAthleteRoutineId, setNewAthleteRoutineId] = useState('');
  const [athleteSuccessMessage, setAthleteSuccessMessage] = useState('');
  const [athleteErrorMessage, setAthleteErrorMessage] = useState('');

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = adminPinInput.trim();
    if (cleanPin === '260816') {
      setIsAdminUnlocked(true);
      setPinError('');
      // Keep session in store aligned as admin
      const current = useUserStore.getState().currentUser;
      useUserStore.setState({
        currentUser: {
          username: current?.username || 'admin',
          role: 'admin',
          isAdmin: true,
          accessCode: current?.accessCode || 'MASTER-ADMIN',
          loginTime: new Date().toISOString(),
        },
        isAuthenticated: true,
      });
    } else {
      setPinError('Clave de administrador incorrecta. Ingrese la clave válida.');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveRoutineChanges = () => {
    if (!editingRoutine) return;
    updateRoutine(editingRoutine.id, editingRoutine);
    setRoutineEditSuccess('¡Rutina actualizada y guardada correctamente!');
    try {
      confetti({ particleCount: 60, spread: 50, colors: ['#9E5325', '#7B3A13'] });
    } catch (_) {}
    setTimeout(() => {
      setRoutineEditSuccess('');
      setEditingRoutine(null);
    }, 1200);
  };

  const handleSaveExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise || !editingExercise.name || !editingExercise.muscle_group) return;

    if (isNewExercise) {
      const newEx: Exercise = {
        id: `custom-ex-${Date.now()}`,
        name: editingExercise.name.trim(),
        muscle_group: editingExercise.muscle_group as MuscleGroup,
        equipment: (editingExercise.equipment || 'ninguno') as Equipment,
        difficulty: (editingExercise.difficulty || 'principiante') as Difficulty,
        description: editingExercise.description?.trim() || 'Ejercicio personalizado añadido por el administrador.',
        tips: editingExercise.tips || ['Mantén postura neutral', 'Controla la fase excéntrica'],
      };
      addExerciseToLibrary(newEx);
    } else if (editingExercise.id) {
      updateExerciseInLibrary(editingExercise.id, editingExercise as Exercise);
    }

    setEditingExercise(null);
  };

  const handleCreateRoutineForUser = async (acc: UserAccount) => {
    const newRoutineId = `routine-${acc.username}-${Date.now()}`;
    const athleteDisplayName = acc.fullName || acc.username;
    const newDraft: Routine = {
      id: newRoutineId,
      user_id: acc.profileId || acc.username,
      name: `Rutina Personalizada - ${athleteDisplayName}`,
      goal: 'hipertrofia',
      days_per_week: 3,
      session_duration: 45,
      created_at: new Date().toISOString(),
      days: [
        {
          id: `day-${newRoutineId}-1`,
          routine_id: newRoutineId,
          day_of_week: 0,
          name: 'Día 1: Empuje',
          focus: 'Pecho, Hombro y Tríceps',
          exercise_ids: ['ex-01', 'ex-02', 'ex-18'],
          exercise_configs: [
            { exerciseId: 'ex-01', sets: 4, reps: '10', restSeconds: 60, alternativeExerciseIds: ['ex-02'] },
            { exerciseId: 'ex-02', sets: 4, reps: '10', restSeconds: 90, alternativeExerciseIds: ['ex-03'] },
            { exerciseId: 'ex-18', sets: 3, reps: '12', restSeconds: 60, alternativeExerciseIds: ['ex-19'] },
          ],
        },
        {
          id: `day-${newRoutineId}-2`,
          routine_id: newRoutineId,
          day_of_week: 1,
          name: 'Día 2: Tracción & Core',
          focus: 'Espalda, Bíceps y Core',
          exercise_ids: ['ex-07', 'ex-21', 'ex-27'],
          exercise_configs: [
            { exerciseId: 'ex-07', sets: 4, reps: '10', restSeconds: 90, alternativeExerciseIds: ['ex-08'] },
            { exerciseId: 'ex-21', sets: 3, reps: '12', restSeconds: 60, alternativeExerciseIds: ['ex-22'] },
            { exerciseId: 'ex-27', sets: 3, reps: '45s', restSeconds: 45, alternativeExerciseIds: ['ex-28'] },
          ],
        },
      ],
    };
    addCustomRoutine(newDraft, false);
    if (!await handleAssignRoutineToUser(acc.username, newRoutineId)) return;
    setEditingRoutine(newDraft);
    setIsCreatorModalOpen(true);
    setAthleteSuccessMessage(`Nueva rutina creada para ${athleteDisplayName}. Modifica sus ejercicios y días.`);
    setTimeout(() => setAthleteSuccessMessage(''), 3000);
  };

  const handleAssignRoutineToUser = async (username: string, routineId: string): Promise<boolean> => {
    setAthleteSuccessMessage('');
    setAthleteErrorMessage('');
    try {
      if (!await useRoutineStore.getState().syncRoutineCatalog()) throw new Error('No se pudo guardar la rutina en Internet. Reintenta.');
      await assignRoutineToAccount(username, routineId);
      setAthleteSuccessMessage(`Rutina guardada en Internet y asignada a ${username}`);
      return true;
    } catch (error) {
      setAthleteErrorMessage(error instanceof Error ? error.message : 'No se pudo asignar la rutina.');
      return false;
    }
  };

  const handleDuplicateRoutineForUser = async (baseRoutine: Routine, acc: UserAccount) => {
    const dupId = `routine-${acc.username}-${Date.now()}`;
    const athleteDisplayName = acc.fullName || acc.username;
    const duplicated: Routine = {
      ...baseRoutine,
      id: dupId,
      user_id: acc.profileId || acc.username,
      name: `${baseRoutine.name} (${athleteDisplayName})`,
      created_at: new Date().toISOString(),
      days: baseRoutine.days.map((d, dIdx) => ({
        ...d,
        id: `day-${dupId}-${dIdx + 1}`,
        routine_id: dupId,
      })),
    };
    addCustomRoutine(duplicated, false);
    if (!await handleAssignRoutineToUser(acc.username, dupId)) return;
    setEditingRoutine(duplicated);
    setIsCreatorModalOpen(true);
    setAthleteSuccessMessage(`Rutina duplicada y asignada a ${athleteDisplayName}`);
    setTimeout(() => setAthleteSuccessMessage(''), 2500);
  };

  const handleCreateAthleteAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAthleteErrorMessage('');
    const cleanUsername = newAthleteUsername.trim().toLowerCase();
    if (!cleanUsername) {
      setAthleteErrorMessage('Ingresa un nombre de usuario.');
      return;
    }
    const result = createAccountByAdmin({
      username: cleanUsername,
      fullName: newAthleteFullName.trim() || cleanUsername,
      password: newAthletePassword.trim() || '123456',
      accessCode: newAthleteCode.trim() || adminAccessCodes[0] || 'FITPLAN2026',
      assignedRoutineId: newAthleteRoutineId || undefined,
    });
    if (!result.success) {
      setAthleteErrorMessage(result.message || 'Error al crear usuario.');
      return;
    }
    setShowCreateUserModal(false);
    setNewAthleteUsername('');
    setNewAthleteFullName('');
    setNewAthletePassword('');
    setNewAthleteCode('');
    setNewAthleteRoutineId('');
    setAthleteSuccessMessage(`Atleta "${cleanUsername}" registrado correctamente.`);
    setTimeout(() => setAthleteSuccessMessage(''), 2500);
  };

  const handleDeleteAthleteAccount = (username: string) => {
    deleteAccount(username);
    setAthleteSuccessMessage(`Usuario ${username} eliminado.`);
    setTimeout(() => setAthleteSuccessMessage(''), 2500);
  };

  if (!isAdminUnlocked) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
        <header className="pt-6 pb-2 text-center">
          <BrandLogo size="md" showSubtitle={false} className="justify-center" />
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9E5325] font-heading mt-3">
            ACCESO RESTRINGIDO
          </div>
          <h1 className="text-2xl font-black text-[#1C1917] font-heading uppercase mt-1">
            Portal del Administrador
          </h1>
        </header>

        <main className="my-auto">
          <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 sm:p-7 shadow-sm text-center">
            <div className="w-14 h-14 rounded-full border-2 border-[#9E5325] bg-[#F8F2EC] text-[#9E5325] flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <p className="text-xs text-[#78716C] mb-5">
              Ingresa la clave de administrador para gestionar rutinas, ejercicios y códigos de acceso.
            </p>

            <form onSubmit={handleUnlockAdmin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Ingresa la clave de administrador"
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-4 py-3 text-sm text-[#1C1917] text-center font-bold tracking-widest focus:outline-none focus:border-[#9E5325]"
                />
              </div>

              {pinError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {pinError}
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white font-bold text-xs uppercase tracking-wider font-heading rounded-2xl shadow-md transition-all"
              >
                Acceder al Panel Admin
              </button>
            </form>
          </div>
        </main>

        <footer className="py-2 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-[#78716C] hover:text-[#1C1917] font-semibold flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la aplicación</span>
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24 text-[#1C1917]">
      {/* Top Admin App Bar */}
      <header className="px-4 pt-4 pb-3 max-w-lg mx-auto border-b border-[#EAE3D9] bg-white sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-xl hover:bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917] flex items-center justify-center transition-colors border border-[#EAE3D9]"
              title="Volver a la vista principal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9E5325] font-heading block leading-none truncate">
                MODO ADMINISTRADOR
              </span>
              <h1 className="text-base font-black text-[#1C1917] font-heading uppercase mt-0.5 truncate">
                Panel de Control
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] bg-[#F8F2EC] text-[#9E5325] font-bold px-2.5 py-1 rounded-full border border-[#E7DFD5] font-heading uppercase whitespace-nowrap">
              Admin Activo
            </span>
          </div>
        </div>

        {/* 4 Admin Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 mt-2.5 bg-[#FAF7F2] p-1 rounded-2xl border border-[#EAE3D9]">
          <button
            onClick={() => setActiveTab('routines')}
            className={`py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-tight sm:tracking-wider font-heading transition-all truncate text-center ${
              activeTab === 'routines'
                ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Rutinas
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-tight sm:tracking-wider font-heading transition-all truncate text-center ${
              activeTab === 'exercises'
                ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Ejercicios
          </button>
          <button
            onClick={() => setActiveTab('codes')}
            className={`py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-tight sm:tracking-wider font-heading transition-all truncate text-center ${
              activeTab === 'codes'
                ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Códigos
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-tight sm:tracking-wider font-heading transition-all truncate text-center ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Usuarios
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* ================= TAB 1: RUTINAS ================= */}
        {activeTab === 'routines' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[#1C1917] font-heading break-words">
                  Gestión y Edición de Rutinas ({routines.length})
                </h2>
                <p className="text-[11px] sm:text-xs text-[#78716C]">
                  Modifica días, series, repeticiones o crea nuevas rutinas
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsPdfUploadOpen(true)}
                  className="bg-white hover:bg-[#FAF7F2] text-[#9E5325] border border-[#EAE3D9] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 font-heading uppercase shrink-0 shadow-xs transition-all active:scale-95"
                  title="Cargar rutina del alumno desde archivo PDF"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir PDF</span>
                </button>

                <button
                  onClick={() => {
                    setEditingRoutine(null);
                    setIsCreatorModalOpen(true);
                  }}
                  className="self-start sm:self-auto bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 font-heading uppercase shrink-0 shadow-sm transition-all active:scale-95"
                  title="Definir nueva rutina mediante el formulario intuitivo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Definir Rutina</span>
                </button>
              </div>
            </div>

            {/* Category Filter Chips for Admin */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setRoutineFilterLevel('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider font-heading whitespace-nowrap transition-all ${
                  routineFilterLevel === 'todos'
                    ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-sm'
                    : 'bg-white text-[#78716C] hover:text-[#1C1917] border border-[#EAE3D9]'
                }`}
              >
                Todas ({routines.length})
              </button>
              <button
                onClick={() => setRoutineFilterLevel('principiante')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider font-heading whitespace-nowrap transition-all ${
                  routineFilterLevel === 'principiante'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                }`}
              >
                Principiante ({routines.filter((r) => r.difficulty === 'principiante' || r.level === 'principiante').length})
              </button>
              <button
                onClick={() => setRoutineFilterLevel('intermedio')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider font-heading whitespace-nowrap transition-all ${
                  routineFilterLevel === 'intermedio'
                    ? 'bg-amber-700 text-white shadow-sm'
                    : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                Intermedio ({routines.filter((r) => r.difficulty === 'intermedio' || r.level === 'intermedio').length})
              </button>
              <button
                onClick={() => setRoutineFilterLevel('avanzado')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider font-heading whitespace-nowrap transition-all ${
                  routineFilterLevel === 'avanzado'
                    ? 'bg-rose-700 text-white shadow-sm'
                    : 'bg-white text-rose-800 hover:bg-rose-50 border border-rose-200'
                }`}
              >
                Avanzado ({routines.filter((r) => r.difficulty === 'avanzado' || r.level === 'avanzado').length})
              </button>
              <button
                onClick={() => setRoutineFilterLevel('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider font-heading whitespace-nowrap transition-all ${
                  routineFilterLevel === 'custom'
                    ? 'bg-[#1C1917] text-white shadow-sm'
                    : 'bg-white text-[#44403C] hover:bg-[#FAF7F2] border border-[#EAE3D9]'
                }`}
              >
                Personalizadas ({routines.filter((r) => !r.is_default || r.id.includes('cristian') || r.name.toLowerCase().includes('cristian') || r.id.includes('carlos') || r.id.includes('valeria') || r.user_id !== 'admin').length})
              </button>
            </div>

            {/* Delete Routine Confirmation in Admin */}
            {routineToDelete && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl animate-scaleUp">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold uppercase font-heading text-rose-900">
                      ¿Confirmar eliminación de rutina?
                    </h4>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Vas a eliminar &quot;{routineToDelete.name}&quot;.
                      {routineToDelete.is_default && (
                        <span className="block font-bold mt-0.5">
                          (Como Administrador tienes privilegios para eliminar rutinas predeterminadas).
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        onClick={() => {
                          deleteRoutine(routineToDelete.id);
                          setRoutineToDelete(null);
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl uppercase font-heading transition-colors"
                      >
                        Sí, Eliminar Rutina
                      </button>
                      <button
                        onClick={() => setRoutineToDelete(null)}
                        className="bg-white border border-rose-200 text-rose-800 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors uppercase font-heading"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {filteredAdminRoutines.map((routine) => {
                const isActive = activeRoutine?.id === routine.id;
                const isDef = Boolean(routine.is_default);
                const diffLevel = routine.difficulty || routine.level;
                return (
                  <div
                    key={routine.id}
                    className={`bg-white rounded-2xl p-4 border transition-all shadow-sm ${
                      isActive ? 'border-[#9E5325] ring-1 ring-[#9E5325]/20' : 'border-[#EAE3D9]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        {(() => {
                          const isCristian = routine.id.includes('cristian') || routine.name.toLowerCase().includes('cristian');
                          const isPersonal = !routine.is_default || isCristian || routine.id.includes('carlos') || routine.id.includes('valeria') || routine.user_id !== 'admin';
                          return (
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              {isCristian && (
                                <span className="text-[10px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white font-black px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                                  👤 Alumno: Cristian Aguilera
                                </span>
                              )}

                              {isPersonal && (
                                <span className="text-[10px] bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-full border border-purple-300 whitespace-nowrap">
                                  Personalizada
                                </span>
                              )}

                              {isDef && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300 whitespace-nowrap">
                                  Predeterminada (Solo Admin)
                                </span>
                              )}

                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E5325] font-heading whitespace-nowrap shrink-0">
                                {routine.goal} • {routine.days_per_week} DÍAS
                              </span>
                              {isActive && (
                                <span className="text-[10px] bg-[#F8F2EC] text-[#9E5325] font-bold px-2 py-0.5 rounded-full border border-[#E7DFD5] whitespace-nowrap shrink-0">
                                  Activa en Atleta
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <h3 className="font-bold text-[#1C1917] text-sm sm:text-base font-heading break-words">
                          {routine.name}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-[#78716C] mt-0.5 truncate">
                          {routine.days.length} días configurados • {routine.session_duration}m por sesión
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => setPdfModalRoutine({ routine })}
                          className="bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] hover:text-[#9E5325] px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] text-xs font-bold flex items-center gap-1 font-heading uppercase whitespace-nowrap"
                          title="Exportar esta rutina a PDF imprimible"
                        >
                          <FileDown className="w-3.5 h-3.5 shrink-0" />
                          <span>PDF</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingRoutine(routine);
                            setIsCreatorModalOpen(true);
                          }}
                          className="bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#9E5325] px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] text-xs font-bold flex items-center gap-1 font-heading uppercase whitespace-nowrap"
                          title="Modificar rutina"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Modificar</span>
                        </button>

                        {routines.length > 1 && (
                          <button
                            onClick={() => setRoutineToDelete(routine)}
                            className="p-2 text-[#A8A29E] hover:text-rose-600 rounded-xl hover:bg-rose-50 shrink-0"
                            title="Eliminar rutina (Administrador autorizado)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview of days in routine */}
                    <div className="mt-3 pt-2.5 border-t border-[#EAE3D9] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {routine.days.map((d) => (
                          <span
                            key={d.id}
                            className="text-[10px] bg-[#FAF7F2] text-[#44403C] px-2 py-1 rounded-lg border border-[#EAE3D9] font-medium"
                          >
                            {d.name}: {d.exercise_ids.length} ejercicios
                          </span>
                        ))}
                      </div>

                      {!isActive && (
                        <button
                          onClick={() => setActiveRoutineById(routine.id)}
                          className="text-xs font-bold text-[#9E5325] hover:underline font-heading uppercase"
                        >
                          Establecer como Activa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 2: EJERCICIOS ================= */}
        {activeTab === 'exercises' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[#1C1917] font-heading break-words">
                  Catálogo de Ejercicios ({exercises.length})
                </h2>
                <p className="text-[11px] sm:text-xs text-[#78716C]">
                  Crea nuevos movimientos o edita los existentes
                </p>
              </div>

              <button
                onClick={() => {
                  setIsNewExercise(true);
                  setEditingExercise({
                    name: '',
                    muscle_group: 'pecho',
                    equipment: 'ninguno',
                    difficulty: 'principiante',
                    description: '',
                    tips: ['Mantén el core firme', 'Controla la bajada'],
                  });
                }}
                className="self-start sm:self-auto bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 font-heading uppercase shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ejercicio</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E5325]" />
              <input
                type="text"
                placeholder="Buscar ejercicio para editar..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="w-full bg-white border border-[#EAE3D9] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#9E5325]"
              />
            </div>

            <div className="space-y-2">
              {exercises
                .filter(
                  (ex) =>
                    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                    ex.muscle_group.toLowerCase().includes(exerciseSearch.toLowerCase())
                )
                .map((ex, idx) => (
                  <div
                    key={`${ex.id}-${idx}`}
                    className="bg-white rounded-xl p-3 border border-[#EAE3D9] flex items-center justify-between gap-2 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {ex.is_default ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Predeterminado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                            Personalizado
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-[#9E5325] bg-[#F8F2EC] px-2 py-0.5 rounded-full border border-[#E7DFD5] capitalize">
                          {ex.muscle_group}
                        </span>
                        <span className="text-[10px] text-[#78716C] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#EAE3D9]">
                          {ex.equipment}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-[#1C1917] truncate font-heading">
                        {ex.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setIsNewExercise(false);
                          setEditingExercise(ex);
                        }}
                        className="p-1.5 text-[#9E5325] hover:bg-[#FAF7F2] rounded-lg"
                        title="Editar ejercicio"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteExerciseFromLibrary(ex.id)}
                        className="p-1.5 text-[#A8A29E] hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Eliminar del catálogo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: CÓDIGOS DE ACCESO ================= */}
        {activeTab === 'codes' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[#1C1917] font-heading break-words">
                Códigos de Acceso del Administrador
              </h2>
              <p className="text-[11px] sm:text-xs text-[#78716C]">
                Estos son los códigos requeridos para que nuevos usuarios puedan registrarse
              </p>
            </div>

            {/* Create Code Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCodeInput.trim()) return;
                createAdminCode(newCodeInput.trim());
                setNewCodeInput('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Generar nuevo código (ej. ATLETA-VIP)"
                value={newCodeInput}
                onChange={(e) => setNewCodeInput(e.target.value.toUpperCase())}
                className="flex-1 bg-white border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#1C1917] focus:outline-none focus:border-[#9E5325]"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase font-heading flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear</span>
              </button>
            </form>

            <div className="space-y-2">
              {adminAccessCodes.map((code) => (
                <div
                  key={code}
                  className="bg-white p-3 rounded-xl border border-[#EAE3D9] flex items-center justify-between gap-2 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <KeyRound className="w-4 h-4 text-[#9E5325] shrink-0" />
                    <span className="font-mono font-bold text-xs sm:text-sm text-[#1C1917] tracking-wider truncate">
                      {code}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopyCode(code)}
                      className="bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#9E5325] px-2.5 py-1.5 rounded-lg border border-[#EAE3D9] text-xs font-semibold flex items-center gap-1"
                    >
                      {copiedCode === code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === code ? 'Copiado' : 'Copiar'}</span>
                    </button>

                    {adminAccessCodes.length > 1 && (
                      <button
                        onClick={() => deleteAdminCode(code)}
                        className="p-1.5 text-[#A8A29E] hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Revocar código"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: USUARIOS & RUTINAS ================= */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Top Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[#1C1917] font-heading break-words">
                  Gestión de Atletas & Rutinas ({registeredAccounts.length})
                </h2>
                <p className="text-[11px] sm:text-xs text-[#78716C] leading-snug">
                  Accede a las rutinas de cada usuario, modifícalas en detalle o crea nuevos planes asignados
                </p>
              </div>

              <button
                onClick={() => currentUser?.uid
                  ? setAthleteSuccessMessage('Para agregar un alumno, pídele que abra FitPlan y se registre con «Nuevo usuario». Después pulsa «Actualizar rutinas y usuarios» arriba.')
                  : setShowCreateUserModal(true)}
                className="self-start sm:self-auto bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-heading uppercase shrink-0 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Nuevo Atleta</span>
              </button>
            </div>

            {/* Notification alert */}
            {athleteSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="break-words">{athleteSuccessMessage}</span>
              </div>
            )}

            {athleteErrorMessage && <p role="alert" className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs">{athleteErrorMessage}</p>}
            {/* Search Athletes */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E5325]" />
              <input
                type="text"
                placeholder="Buscar atleta por nombre o usuario..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full bg-white border border-[#EAE3D9] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#9E5325]"
              />
            </div>

            {/* Athletes Cards List */}
            {registeredAccounts
              .filter((acc) => {
                const term = userSearchTerm.toLowerCase();
                return (
                  acc.username.toLowerCase().includes(term) ||
                  (acc.fullName && acc.fullName.toLowerCase().includes(term)) ||
                  acc.accessCode.toLowerCase().includes(term)
                );
              })
              .map((acc, idx) => {
                const userRoutines = routines.filter(
                  (r) =>
                    r.user_id === acc.profileId ||
                    r.user_id === acc.username ||
                    acc.assignedRoutineId === r.id
                );
                const primaryRoutine =
                  routines.find((r) => r.id === acc.assignedRoutineId) ||
                  userRoutines[0] ||
                  null;
                const isExpanded = expandedUser === acc.username;

                return (
                  <div
                    key={`${acc.username}-${idx}`}
                    className="bg-white rounded-2xl border border-[#EAE3D9] p-3.5 sm:p-4 shadow-sm space-y-3 transition-all hover:border-[#D8C5B3]"
                  >
                    {/* Athlete Identity Row */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full border-2 border-[#9E5325] bg-[#F8F2EC] text-[#9E5325] font-black text-sm flex items-center justify-center font-heading shrink-0">
                          {acc.fullName ? acc.fullName.charAt(0).toUpperCase() : acc.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="font-bold text-xs sm:text-sm text-[#1C1917] font-heading break-words">
                              {acc.fullName || acc.username}
                            </h3>
                            <span className="text-[10px] text-[#78716C] font-mono truncate max-w-[120px] sm:max-w-none">
                              @{acc.username}
                            </span>
                            {acc.role === 'admin' ? (
                              <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded-full uppercase font-heading">
                                Admin
                              </span>
                            ) : (
                              <span className="text-[9px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-1.5 py-0.5 rounded-full uppercase font-heading">
                                Usuario
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] bg-[#FAF7F2] text-[#9E5325] px-2 py-0.5 rounded-md font-mono border border-[#EAE3D9] flex items-center gap-1 font-semibold whitespace-nowrap shrink-0">
                              <KeyRound className="w-2.5 h-2.5 shrink-0" />
                              {acc.accessCode}
                            </span>
                            <span className="text-[10px] text-[#78716C] whitespace-nowrap shrink-0">
                              Registrado: {new Date(acc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => currentUser?.uid
                          ? setAthleteErrorMessage('La eliminación de cuentas se gestiona desde Firebase Authentication; no se eliminará solo de este navegador.')
                          : handleDeleteAthleteAccount(acc.username)}
                        className="p-1.5 text-[#A8A29E] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                        title={`Eliminar usuario ${acc.username}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Assigned Routine Panel */}
                    <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EAE3D9] space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E5325] font-heading flex items-center gap-1 min-w-0">
                          <Dumbbell className="w-3 h-3 shrink-0" />
                          <span className="truncate">Rutina de Entrenamiento Asignada</span>
                        </span>

                        {primaryRoutine && (
                          <span className="text-[10px] bg-white text-[#9E5325] px-2 py-0.5 rounded-full border border-[#EAE3D9] font-bold uppercase font-heading self-start sm:self-auto whitespace-nowrap shrink-0">
                            {primaryRoutine.goal} • {primaryRoutine.days_per_week} DÍAS • {primaryRoutine.session_duration} MIN
                          </span>
                        )}
                      </div>

                      {primaryRoutine ? (
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-xs sm:text-sm text-[#1C1917] font-heading break-words">
                            {primaryRoutine.name}
                          </h4>

                          <div className="flex flex-wrap gap-1 pt-1">
                            {primaryRoutine.days.map((d, dIdx) => (
                              <span
                                key={`${d.id}-${dIdx}`}
                                className="text-[10px] bg-white text-[#44403C] px-2 py-0.5 rounded-md border border-[#EAE3D9] font-medium whitespace-nowrap shrink-0"
                              >
                                {d.name}: {d.exercise_ids.length} ej.
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-[#78716C] py-1">
                          Este atleta aún no tiene una rutina asignada. Puedes crearle una o asignarle una del catálogo.
                        </div>
                      )}
                    </div>

                    {/* Routine Actions for this athlete */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {primaryRoutine && (
                        <button
                          onClick={() => setEditingRoutine(primaryRoutine)}
                          className="bg-white hover:bg-[#FAF7F2] text-[#9E5325] border border-[#EAE3D9] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 font-heading uppercase transition-all shadow-sm whitespace-nowrap"
                          title="Modificar los días, ejercicios, series y repeticiones de la rutina de este atleta"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Modificar Rutina</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleCreateRoutineForUser(acc)}
                        className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 font-heading uppercase transition-all shadow-sm whitespace-nowrap"
                        title="Crear una nueva rutina exclusiva para este atleta"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>+ Nueva Rutina</span>
                      </button>

                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : acc.username)}
                        className="bg-white hover:bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917] border border-[#EAE3D9] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ml-auto whitespace-nowrap shrink-0"
                      >
                        <Layers className="w-3.5 h-3.5 text-[#9E5325] shrink-0" />
                        <span>{isExpanded ? 'Ocultar' : `Ver Rutinas (${userRoutines.length})`}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    </div>

                    {/* Expandable sub-panel with all user routines & assignment */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#EAE3D9] space-y-3 animate-fadeIn">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#1C1917] font-heading">
                          Planes y Rutinas de @{acc.username}
                        </div>

                        {userRoutines.length > 0 ? (
                          <div className="space-y-2">
                            {userRoutines.map((r) => {
                              const isUserPrimary = acc.assignedRoutineId === r.id || primaryRoutine?.id === r.id;
                              return (
                                <div
                                  key={r.id}
                                  className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                    isUserPrimary
                                      ? 'bg-[#F8F2EC] border-[#9E5325]/40'
                                      : 'bg-[#FAF7F2] border-[#EAE3D9]'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[#1C1917] font-heading break-words">
                                        {r.name}
                                      </span>
                                      {isUserPrimary && (
                                        <span className="text-[9px] bg-[#9E5325] text-white px-2 py-0.5 rounded-full font-bold uppercase font-heading shrink-0 whitespace-nowrap">
                                          Principal
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[#78716C] block mt-0.5 truncate">
                                      {r.goal} • {r.days.length} días • {r.session_duration} min/sesión
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                    <button
                                      onClick={() => setPdfModalRoutine({ routine: r, athleteName: acc.fullName || acc.username })}
                                      className="bg-white hover:bg-[#F2E7DC] text-[#78716C] hover:text-[#9E5325] border border-[#EAE3D9] p-1.5 rounded-lg shrink-0"
                                      title="Exportar esta rutina a PDF imprimible"
                                    >
                                      <FileDown className="w-3.5 h-3.5" />
                                    </button>

                                    {!isUserPrimary && (
                                      <button
                                        onClick={() => handleAssignRoutineToUser(acc.username, r.id)}
                                        className="bg-white hover:bg-[#F2E7DC] text-[#9E5325] border border-[#EAE3D9] px-2.5 py-1 rounded-lg text-[11px] font-bold font-heading uppercase whitespace-nowrap"
                                      >
                                        Hacer Principal
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setEditingRoutine(r);
                                        setIsCreatorModalOpen(true);
                                      }}
                                      className="bg-white hover:bg-[#F2E7DC] text-[#9E5325] border border-[#EAE3D9] p-1.5 rounded-lg shrink-0"
                                      title="Modificar esta rutina"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#78716C]">
                            No hay rutinas vinculadas aún para este atleta.
                          </p>
                        )}

                        {/* Assign existing routine from library */}
                        <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EAE3D9] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <span className="text-[10px] font-bold text-[#78716C] uppercase font-heading shrink-0">
                            Asignar Rutina Existente:
                          </span>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignRoutineToUser(acc.username, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="flex-1 bg-white border border-[#EAE3D9] rounded-lg px-2 py-1.5 text-xs text-[#1C1917]"
                          >
                            <option value="">-- Seleccionar rutina del catálogo --</option>
                            {routines.map((r) => {
                              const diff = r.difficulty || r.level;
                              const diffLabel = diff ? `[${diff.toUpperCase()}] ` : '';
                              return (
                                <option key={r.id} value={r.id}>
                                  {diffLabel}{r.name} ({r.goal} - {r.days_per_week} días)
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {registeredAccounts.length === 0 && (
              <div className="bg-white p-6 rounded-2xl border border-[#EAE3D9] text-center text-xs text-[#78716C]">
                No hay usuarios disponibles. Pide al alumno que se registre en FitPlan y pulsa «Actualizar rutinas y usuarios».
              </div>
            )}
          </div>
        )}
      </main>

      {/* Routine definition and editing is handled by RoutineDefinitionModal */}

      {/* ================= MODAL: CREAR/EDITAR EJERCICIO ================= */}
      {editingExercise && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#EAE3D9] rounded-3xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="font-bold text-[#1C1917] text-base font-heading uppercase mb-3">
              {isNewExercise ? 'Nuevo Ejercicio al Catálogo' : 'Editar Ejercicio'}
            </h3>

            <form onSubmit={handleSaveExercise} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1C1917] block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editingExercise.name || ''}
                  onChange={(e) =>
                    setEditingExercise({ ...editingExercise, name: e.target.value })
                  }
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1C1917] block mb-1">Músculo</label>
                  <select
                    value={editingExercise.muscle_group || 'pecho'}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        muscle_group: e.target.value as MuscleGroup,
                      })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-2 py-1.5 text-xs text-[#1C1917]"
                  >
                    <option value="pecho">Pecho</option>
                    <option value="espalda">Espalda</option>
                    <option value="piernas">Piernas</option>
                    <option value="hombros">Hombros</option>
                    <option value="brazos">Brazos</option>
                    <option value="core">Core</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#1C1917] block mb-1">Equipamiento</label>
                  <select
                    value={editingExercise.equipment || 'ninguno'}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        equipment: e.target.value as Equipment,
                      })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-2 py-1.5 text-xs text-[#1C1917]"
                  >
                    <option value="ninguno">Sin equipo (Corporal)</option>
                    <option value="mancuernas">Mancuernas</option>
                    <option value="gimnasio">Gimnasio completo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1C1917] block mb-1">Descripción / Técnica</label>
                <textarea
                  rows={3}
                  value={editingExercise.description || ''}
                  onChange={(e) =>
                    setEditingExercise({ ...editingExercise, description: e.target.value })
                  }
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs text-[#1C1917]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white py-2.5 rounded-xl text-xs font-bold uppercase font-heading"
                >
                  Guardar Ejercicio
                </button>
                <button
                  type="button"
                  onClick={() => setEditingExercise(null)}
                  className="px-4 bg-[#FAF7F2] border border-[#EAE3D9] text-[#78716C] rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REGISTRAR NUEVO ATLETA ================= */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white border border-[#EAE3D9] rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-3 gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-[#9E5325] uppercase tracking-wider font-heading block truncate">
                  ADMINISTRADOR
                </span>
                <h3 className="font-black text-[#1C1917] text-sm sm:text-base font-heading uppercase truncate">
                  Registrar Nuevo Atleta
                </h3>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#EAE3D9] text-[#78716C] flex items-center justify-center shrink-0"
              >
                ✕
              </button>
            </div>

            {athleteErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="break-words">{athleteErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateAthleteAccount} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1C1917] block mb-1 uppercase font-heading text-[10px]">
                  Nombre Completo del Atleta
                </label>
                <input
                  type="text"
                  placeholder="Ej. Rodrigo Morales"
                  value={newAthleteFullName}
                  onChange={(e) => setNewAthleteFullName(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#9E5325]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1917] block mb-1 uppercase font-heading text-[10px]">
                  Nombre de Usuario (Login) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. rodrigo_m"
                  value={newAthleteUsername}
                  onChange={(e) => setNewAthleteUsername(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#9E5325]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1C1917] block mb-1 uppercase font-heading text-[10px]">
                    Contraseña Inicial
                  </label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={newAthletePassword}
                    onChange={(e) => setNewAthletePassword(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs text-[#1C1917]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1917] block mb-1 uppercase font-heading text-[10px]">
                    Código de Acceso
                  </label>
                  <select
                    value={newAthleteCode}
                    onChange={(e) => setNewAthleteCode(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-2 py-2 text-xs text-[#1C1917] font-mono font-bold"
                  >
                    {adminAccessCodes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1C1917] block mb-1 uppercase font-heading text-[10px]">
                  Asignar Rutina Inicial (Opcional)
                </label>
                <select
                  value={newAthleteRoutineId}
                  onChange={(e) => setNewAthleteRoutineId(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl px-2 py-2 text-xs text-[#1C1917]"
                >
                  <option value="">-- Sin rutina inicial (se creará después) --</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.goal} - {r.days_per_week} días)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white font-bold text-xs uppercase tracking-wider font-heading rounded-xl shadow-md"
                >
                  Registrar Atleta
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 min-h-[44px] bg-[#FAF7F2] border border-[#EAE3D9] text-[#78716C] font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Routine PDF Modal */}
      {pdfModalRoutine && (
        <ExportRoutinePdfModal
          isOpen={Boolean(pdfModalRoutine)}
          onClose={() => setPdfModalRoutine(null)}
          routine={pdfModalRoutine.routine}
          exercises={exercises}
          athleteName={pdfModalRoutine.athleteName}
        />
      )}

      {/* Routine Definition Form Modal (Admin / Athlete) */}
      <RoutineDefinitionModal
        isOpen={isCreatorModalOpen}
        onClose={() => {
          setIsCreatorModalOpen(false);
          setEditingRoutine(null);
        }}
        initialRoutine={editingRoutine}
      />

      {/* Upload Routine PDF Modal */}
      <UploadRoutinePdfModal
        isOpen={isPdfUploadOpen}
        onClose={() => setIsPdfUploadOpen(false)}
      />
    </div>
  );
};
