import {
  createProgram,
  createProgramWeek,
  createProgramSession,
} from '../../models.js';
import {
  roundToStep,
  getWorkingWeight,
  applyJunkVolumeCap,
} from '../helpers/progressionCore.js';
import {
  resolveSessionDays,
  resolveRestInterval,
  resolveGoalBlueprint,
  resolveRecoverySetAdjustment,
  resolveWeeklyProgressStep,
  isDeloadWeek,
} from '../helpers/trainingAdjustments.js';
import { buildIntensitySummary } from '../helpers/intensitySummary.js';
import { buildRpeGuide } from '../helpers/rpeGuidance.js';
import { resolveProgramDuration } from '../helpers/programDuration.js';

const START_RPE = 7;
const RPE_STEP = 0.5;
const MAX_RPE = 9.5;
const DELOAD_PERCENT = 0.6;

function formatRpeLabel(value) {
  if (!Number.isFinite(value)) {
    return '7';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildSessions({
  sessionDays,
  topSet,
  backoffSets,
  intensitySummary,
  restInterval,
  rpeGuide,
  coachingNotes,
}) {
  return sessionDays.map((dayLabel) =>
    createProgramSession({
      dayLabel,
      topSet,
      backoffSets: [...backoffSets],
      intensitySummary,
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
  baseReps,
  baseWeight,
}) {
  const deloadWeight = roundToStep(baseWeight * DELOAD_PERCENT);
  const topSet = `${deloadWeight}×${baseReps} @ RPE 6-7`;
  const backoffSets = ['Фокус на технике и скорости'];
  const intensitySummary = buildIntensitySummary({
    topWeight: deloadWeight,
    topReps: baseReps,
    backoffWeight: deloadWeight,
    backoffReps: baseReps,
    backoffSets: 1,
    intensityPercent: 0.6,
    oneRm: baseWeight / 0.85 || 0,
    rpe: '6-7',
    movementType: userInput?.movementType,
    goal: userInput?.goal,
  });
  const restInterval = resolveRestInterval(userInput, {
    reps: baseReps,
    intensityPercent: 0.6,
  });
  const rpeGuide = buildRpeGuide('6-7', userInput.experienceLevel);
  const coachingNotes = ['Делoad: снижаем вес до 60% и выполняем 2 лёгких подхода.'];

  const sessions = buildSessions({
    sessionDays,
    topSet,
    backoffSets,
    intensitySummary,
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
  projectedOneRm,
  sessionDays,
  userInput,
  targetSets,
  goalBlueprint,
  weeklyStep,
}) {
  const currentRpe = Math.min(START_RPE + weekNumber * RPE_STEP, MAX_RPE);
  const rpeLabel = formatRpeLabel(currentRpe);
  const workingWeight = getWorkingWeight(projectedOneRm, goalBlueprint.reps, currentRpe);
  const basePercent = projectedOneRm > 0 && workingWeight > 0 ? workingWeight / projectedOneRm : 0.75;
  const volumeGuard = applyJunkVolumeCap({
    sets: targetSets,
    reps: goalBlueprint.reps,
    intensityPercent: basePercent,
  });
  const finalPercent = volumeGuard.intensityPercent || basePercent;
  const finalWeight = projectedOneRm > 0 ? roundToStep(projectedOneRm * finalPercent) : workingWeight;
  const totalSets = Math.max(1, volumeGuard.sets);
  const remainingSets = Math.max(0, totalSets - 1);
  const reps = volumeGuard.reps;
  const topSet = `${finalWeight}×${reps} @ RPE ${rpeLabel}`;
  const backoffLine = `${finalWeight}×${reps} @ RPE ${rpeLabel}`;
  const backoffSets = Array.from({ length: remainingSets }, () => backoffLine);
  const restInterval = resolveRestInterval(userInput, {
    reps,
    intensityPercent: finalPercent,
  });
  const rpeGuide = buildRpeGuide(rpeLabel, userInput.experienceLevel);
  const projectedPercentGrowth = Math.round(weeklyStep * weekNumber * 1000) / 10;
  const coachingNotes = [
    `Цель недели: ${totalSets}×${reps} @ RPE ${rpeLabel}.`,
    projectedPercentGrowth > 0
      ? `Прогноз роста 1ПМ ≈ +${projectedPercentGrowth}%`
      : 'Держим технику и скорость.',
  ];
  const intensitySummary = buildIntensitySummary({
    topWeight: finalWeight,
    topReps: reps,
    backoffWeight: finalWeight,
    backoffReps: reps,
    backoffSets: remainingSets,
    intensityPercent: finalPercent,
    oneRm: projectedOneRm,
    rpe: rpeLabel,
    movementType: userInput?.movementType,
    goal: userInput?.goal,
  });

  const sessions = buildSessions({
    sessionDays,
    topSet,
    backoffSets,
    intensitySummary,
    restInterval,
    rpeGuide,
    coachingNotes,
  });

  return createProgramWeek({
    weekNumber,
    sessions,
  });
}

export function generateLinear5x5Program(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const totalWeeks = resolveProgramDuration(userInput);
  const sessionDays = resolveSessionDays(userInput);
  const goalBlueprint = resolveGoalBlueprint(userInput);
  const volumeAdjustment = resolveRecoverySetAdjustment(userInput);
  const targetSets = Math.max(3, goalBlueprint.baseSets + volumeAdjustment);
  const weeklyStep = resolveWeeklyProgressStep(userInput);
  const baseWeight = getWorkingWeight(safeOneRm, goalBlueprint.reps, START_RPE) || safeOneRm;

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    const weekNumber = i + 1;
    const projectedOneRm = safeOneRm > 0 ? safeOneRm * (1 + weeklyStep * weekNumber) : baseWeight;

    if (isDeloadWeek(weekNumber, userInput)) {
      weeks.push(
        buildDeloadWeek({
          weekNumber,
          sessionDays,
          userInput,
          baseReps: goalBlueprint.reps,
          baseWeight: baseWeight || projectedOneRm,
        }),
      );
      continue;
    }

    weeks.push(
      buildWorkWeek({
        weekNumber,
        projectedOneRm,
        sessionDays,
        userInput,
        targetSets,
        goalBlueprint,
        weeklyStep,
      }),
    );
  }

  return createProgram({
    id: 'linear-5x5',
    name: 'Классическая линейная прогрессия',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
