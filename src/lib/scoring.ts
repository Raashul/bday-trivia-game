export const POINTS_CORRECT = 1000;
export const POINTS_WRONG = 0;

export function computePoints(isCorrect: boolean): number {
  return isCorrect ? POINTS_CORRECT : POINTS_WRONG;
}
