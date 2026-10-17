import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { Exercise, Goal, Difficulty, Equipment, MuscleGroup, Routine, RoutineDay, RoutineExerciseConfig } from '../types';

// Configure matching worker URL for browser environment
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfjsWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;
}

export interface ParsedPdfExercise {
  name: string;
  originalRawName: string;
  matchedExerciseId?: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  sets: number;
  reps: string | number;
  restSeconds: number;
}

export interface ParsedPdfDay {
  dayNumber: number;
  name: string;
  focus: string;
  exercises: ParsedPdfExercise[];
}

export interface ParsedPdfRoutine {
  routineName: string;
  athleteName: string;
  goal: Goal;
  difficulty: Difficulty;
  daysPerWeek: number;
  sessionDuration: number;
  days: ParsedPdfDay[];
  rawTextPreview: string;
}

function normalizeMatch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function findBestExerciseMatch(rawName: string, exercises: Exercise[]): Exercise | undefined {
  const normRaw = normalizeMatch(rawName);

  // 1. Exact normalized match
  const exact = exercises.find((e) => normalizeMatch(e.name) === normRaw);
  if (exact) return exact;

  // 2. Prefix / Ellipsis matching (e.g. "Peso Muerto Rumano con Mancuern..." -> "Peso Muerto Rumano con Mancuernas")
  const cleanPrefix = rawName.replace(/\.{2,}$/, '').trim();
  const normPrefix = normalizeMatch(cleanPrefix);
  if (normPrefix.length >= 6) {
    const prefixMatch = exercises.find((e) => {
      const eNorm = normalizeMatch(e.name);
      return eNorm.startsWith(normPrefix) || normPrefix.startsWith(eNorm) || eNorm.includes(normPrefix);
    });
    if (prefixMatch) return prefixMatch;
  }

  // 3. Keyword matching (e.g. "Sentadilla Goblet", "Hip Thrust", "Bicicleta Estática")
  const keywords = rawName
    .split(/[\s/+,]+/)
    .filter((w) => w.length >= 4)
    .map((w) => normalizeMatch(w));

  let bestScore = 0;
  let bestCandidate: Exercise | undefined = undefined;

  for (const ex of exercises) {
    const eNorm = normalizeMatch(ex.name);
    let score = 0;
    for (const kw of keywords) {
      if (eNorm.includes(kw)) score += 3;
    }
    if (score > bestScore && score >= 3) {
      bestScore = score;
      bestCandidate = ex;
    }
  }

  return bestCandidate;
}

export function parseExerciseLine(line: string): {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  equipment: Equipment;
  muscle: MuscleGroup;
} {
  let muscle: MuscleGroup = 'piernas';
  const muscleMatch = line.match(/\[MUSCLE:\s*([^\]]+)\]/i);
  if (muscleMatch) {
    const rawM = muscleMatch[1].trim().toLowerCase();
    if (['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core'].includes(rawM)) {
      muscle = rawM as MuscleGroup;
    }
    line = line.replace(muscleMatch[0], '').trim();
  }

  // 1. Extract rest seconds from the end (e.g. "120s", "90s", "60s", "45s")
  let restSeconds = 60;
  const restMatch = line.match(/(\d+)\s*s(?:eg)?$/i) || line.match(/(\d+)\s*s(?:eg)?\b/i);
  if (restMatch) {
    restSeconds = parseInt(restMatch[1], 10);
    line = line.replace(restMatch[0], '').trim();
  }

  // 2. Extract series and reps (e.g. "4 × 8-10", "3 x 10", "3 × 20-35s", "3 × 10 pasos x dirección")
  let sets = 3;
  let reps = '10-12';
  const setsRepsMatch = line.match(/(\d+)\s*[×xX]\s*(.+)$/);
  if (setsRepsMatch) {
    sets = parseInt(setsRepsMatch[1], 10);
    reps = setsRepsMatch[2].trim();
    line = line.substring(0, setsRepsMatch.index).trim();
  }

  // 3. Extract equipment token from end of remaining line (column alignment)
  let equipment: Equipment = 'mancuernas';
  const equipColMatch = line.match(/\b(MANCUERNAS|NINGUNO|GIMNASIO|BARRA|POLEA|MÁQUINA|MAQUINA)\s*$/i);
  if (equipColMatch) {
    const rawEq = equipColMatch[1].toUpperCase();
    if (rawEq === 'NINGUNO') equipment = 'ninguno';
    else if (rawEq === 'MANCUERNAS') equipment = 'mancuernas';
    else equipment = 'gimnasio';
    line = line.substring(0, equipColMatch.index).trim();
  }

  // 4. Remove S1 S2 S3 S4... tracking markers
  line = line.replace(/\bS\d+\b/g, '').trim();

  // 5. Remove leading index number (e.g. "1 ")
  line = line.replace(/^\d+\s+/, '').trim();

  // 6. Clean exercise name
  const cleanName = line.replace(/\s+/g, ' ').replace(/\.{2,}$/, '').trim();

  return {
    name: cleanName || 'Ejercicio',
    sets: Math.min(Math.max(sets, 1), 10),
    reps: reps || '10-12',
    restSeconds: Math.min(Math.max(restSeconds, 15), 300),
    equipment,
    muscle,
  };
}

export async function extractTextLinesFromPdf(file: File | ArrayBuffer): Promise<string[]> {
  const data = file instanceof File ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array(file);

  const loadingTask = pdfjsLib.getDocument({
    data,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = (textContent.items as any[])
      .map((item) => ({
        str: item.str ? item.str.trim() : '',
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
      }))
      .filter((i) => i.str.length > 0);

    // Group items that appear on approx same horizontal line
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    let curY = -9999;
    let curLineItems: string[] = [];

    for (const it of items) {
      if (Math.abs(it.y - curY) > 3.5) {
        if (curLineItems.length > 0) {
          allLines.push(curLineItems.join(' '));
        }
        curLineItems = [it.str];
        curY = it.y;
      } else {
        curLineItems.push(it.str);
      }
    }
    if (curLineItems.length > 0) {
      allLines.push(curLineItems.join(' '));
    }
  }

  return allLines;
}

export async function parseRoutineFromPdf(
  file: File | ArrayBuffer,
  existingExercises: Exercise[]
): Promise<ParsedPdfRoutine> {
  const allLines = await extractTextLinesFromPdf(file);

  let routineName = 'Rutina Importada desde PDF';
  let athleteName = '';
  let goal: Goal = 'resistencia';
  let daysPerWeek = 3;
  let sessionDuration = 60;

  // 1. Parse Metadata from Header
  for (const line of allLines) {
    if (/Atleta:/i.test(line)) {
      const match = line.match(/Atleta:\s*([^|\n]+)/i);
      if (match) athleteName = match[1].trim();
    }
    if (/Rutina:/i.test(line)) {
      const match = line.match(/Rutina:\s*([^|\n]+)/i);
      if (match) routineName = match[1].trim();
    }
    if (/Objetivo:/i.test(line)) {
      if (/hipertrofia/i.test(line)) goal = 'hipertrofia';
      else if (/fuerza/i.test(line)) goal = 'fuerza';
      else if (/perdida/i.test(line)) goal = 'perdida_grasa';
      else if (/resistencia/i.test(line)) goal = 'resistencia';

      const dMatch = line.match(/(\d+)\s*D[ií]as/i);
      if (dMatch) daysPerWeek = parseInt(dMatch[1], 10);
      const minMatch = line.match(/(\d+)\s*min/i);
      if (minMatch) sessionDuration = parseInt(minMatch[1], 10);
    }
  }

  // If athleteName not explicitly labeled, try finding student in routineName
  if (!athleteName && routineName.includes('-')) {
    const parts = routineName.split('-');
    const candidate = parts[parts.length - 1].trim();
    if (candidate.length > 2 && !/gym|rutina|entrenamiento/i.test(candidate)) {
      athleteName = candidate;
    }
  }

  // 2. Parse Days and Exercises
  const rawDays: { dayNum: number; name: string; focus: string; exerciseLines: string[] }[] = [];
  let currentRawDay: { dayNum: number; name: string; focus: string; exerciseLines: string[] } | null = null;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];

    // Check for DÍA X: or DIA X:
    const dayMatch = line.match(/^D[IÍ]A\s*(\d+)[:\s]*(.*)/i);
    if (dayMatch) {
      const dNum = parseInt(dayMatch[1], 10);
      let rawTitle = dayMatch[2].trim();
      let focus = '';

      if (/Enfoque:/i.test(rawTitle)) {
        const parts = rawTitle.split(/Enfoque:/i);
        rawTitle = parts[0].trim();
        focus = parts[1].trim();
      }

      // Remove redundant "DÍA X: " if duplicated
      rawTitle = rawTitle.replace(/^D[IÍ]A\s*\d+[:\s]*/i, '').trim();
      const dayDisplayName = `Día ${dNum}${rawTitle ? ': ' + rawTitle : ''}`;

      currentRawDay = {
        dayNum: dNum,
        name: dayDisplayName,
        focus,
        exerciseLines: [],
      };
      rawDays.push(currentRawDay);
      continue;
    }

    if (currentRawDay) {
      // End day on notes or page footer
      if (/NOTAS Y OBSERVACIONES/i.test(line) || /Página \d+ de \d+/i.test(line)) {
        continue;
      }
      if (/#\s*EJERCICIO/i.test(line) || /REGISTRO DE SERIES/i.test(line)) {
        continue;
      }

      // Check if line begins with exercise number e.g. "1 Sentadilla Goblet..."
      if (/^\d+\s+[A-Za-zÁÉÍÓÚáéíóú]/.test(line)) {
        currentRawDay.exerciseLines.push(line);
      } else if (
        currentRawDay.exerciseLines.length > 0 &&
        /^(PIERNAS|PECHO|ESPALDA|HOMBROS|BRAZOS|CORE)$/i.test(line.trim())
      ) {
        // Next line contains muscle group for previous exercise
        currentRawDay.exerciseLines[currentRawDay.exerciseLines.length - 1] += ` [MUSCLE: ${line.trim()}]`;
      }
    }
  }

  // If no "DÍA" headers were detected, treat the entire document as a 1-day routine
  if (rawDays.length === 0) {
    const fallbackDay = {
      dayNum: 1,
      name: 'Día 1: Entrenamiento Completo',
      focus: 'Entrenamiento extraído del documento PDF',
      exerciseLines: allLines.filter((l) => /^\d+\s+[A-Za-zÁÉÍÓÚáéíóú]/.test(l)),
    };
    rawDays.push(fallbackDay);
  }

  // 3. Transform Raw Days into Parsed Days with Exercise Matching
  const parsedDays: ParsedPdfDay[] = rawDays.map((rd) => {
    const exercises: ParsedPdfExercise[] = rd.exerciseLines.map((line) => {
      const parsed = parseExerciseLine(line);
      const matched = findBestExerciseMatch(parsed.name, existingExercises);

      return {
        name: matched ? matched.name : parsed.name,
        originalRawName: parsed.name,
        matchedExerciseId: matched?.id,
        muscle: matched ? matched.muscle_group : parsed.muscle,
        equipment: matched ? matched.equipment : parsed.equipment,
        sets: parsed.sets,
        reps: parsed.reps,
        restSeconds: parsed.restSeconds,
      };
    });

    return {
      dayNumber: rd.dayNum,
      name: rd.name,
      focus: rd.focus,
      exercises,
    };
  });

  return {
    routineName,
    athleteName,
    goal,
    difficulty: 'intermedio',
    daysPerWeek: parsedDays.length || daysPerWeek,
    sessionDuration,
    days: parsedDays,
    rawTextPreview: allLines.slice(0, 15).join('\n'),
  };
}

export function convertParsedRoutineToAppRoutine(
  parsed: ParsedPdfRoutine,
  assignedUserId: string,
  createdBy: string,
  isDefault: boolean,
  existingExercises: Exercise[],
  onNewExercisesCreated?: (newExercises: Exercise[]) => void
): Routine {
  // If this routine is for Cristian Aguilera, keep the standard ID or unique PDF ID
  const isCristian =
    assignedUserId === 'cristian_aguilera' ||
    parsed.athleteName.toLowerCase().includes('cristian') ||
    parsed.routineName.toLowerCase().includes('cristian');

  const routineId = isCristian ? 'routine-cristian-aguilera' : `routine-pdf-${Date.now()}`;
  const newlyCreatedExercises: Exercise[] = [];

  const days: RoutineDay[] = parsed.days.map((d, dIdx) => {
    const dayId = `day-${routineId}-${dIdx + 1}`;
    const exerciseIds: string[] = [];
    const exerciseConfigs: RoutineExerciseConfig[] = [];

    d.exercises.forEach((exItem, exIdx) => {
      let exerciseId = exItem.matchedExerciseId;

      if (!exerciseId) {
        // Create custom exercise on the fly
        exerciseId = `ex-pdf-${Date.now()}-${dIdx}-${exIdx}`;
        const newEx: Exercise = {
          id: exerciseId,
          name: exItem.name,
          muscle_group: exItem.muscle,
          equipment: exItem.equipment,
          difficulty: 'intermedio',
          description: `Ejercicio importado desde PDF para ${parsed.routineName}`,
          is_default: false,
          created_by: createdBy,
        };
        newlyCreatedExercises.push(newEx);
      }

      exerciseIds.push(exerciseId);
      exerciseConfigs.push({
        exerciseId,
        sets: exItem.sets,
        reps: exItem.reps,
        restSeconds: exItem.restSeconds,
      });
    });

    return {
      id: dayId,
      routine_id: routineId,
      day_of_week: dIdx,
      name: d.name,
      focus: d.focus || 'Entrenamiento estructurado',
      exercise_ids: exerciseIds,
      exercise_configs: exerciseConfigs,
    };
  });

  if (newlyCreatedExercises.length > 0 && onNewExercisesCreated) {
    onNewExercisesCreated(newlyCreatedExercises);
  }

  return {
    id: routineId,
    user_id: assignedUserId,
    name: parsed.routineName,
    goal: parsed.goal,
    difficulty: parsed.difficulty,
    level: parsed.difficulty,
    is_default: isDefault,
    created_by: createdBy,
    days_per_week: parsed.daysPerWeek,
    session_duration: parsed.sessionDuration,
    created_at: new Date().toISOString(),
    days,
  };
}
