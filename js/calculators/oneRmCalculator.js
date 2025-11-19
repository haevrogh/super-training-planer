// Pure functions — calculate estimated 1RM and derived rep max targets

const ONE_RM_FORMULAS = {
  epley: (weight, reps) => weight * (1 + reps / 30),
  brzycki: (weight, reps) => weight / (1.0278 - 0.0278 * reps),
  lombardi: (weight, reps) => weight * reps ** 0.1,
  oconner: (weight, reps) => weight * (1 + 0.025 * reps),
  wendler: (weight, reps) => weight + weight * reps * 0.0333,
};

const REP_MAX_PERCENTAGES = [
  { reps: 1, percent: 1 },
  { reps: 3, percent: 0.91 },
  { reps: 5, percent: 0.86 },
  { reps: 8, percent: 0.8 },
  { reps: 10, percent: 0.75 },
];

function sanitizeInputs(weight, reps) {
  const safeWeight = Number(weight);
  const safeReps = Number(reps);

  if (!Number.isFinite(safeWeight) || !Number.isFinite(safeReps)) {
    return { weight: 0, reps: 0 };
  }

  return { weight: Math.max(0, safeWeight), reps: Math.max(0, safeReps) };
}

export function calculateOneRm(weight, reps, formula = 'epley') {
  const { weight: safeWeight, reps: safeReps } = sanitizeInputs(weight, reps);

  if (safeWeight === 0 || safeReps === 0) {
    return 0;
  }

  if (safeReps === 1) {
    return Math.round(safeWeight);
  }

  const calculator = ONE_RM_FORMULAS[formula] || ONE_RM_FORMULAS.epley;
  const estimate = calculator(safeWeight, safeReps);
  return Math.round(estimate);
}

export function estimateOneRmVariants(weight, reps) {
  const { weight: safeWeight, reps: safeReps } = sanitizeInputs(weight, reps);

  if (safeWeight === 0 || safeReps === 0) {
    return {};
  }

  return Object.entries(ONE_RM_FORMULAS).reduce((acc, [key, fn]) => {
    const estimate = fn(safeWeight, safeReps);
    acc[key] = Number.isFinite(estimate) ? Math.round(estimate) : 0;
    return acc;
  }, {});
}

export function buildRepMaxes(oneRm) {
  const safeOneRm = Number(oneRm);

  if (!Number.isFinite(safeOneRm) || safeOneRm <= 0) {
    return [];
  }

  return REP_MAX_PERCENTAGES.map(({ reps, percent }) => ({
    reps,
    percent: Math.round(percent * 100),
    weight: Math.round(safeOneRm * percent),
  }));
}
