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
  resolveGoalBlueprint,
  resolveRecoverySetAdjustment,
  resolveWeeklyProgressStep,
  resolveRestInterval,
  isDeloadWeek,
} from '../helpers/trainingAdjustments.js';
import { buildIntensitySummary } from '../helpers/intensitySummary.js';
import { buildRpeGuide } from '../helpers/rpeGuidance.js';

const DEFAULT_WEEKS = 6;
const HEAVY_RPE = 9;
const MEDIUM_RPE = 8;
const LIGHT_RPE = 7;
const MEDIUM_REPS = 6;
const LIGHT_REPS = 10;
const HEAVY_REPS = 5;
const MEDIUM_PERCENT = 0.9;
const LIGHT_PERCENT = 0.8;
const DELOAD_PERCENT = 0.6;

function pickDay(sessionDays, index, fallback) {
  return sessionDays[index] || fallback;
}

function buildSession({
  dayLabel,
  weight,
  reps,
  sets,
  rpe,
  userInput,
  oneRm,
  coachingNotes,
}) {
  const guard = applyJunkVolumeCap({ sets, reps, intensityPercent: oneRm ? weight / oneRm : null });
  const restInterval = resolveRestInterval(userInput, {
    reps: guard.reps,
    intensityPercent: oneRm ? weight / oneRm : null,
  });
  const topSet = `${weight}×${guard.reps} @ RPE ${rpe}`;
  const backoffSets = Array.from({ length: Math.max(0, guard.sets - 1) }, () => topSet);
  const rpeGuide = buildRpeGuide(String(rpe), userInput.experienceLevel);
  const intensitySummary = buildIntensitySummary({
    topWeight: weight,
    topReps: guard.reps,
    backoffWeight: weight,
    backoffReps: guard.reps,
    backoffSets: Math.max(0, guard.sets - 1),
    intensityPercent: oneRm ? weight / oneRm : null,
    oneRm,
    rpe,
  });

  return createProgramSession({
    dayLabel,
    topSet,
    backoffSets,
    intensitySummary,
    restInterval,
    rpeGuide,
    coachingNotes,
  });
}

function buildDeloadWeek({ weekNumber, sessionDays, baseWeight, userInput }) {
  const lightWeight = roundToStep(baseWeight * DELOAD_PERCENT);
  const dayLabels = [
    pickDay(sessionDays, 0, 'Пн'),
    pickDay(sessionDays, 1, 'Ср'),
    pickDay(sessionDays, 2, 'Пт'),
  ];
  const sessions = dayLabels.map((dayLabel) =>
    buildSession({
      dayLabel,
      weight: lightWeight,
      reps: 6,
      sets: 2,
      rpe: 6.5,
      userInput,
      oneRm: baseWeight || null,
      coachingNotes: ['Разгрузочная неделя: лёгкие двойки для техники.'],
    }),
  );

  return createProgramWeek({ weekNumber, sessions });
}

function buildWorkWeek({
  weekNumber,
  projectedOneRm,
  sessionDays,
  userInput,
  goalBlueprint,
}) {
  const volumeAdjustment = resolveRecoverySetAdjustment(userInput);
  const heavySets = Math.max(3, goalBlueprint.baseSets + volumeAdjustment);
  const mediumSets = Math.max(3, goalBlueprint.baseSets - 1 + volumeAdjustment);
  const lightSets = Math.max(2, goalBlueprint.baseSets - 1 + volumeAdjustment);

  const heavyWeight = getWorkingWeight(projectedOneRm, HEAVY_REPS, HEAVY_RPE);
  const mediumWeight = roundToStep(heavyWeight * MEDIUM_PERCENT);
  const lightWeight = roundToStep(heavyWeight * LIGHT_PERCENT);

  const sessions = [
    buildSession({
      dayLabel: pickDay(sessionDays, 0, 'Пн'),
      weight: heavyWeight,
      reps: HEAVY_REPS,
      sets: heavySets,
      rpe: HEAVY_RPE,
      userInput,
      oneRm: projectedOneRm,
      coachingNotes: ['Тяжёлый день: фокус на силе и низкий диапазон повторений.'],
    }),
    buildSession({
      dayLabel: pickDay(sessionDays, 1, 'Ср'),
      weight: mediumWeight,
      reps: MEDIUM_REPS,
      sets: mediumSets,
      rpe: MEDIUM_RPE,
      userInput,
      oneRm: projectedOneRm,
      coachingNotes: ['Средний день: стабильная техника, умеренная нагрузка.'],
    }),
    buildSession({
      dayLabel: pickDay(sessionDays, 2, 'Пт'),
      weight: lightWeight,
      reps: LIGHT_REPS,
      sets: lightSets,
      rpe: LIGHT_RPE,
      userInput,
      oneRm: projectedOneRm,
      coachingNotes: ['Лёгкий день: объём через повторения, минимальный стресс.'],
    }),
  ];

  return createProgramWeek({ weekNumber, sessions });
}

export function generateHeavyLightMediumProgram(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const requestedWeeks = Number(userInput?.weeks) || DEFAULT_WEEKS;
  const totalWeeks = Math.max(1, Math.min(requestedWeeks, 12));
  const sessionDays = resolveSessionDays(userInput);
  const goalBlueprint = resolveGoalBlueprint(userInput);
  const weeklyStep = resolveWeeklyProgressStep(userInput);
  const baseWeight = getWorkingWeight(safeOneRm, HEAVY_REPS, HEAVY_RPE) || safeOneRm;

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    const weekNumber = i + 1;
    const projectedOneRm = safeOneRm > 0 ? safeOneRm * (1 + weeklyStep * i) : baseWeight;

    if (isDeloadWeek(weekNumber, userInput)) {
      weeks.push(
        buildDeloadWeek({
          weekNumber,
          sessionDays,
          baseWeight: baseWeight || projectedOneRm,
          userInput,
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
        goalBlueprint,
      }),
    );
  }

  return createProgram({
    id: 'heavy-light-medium',
    name: 'Heavy–Light–Medium',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
