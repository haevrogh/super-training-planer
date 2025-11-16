// Pure function — calculate estimated 1RM

export function calculateOneRm(weight, reps) {
  const safeWeight = Number(weight);
  const safeReps = Number(reps);

  if (!Number.isFinite(safeWeight) || !Number.isFinite(safeReps)) {
    return 0;
  }

  const estimate = safeWeight * (1 + safeReps / 30);
  return Math.round(estimate * 10) / 10;
}
