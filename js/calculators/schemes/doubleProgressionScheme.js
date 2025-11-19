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
import { resolveProgramDuration } from '../helpers/programDuration.js';

const STARTING_RPE = 8;
const SESSION_RPE = 8.5;
const PROGRESSION_INCREMENT = 2.5;
const DELOAD_PERCENT = 0.6;

function determineInitialWeight(oneRm, repRangeStart, userInput) {
  const percent = getWorkingPercent(repRangeStart, STARTING_RPE);
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

function initializeProgressionState({ oneRm, repRange, userInput }) {
  const startWeight = determineInitialWeight(oneRm, repRange.start, userInput);
  const userWeight = Number(userInput?.weight);
  const userReps = Number(userInput?.reps);
  const weightIncrement = roundToDumbbell(PROGRESSION_INCREMENT);
  const hasClearedRange =
    Number.isFinite(userWeight) &&
    Number.isFinite(userReps) &&
    userReps >= repRange.end &&
    startWeight <= userWeight;

  return {
    workingWeight: hasClearedRange ? roundToDumbbell(startWeight + weightIncrement) : startWeight,
    currentReps: repRange.start,
  };
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
  currentReps,
}) {
  const deloadWeight = roundToDumbbell(workingWeight * DELOAD_PERCENT);
  const line = `${deloadWeight}×${currentReps} @ RPE 6-7`;
  const restInterval = resolveRestInterval(userInput, {
    reps: currentReps,
    intensityPercent: 0.6,
  });
  const summary = buildIntensitySummary({
    topWeight: deloadWeight,
    topReps: currentReps,
    backoffWeight: deloadWeight,
    backoffReps: currentReps,
    backoffSets: 1,
    intensityPercent: 0.6,
    oneRm: workingWeight / 0.75 || 0,
    rpe: '6-7',
    movementType: userInput?.movementType,
    goal: userInput?.goal,
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
  progressNote,
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
    movementType: userInput?.movementType,
    goal: userInput?.goal,
  });
  const coachingNotes = [`Диапазон повторений: ${repRange.start}–${repRange.end}.`, progressNote];

  if (shouldUseRepProgression) {
    coachingNotes.push('Шаг веса слишком крупный — удерживаем вес и добавляем +2 повтора в каждом подходе.');
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
  const totalWeeks = resolveProgramDuration(userInput);
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
  const progressRate = resolveProgressRate(userInput);
  const initialState = initializeProgressionState({ oneRm: safeOneRm, repRange, userInput });
  let workingWeight = initialState.workingWeight;
  let currentReps = initialState.currentReps;

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    const weekNumber = i + 1;
    const useRepProgression = shouldSwitchToRepProgression(
      workingWeight,
      PROGRESSION_INCREMENT,
      userInput.movementType,
    );
    const repStep = useRepProgression ? 2 : 1;

    if (isDeloadWeek(weekNumber, userInput)) {
      weeks.push(
        buildDeloadWeek({
          weekNumber,
          sessionDays,
          userInput,
          workingWeight,
          currentReps,
        }),
      );
      continue;
    }

    const nextReps = currentReps + repStep;
    const weightIncrement = roundToDumbbell(PROGRESSION_INCREMENT * progressRate);
    const willIncreaseWeight = nextReps > repRange.end;
    const nextWeight = willIncreaseWeight
      ? roundToDumbbell(workingWeight + weightIncrement)
      : workingWeight;
    const progressNote = willIncreaseWeight
      ? `SUCCESS: Increase weight by ${weightIncrement} кг next week.`
      : `Продолжаем работу с этим весом, цель — ${nextReps} повт.`;

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
        progressNote,
      }),
    );

    workingWeight = nextWeight;
    currentReps = willIncreaseWeight ? repRange.start : nextReps;
  }

  return createProgram({
    id: 'double-progression',
    name: 'Двойная прогрессия',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
