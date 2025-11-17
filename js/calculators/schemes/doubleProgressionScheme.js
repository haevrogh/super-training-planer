// Pure function — double progression logic

import {
  createProgram,
  createProgramWeek,
  createProgramSession,
} from '../../models.js';
import { roundToDumbbell, DUMBBELL_STEPS } from '../helpers/dumbbellRounding.js';
import {
  resolveDoubleProgressionRange,
  resolveIntensityPercent,
  resolveSessionDays,
  resolveVolumeMultiplier,
  resolveRestInterval,
} from '../helpers/trainingAdjustments.js';
import { buildIntensitySummary } from '../helpers/intensitySummary.js';

const DEFAULT_WEEKS = 6;
const BASE_PERCENT = 0.7;
const BASE_TOTAL_SETS = 3;
const NOTE = 'Подумай об увеличении веса на следующей неделе';

function getNextDumbbellWeight(currentWeight) {
  const roundedWeight = roundToDumbbell(currentWeight);
  const currentIndex = DUMBBELL_STEPS.indexOf(roundedWeight);

  if (currentIndex === -1) {
    return roundedWeight;
  }

  if (currentIndex >= DUMBBELL_STEPS.length - 1) {
    return DUMBBELL_STEPS[DUMBBELL_STEPS.length - 1];
  }

  return DUMBBELL_STEPS[currentIndex + 1];
}

function buildDoubleProgressionWeek(
  weekNumber,
  targetReps,
  workingWeight,
  sessionDays,
  backoffSetsCount,
  reachedCap,
  oneRm,
  userInput,
  intensityPercent,
) {
  const setLine = `${workingWeight}×${targetReps}`;
  const baseBackoffSets = Array.from({ length: backoffSetsCount }, () => setLine);
  const backoffWithNote = reachedCap ? [...baseBackoffSets, NOTE] : baseBackoffSets;
  const intensitySummary = buildIntensitySummary({
    topWeight: workingWeight,
    topReps: targetReps,
    backoffWeight: workingWeight,
    backoffReps: targetReps,
    backoffSets: backoffSetsCount,
    intensityPercent: null,
    oneRm,
    rpe: '7-8',
  });

  const restInterval = resolveRestInterval(userInput, {
    reps: targetReps,
    intensityPercent,
  });
  const sessions = sessionDays.map((dayLabel) =>
    createProgramSession({
      dayLabel,
      topSet: setLine,
      backoffSets: [...backoffWithNote],
      intensitySummary,
      restInterval,
    }),
  );

  return createProgramWeek({
    weekNumber,
    sessions,
  });
}

export function generateDoubleProgressionProgram(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const requestedWeeks = Number(userInput?.weeks) || DEFAULT_WEEKS;
  const totalWeeks = Math.max(1, requestedWeeks);
  const intensityPercent = resolveIntensityPercent(BASE_PERCENT, userInput);
  const baseWorkingWeight = safeOneRm > 0 ? roundToDumbbell(safeOneRm * intensityPercent) : 0;
  const sessionDays = resolveSessionDays(userInput);
  const volumeMultiplier = resolveVolumeMultiplier(userInput);
  const totalSets = Math.max(2, Math.round(BASE_TOTAL_SETS * volumeMultiplier));
  const backoffSetsCount = Math.max(1, totalSets - 1);
  const repRange = resolveDoubleProgressionRange(userInput);

  let currentWeight = baseWorkingWeight;
  let currentReps = repRange.start;

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    const reachedCap = currentReps >= repRange.end;

    weeks.push(
      buildDoubleProgressionWeek(
        i + 1,
        currentReps,
        currentWeight,
        sessionDays,
        backoffSetsCount,
        reachedCap,
        safeOneRm,
        userInput,
        intensityPercent,
      ),
    );

    if (reachedCap) {
      currentWeight = getNextDumbbellWeight(currentWeight);
      currentReps = repRange.start;
    } else {
      currentReps = Math.min(currentReps + 1, repRange.end);
    }
  }

  return createProgram({
    id: 'double-progression',
    name: 'Двойная прогрессия 8–12',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
