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

const TOP_SET_REPS = 5;
const BACKOFF_REPS = 8;
const TOP_SET_RPE = 9;
const BACKOFF_PERCENT = 0.9;
const BACKOFF_RPE = '7-8';
const DELOAD_PERCENT = 0.6;

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

function buildDeloadWeek({ weekNumber, sessionDays, userInput, baseWeight }) {
  const deloadTop = roundToStep(baseWeight * DELOAD_PERCENT);
  const topSet = `${deloadTop}×${TOP_SET_REPS} @ RPE 6-7`;
  const backoffLine = `${deloadTop}×${BACKOFF_REPS} @ RPE 6-7`;
  const backoffSets = [backoffLine];
  const restInterval = resolveRestInterval(userInput, {
    reps: BACKOFF_REPS,
    intensityPercent: 0.6,
  });
  const coachingNotes = ['Разгрузочная неделя — держим вес 60% и 2 подхода.'];
  const rpeGuide = buildRpeGuide('6-7', userInput.experienceLevel);
  const intensitySummary = buildIntensitySummary({
    topWeight: deloadTop,
    topReps: TOP_SET_REPS,
    backoffWeight: deloadTop,
    backoffReps: BACKOFF_REPS,
    backoffSets: backoffSets.length,
    intensityPercent: 0.6,
    oneRm: baseWeight / 0.9 || 0,
    rpe: '6-7',
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

function buildWorkWeek({
  weekNumber,
  projectedOneRm,
  sessionDays,
  userInput,
  totalSets,
}) {
  const topWeight = getWorkingWeight(projectedOneRm, TOP_SET_REPS, TOP_SET_RPE);
  const backoffWeight = roundToStep(topWeight * BACKOFF_PERCENT);
  const guard = applyJunkVolumeCap({
    sets: totalSets,
    reps: BACKOFF_REPS,
    intensityPercent: projectedOneRm > 0 ? backoffWeight / projectedOneRm : 0.7,
  });
  const backoffSetsCount = Math.max(1, guard.sets - 1);
  const restInterval = resolveRestInterval(userInput, {
    reps: BACKOFF_REPS,
    intensityPercent: guard.intensityPercent || backoffWeight / projectedOneRm,
  });
  const topSet = `${topWeight}×${TOP_SET_REPS} @ RPE ${TOP_SET_RPE}`;
  const backoffLine = `${backoffWeight}×${guard.reps} @ RPE ${BACKOFF_RPE}`;
  const backoffSets = Array.from({ length: backoffSetsCount }, () => backoffLine);
  const rpeGuide = buildRpeGuide(String(TOP_SET_RPE), userInput.experienceLevel);
  const coachingNotes = [
    `Топ-сет: 1×${TOP_SET_REPS} @ RPE ${TOP_SET_RPE}.`,
    `Добивка: ${backoffSetsCount}×${guard.reps} (-10% от топ-сета).`,
  ];
  const intensitySummary = buildIntensitySummary({
    topWeight: topWeight,
    topReps: TOP_SET_REPS,
    backoffWeight,
    backoffReps: guard.reps,
    backoffSets: backoffSetsCount,
    intensityPercent: guard.intensityPercent || backoffWeight / projectedOneRm,
    oneRm: projectedOneRm,
    rpe: TOP_SET_RPE,
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

export function generateTopSetProgram(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const totalWeeks = resolveProgramDuration(userInput);
  const sessionDays = resolveSessionDays(userInput);
  const goalBlueprint = resolveGoalBlueprint(userInput);
  const volumeAdjustment = resolveRecoverySetAdjustment(userInput);
  const totalSets = Math.max(3, goalBlueprint.baseSets + volumeAdjustment);
  const weeklyStep = resolveWeeklyProgressStep(userInput);
  const baseWeight = getWorkingWeight(safeOneRm, TOP_SET_REPS, TOP_SET_RPE) || safeOneRm;

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
        totalSets,
      }),
    );
  }

  return createProgram({
    id: 'top-set-backoff',
    name: 'Топ-сет + добивка',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
