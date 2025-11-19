const REPS_TO_PERCENT = {
  1: 1,
  3: 0.93,
  5: 0.87,
  6: 0.85,
  8: 0.8,
  10: 0.75,
  12: 0.7,
  15: 0.65,
};

const RPE_DROP_STEP = 0.025;
const MIN_PERCENT = 0.5;
const MAX_PERCENT = 0.99;
const DEFAULT_PERCENT = 0.7;
const JUNK_VOLUME_CAP = 6;
const JUNK_VOLUME_TARGET_MAX = 5;
const JUNK_VOLUME_TARGET_MIN = 3;
const HEAVY_REP_FLOOR = 2;
const REP_ADJUSTMENT = 1;
const PROGRESSION_PERCENT_CAP_COMPOUND = 0.2;
const PROGRESSION_PERCENT_CAP_ISO = 0.15;

function normalizeRepsKey(reps) {
  const numericReps = Number(reps);

  if (!Number.isFinite(numericReps) || numericReps <= 0) {
    return 1;
  }

  const availableReps = Object.keys(REPS_TO_PERCENT)
    .map((key) => Number(key))
    .sort((a, b) => a - b);

  let closest = availableReps[0];

  for (let i = 0; i < availableReps.length; i += 1) {
    const current = availableReps[i];

    if (current === numericReps) {
      return current;
    }

    if (current > numericReps) {
      const prev = availableReps[Math.max(0, i - 1)];
      const prevDiff = Math.abs(numericReps - prev);
      const currentDiff = Math.abs(numericReps - current);
      return prevDiff <= currentDiff ? prev : current;
    }

    closest = current;
  }

  return closest;
}

export function getBasePercentForReps(reps) {
  const key = normalizeRepsKey(reps);
  return REPS_TO_PERCENT[key] || DEFAULT_PERCENT;
}

export function getWorkingPercent(targetReps, targetRpe) {
  const basePercent = getBasePercentForReps(targetReps);
  const safeRpe = Number(targetRpe);
  const rpeValue = Number.isFinite(safeRpe) ? safeRpe : 10;
  const adjustment = (10 - rpeValue) * RPE_DROP_STEP;
  const finalPercent = basePercent - adjustment;
  return Math.min(Math.max(finalPercent, MIN_PERCENT), MAX_PERCENT);
}

export function roundToStep(weight, step = 2.5) {
  const numericWeight = Number(weight);
  const numericStep = Number(step);

  if (!Number.isFinite(numericWeight) || !Number.isFinite(numericStep) || numericStep <= 0) {
    return 0;
  }

  return Math.round(numericWeight / numericStep) * numericStep;
}

export function getWorkingWeight(oneRm, targetReps, targetRpe, options = {}) {
  const safeOneRm = Number(oneRm);

  if (!Number.isFinite(safeOneRm) || safeOneRm <= 0) {
    return 0;
  }

  const percent = getWorkingPercent(targetReps, targetRpe);
  const step = options.step || 2.5;
  const rawWeight = safeOneRm * percent;
  return roundToStep(rawWeight, step);
}

export function applyJunkVolumeCap({ sets, reps, intensityPercent }) {
  const safeSets = Number.isFinite(Number(sets)) ? Number(sets) : 0;
  const safeReps = Number.isFinite(Number(reps)) ? Number(reps) : 0;
  const safePercent = Number.isFinite(Number(intensityPercent))
    ? Number(intensityPercent)
    : null;

  if (safeSets <= JUNK_VOLUME_CAP) {
    return {
      sets: Math.max(1, Math.round(safeSets)),
      reps: Math.max(1, Math.round(safeReps)),
      intensityPercent: safePercent,
    };
  }

  const adjustedSets = Math.max(
    JUNK_VOLUME_TARGET_MIN,
    Math.min(JUNK_VOLUME_TARGET_MAX, Math.round(safeSets * 0.7)),
  );
  const adjustedReps = Math.max(HEAVY_REP_FLOOR, Math.round(safeReps - REP_ADJUSTMENT));
  const adjustedPercent = safePercent
    ? Math.min(safePercent + 0.02, MAX_PERCENT)
    : null;

  return {
    sets: adjustedSets,
    reps: adjustedReps,
    intensityPercent: adjustedPercent,
  };
}

export function shouldSwitchToRepProgression(currentWeight, increment, movementType) {
  const weight = Number(currentWeight);
  const step = Number(increment);

  if (!Number.isFinite(weight) || !Number.isFinite(step) || step <= 0 || weight <= 0) {
    return false;
  }

  const limit = movementType === 'isolation'
    ? PROGRESSION_PERCENT_CAP_ISO
    : PROGRESSION_PERCENT_CAP_COMPOUND;
  const jumpPercent = step / weight;
  return jumpPercent >= limit;
}

export { REPS_TO_PERCENT };
