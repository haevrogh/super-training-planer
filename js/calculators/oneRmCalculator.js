// Pure function — calculate estimated 1RM

export function calculateOneRm(weight, reps) {
  const safeWeight = Number(weight);
  const safeReps = Number(reps);

  if (!Number.isFinite(safeWeight) || !Number.isFinite(safeReps)) {
    return 0;
  }

  if (safeWeight <= 0 || safeReps <= 0) {
    return 0;
  }

  if (safeReps === 1) {
    return Math.round(safeWeight);
  }

  const estimate = safeWeight * (1 + safeReps / 30);
  return Math.round(estimate);
}
