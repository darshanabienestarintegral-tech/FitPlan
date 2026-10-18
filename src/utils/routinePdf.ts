import { jsPDF } from 'jspdf';
import { Exercise, Routine } from '../types';

interface ExportPdfOptions {
  routine: Routine;
  exercises: Exercise[];
  athleteName?: string;
}

export function generateRoutinePDF({ routine, exercises, athleteName }: ExportPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 14;

  const getExercise = (id: string) => exercises.find((e) => e.id === id);

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      currentY = 14;
      renderHeaderCompact();
    }
  };

  const renderHeaderCompact = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(158, 83, 37); // #9E5325
    doc.text('DARSHANA GYM • HOJA DE ENTRENAMIENTO', margin, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(routine.name, pageWidth - margin, currentY, { align: 'right' });

    currentY += 4;
    doc.setDrawColor(234, 227, 217);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;
  };

  // --- FIRST PAGE COVER / HEADER ---
  // Background Header Banner
  doc.setFillColor(248, 242, 236); // #F8F2EC
  doc.roundedRect(margin, currentY, contentWidth, 28, 3, 3, 'F');
  doc.setDrawColor(220, 205, 190);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 28, 3, 3, 'S');

  // Brand title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(28, 25, 23); // #1C1917
  doc.text('DARSHANA GYM', margin + 5, currentY + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(158, 83, 37); // #9E5325
  doc.text('PLAN DE ENTRENAMIENTO IMPRIMIBLE', margin + 5, currentY + 12);

  // Date and Athlete info right aligned
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 75, 70);
  const todayStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Fecha: ${todayStr}`, pageWidth - margin - 5, currentY + 7, { align: 'right' });

  if (athleteName) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Atleta: ${athleteName}`, pageWidth - margin - 5, currentY + 12, { align: 'right' });
  }

  // Routine Meta Chips in Header Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`Rutina: ${routine.name.toUpperCase()}`, margin + 5, currentY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  const goalFormatted = routine.goal.replace('_', ' ').toUpperCase();
  doc.text(
    `Objetivo: ${goalFormatted}   |   ${routine.days_per_week} Días/Semana   |   ~${routine.session_duration || 60} min/sesión`,
    margin + 5,
    currentY + 25
  );

  currentY += 34;

  // --- INSTRUCTIONS & GYM LOG BANNER ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(234, 227, 217);
  doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(158, 83, 37);
  doc.text('GUÍA PARA EL GIMNASIO:', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 75, 70);
  doc.text(
    'Lleva esta hoja y un bolígrafo. Anota el peso (kg) y las reps en las casillas [S1, S2, ...] para registrar tu sobrecarga progresiva.',
    margin + 4,
    currentY + 9
  );

  currentY += 16;

  // --- DAYS BREAKDOWN ---
  routine.days.forEach((day, dayIndex) => {
    // Header for the Day
    checkPageBreak(25);

    doc.setFillColor(158, 83, 37); // Terracotta #9E5325
    doc.roundedRect(margin, currentY, contentWidth, 8.5, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`DÍA ${dayIndex + 1}: ${day.name.toUpperCase()}`, margin + 4, currentY + 5.8);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Enfoque: ${day.focus}`, pageWidth - margin - 4, currentY + 5.8, { align: 'right' });

    currentY += 11;

    // Table Column Headers
    checkPageBreak(12);
    doc.setFillColor(242, 237, 230);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setDrawColor(220, 210, 200);
    doc.rect(margin, currentY, contentWidth, 6, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(60, 55, 50);

    doc.text('#', margin + 3, currentY + 4.2);
    doc.text('EJERCICIO / GRUPO', margin + 9, currentY + 4.2);
    doc.text('EQUIPO', margin + 68, currentY + 4.2);
    doc.text('SERIES × REPS', margin + 94, currentY + 4.2);
    doc.text('DESCANSO', margin + 120, currentY + 4.2);
    doc.text('REGISTRO DE SERIES (PESO / REPS)', margin + 140, currentY + 4.2);

    currentY += 6.5;

    // Exercise Rows
    day.exercise_configs.forEach((config, exIndex) => {
      const ex = getExercise(config.exerciseId);
      const exName = ex?.name || 'Ejercicio';
      const muscleGroup = ex?.muscle_group ? ex.muscle_group.toUpperCase() : 'GENERAL';
      const equipment = ex?.equipment ? ex.equipment.toUpperCase() : 'LIBRE';
      const setsCount = Number(config.sets) || 3;
      const repsStr = String(config.reps || '10-12');
      const restStr = config.restSeconds === 0 ? '—' : config.restLabel?.startsWith('60–90') ? '60–90s' : `${config.restSeconds ?? 90}s`;

      const rowHeight = 11.5;
      checkPageBreak(rowHeight + 2);

      // Alternate row backgrounds
      if (exIndex % 2 === 1) {
        doc.setFillColor(252, 250, 247);
        doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
      }

      // Border bottom
      doc.setDrawColor(238, 232, 224);
      doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

      // Number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(158, 83, 37);
      doc.text(`${exIndex + 1}`, margin + 3, currentY + 4.5);

      // Exercise Name & Muscle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(28, 25, 23);
      const truncatedName = exName.length > 32 ? exName.substring(0, 31) + '...' : exName;
      doc.text(truncatedName, margin + 9, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 113, 108);
      doc.text(muscleGroup, margin + 9, currentY + 8.5);

      // Equipment
      doc.setFontSize(6.8);
      doc.setTextColor(80, 75, 70);
      doc.text(equipment, margin + 68, currentY + 5.5);

      // Sets & Reps
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(28, 25, 23);
      doc.text(`${setsCount} × ${repsStr}`, margin + 94, currentY + 5.5);

      // Rest
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 113, 108);
      doc.text(restStr, margin + 120, currentY + 5.5);

      // Gym Set Logging Boxes: [S1: ___] [S2: ___] [S3: ___] [S4: ___]
      const maxBoxes = Math.min(setsCount, 4);
      const boxWidth = 9.8;
      const boxHeight = 6.2;
      const startBoxX = margin + 140;

      for (let s = 1; s <= maxBoxes; s++) {
        const boxX = startBoxX + (s - 1) * (boxWidth + 1.2);
        const boxY = currentY + 2.2;

        // Draw small set box
        doc.setDrawColor(190, 180, 170);
        doc.setLineWidth(0.25);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 0.8, 0.8, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(158, 83, 37);
        doc.text(`S${s}`, boxX + 1.2, boxY + 2.4);

        // Underline for weight writing
        doc.setDrawColor(210, 200, 190);
        doc.line(boxX + 1, boxY + 4.8, boxX + boxWidth - 1, boxY + 4.8);
      }

      currentY += rowHeight;
    });

    currentY += 5; // Space between days
  });

  // --- NOTES & TRACKING SECTION ---
  checkPageBreak(30);
  doc.setFillColor(250, 246, 240);
  doc.setDrawColor(230, 220, 210);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(158, 83, 37);
  doc.text('NOTAS Y OBSERVACIONES DEL ENTRENAMIENTO:', margin + 4, currentY + 5);

  // Note lines for handwritten notes
  doc.setDrawColor(220, 212, 202);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(margin + 4, currentY + 11, pageWidth - margin - 4, currentY + 11);
  doc.line(margin + 4, currentY + 16, pageWidth - margin - 4, currentY + 16);
  doc.line(margin + 4, currentY + 21, pageWidth - margin - 4, currentY + 21);
  doc.setLineDashPattern([], 0); // Reset dash

  currentY += 28;

  // --- FOOTER FOR ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 130, 120);
    doc.text(
      'Darshana Gym • Plan para gimnasio • Mantén la constancia y sobrecarga progresiva',
      margin,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  return doc;
}

export function downloadRoutinePDF(options: ExportPdfOptions): void {
  const doc = generateRoutinePDF(options);
  const cleanName = (options.routine.name || 'Rutina')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  doc.save(`Darshana_Rutina_${cleanName}.pdf`);
}
