import React, { useState, useMemo } from 'react';
import {
  X,
  Dumbbell,
  ShieldCheck,
  Check,
  Trash2,
  Lock,
  Plus,
  FileDown,
  Sparkles,
  Filter,
  AlertCircle,
  Award,
  Calendar,
  Layers,
  Edit3,
  User,
  Upload,
} from 'lucide-react';
import { Difficulty, Routine } from '../types';
import { useRoutineStore } from '../store/useRoutineStore';
import { useUserStore } from '../store/useUserStore';
import { ExportRoutinePdfModal } from './ExportRoutinePdfModal';
import { RoutineDefinitionModal } from './RoutineDefinitionModal';
import { UploadRoutinePdfModal } from './UploadRoutinePdfModal';
import confetti from 'canvas-confetti';

export const isPersonalizedRoutine = (r: Routine): boolean => {
  if (!r) return false;
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
};

interface RoutineCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreator: () => void;
}

const levelBadgeColorMap: Record<Difficulty, { bg: string; text: string; border: string; label: string }> = {
  principiante: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    label: 'Principiante',
  },
  intermedio: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    label: 'Intermedio / Medio',
  },
  avanzado: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    label: 'Avanzado',
  },
};

export const RoutineCatalogModal: React.FC<RoutineCatalogModalProps> = ({
  isOpen,
  onClose,
  onOpenCreator,
}) => {
  const routines = useRoutineStore((s) => s.routines);
  const activeRoutine = useRoutineStore((s) => s.activeRoutine);
  const setActiveRoutineById = useRoutineStore((s) => s.setActiveRoutineById);
  const deleteRoutine = useRoutineStore((s) => s.deleteRoutine);
  const canDeleteRoutine = useRoutineStore((s) => s.canDeleteRoutine);
  const exercises = useRoutineStore((s) => s.exercises);

  const currentUser = useUserStore((s) => s.currentUser);
  const profile = useUserStore((s) => s.profile);
  const isAdmin = Boolean(currentUser?.isAdmin);

  const canEditRoutine = useRoutineStore((s) => s.canEditRoutine);

  const [selectedTab, setSelectedTab] = useState<'todos' | 'personalizadas' | Difficulty>('todos');
  const [pdfRoutine, setPdfRoutine] = useState<Routine | null>(null);
  const [isPdfUploadOpen, setIsPdfUploadOpen] = useState(false);
  const [editingRoutineForModal, setEditingRoutineForModal] = useState<Routine | null>(null);
  const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  const filteredRoutines = useMemo(() => {
    return routines
      .filter((r) => {
        if (selectedTab === 'todos') return true;
        if (selectedTab === 'personalizadas') {
          return isPersonalizedRoutine(r);
        }
        return r.difficulty === selectedTab || r.level === selectedTab;
      })
      .sort((a, b) => {
        // En la sección de personalizadas, Cristian Aguilera se ubica de forma destacada al inicio
        if (selectedTab === 'personalizadas') {
          const aIsCristian = a.id.includes('cristian') || a.name.toLowerCase().includes('cristian');
          const bIsCristian = b.id.includes('cristian') || b.name.toLowerCase().includes('cristian');
          if (aIsCristian && !bIsCristian) return -1;
          if (!aIsCristian && bIsCristian) return 1;
        }
        return 0;
      });
  }, [routines, selectedTab]);

  if (!isOpen) return null;

  const countPrincipiante = routines.filter((r) => r.difficulty === 'principiante' || r.level === 'principiante').length;
  const countIntermedio = routines.filter((r) => r.difficulty === 'intermedio' || r.level === 'intermedio').length;
  const countAvanzado = routines.filter((r) => r.difficulty === 'avanzado' || r.level === 'avanzado').length;
  const countPersonalizadas = routines.filter(isPersonalizedRoutine).length;

  const handleSelectRoutine = (routineId: string) => {
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
    onClose();
  };

  const handleAttemptDelete = (routine: Routine) => {
    const check = canDeleteRoutine(routine.id);
    if (!check.allowed) {
      setPermissionNotice(check.reason || 'No tienes permisos para eliminar esta rutina.');
      setTimeout(() => setPermissionNotice(null), 4000);
      return;
    }
    setRoutineToDelete(routine);
  };

  const confirmDelete = () => {
    if (!routineToDelete) return;
    deleteRoutine(routineToDelete.id);
    setRoutineToDelete(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white border border-[#EAE3D9] rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl my-auto animate-scaleUp overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAE3D9] bg-[#FAF7F2] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE3D9] text-[#9E5325] flex items-center justify-center shadow-sm shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E5325] font-heading whitespace-nowrap">
                  DARSHANA GYM • CATÁLOGO
                </span>
                {isAdmin ? (
                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                    Modo Admin
                  </span>
                ) : (
                  <span className="text-[9px] bg-[#EAE3D9] text-[#78716C] font-semibold px-1.5 py-0.2 rounded">
                    Atleta
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#1C1917] font-heading uppercase tracking-tight truncate">
                Planes de Entrenamiento
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsPdfUploadOpen(true)}
              className="bg-white hover:bg-[#FAF7F2] text-[#9E5325] border border-[#EAE3D9] text-xs font-bold px-3 py-2 rounded-xl shadow-xs flex items-center gap-1.5 font-heading uppercase transition-all whitespace-nowrap"
              title="Cargar rutina del alumno desde archivo PDF"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Subir PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenCreator();
              }}
              className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm flex items-center gap-1.5 font-heading uppercase transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Nueva Rutina</span>
              <span className="sm:hidden">Crear</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-[#EAE3D9] text-[#78716C] hover:text-[#1C1917] flex items-center justify-center transition-colors shrink-0"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="p-3 bg-[#FAF7F2]/60 border-b border-[#EAE3D9] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setSelectedTab('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider font-heading transition-all whitespace-nowrap ${
              selectedTab === 'todos'
                ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-sm'
                : 'bg-white text-[#78716C] hover:text-[#1C1917] border border-[#EAE3D9]'
            }`}
          >
            Todas ({routines.length})
          </button>

          <button
            onClick={() => setSelectedTab('personalizadas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider font-heading transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedTab === 'personalizadas'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personalizadas</span>
            <span className="text-[10px] opacity-80">({countPersonalizadas})</span>
          </button>

          <button
            onClick={() => setSelectedTab('principiante')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider font-heading transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedTab === 'principiante'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <span>Principiante</span>
            <span className="text-[10px] opacity-80">({countPrincipiante})</span>
          </button>

          <button
            onClick={() => setSelectedTab('intermedio')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider font-heading transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedTab === 'intermedio'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span>Medio / Intermedio</span>
            <span className="text-[10px] opacity-80">({countIntermedio})</span>
          </button>

          <button
            onClick={() => setSelectedTab('avanzado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider font-heading transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedTab === 'avanzado'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-white text-rose-800 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            <span>Avanzado</span>
            <span className="text-[10px] opacity-80">({countAvanzado})</span>
          </button>
        </div>

        {/* Permission Alert Notice */}
        {permissionNotice && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl flex items-center gap-2.5 text-xs font-medium animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="flex-1">{permissionNotice}</span>
            <button onClick={() => setPermissionNotice(null)} className="text-amber-700 font-bold hover:underline">
              Cerrar
            </button>
          </div>
        )}

        {/* Delete Confirmation Card Dialog */}
        {routineToDelete && (
          <div className="mx-4 mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl animate-scaleUp">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold uppercase font-heading text-rose-900">
                  ¿Confirmar eliminación de rutina?
                </h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Vas a eliminar permanentemente &quot;{routineToDelete.name}&quot;.
                  {routineToDelete.is_default && isAdmin && (
                    <span className="block font-bold mt-0.5">
                      (Esta es una rutina predeterminada. Como administrador tienes autorización para borrarla).
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    onClick={confirmDelete}
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

        {/* Scrollable Routine Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {filteredRoutines.length === 0 ? (
            <div className="text-center py-12 px-4 bg-[#FAF7F2] rounded-3xl border border-[#EAE3D9]">
              <Dumbbell className="w-10 h-10 text-[#A8A29E] mx-auto mb-2 opacity-50" />
              <h3 className="font-bold text-[#1C1917] text-sm uppercase font-heading">
                No hay rutinas en esta categoría
              </h3>
              <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto">
                No se encontraron planes con este filtro.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenCreator();
                }}
                className="mt-4 bg-[#9E5325] text-white font-bold text-xs px-4 py-2 rounded-xl font-heading uppercase"
              >
                + Crear Rutina Personalizada
              </button>
            </div>
          ) : (
            filteredRoutines.map((routine) => {
              const isActive = activeRoutine?.id === routine.id;
              const diffLevel = routine.difficulty || routine.level;
              const levelBadge = diffLevel ? levelBadgeColorMap[diffLevel] : null;
              const isDefault = Boolean(routine.is_default);
              const isCristian = routine.id.includes('cristian') || routine.name.toLowerCase().includes('cristian');
              const isPersonal = isPersonalizedRoutine(routine);
              const editCheck = canEditRoutine(routine.id);
              const deleteCheck = canDeleteRoutine(routine.id);

              return (
                <article
                  key={routine.id}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-sm ${
                    isActive ? 'border-[#9E5325] ring-2 ring-[#9E5325]/15' : 'border-[#EAE3D9] hover:border-[#D8C5B3]'
                  } ${isCristian ? 'bg-gradient-to-br from-amber-50/20 via-white to-orange-50/30 border-amber-300' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      {/* Badge Tags Row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {isCristian && (
                          <span className="text-[10px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white font-black px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 whitespace-nowrap">
                            <User className="w-3 h-3" />
                            <span>Alumno: Cristian Aguilera</span>
                          </span>
                        )}

                        {isPersonal && (
                          <span className="text-[10px] bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-full border border-purple-300 whitespace-nowrap">
                            Personalizada
                          </span>
                        )}

                        {isDefault && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300 whitespace-nowrap">
                            Predeterminada
                          </span>
                        )}

                        {(isDefault || routine.created_by === 'admin') && (
                          <span className="text-[10px] bg-stone-100 text-stone-700 font-semibold px-2 py-0.5 rounded-full border border-stone-300 flex items-center gap-1 whitespace-nowrap">
                            <Lock className="w-2.5 h-2.5 text-stone-600" />
                            <span>Solo Admin</span>
                          </span>
                        )}

                        {levelBadge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${levelBadge.bg} ${levelBadge.text} ${levelBadge.border}`}
                          >
                            {levelBadge.label}
                          </span>
                        )}

                        <span className="text-[10px] text-[#78716C] bg-[#FAF7F2] font-semibold px-2 py-0.5 rounded-full border border-[#EAE3D9] whitespace-nowrap">
                          {routine.days_per_week} días / sem • {routine.session_duration} min
                        </span>

                        {isActive && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 whitespace-nowrap">
                            <Check className="w-3 h-3 stroke-[3px]" />
                            <span>Rutina Activa</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-[#1C1917] text-sm sm:text-base font-heading leading-tight break-words">
                        {routine.name}
                      </h3>

                      <p className="text-[11px] text-[#78716C] mt-0.5">
                        Objetivo: <span className="font-semibold text-[#44403C] capitalize">{routine.goal}</span> •{' '}
                        {routine.days.length} sesiones por semana
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                      <button
                        onClick={() => setPdfRoutine(routine)}
                        className="bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] hover:text-[#9E5325] px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] text-xs font-bold flex items-center gap-1 font-heading uppercase whitespace-nowrap transition-colors"
                        title="Exportar a PDF imprimible"
                      >
                        <FileDown className="w-3.5 h-3.5 shrink-0" />
                        <span>PDF</span>
                      </button>

                      {/* Edit Routine Button - strictly restricted to Admin */}
                      {editCheck.allowed ? (
                        <button
                          onClick={() => setEditingRoutineForModal(routine)}
                          className="bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#9E5325] px-2.5 py-1.5 rounded-xl border border-[#EAE3D9] text-xs font-bold flex items-center gap-1 font-heading uppercase whitespace-nowrap transition-colors"
                          title="Editar rutina (Autorizado como Administrador)"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Editar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setPermissionNotice(
                              editCheck.reason ||
                                'Esta rutina de Cristian Aguilera es predeterminada y solo puede ser editada por el administrador de la aplicación.'
                            );
                            setTimeout(() => setPermissionNotice(null), 4500);
                          }}
                          className="bg-[#FAF7F2] text-[#A8A29E] hover:text-amber-800 px-2 py-1.5 rounded-xl border border-[#EAE3D9] text-xs font-semibold flex items-center gap-1 font-heading uppercase whitespace-nowrap transition-colors"
                          title={
                            editCheck.reason ||
                            'Solo el administrador de la aplicación puede editar esta rutina.'
                          }
                        >
                          <Lock className="w-3.5 h-3.5 text-[#A8A29E] shrink-0" />
                          <span className="hidden sm:inline">Solo Admin</span>
                        </button>
                      )}

                      {!isActive ? (
                        <button
                          onClick={() => handleSelectRoutine(routine.id)}
                          className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 font-heading uppercase whitespace-nowrap shadow-sm transition-all"
                        >
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>Activar</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl font-heading uppercase flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>En uso</span>
                        </span>
                      )}

                      {/* Delete Routine Button with Permission Enforcement */}
                      {deleteCheck.allowed ? (
                        <button
                          onClick={() => handleAttemptDelete(routine)}
                          className="p-2 text-[#A8A29E] hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors shrink-0"
                          title={
                            isDefault
                              ? 'Eliminar rutina predeterminada (Autorizado como Administrador)'
                              : 'Eliminar mi rutina personalizada'
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAttemptDelete(routine)}
                          className="p-2 text-[#D6D3D1] hover:text-amber-700 rounded-xl hover:bg-amber-50/60 transition-colors shrink-0 cursor-not-allowed"
                          title={deleteCheck.reason || 'Rutina predeterminada: solo el administrador puede eliminarla.'}
                        >
                          <Lock className="w-3.5 h-3.5 text-[#A8A29E]" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Days Mini-List */}
                  <div className="mt-3 pt-2.5 border-t border-[#EAE3D9] flex flex-wrap gap-1.5">
                    {routine.days.map((d, dIdx) => (
                      <span
                        key={d.id || dIdx}
                        className="text-[10px] bg-[#FAF7F2] text-[#44403C] px-2 py-1 rounded-lg border border-[#EAE3D9] font-medium truncate max-w-full"
                        title={d.focus}
                      >
                        <span className="font-bold text-[#9E5325]">Día {dIdx + 1}:</span> {d.name.replace(/^Día \d+:\s*/, '')} ({d.exercise_ids.length} ex)
                      </span>
                    ))}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Modal Footer Info */}
        <div className="p-3 bg-[#FAF7F2] border-t border-[#EAE3D9] text-[11px] text-[#78716C] flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-center sm:text-left">
            <Lock className="w-3.5 h-3.5 text-[#9E5325] shrink-0" />
            <span>
              {isAdmin
                ? 'Como Administrador tienes privilegios para eliminar rutinas predeterminadas y personalizadas.'
                : 'Las rutinas predeterminadas no pueden ser eliminadas por atletas (solo tus propias rutinas).'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-[#9E5325] hover:underline uppercase font-heading whitespace-nowrap"
          >
            Cerrar Catálogo
          </button>
        </div>
      </div>

      {/* Routine PDF Export Modal Sub-Dialog */}
      {pdfRoutine && (
        <ExportRoutinePdfModal
          isOpen={Boolean(pdfRoutine)}
          onClose={() => setPdfRoutine(null)}
          routine={pdfRoutine}
          exercises={exercises}
          athleteName={profile?.name || currentUser?.username}
        />
      )}

      {/* Routine Definition Modal for editing by admin */}
      {editingRoutineForModal && (
        <RoutineDefinitionModal
          isOpen={Boolean(editingRoutineForModal)}
          onClose={() => setEditingRoutineForModal(null)}
          initialRoutine={editingRoutineForModal}
        />
      )}

      {/* Upload Routine PDF Modal */}
      <UploadRoutinePdfModal
        isOpen={isPdfUploadOpen}
        onClose={() => setIsPdfUploadOpen(false)}
      />
    </div>
  );
};
