// Centralização de constantes e funções de matching facial

export const FACE_MATCH_THRESHOLD = 0.55;

/**
 * Cálculo da distância euclidiana entre dois vetores de 128 dimensões
 */
export function euclideanDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export interface MatchResult {
  match: {
    id: string;
    name: string;
    distance: number;
    confidence: number;
  } | null;
  bestMatch: {
    id: string;
    name: string;
    distance: number;
  } | null;
}

/**
 * Compara um Face Descriptor com uma lista de pessoas cadastradas
 * utilizando a métrica de distância euclidiana e o limiar centralizado.
 */
export function compareFace(
  faceDescriptor: number[],
  registeredPersons: { id: string; name: string; descriptor: number[] }[],
  threshold: number = FACE_MATCH_THRESHOLD
): MatchResult {
  if (!faceDescriptor || faceDescriptor.length !== 128 || registeredPersons.length === 0) {
    return { match: null, bestMatch: null };
  }

  let best: { id: string; name: string; distance: number } | null = null;

  for (const person of registeredPersons) {
    if (!person.descriptor || person.descriptor.length !== 128) continue;
    const dist = euclideanDistance(faceDescriptor, person.descriptor);
    if (!best || dist < best.distance) {
      best = { id: person.id, name: person.name, distance: dist };
    }
  }

  if (best && best.distance <= threshold) {
    const confidence = Math.round(
      Math.max(50, 100 - best.distance * 80)
    );
    return {
      match: {
        id: best.id,
        name: best.name,
        distance: Number(best.distance.toFixed(4)),
        confidence,
      },
      bestMatch: {
        id: best.id,
        name: best.name,
        distance: Number(best.distance.toFixed(4)),
      },
    };
  }

  return {
    match: null,
    bestMatch: best
      ? {
          id: best.id,
          name: best.name,
          distance: Number(best.distance.toFixed(4)),
        }
      : null,
  };
}
