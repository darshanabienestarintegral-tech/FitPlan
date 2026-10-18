import { expect, test } from 'bun:test';
import { parseProtocolDays } from '../src/utils/protocolPdfParser';
import { findBestExerciseMatch } from '../src/utils/pdfExerciseMatching';

const lines = [
 'LUNES: DÍA 1 (Preparación y fuerza)', 'Fase 1: Preparación (6 min)',
 '● A1. Dorsiflexión con Mancuerna en Banco: 3 series x 12-15 repeticiones.',
 'Fase excéntrica de 3 segundos.', 'Fase 2: Fuerza (34 min)',
 'B1. Remo Unilateral con Mancuerna: 3 series x 10', 'repeticiones por lado. [RIR 2]',
 'Fase 3: Cardio (15 min)', 'D1. Bicicleta Estática: 15 minutos continuos (Zona 2).',
 'MIÉRCOLES: DÍA 2 (Tracciones)', 'Fase 2: Fuerza',
 'B1. Peso Muerto Rumano: 4 series x 8-10 repeticiones.',
 'Fase 3: Cardio', 'D1. Bicicleta Estática (HIIT): 15 minutos (1 min a >85% FC máx',
 'x 2 min de recuperación activa).', 'EVIDENCIA Y REFERENCIAS',
 'A1. Esto no es un ejercicio: 3 series x 10 repeticiones.',
];
test('weekday headings, letter markers and wrapped instructions retain dosage', () => {
 const days=parseProtocolDays(lines);
 expect(days.map(day=>day.exercises.length)).toEqual([3,2]);
 expect(days[0].exercises[0].sets).toBe(3);
 expect(days[0].exercises[0].reps).toBe('12-15');
 expect(days[0].exercises[0].notes).toContain('3 segundos');
 expect(days[0].exercises[1].reps).toBe('10 por lado');
 expect(days[0].exercises[1].notes).toContain('RIR 2');
});
test('missing preparation rests and continuous cardio do not invent a countdown', () => {
 const days=parseProtocolDays(lines);
 expect(days[0].exercises[0].restSeconds).toBe(0);
 expect(days[0].exercises[0].restLabel).toContain('no especificado');
 expect(days[0].exercises[1].restLabel).toContain('60–90');
 expect(days[0].exercises[2].sets).toBe(1);
 expect(days[0].exercises[2].reps).toBe('15 min');
 expect(days[1].exercises[1].notes).toContain('>85%');
 expect(days[1].exercises[1].notes).toContain('2 min de recuperación');
});
test('table PDFs fall back to the existing parser', () => {
 expect(parseProtocolDays(['DÍA 1: Full body','1 Sentadilla 3 x 10 90s'])).toBeNull();
});
test('unrecognized narrative dosage fails visibly rather than inventing reps', () => {
 expect(()=>parseProtocolDays(['LUNES: DÍA 1 (Fuerza)','A1. Ejercicio: dosis sin especificar'])).toThrow();
});
test('shared equipment words never substitute an unrelated exercise', () => {
 const library=[{id:'press',name:'Press de banca con mancuernas'},{id:'squat',name:'Sentadilla Goblet con Mancuerna'}];
 expect(findBestExerciseMatch('Dorsiflexión con Mancuerna en Banco',library)).toBeUndefined();
 expect(findBestExerciseMatch('sentadilla goblet con mancuerna',library)?.id).toBe('squat');
 expect(findBestExerciseMatch('Press de banca con mancu...',library)?.id).toBe('press');
});
