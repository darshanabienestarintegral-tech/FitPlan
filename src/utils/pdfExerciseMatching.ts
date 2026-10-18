import type { Exercise } from '../types';

export function normalizeMatch(str: string): string {
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

  // Only accept a unique explicitly truncated prefix. Shared words such as
  // "mancuerna" must never substitute a different movement or rehabilitation drill.
  if (/\.{2,}$/.test(rawName)) {
    const prefix = normalizeMatch(rawName.replace(/\.{2,}$/, ''));
    const matches = prefix.length >= 12 ? exercises.filter((item) => normalizeMatch(item.name).startsWith(prefix)) : [];
    if (matches.length === 1) return matches[0];
  }
  return undefined;
}

