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
  resolveWeeklyProgressStep,
  resolveRecoverySetAdjustment,
  isDeloadWeek,
} from '../helpers/trainingAdjustments.js';
import { buildIntensitySummary } from '../helpers/intensitySummary.js';
import { buildRpeGuide } from '../helpers/rpeGuidance.js';
import { resolveProgramDuration } from '../helpers/programDuration.js';

const MAX_EFFORT_REPS = 2;
const MAX_EFFORT_RPE = 9.5;
const DYNAMIC_REPS = 2;
const DYNAMIC_PERCENT = 0.6;
const REP_DAY_REPS = 10;
const REP_DAY_RPE = 8;
const DELOAD_PERCENT = 0.6;

function pickDay(sessionDays, index, fallback) {
  return sessionDays[index] || fallback;
}

function buildMaxEffortSession({ dayLabel, projectedOneRm, userInput }) {
  const topWeight = getWorkingWeight(projectedOneRm, MAX_EFFORT_REPS, MAX_EFFORT_RPE);
  const backoffWeight = roundToStep(topWeight * 0.9);
  const restInterval = resolveRestInterval(userInput, {
    reps: MAX_EFFORT_REPS,
    intensityPercent: projectedOneRm ? topWeight / projectedOneRm : null,
  });
  const rpeGuide = buildRpeGuide(String(MAX_EFFORT_RPE), userInput.experienceLevel);
  const coachingNotes = ['Максимальное усилие: тяжёлый двойной сет, затем работа на 90%.'];
  const intensitySummary = buildIntensitySummary({
    topWeight,
    topReps: MAX_EFFORT_REPS,
    backoffWeight,
    backoffReps: MAX_EFFORT_REPS,
    backoffSets: 2,
    intensityPercent: projectedOneRm ? topWeight / projectedOneRm : null,
    oneRm: projectedOneRm,
    rpe: MAX_EFFORT_RPE,
  });

  return createProgramSession({
    dayLabel,
    topSet: `${topWeight}×${MAX_EFFORT_REPS} @ RPE ${MAX_EFFORT_RPE}`,
    backoffSets: [`${backoffWeight}×${MAX_EFFORT_REPS} @ RPE 9`, `${backoffWeight}×${MAX_EFFORT_REPS} @ RPE 9`],
    intensitySummary,
    restInterval,
    rpeGuide,
    coachingNotes,
  });
}

function buildDynamicSession({ dayLabel, projectedOneRm, userInput }) {
  const workingWeight = roundToStep(projectedOneRm * DYNAMIC_PERCENT);
  const guard = applyJunkVolumeCap({
    sets: 8,
    reps: DYNAMIC_REPS,
    intensityPercent: projectedOneRm ? workingWeight / projectedOneRm : null,
  });
  const restInterval = resolveRestInterval(userInput, {
    reps: guard.reps,
    intensityPercent: projectedOneRm ? workingWeight / projectedOneRm : DYNAMIC_PERCENT,
  });
  const rpeGuide = buildRpeGuide('6-7', userInput.experienceLevel);
  const coachingNotes = ['Динамический день: взрывное исполнение, короткие паузы.'];
  const backoffSets = Array.from({ length: guard.sets }, () => `${workingWeight}×${guard.reps} @ RPE 6-7`);
  const intensitySummary = buildIntensitySummary({
    topWeight: workingWeight,
    topReps: guard.reps,
    backoffWeight: workingWeight,
    backoffReps: guard.reps,
    backoffSets: Math.max(0, guard.sets - 1),
    intensityPercent: projectedOneRm ? workingWeight / projectedOneRm : DYNAMIC_PERCENT,
    oneRm: projectedOneRm,
    rpe: '6-7',
  });

  return createProgramSession({
    dayLabel,
    topSet: backoffSets[0] || `${workingWeight}×${guard.reps} @ RPE 6-7`,
    backoffSets: backoffSets.slice(1),
    intensitySummary,
    restInterval,
    rpeGuide,
    coachingNotes,
  });
}

function buildRepetitionSession({ dayLabel, projectedOneRm, userInput }) {
  const baseWeight = getWorkingWeight(projectedOneRm, REP_DAY_REPS, REP_DAY_RPE);
  const guard = applyJunkVolumeCap({
    sets: 4,
    reps: REP_DAY_REPS,
    intensityPercent: projectedOneRm ? baseWeight / projectedOneRm : null,
  });
  const restInterval = resolveRestInterval(userInput, {
    reps: guard.reps,
    intensityPercent: projectedOneRm ? baseWeight / projectedOneRm : null,
  });
  const rpeGuide = buildRpeGuide(String(REP_DAY_RPE), userInput.experienceLevel);
  const coachingNotes = ['Повторный день: подъём тонны объёма, следите за утомлением.'];
  const topSet = `${baseWeight}×${guard.reps} @ RPE ${REP_DAY_RPE}`;
  const backoffSets = Array.from({ length: Math.max(0, guard.sets - 1) }, () => topSet);
  const intensitySummary = buildIntensitySummary({
    topWeight: baseWeight,
    topReps: guard.reps,
    backoffWeight: baseWeight,
    backoffReps: guard.reps,
    backoffSets: Math.max(0, guard.sets - 1),
    intensityPercent: projectedOneRm ? baseWeight / projectedOneRm : null,
    oneRm: projectedOneRm,
    rpe: REP_DAY_RPE,
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

function buildDeloadWeek({ weekNumber, sessionDays, baseOneRm, userInput }) {
  const lightWeight = roundToStep(baseOneRm * DELOAD_PERCENT);
  const sessions = sessionDays.slice(0, 3).map((dayLabel) =>
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
        oneRm: baseOneRm,
        rpe: '6-7',
      }),
      restInterval: resolveRestInterval(userInput, { reps: 5, intensityPercent: 0.6 }),
      rpeGuide: buildRpeGuide('6-7', userInput.experienceLevel),
      coachingNotes: ['Разгрузка конъюгата: техника и скорость.'],
    }),
  );

  return createProgramWeek({ weekNumber, sessions });
}

function buildWorkWeek({ weekNumber, projectedOneRm, sessionDays, userInput }) {
  const sessions = [
    buildMaxEffortSession({
      dayLabel: pickDay(sessionDays, 0, 'Пн'),
      projectedOneRm,
      userInput,
    }),
    buildDynamicSession({
      dayLabel: pickDay(sessionDays, 1, 'Ср'),
      projectedOneRm,
      userInput,
    }),
    buildRepetitionSession({
      dayLabel: pickDay(sessionDays, 2, 'Пт'),
      projectedOneRm,
      userInput,
    }),
    buildDynamicSession({
      dayLabel: pickDay(sessionDays, 3, 'Сб'),
      projectedOneRm,
      userInput,
    }),
  ];

  return createProgramWeek({ weekNumber, sessions });
}

export function generateConjugateProgram(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const totalWeeks = resolveProgramDuration(userInput);
  const sessionDays = resolveSessionDays(userInput);
  const weeklyStep = resolveWeeklyProgressStep(userInput);
  const baseOneRm = safeOneRm || 100;
  const recoveryAdjustment = resolveRecoverySetAdjustment(userInput);

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    const weekNumber = i + 1;
    const projectedOneRm = safeOneRm > 0 ? safeOneRm * (1 + weeklyStep * i) : baseOneRm;

    if (isDeloadWeek(weekNumber, userInput)) {
      weeks.push(
        buildDeloadWeek({
          weekNumber,
          sessionDays,
          baseOneRm: baseOneRm || projectedOneRm,
          userInput,
        }),
      );
      continue;
    }

    weeks.push(
      buildWorkWeek({
        weekNumber,
        projectedOneRm: projectedOneRm * (1 + recoveryAdjustment * 0.02),
        sessionDays,
        userInput,
      }),
    );
  }

  return createProgram({
    id: 'conjugate',
    name: 'Conjugate',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
