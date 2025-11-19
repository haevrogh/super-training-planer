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

function normalizePercentValue(percentValue) {
  const numeric = Number(percentValue);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return numeric <= 1 ? numeric * 100 : numeric;
}

function computePercent1Rm(weight, oneRm, fallbackPercent) {
  const safeWeight = safePositive(weight);

  if (Number.isFinite(oneRm) && oneRm > 0 && safeWeight > 0) {
    return (safeWeight / oneRm) * 100;
  }

  return normalizePercentValue(fallbackPercent);
}

function approximateRpe(percent1Rm) {
  if (!percent1Rm) {
    return 0;
  }

  return (percent1Rm / 100) * 10;
}

function resolveRpeValue(rpeInput, percent1Rm) {
  if (rpeInput !== undefined && rpeInput !== null && String(rpeInput).trim() !== '') {
    const parsed = parseRpeValue(rpeInput);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return approximateRpe(percent1Rm);
}

function calculateSetMti({ weight, reps, percent1Rm, rpeInput }) {
  const safeWeight = safePositive(weight);
  const safeReps = safePositive(reps);
  const safePercent = Math.max(0, Number(percent1Rm) || 0);

  if (safeWeight === 0 || safeReps === 0 || safePercent === 0) {
    return 0;
  }

  const rpeValue = resolveRpeValue(rpeInput, safePercent);
  const normalizedPercent = safePercent / 100;
  const normalizedRpe = Math.max(0, rpeValue / 10);

  return (
    safeWeight *
    safeReps *
    normalizedPercent ** 1.6 *
    normalizedRpe ** 2
  );
}

const MUSCLE_SPLITS = {
  compound: {
    legs: 0.3,
    back: 0.25,
    chest: 0.15,
    shoulders: 0.1,
    arms: 0.1,
    core: 0.1,
  },
  isolation: {
    chest: 0.25,
    shoulders: 0.2,
    arms: 0.25,
    back: 0.15,
    legs: 0.05,
    core: 0.1,
  },
};

const GOAL_MUSCLE_BIASES = {
  strength: {
    legs: 1.15,
    back: 1.1,
    chest: 0.95,
    shoulders: 0.95,
    arms: 0.9,
    core: 1.05,
  },
  hypertrophy: {
    legs: 1,
    back: 1,
    chest: 1.05,
    shoulders: 1.05,
    arms: 1.1,
    core: 0.95,
  },
  endurance: {
    legs: 1.05,
    back: 1.05,
    chest: 0.95,
    shoulders: 0.95,
    arms: 0.9,
    core: 1.1,
  },
};

export function resolveStressLabel(score) {
  const safeScore = Number(score);

  if (!Number.isFinite(safeScore)) {
    return 'Unknown';
  }

  if (safeScore < 0.45) {
    return 'Light';
  }

  if (safeScore < 0.7) {
    return 'Moderate';
  }

  return 'High';
}

function calculateStressScore({ intensityPercent, totalReps, tonnage, rpeValue }) {
  const normalizedIntensity = Math.min(Math.max(intensityPercent / 100, 0), 1);
  const normalizedReps = Math.min(totalReps / 28, 1);
  const normalizedTonnage = Math.min(tonnage / 20000, 1);
  const normalizedRpe = Math.min(rpeValue / 10, 1);
  const score =
    normalizedIntensity * 0.55 + normalizedReps * 0.2 + normalizedTonnage * 0.15 + normalizedRpe * 0.1;

  return Math.max(0, Math.min(score, 1));
}

function calculateRecoveryWindows({ stressScore, movementType }) {
  const baseHours = movementType === 'isolation' ? 18 : 26;
  const added = stressScore * (movementType === 'isolation' ? 14 : 22);
  const recommendedRestHours = Math.round(baseHours + added);
  const recommendedRestDays = Math.max(1, Math.round((recommendedRestHours / 24) * 10) / 10);
  return {
    recommendedRestHours,
    recommendedRestDays,
  };
}

function applyMuscleBiases(distribution, goal) {
  const biases = GOAL_MUSCLE_BIASES[goal] || GOAL_MUSCLE_BIASES.strength;
  const weightedEntries = Object.entries(distribution).map(([group, share]) => {
    const bias = biases[group] || 1;
    return [group, share * bias];
  });

  const total = weightedEntries.reduce((sum, [, value]) => sum + value, 0) || 1;

  return weightedEntries.reduce((result, [group, value]) => {
    result[group] = value / total;
    return result;
  }, {});
}

function calculateMuscleSplit(tonnage, movementType, goal) {
  const baseSplit = MUSCLE_SPLITS[movementType] || MUSCLE_SPLITS.compound;
  const adjustedSplit = applyMuscleBiases(baseSplit, goal);

  return Object.entries(adjustedSplit).reduce((acc, [group, share]) => {
    acc[group] = Math.round(tonnage * share);
    return acc;
  }, {});
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
  movementType,
  goal,
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
  const topPercent1Rm = computePercent1Rm(safeTopWeight, oneRm, intensityPercent);
  const backoffPercent1Rm = computePercent1Rm(
    safeBackoffWeight,
    oneRm,
    topPercent1Rm,
  );
  const topSetMti = calculateSetMti({
    weight: safeTopWeight,
    reps: safeTopReps,
    percent1Rm: topPercent1Rm,
    rpeInput: rpe,
  });
  const backoffSetMti = calculateSetMti({
    weight: safeBackoffWeight,
    reps: safeBackoffReps,
    percent1Rm: backoffPercent1Rm,
    rpeInput: null,
  });
  const mechanicalTensionIndex = Math.round(
    topSetMti + backoffSetMti * safeBackoffSets,
  );
  const velocityFactor = Math.max(0.2, 1 - relativeLoad * 0.7);
  const forceVelocity = Math.round(safeTopWeight * velocityFactor);
  const normalizedLoadVolume = Math.round(tonnage * (rpeValue / 10));
  const stressScore = calculateStressScore({
    intensityPercent: avgIntensity,
    totalReps,
    tonnage,
    rpeValue,
  });
  const stressLabel = resolveStressLabel(stressScore);
  const { recommendedRestHours, recommendedRestDays } = calculateRecoveryWindows({
    stressScore,
    movementType,
  });
  const tonnageByGroup = calculateMuscleSplit(tonnage, movementType, goal);

  return {
    tonnage: Math.round(tonnage),
    avgIntensity,
    mti: mechanicalTensionIndex,
    forceVelocity,
    normalizedLoadVolume,
    tonnageByGroup,
    stressLabel,
    stressScore,
    recommendedRestHours,
    recommendedRestDays,
    recoveryAdvice: `Отдохните ${recommendedRestHours} ч (~${recommendedRestDays} дн) перед следующей тяжёлой сессией`,
  };
}
