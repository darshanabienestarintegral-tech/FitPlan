import React, { useState } from 'react';
import { FileDown, Printer, X, Check, Dumbbell, Sparkles, AlertCircle } from 'lucide-react';
import { Routine, Exercise } from '../types';
import { downloadRoutinePDF } from '../utils/routinePdf';

interface ExportRoutinePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  routine: Routine;
  exercises: Exercise[];
  athleteName?: string;
}

export const ExportRoutinePdfModal: React.FC<ExportRoutinePdfModalProps> = ({
  isOpen,
  onClose,
  routine,
  exercises,
  athleteName,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    try {
      setIsGenerating(true);
      downloadRoutinePDF({
        routine,
        exercises,
        athleteName,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getExercise = (id: string) => exercises.find((e) => e.id === id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto no-print">
      <div className="bg-[#FAF7F2] rounded-2xl max-w-2xl w-full border border-[#EAE3D9] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAE3D9] bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#F8F2EC] border border-[#E7DFD5] flex items-center justify-center text-[#9E5325] shrink-0">
              <FileDown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-[#1C1917] font-heading uppercase tracking-tight truncate">
                Exportar Rutina a PDF
              </h2>
              <p className="text-xs text-[#78716C] truncate">
                Documento imprimible con casillas para llevar y anotar al gimnasio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] hover:text-[#1C1917] flex items-center justify-center transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="px-4 py-3 bg-[#F8F2EC] border-b border-[#EAE3D9] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs font-semibold text-[#78716C] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#9E5325]" />
            <span>Formato A4 optimizado con seguimiento de series</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-[#EAE3D9] bg-white hover:bg-[#F2E7DC] text-[#1C1917] text-xs font-bold font-heading flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Abrir diálogo de impresión directa"
            >
              <Printer className="w-3.5 h-3.5 text-[#78716C]" />
              <span className="whitespace-nowrap">Imprimir</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold font-heading uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                downloadSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] hover:to-[#6E320F] shadow-[#9E5325]/25'
              }`}
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span className="whitespace-nowrap">¡PDF Descargado!</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span className="whitespace-nowrap">
                    {isGenerating ? 'Generando...' : 'Descargar PDF'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Document Preview (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#F5EFE6]">
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#EAE3D9] shadow-sm max-w-xl mx-auto text-xs text-[#1C1917]">
            {/* Sheet Header */}
            <div className="border-b-2 border-[#9E5325] pb-3 mb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#9E5325] uppercase font-heading block">
                    DARSHANA GYM
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#1C1917] font-heading uppercase">
                    {routine.name}
                  </h3>
                  <div className="text-[11px] text-[#78716C] mt-0.5">
                    Objetivo: <span className="font-semibold capitalize text-[#1C1917]">{routine.goal.replace('_', ' ')}</span> • {routine.days_per_week} días/semana • ~{routine.session_duration || 60} min
                  </div>
                </div>

                <div className="text-right text-[11px] text-[#78716C] shrink-0">
                  <div>{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  {athleteName && (
                    <div className="font-bold text-[#1C1917] mt-0.5">Atleta: {athleteName}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Gym Tip Banner */}
            <div className="bg-[#FAF7F2] border border-[#EAE3D9] rounded-lg p-2.5 mb-4 text-[11px] text-[#78716C] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#9E5325] shrink-0" />
              <span>Lleva esta hoja al gimnasio. Anota tus cargas y repeticiones en las casillas correspondientes de cada serie.</span>
            </div>

            {/* Routine Days */}
            <div className="space-y-4">
              {routine.days.map((day, dIdx) => (
                <div key={day.id || dIdx} className="border border-[#EAE3D9] rounded-lg overflow-hidden">
                  {/* Day Header */}
                  <div className="bg-[#9E5325] text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold font-heading">
                    <span className="truncate">DÍA {dIdx + 1}: {day.name}</span>
                    <span className="text-[10px] opacity-90 font-normal shrink-0">{day.focus}</span>
                  </div>

                  {/* Exercises Table */}
                  <div className="divide-y divide-[#EAE3D9] bg-white">
                    <div className="bg-[#FAF7F2] px-3 py-1.5 grid grid-cols-12 gap-1 text-[10px] font-bold text-[#78716C] font-heading uppercase">
                      <div className="col-span-1">#</div>
                      <div className="col-span-5">Ejercicio</div>
                      <div className="col-span-2">Series×Reps</div>
                      <div className="col-span-4 text-right">Registro Series</div>
                    </div>

                    {day.exercise_configs.map((config, exIdx) => {
                      const ex = getExercise(config.exerciseId);
                      const setsCount = Number(config.sets) || 3;
                      const maxBoxes = Math.min(setsCount, 4);

                      return (
                        <div key={config.exerciseId + exIdx} className="px-3 py-2 grid grid-cols-12 gap-1 items-center hover:bg-[#FCFAF7] text-xs">
                          <div className="col-span-1 font-bold text-[#9E5325] text-[11px]">
                            {exIdx + 1}
                          </div>
                          <div className="col-span-5 min-w-0 pr-1">
                            <div className="font-bold text-[#1C1917] truncate">{ex?.name || 'Ejercicio'}</div>
                            <div className="text-[10px] text-[#78716C] uppercase truncate">{ex?.muscle_group || 'General'} • {config.restSeconds || 90}s rest</div>
                          </div>
                          <div className="col-span-2 font-semibold text-[#1C1917] text-[11px] whitespace-nowrap">
                            {config.sets} × {config.reps}
                          </div>
                          <div className="col-span-4 flex items-center justify-end gap-1">
                            {Array.from({ length: maxBoxes }).map((_, sIdx) => (
                              <div
                                key={sIdx}
                                className="w-8 h-6 rounded border border-[#D8C5B3] bg-white flex flex-col items-center justify-center text-[8px] text-[#78716C]"
                              >
                                <span className="text-[7px] text-[#9E5325] font-bold">S{sIdx + 1}</span>
                                <span className="border-b border-[#D8C5B3] w-4 mt-0.5"></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Notes Section Preview */}
            <div className="mt-4 pt-3 border-t border-[#EAE3D9]">
              <div className="text-[10px] font-bold text-[#9E5325] uppercase font-heading mb-1">
                Notas y observaciones del gimnasio:
              </div>
              <div className="border-b border-dashed border-[#D8C5B3] h-4"></div>
              <div className="border-b border-dashed border-[#D8C5B3] h-4"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#EAE3D9] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-[#78716C] flex items-center gap-1 truncate">
            <Dumbbell className="w-3.5 h-3.5 text-[#9E5325] shrink-0" />
            <span className="truncate">Archivo PDF vectorial de alta calidad, listo para imprimir en cualquier impresora.</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-[#EAE3D9] hover:bg-[#FAF7F2] text-[#78716C] text-xs font-semibold"
            >
              Cerrar
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-[#9E5325] hover:bg-[#8C4318] text-white text-xs font-bold font-heading uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
