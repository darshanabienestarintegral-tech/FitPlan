import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Dumbbell,
  Clock,
  Flame,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ShieldAlert,
  Loader2,
  FileCheck,
  Play,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRoutineStore } from '../store/useRoutineStore';
import { useUserStore } from '../store/useUserStore';
import {
  parseRoutineFromPdf,
  convertParsedRoutineToAppRoutine,
  ParsedPdfRoutine,
} from '../utils/pdfRoutineParser';
import { Goal, Difficulty } from '../types';

interface UploadRoutinePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (routineId: string) => void;
  initialTargetUser?: string;
}

export const UploadRoutinePdfModal: React.FC<UploadRoutinePdfModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTargetUser,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exercises = useRoutineStore((s) => s.exercises);
  const routines = useRoutineStore((s) => s.routines);
  const addCustomRoutine = useRoutineStore((s) => s.addCustomRoutine);
  const updateRoutine = useRoutineStore((s) => s.updateRoutine);
  const addExerciseToLibrary = useRoutineStore((s) => s.addExerciseToLibrary);
  const setActiveRoutineById = useRoutineStore((s) => s.setActiveRoutineById);

  const currentUser = useUserStore((s) => s.currentUser);
  const profile = useUserStore((s) => s.profile);
  const registeredAccounts = useUserStore((s) => s.registeredAccounts);
  const isAdmin = Boolean(currentUser?.isAdmin);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [parsedData, setParsedData] = useState<ParsedPdfRoutine | null>(null);

  // Form customizations after parsing
  const [routineName, setRoutineName] = useState('');
  const [assignedStudent, setAssignedStudent] = useState(initialTargetUser || 'cristian_aguilera');
  const [selectedGoal, setSelectedGoal] = useState<Goal>('resistencia');
  const [makeActiveImmediately, setMakeActiveImmediately] = useState(true);
  const [expandedDayIndex, setExpandedDayIndex] = useState<number>(0);
  const [successSavedName, setSuccessSavedName] = useState('');

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Por favor sube un archivo con formato .PDF');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setIsProcessing(true);

    try {
      const parsed = await parseRoutineFromPdf(file, exercises);

      if (!parsed.days || parsed.days.length === 0) {
        throw new Error('No se detectaron días de entrenamiento en el PDF.');
      }

      setParsedData(parsed);
      setRoutineName(parsed.routineName);
      setSelectedGoal(parsed.goal);

      // Automatically identify if this routine corresponds to Cristian Aguilera
      const isForCristian =
        parsed.athleteName.toLowerCase().includes('cristian') ||
        parsed.routineName.toLowerCase().includes('cristian') ||
        initialTargetUser === 'cristian_aguilera';

      if (isForCristian) {
        setAssignedStudent('cristian_aguilera');
      } else if (currentUser?.username) {
        setAssignedStudent(currentUser.username);
      }
    } catch (err: any) {
      console.error('Error parsing PDF routine:', err);
      setErrorMessage(
        err?.message ||
          'No se pudo leer el archivo PDF. Asegúrate de que sea un PDF legible de rutina o plan de entrenamiento.'
      );
      setSelectedFile(null);
      setParsedData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRoutine = () => {
    if (!parsedData) return;

    try {
      const isCristian =
        assignedStudent === 'cristian_aguilera' ||
        routineName.toLowerCase().includes('cristian') ||
        parsedData.athleteName.toLowerCase().includes('cristian');

      const appRoutine = convertParsedRoutineToAppRoutine(
        {
          ...parsedData,
          routineName: routineName.trim() || parsedData.routineName,
          goal: selectedGoal,
        },
        assignedStudent,
        isAdmin ? 'admin' : currentUser?.username || 'usuario',
        isCristian ? true : false,
        exercises,
        (newlyCreated) => {
          newlyCreated.forEach((ex) => addExerciseToLibrary(ex));
        }
      );

      // Check if routine with this ID already exists (e.g. updating Cristian Aguilera's default routine)
      const existing = routines.find((r) => r.id === appRoutine.id);
      if (existing) {
        updateRoutine(existing.id, appRoutine);
      } else {
        addCustomRoutine(appRoutine, false);
      }

      // Activate routine immediately if option is checked
      if (makeActiveImmediately) {
        setActiveRoutineById(appRoutine.id);
      }

      try {
        confetti({
          particleCount: 90,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#9E5325', '#7B3A13', '#22C55E', '#EAE3D9'],
        });
      } catch {
        // ignore
      }

      setSuccessSavedName(appRoutine.name);
      if (onSuccess) {
        onSuccess(appRoutine.id);
      }

      setTimeout(() => {
        handleReset();
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Error saving routine:', err);
      setErrorMessage(err?.message || 'Error al guardar la rutina.');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedData(null);
    setErrorMessage('');
    setIsProcessing(false);
    setSuccessSavedName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isAssignedToCristian = assignedStudent === 'cristian_aguilera';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
    >
      <div className="bg-white border border-[#EAE3D9] rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl my-auto animate-scaleUp overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAE3D9] bg-[#FAF7F2] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE3D9] text-[#9E5325] flex items-center justify-center shadow-sm shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E5325] font-heading block">
                DARSHANA GYM • IMPORTADOR DE RUTINAS
              </span>
              <h2 className="text-base sm:text-lg font-black text-[#1C1917] font-heading uppercase tracking-tight truncate">
                Cargar Rutina desde Archivo PDF
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-[#EAE3D9] text-[#78716C] hover:text-[#1C1917] flex items-center justify-center transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successSavedName && (
          <div className="m-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-scaleUp">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-extrabold font-heading text-sm uppercase">¡Rutina cargada con éxito!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                "{successSavedName}" se ha integrado en la lista de rutinas de la aplicación.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2.5 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-500 hover:text-rose-800 text-[11px] underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {!parsedData ? (
            /* Upload Zone Screen */
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  dragActive
                    ? 'border-[#9E5325] bg-[#9E5325]/5 scale-[0.99]'
                    : 'border-[#EAE3D9] hover:border-[#9E5325] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-white border border-[#EAE3D9] text-[#9E5325] flex items-center justify-center shadow-sm">
                  {isProcessing ? (
                    <Loader2 className="w-7 h-7 animate-spin text-[#9E5325]" />
                  ) : (
                    <FileText className="w-7 h-7 text-[#9E5325]" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="font-heading font-black text-sm uppercase text-[#1C1917]">
                    {isProcessing ? 'Analizando Documento PDF...' : 'Selecciona o arrastra el archivo PDF aquí'}
                  </p>
                  <p className="text-xs text-[#78716C] max-w-sm mx-auto">
                    Compatible con planes de entrenamiento imprimibles de Darshana Gym o rutinas en formato PDF.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  className="mt-2 bg-[#9E5325] hover:bg-[#7B3A13] text-white text-xs font-bold px-4 py-2.5 rounded-xl uppercase font-heading transition-all shadow-sm flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Explorar Archivos</span>
                </button>
              </div>

              {/* Instructions & Features */}
              <div className="bg-[#FAF7F2] border border-[#EAE3D9] rounded-2xl p-4 space-y-2 text-xs text-[#78716C]">
                <p className="font-bold text-[#1C1917] font-heading uppercase text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#9E5325]" />
                  ¿Qué detecta automáticamente el sistema?
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>
                    <strong className="text-[#1C1917]">Estructura de días:</strong> Detecta Día 1, Día 2, Día 3 con
                    sus enfoques.
                  </li>
                  <li>
                    <strong className="text-[#1C1917]">Ejercicios y músculos:</strong> Vincula automáticamente los
                    ejercicios con la biblioteca o crea los faltantes.
                  </li>
                  <li>
                    <strong className="text-[#1C1917]">Series, Repeticiones y Descansos:</strong> Extrae series exactas
                    (ej. 4x8-10) y descansos (ej. 120s, 90s).
                  </li>
                  <li>
                    <strong className="text-[#1C1917]">Alumno asignado:</strong> Si el PDF corresponde a Cristian
                    Aguilera u otro alumno, se asigna con las protecciones correspondientes.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Parsed Routine Review & Confirmation Screen */
            <div className="space-y-5 animate-fadeIn">
              {/* File Info Pill */}
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold truncate">{selectedFile?.name}</p>
                    <p className="text-[10px] text-emerald-700">
                      {parsedData.days.length} Días detectados • {parsedData.days.reduce((acc, d) => acc + d.exercises.length, 0)} Ejercicios extraídos
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-[#78716C] hover:text-[#1C1917] underline font-semibold shrink-0"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Editable Fields */}
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE3D9] space-y-3.5 text-xs">
                <div>
                  <label className="font-black text-[#1C1917] block mb-1 uppercase font-heading text-[11px]">
                    Nombre de la Rutina
                  </label>
                  <input
                    type="text"
                    value={routineName}
                    onChange={(e) => setRoutineName(e.target.value)}
                    placeholder="Ej. Acondicionamiento Físico - Cristian Aguilera"
                    className="w-full bg-white border border-[#EAE3D9] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1917] font-bold focus:outline-none focus:border-[#9E5325]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-black text-[#1C1917] block mb-1 uppercase font-heading text-[11px]">
                      Asignar a Alumno
                    </label>
                    <select
                      value={assignedStudent}
                      onChange={(e) => setAssignedStudent(e.target.value)}
                      className="w-full bg-white border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#9E5325]"
                    >
                      <option value="cristian_aguilera">👤 Cristian Aguilera (Alumno Oficial)</option>
                      {registeredAccounts
                        .filter((a) => a.username !== 'cristian_aguilera' && a.username !== 'admin')
                        .map((acc) => (
                          <option key={acc.username} value={acc.username}>
                            👤 {acc.fullName || acc.username}
                          </option>
                        ))}
                      {currentUser?.username &&
                        currentUser.username !== 'cristian_aguilera' &&
                        currentUser.username !== 'admin' && (
                          <option value={currentUser.username}>👤 Mi Usuario ({currentUser.username})</option>
                        )}
                      {isAdmin && <option value="admin">⭐ Rutina General de Gimnasio</option>}
                    </select>
                  </div>

                  <div>
                    <label className="font-black text-[#1C1917] block mb-1 uppercase font-heading text-[11px]">
                      Objetivo
                    </label>
                    <select
                      value={selectedGoal}
                      onChange={(e) => setSelectedGoal(e.target.value as Goal)}
                      className="w-full bg-white border border-[#EAE3D9] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#9E5325]"
                    >
                      <option value="resistencia">Resistencia / Acondicionamiento</option>
                      <option value="hipertrofia">Hipertrofia Muscular</option>
                      <option value="fuerza">Fuerza Máxima</option>
                      <option value="perdida_grasa">Pérdida de Grasa</option>
                    </select>
                  </div>
                </div>

                {/* Protection notice if assigned to Cristian Aguilera */}
                {isAssignedToCristian && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold uppercase font-heading text-[11px]">
                        Seguridad y Permisos de Cristian Aguilera
                      </p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Esta rutina se guardará en la sección de rutinas personalizadas protegida. Solo el alumno
                        Cristian Aguilera podrá seleccionarla en su perfil, y las modificaciones futuras solo las
                        puede autorizar el administrador.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Days Accordion */}
              <div className="space-y-2">
                <p className="font-black text-xs uppercase font-heading text-[#1C1917] flex items-center justify-between">
                  <span>Días de Entrenamiento Detectados ({parsedData.days.length})</span>
                  <span className="text-[11px] text-[#78716C] font-normal">Revisa los ejercicios extraídos</span>
                </p>

                <div className="space-y-2.5">
                  {parsedData.days.map((day, dIdx) => {
                    const isExpanded = expandedDayIndex === dIdx;
                    return (
                      <div
                        key={dIdx}
                        className="bg-white border border-[#EAE3D9] rounded-2xl overflow-hidden transition-all shadow-xs"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedDayIndex(isExpanded ? -1 : dIdx)}
                          className="w-full p-3 bg-[#FAF7F2]/80 hover:bg-[#FAF7F2] text-left flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-[#9E5325] text-white text-xs font-black flex items-center justify-center font-heading shrink-0">
                              {dIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-[#1C1917] font-heading uppercase truncate">
                                {day.name}
                              </p>
                              {day.focus && (
                                <p className="text-[11px] text-[#78716C] truncate">{day.focus}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] bg-white border border-[#EAE3D9] px-2 py-0.5 rounded-full font-bold text-[#9E5325]">
                              {day.exercises.length} ejercicios
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#78716C]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#78716C]" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-3 divide-y divide-[#EAE3D9] text-xs">
                            {day.exercises.map((ex, exIdx) => (
                              <div
                                key={exIdx}
                                className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#1C1917]">{ex.name}</span>
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#FAF7F2] text-[#78716C] border border-[#EAE3D9] font-bold">
                                      {ex.muscle}
                                    </span>
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                                      {ex.equipment}
                                    </span>
                                  </div>
                                  {ex.matchedExerciseId ? (
                                    <p className="text-[10px] text-emerald-700 mt-0.5 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 inline" />
                                      Enlazado con biblioteca de ejercicios
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-blue-700 mt-0.5 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 inline" />
                                      Se creará como nuevo ejercicio
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 text-xs font-bold">
                                  <span className="bg-[#FAF7F2] border border-[#EAE3D9] px-2 py-1 rounded-lg text-[#1C1917]">
                                    {ex.sets} × {ex.reps}
                                  </span>
                                  <span className="bg-[#FAF7F2] border border-[#EAE3D9] px-2 py-1 rounded-lg text-[#9E5325] flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {ex.restSeconds}s
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Set Active Checkbox */}
              <div className="p-3 bg-white border border-[#EAE3D9] rounded-2xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="makeActiveImmediately"
                  checked={makeActiveImmediately}
                  onChange={(e) => setMakeActiveImmediately(e.target.checked)}
                  className="w-4 h-4 text-[#9E5325] rounded border-[#EAE3D9] focus:ring-[#9E5325]"
                />
                <label htmlFor="makeActiveImmediately" className="text-xs font-bold text-[#1C1917] cursor-pointer">
                  Cargar y activar inmediatamente en la pantalla de entrenamiento
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#EAE3D9] bg-[#FAF7F2] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#EAE3D9] bg-white text-xs font-bold font-heading uppercase text-[#78716C] hover:text-[#1C1917] transition-all"
          >
            Cancelar
          </button>

          {parsedData && (
            <button
              type="button"
              onClick={handleSaveRoutine}
              className="bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 font-heading uppercase shadow-md transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Cargar a la Lista de Rutinas</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
