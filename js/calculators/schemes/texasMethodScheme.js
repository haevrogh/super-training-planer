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
import { resolveProgramDuration } from '../helpers/programDuration.js';

const VOLUME_DAY_RPE = 8.5;
const INTENSITY_DAY_RPE = 9.5;
const LIGHT_DAY_RPE = 7;
const LIGHT_DAY_MULTIPLIER = 0.85;
const BACKOFF_MULTIPLIER = 0.9;
const DELOAD_PERCENT = 0.6;

function pickDay(sessionDays, index, fallback) {
  return sessionDays[index] || fallback;
}

function buildVolumeSession({ dayLabel, workingWeight, sets, reps, userInput }) {
  const safeSets = Math.max(3, sets);
  const capped = applyJunkVolumeCap({
    sets: safeSets,
    reps,
    intensityPercent: null,
  });
  const restInterval = resolveRestInterval(userInput, {
    reps: capped.reps,
    intensityPercent: null,
  });
  const topSet = `${workingWeight}×${capped.reps} @ RPE ${VOLUME_DAY_RPE}`;
  const backoffSets = Array.from({ length: Math.max(0, capped.sets - 1) }, () => topSet);
  const rpeGuide = buildRpeGuide(String(VOLUME_DAY_RPE), userInput.experienceLevel);
  const intensitySummary = buildIntensitySummary({
    topWeight: workingWeight,
    topReps: capped.reps,
    backoffWeight: workingWeight,
    backoffReps: capped.reps,
    backoffSets: Math.max(0, capped.sets - 1),
    intensityPercent: null,
    oneRm: null,
    rpe: VOLUME_DAY_RPE,
  });
  const coachingNotes = [
    'Объёмный день: классический 5×5 с прогрессией по весу.',
  ];

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

function buildLightSession({
  dayLabel,
  workingWeight,
  reps,
  userInput,
}) {
  const restInterval = resolveRestInterval(userInput, {
    reps,
    intensityPercent: null,
  });
  const topSet = `${workingWeight}×${reps} @ RPE ${LIGHT_DAY_RPE}`;
  const backoffSets = [topSet];
  const rpeGuide = buildRpeGuide(String(LIGHT_DAY_RPE), userInput.experienceLevel);
  const intensitySummary = buildIntensitySummary({
    topWeight: workingWeight,
    topReps: reps,
    backoffWeight: workingWeight,
    backoffReps: reps,
    backoffSets: 1,
    intensityPercent: null,
    oneRm: null,
    rpe: LIGHT_DAY_RPE,
  });
  const coachingNotes = ['Лёгкий день: техника и скорость, вес ≈85% от объёма.'];

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

function buildIntensitySession({
  dayLabel,
  workingWeight,
  reps,
  userInput,
}) {
  const backoffWeight = roundToStep(workingWeight * BACKOFF_MULTIPLIER);
  const restInterval = resolveRestInterval(userInput, {
    reps,
    intensityPercent: null,
  });
  const topSet = `${workingWeight}×${reps} @ RPE ${INTENSITY_DAY_RPE}`;
  const backoffLine = `${backoffWeight}×${reps} @ RPE 8`;
  const backoffSets = [backoffLine, backoffLine];
  const rpeGuide = buildRpeGuide(String(INTENSITY_DAY_RPE), userInput.experienceLevel);
  const intensitySummary = buildIntensitySummary({
    topWeight: workingWeight,
    topReps: reps,
    backoffWeight,
    backoffReps: reps,
    backoffSets: backoffSets.length,
    intensityPercent: null,
    oneRm: null,
    rpe: INTENSITY_DAY_RPE,
  });
  const coachingNotes = ['Интенсивный день: один тяжёлый сет и два добивающих.'];

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

function buildDeloadWeek({
  weekNumber,
  sessionDays,
  baseWeight,
  userInput,
}) {
  const lightWeight = roundToStep(baseWeight * DELOAD_PERCENT);
  const dayLabels = [
    pickDay(sessionDays, 0, 'Пн'),
    pickDay(sessionDays, 1, 'Ср'),
    pickDay(sessionDays, 2, 'Пт'),
  ];
  const sessions = dayLabels.map((dayLabel) =>
    createProgramSession({
      dayLabel,
      topSet: `${lightWeight}×5 @ RPE 6-7`,
      backoffSets: [`${lightWeight}×5 @ RPE 6-7`],
      intensitySummary: buildIntensitySummary({
        topWeight: lightWeight,
        topReps: 5,
        backoffWeight: lightWeight,
        backoffReps: 5,
        backoffSets: 1,
        intensityPercent: 0.6,
        oneRm: baseWeight || 0,
        rpe: '6-7',
      }),
      restInterval: resolveRestInterval(userInput, {
        reps: 5,
        intensityPercent: 0.6,
      }),
      rpeGuide: buildRpeGuide('6-7', userInput.experienceLevel),
      coachingNotes: ['Делoad: 60% от объёмного дня, лёгкая техника.'],
    }),
  );

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
  goalBlueprint,
}) {
  const volumeSets = Math.max(4, goalBlueprint.baseSets + resolveRecoverySetAdjustment(userInput));
  const volumeWeight = getWorkingWeight(projectedOneRm, 5, VOLUME_DAY_RPE);
  const lightWeight = roundToStep(volumeWeight * LIGHT_DAY_MULTIPLIER);
  const intensityWeight = getWorkingWeight(projectedOneRm, 5, INTENSITY_DAY_RPE);

  const dayLabels = [
    pickDay(sessionDays, 0, 'Пн'),
    pickDay(sessionDays, 1, 'Ср'),
    pickDay(sessionDays, 2, 'Пт'),
  ];

  const sessions = [
    buildVolumeSession({
      dayLabel: dayLabels[0],
      workingWeight: volumeWeight,
      sets: volumeSets,
      reps: 5,
      userInput,
    }),
    buildLightSession({
      dayLabel: dayLabels[1],
      workingWeight: lightWeight,
      reps: 5,
      userInput,
    }),
    buildIntensitySession({
      dayLabel: dayLabels[2],
      workingWeight: intensityWeight,
      reps: 5,
      userInput,
    }),
  ];

  return createProgramWeek({
    weekNumber,
    sessions,
  });
}

export function generateTexasMethodProgram(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const totalWeeks = resolveProgramDuration(userInput);
  const sessionDays = resolveSessionDays(userInput);
  const goalBlueprint = resolveGoalBlueprint(userInput);
  const weeklyStep = resolveWeeklyProgressStep(userInput);
  const baseWeight = getWorkingWeight(safeOneRm, 5, VOLUME_DAY_RPE) || safeOneRm;

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
    id: 'texas-method',
    name: 'Texas Method',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
