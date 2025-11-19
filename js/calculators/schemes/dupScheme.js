import {
  createProgram,
  createProgramWeek,
  createProgramSession,
} from '../../models.js';
import {
  getWorkingWeight,
  applyJunkVolumeCap,
  roundToStep,
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
import { resolveProgramDuration } from '../helpers/programDuration.js';

const STRENGTH_REPS = 5;
const STRENGTH_RPE = 8.5;
const HYPERTROPHY_REPS = 8;
const HYPERTROPHY_RPE = 8;
const POWER_REPS = 3;
const POWER_RPE = 7.5;
const DELOAD_PERCENT = 0.6;

function pickDay(sessionDays, index, fallback) {
  return sessionDays[index] || fallback;
}

function buildDupletSession({
  dayLabel,
  weight,
  reps,
  sets,
  rpe,
  userInput,
  oneRm,
  focus,
}) {
  const guard = applyJunkVolumeCap({
    sets,
    reps,
    intensityPercent: oneRm ? weight / oneRm : null,
  });
  const restInterval = resolveRestInterval(userInput, {
    reps: guard.reps,
    intensityPercent: oneRm ? weight / oneRm : null,
  });
  const topSet = `${weight}×${guard.reps} @ RPE ${rpe}`;
  const backoffSets = Array.from({ length: Math.max(0, guard.sets - 1) }, () => topSet);
  const intensitySummary = buildIntensitySummary({
    topWeight: weight,
    topReps: guard.reps,
    backoffWeight: weight,
    backoffReps: guard.reps,
    backoffSets: Math.max(0, guard.sets - 1),
    intensityPercent: oneRm ? weight / oneRm : null,
    oneRm,
    rpe,
    movementType: userInput?.movementType,
    goal: userInput?.goal,
  });
  const rpeGuide = buildRpeGuide(String(rpe), userInput.experienceLevel);
  const coachingNotes = [`${focus} блок: держим технику и скорость.`];

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
  const deloadWeight = roundToStep(baseWeight * DELOAD_PERCENT);
  const dayLabels = [
    pickDay(sessionDays, 0, 'Пн'),
    pickDay(sessionDays, 1, 'Ср'),
    pickDay(sessionDays, 2, 'Пт'),
  ];
  const sessions = dayLabels.map((dayLabel) =>
    buildDupletSession({
      dayLabel,
      weight: deloadWeight,
      reps: 6,
      sets: 2,
      rpe: 6.5,
      userInput,
      oneRm: baseWeight || null,
      focus: 'Делoad',
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
  const baseSets = Math.max(3, goalBlueprint.baseSets + volumeAdjustment);
  const powerSets = Math.max(3, baseSets - 1);
  const hypertrophySets = Math.max(3, baseSets + 1);

  const strengthWeight = getWorkingWeight(projectedOneRm, STRENGTH_REPS, STRENGTH_RPE);
  const hypertrophyWeight = getWorkingWeight(projectedOneRm, HYPERTROPHY_REPS, HYPERTROPHY_RPE);
  const powerWeight = getWorkingWeight(projectedOneRm, POWER_REPS, POWER_RPE);

  const sessions = [
    buildDupletSession({
      dayLabel: pickDay(sessionDays, 0, 'Пн'),
      weight: strengthWeight,
      reps: STRENGTH_REPS,
      sets: baseSets,
      rpe: STRENGTH_RPE,
      userInput,
      oneRm: projectedOneRm,
      focus: 'Сила',
    }),
    buildDupletSession({
      dayLabel: pickDay(sessionDays, 1, 'Ср'),
      weight: hypertrophyWeight,
      reps: HYPERTROPHY_REPS,
      sets: hypertrophySets,
      rpe: HYPERTROPHY_RPE,
      userInput,
      oneRm: projectedOneRm,
      focus: 'Гипертрофия',
    }),
    buildDupletSession({
      dayLabel: pickDay(sessionDays, 2, 'Пт'),
      weight: powerWeight,
      reps: POWER_REPS,
      sets: powerSets,
      rpe: POWER_RPE,
      userInput,
      oneRm: projectedOneRm,
      focus: 'Мощность',
    }),
  ];

  return createProgramWeek({ weekNumber, sessions });
}

export function generateDupProgram(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const totalWeeks = resolveProgramDuration(userInput);
  const sessionDays = resolveSessionDays(userInput);
  const goalBlueprint = resolveGoalBlueprint(userInput);
  const weeklyStep = resolveWeeklyProgressStep(userInput);
  const baseWeight = getWorkingWeight(safeOneRm, STRENGTH_REPS, STRENGTH_RPE) || safeOneRm;

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
    id: 'dup',
    name: 'DUP (Daily Undulating)',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
