// Pure function — double progression logic

import {
  createProgram,
  createProgramWeek,
  createProgramSession,
} from '../../models.js';
import { roundToDumbbell } from '../helpers/dumbbellRounding.js';
import {
  resolveDoubleProgressionRange,
  resolveIntensityPercent,
  resolveSessionDays,
  resolveVolumeMultiplier,
} from '../helpers/trainingAdjustments.js';
import { buildIntensitySummary } from '../helpers/intensitySummary.js';
import { buildAccessoryProgression } from '../helpers/accessoryProgression.js';

const DEFAULT_WEEKS = 6;
const BASE_PERCENT = 0.7;
const BASE_TOTAL_SETS = 3;
const NOTE = 'Подумай об увеличении веса на следующей неделе';

function buildDoubleProgressionWeek(
  weekNumber,
  targetReps,
  workingWeight,
  sessionDays,
  backoffSetsCount,
  reachedCap,
  oneRm,
  userInput,
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

  const sessions = sessionDays.map((dayLabel, sessionIndex) =>
    createProgramSession({
      dayLabel,
      topSet: setLine,
      backoffSets: [...backoffWithNote],
      intensitySummary,
      accessories: buildAccessoryProgression(weekNumber, sessionIndex, userInput),
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
  const workingWeight = safeOneRm > 0 ? roundToDumbbell(safeOneRm * intensityPercent) : 0;
  const sessionDays = resolveSessionDays(userInput);
  const volumeMultiplier = resolveVolumeMultiplier(userInput);
  const totalSets = Math.max(2, Math.round(BASE_TOTAL_SETS * volumeMultiplier));
  const backoffSetsCount = Math.max(1, totalSets - 1);
  const repRange = resolveDoubleProgressionRange(userInput);

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    const targetReps = Math.min(repRange.start + i, repRange.end);
    const reachedCap = targetReps >= repRange.end;
    weeks.push(
      buildDoubleProgressionWeek(
        i + 1,
        targetReps,
        workingWeight,
        sessionDays,
        backoffSetsCount,
        reachedCap,
        safeOneRm,
        userInput,
      ),
    );
  }

  return createProgram({
    id: 'double-progression',
    name: 'Двойная прогрессия 8–12',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
