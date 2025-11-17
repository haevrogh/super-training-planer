// Helper for building per-session intensity summaries

function extractFirstNumber(value) {
  if (value === undefined || value === null) {
    return 0;
  }

  const matches = String(value)
    .replace(',', '.')
    .match(/(\d+(?:\.\d+)?)/);

  if (!matches || matches.length === 0) {
    return Number(value) || 0;
  }

  return Number(matches[0]) || 0;
}

function parseRpeValue(rpeInput) {
  if (!rpeInput) {
    return 7.5;
  }

  const matches = String(rpeInput)
    .replace(',', '.')
    .match(/(\d+(?:\.\d+)?)/g);

  if (!matches || matches.length === 0) {
    const numeric = Number(rpeInput);
    return Number.isFinite(numeric) ? numeric : 7.5;
  }

  const numericValues = matches
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (numericValues.length === 0) {
    return 7.5;
  }

  const total = numericValues.reduce((sum, current) => sum + current, 0);
  return total / numericValues.length;
}

function safePositive(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function buildIntensitySummary({
  topWeight,
  topReps,
  backoffWeight,
  backoffReps,
  backoffSets,
  intensityPercent,
  oneRm,
  rpe,
} = {}) {
  const safeTopWeight = safePositive(topWeight);
  const safeTopReps = safePositive(extractFirstNumber(topReps));

  if (safeTopWeight === 0 || safeTopReps === 0) {
    return null;
  }

  const safeBackoffWeight = safePositive(backoffWeight);
  const safeBackoffReps = safePositive(extractFirstNumber(backoffReps));
  const safeBackoffSets = Math.max(0, Number(backoffSets) || 0);

  const topVolume = safeTopWeight * safeTopReps;
  const backoffVolume =
    safeBackoffWeight > 0 && safeBackoffReps > 0
      ? safeBackoffWeight * safeBackoffReps * safeBackoffSets
      : 0;
  const tonnage = topVolume + backoffVolume;

  const totalSets = 1 + safeBackoffSets;
  const averageWeight =
    totalSets > 0
      ? (safeTopWeight + safeBackoffWeight * safeBackoffSets) / totalSets
      : safeTopWeight;

  const normalizedIntensity =
    Number.isFinite(oneRm) && oneRm > 0
      ? Math.min(averageWeight / oneRm, 1)
      : Math.max(0, Number(intensityPercent) || 0);
  const avgIntensity = Math.round(normalizedIntensity * 100);
  const relativeLoad =
    Number.isFinite(oneRm) && oneRm > 0
      ? Math.min(safeTopWeight / oneRm, 1)
      : normalizedIntensity;
  const totalReps = safeTopReps + safeBackoffReps * safeBackoffSets;

  const rpeValue = parseRpeValue(rpe);
  const mechanicalTensionIndex = Math.round(relativeLoad * totalReps * 10);
  const velocityFactor = Math.max(0.2, 1 - relativeLoad * 0.7);
  const forceVelocity = Math.round(safeTopWeight * velocityFactor);
  const normalizedLoadVolume = Math.round(tonnage * (rpeValue / 10));

  return {
    tonnage: Math.round(tonnage),
    avgIntensity,
    mti: mechanicalTensionIndex,
    forceVelocity,
    normalizedLoadVolume,
  };
}
