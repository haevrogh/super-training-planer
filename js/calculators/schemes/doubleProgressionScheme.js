import {
  createProgram,
  createProgramWeek,
  createProgramSession,
} from '../../models.js';
import { roundToDumbbell } from '../helpers/dumbbellRounding.js';
import {
  resolveDoubleProgressionRange,
  resolveSessionDays,
  resolveRestInterval,
  resolveGoalBlueprint,
  resolveRecoverySetAdjustment,
  resolveProgressRate,
  isDeloadWeek,
} from '../helpers/trainingAdjustments.js';
import {
  applyJunkVolumeCap,
  getWorkingPercent,
  shouldSwitchToRepProgression,
} from '../helpers/progressionCore.js';
import { buildIntensitySummary } from '../helpers/intensitySummary.js';
import { buildRpeGuide } from '../helpers/rpeGuidance.js';

const DEFAULT_WEEKS = 6;
const SESSION_RPE = 8;
const PROGRESSION_INCREMENT = 2.5;
const DELOAD_PERCENT = 0.6;

function determineInitialWeight(oneRm, repRangeStart, userInput) {
  const percent = getWorkingPercent(repRangeStart, SESSION_RPE);
  const baseFromOneRm = Number(oneRm) > 0 ? roundToDumbbell(oneRm * percent) : 0;

  if (baseFromOneRm > 0) {
    return baseFromOneRm;
  }

  const inputWeight = Number(userInput?.weight);

  if (Number.isFinite(inputWeight) && inputWeight > 0) {
    return roundToDumbbell(inputWeight);
  }

  return roundToDumbbell(20);
}

function buildSessions({
  sessionDays,
  setLine,
  setCount,
  summary,
  restInterval,
  rpeGuide,
  coachingNotes,
}) {
  const backoffSets = Array.from({ length: Math.max(0, setCount - 1) }, () => setLine);

  return sessionDays.map((dayLabel) =>
    createProgramSession({
      dayLabel,
      topSet: setLine,
      backoffSets,
      intensitySummary: summary,
      restInterval,
      rpeGuide,
      coachingNotes,
    }),
  );
}

function buildDeloadWeek({
  weekNumber,
  sessionDays,
  userInput,
  workingWeight,
  repRange,
}) {
  const deloadWeight = roundToDumbbell(workingWeight * DELOAD_PERCENT);
  const line = `${deloadWeight}×${repRange.start} @ RPE 6-7`;
  const restInterval = resolveRestInterval(userInput, {
    reps: repRange.start,
    intensityPercent: 0.6,
  });
  const summary = buildIntensitySummary({
    topWeight: deloadWeight,
    topReps: repRange.start,
    backoffWeight: deloadWeight,
    backoffReps: repRange.start,
    backoffSets: 1,
    intensityPercent: 0.6,
    oneRm: workingWeight / 0.75 || 0,
    rpe: '6-7',
  });
  const coachingNotes = ['Разгрузка двойной прогрессии — сохраним вес и объём в 2 лёгких подхода.'];
  const rpeGuide = buildRpeGuide('6-7', userInput.experienceLevel);
  const sessions = buildSessions({
    sessionDays,
    setLine: line,
    setCount: 2,
    summary,
    restInterval,
    rpeGuide,
    coachingNotes,
  });

  return createProgramWeek({
    weekNumber,
    sessions,
  });
}

function buildWorkWeek({
  weekNumber,
  sessionDays,
  userInput,
  repRange,
  workingWeight,
  currentReps,
  totalSets,
  oneRm,
  shouldUseRepProgression,
}) {
  const setLine = `${workingWeight}×${currentReps} @ RPE ${SESSION_RPE}`;
  const restInterval = resolveRestInterval(userInput, {
    reps: currentReps,
    intensityPercent: oneRm > 0 ? workingWeight / oneRm : null,
  });
  const rpeGuide = buildRpeGuide(String(SESSION_RPE), userInput.experienceLevel);
  const summary = buildIntensitySummary({
    topWeight: workingWeight,
    topReps: currentReps,
    backoffWeight: workingWeight,
    backoffReps: currentReps,
    backoffSets: Math.max(0, totalSets - 1),
    intensityPercent: oneRm > 0 ? workingWeight / oneRm : null,
    oneRm,
    rpe: SESSION_RPE,
  });
  const coachingNotes = [
    `Диапазон повторений: ${repRange.start}–${repRange.end}.`,
    `Если все ${totalSets} подходов по ${repRange.end} — повышаем нагрузку.`,
  ];

  if (shouldUseRepProgression) {
    coachingNotes.push('Шаг веса слишком крупный — удерживаем вес и добавляем +2 повтора в каждом подходе.');
  } else {
    const nextWeight = roundToDumbbell(workingWeight + PROGRESSION_INCREMENT);
    coachingNotes.push(`Следующий шаг веса: ${nextWeight} кг.`);
  }

  const sessions = buildSessions({
    sessionDays,
    setLine,
    setCount: totalSets,
    summary,
    restInterval,
    rpeGuide,
    coachingNotes,
  });

  return createProgramWeek({
    weekNumber,
    sessions,
  });
}

export function generateDoubleProgressionProgram(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const requestedWeeks = Number(userInput?.weeks) || DEFAULT_WEEKS;
  const totalWeeks = Math.max(1, Math.min(requestedWeeks, 12));
  const repRange = resolveDoubleProgressionRange(userInput);
  const sessionDays = resolveSessionDays(userInput);
  const goalBlueprint = resolveGoalBlueprint(userInput);
  const volumeAdjustment = resolveRecoverySetAdjustment(userInput);
  const baseSets = Math.max(2, goalBlueprint.baseSets + volumeAdjustment);
  const guard = applyJunkVolumeCap({
    sets: baseSets,
    reps: repRange.start,
    intensityPercent: null,
  });
  const totalSets = Math.max(2, guard.sets);
  const initialWeight = determineInitialWeight(safeOneRm, repRange.start, userInput);
  let workingWeight = initialWeight;
  let currentReps = Math.max(repRange.start, guard.reps);
  const progressRate = resolveProgressRate(userInput);

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    const weekNumber = i + 1;
    const useRepProgression = shouldSwitchToRepProgression(
      workingWeight,
      PROGRESSION_INCREMENT,
      userInput.movementType,
    );

    if (isDeloadWeek(weekNumber, userInput)) {
      weeks.push(
        buildDeloadWeek({
          weekNumber,
          sessionDays,
          userInput,
          workingWeight,
          repRange,
        }),
      );
      continue;
    }

    weeks.push(
      buildWorkWeek({
        weekNumber,
        sessionDays,
        userInput,
        repRange,
        workingWeight,
        currentReps,
        totalSets,
        oneRm: safeOneRm,
        shouldUseRepProgression: useRepProgression,
      }),
    );

    if (useRepProgression) {
      currentReps = Math.min(currentReps + 2, repRange.end);
      continue;
    }

    if (weekNumber % 2 === 0) {
      workingWeight = roundToDumbbell(workingWeight + PROGRESSION_INCREMENT * progressRate);
      currentReps = repRange.start;
    } else {
      currentReps = Math.min(currentReps + 1, repRange.end);
    }
  }

  return createProgram({
    id: 'double-progression',
    name: 'Двойная прогрессия',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
