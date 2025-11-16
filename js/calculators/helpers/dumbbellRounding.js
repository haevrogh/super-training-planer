const DUMBBELL_STEPS = [
  5, 7, 9, 13, 15, 18, 20, 22, 25, 27, 29, 32, 34, 36, 38, 40,
];

export function roundToDumbbell(weight) {
  const numericWeight = Number(weight);

  if (!Number.isFinite(numericWeight)) {
    return DUMBBELL_STEPS[0];
  }

  let closest = DUMBBELL_STEPS[0];
  let smallestDiff = Math.abs(numericWeight - closest);

  for (let i = 1; i < DUMBBELL_STEPS.length; i += 1) {
    const current = DUMBBELL_STEPS[i];
    const currentDiff = Math.abs(numericWeight - current);

    if (currentDiff < smallestDiff) {
      closest = current;
      smallestDiff = currentDiff;
    }
  }

  return closest;
}

export function getLowerDumbbellStep(currentWeight) {
  const roundedWeight = roundToDumbbell(currentWeight);
  const currentIndex = DUMBBELL_STEPS.indexOf(roundedWeight);

  if (currentIndex <= 0) {
    return DUMBBELL_STEPS[0];
  }

  return DUMBBELL_STEPS[Math.max(0, currentIndex - 1)];
}

export { DUMBBELL_STEPS };
