import type { ParsedPdfDay } from './pdfRoutineParser';

// Narrative protocols use weekday headings and A1/B1 markers rather than tables.
export function parseProtocolDays(lines: string[]): ParsedPdfDay[] | null {
  const days: ParsedPdfDay[] = [];
  let day: ParsedPdfDay | undefined;
  let phase = 0;
  let entry: { body: string; phase: number } | undefined;
  const flush = () => {
    if (!entry || !day) return;
    const body = entry.body.replace(/\s+/g, ' ').trim();
    const separator = body.indexOf(':');
    const name = separator < 0 ? body : body.slice(0, separator).trim();
    const prescription = separator < 0 ? '' : body.slice(separator + 1).trim();
    const strength = prescription.match(/(\d+)\s*series\s*[x×]\s*(\d+(?:\s*[-–]\s*\d+)?)(?:\s*repeticiones)?(\s*por lado)?/i);
    const cardio = prescription.match(/^(\d+)\s*minutos?/i);
    if (!strength && !cardio) throw new Error(`No se pudo interpretar la dosis de «${name}». Revisa el documento antes de importar.`);
    const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const muscle = /triceps|biceps/.test(normalized) ? 'brazos' : /remo|jalon/.test(normalized) ? 'espalda' : /militar|hombro/.test(normalized) ? 'hombros' : /banca|pecho/.test(normalized) ? 'pecho' : 'piernas';
    const equipment = /maquina|polea|prensa|bicicleta|disco/.test(normalized) ? 'gimnasio' : /mancuerna/.test(normalized) ? 'mancuernas' : 'ninguno';
    day.exercises.push({
      name, originalRawName: name, muscle, equipment,
      sets: strength ? Number(strength[1]) : 1,
      reps: strength ? strength[2].replace(/\s/g, '') + (strength[3] ? ' por lado' : '') : `${cardio![1]} min`,
      restSeconds: entry.phase === 2 ? 60 : 0,
      restLabel: entry.phase === 2 ? '60–90 s según PDF; temporizador de 60 s' : cardio ? 'Bloque de cardio' : 'Descanso no especificado en PDF',
      notes: body,
    });
    entry = undefined;
  };
  for (const raw of lines) {
    const line = raw.trim().replace(/^[●•]\s*/, '');
    if (/EVIDENCIA Y REFERENCIAS|^Nota:/i.test(line)) { flush(); break; }
    const heading = line.match(/^(?:(LUNES|MARTES|MI[ÉE]RCOLES|JUEVES|VIERNES|S[ÁA]BADO|DOMINGO)\s*:\s*)?D[IÍ]A\s*(\d+)\s*[:(]\s*(.*)/i);
    if (heading) {
      flush();
      day = { dayNumber: Number(heading[2]), name: `Día ${heading[2]}${heading[1] ? ` — ${heading[1]}` : ''}: ${heading[3]}`, focus: heading[3], exercises: [] };
      days.push(day); phase = 0; continue;
    }
    if (!day) continue;
    const phaseMatch = line.match(/^Fase\s*(\d+)\s*:/i);
    if (phaseMatch) { flush(); phase = Number(phaseMatch[1]); continue; }
    const exercise = line.match(/^[A-Z]\d+\.\s+(.+)/);
    if (exercise) { flush(); entry = { body: exercise[1], phase }; continue; }
    if (entry && line) entry.body += ` ${line}`;
  }
  flush();
  if (!days.some((item) => item.exercises.length)) return null;
  if (days.some((item) => !item.exercises.length)) throw new Error('Un día del protocolo no contiene ejercicios legibles. Revisa el PDF.');
  return days;
}
