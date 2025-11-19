import {
  createProgram,
  createProgramWeek,
  createProgramSession,
} from '../../models.js';
import { roundToStep } from '../helpers/progressionCore.js';
import {
  resolveSessionDays,
  resolveWeeklyProgressStep,
  resolveRestInterval,
  isDeloadWeek,
} from '../helpers/trainingAdjustments.js';
import { buildIntensitySummary } from '../helpers/intensitySummary.js';
import { buildRpeGuide } from '../helpers/rpeGuidance.js';

const DEFAULT_WEEKS = 6;
const DELOAD_PERCENT = 0.6;

function pickDay(sessionDays, index, fallback) {
  return sessionDays[index] || fallback;
}

function buildSheikoSession({ dayLabel, oneRm, blocks, userInput }) {
  const weightedBlocks = blocks.map((block) => ({
    ...block,
    weight: roundToStep(oneRm * block.percent),
  }));
  const topBlock = weightedBlocks.reduce((prev, current) =>
    current.percent > prev.percent ? current : prev,
  weightedBlocks[0]);
  const backoffBlocks = weightedBlocks.filter((block) => block !== topBlock);
  const backoffSets = backoffBlocks.flatMap((block) =>
    Array.from({ length: block.sets }, () => `${block.weight}×${block.reps} @ RPE ${block.rpe}`),
  );
  const topSet = `${topBlock.weight}×${topBlock.reps} @ RPE ${topBlock.rpe}`;
  const restInterval = resolveRestInterval(userInput, {
    reps: topBlock.reps,
    intensityPercent: topBlock.percent,
  });
  const rpeGuide = buildRpeGuide(String(topBlock.rpe), userInput.experienceLevel);
  const intensitySummary = buildIntensitySummary({
    topWeight: topBlock.weight,
    topReps: topBlock.reps,
    backoffWeight: backoffBlocks[0]?.weight || topBlock.weight,
    backoffReps: backoffBlocks[0]?.reps || topBlock.reps,
    backoffSets: backoffSets.length,
    intensityPercent: topBlock.percent,
    oneRm,
    rpe: topBlock.rpe,
  });
  const coachingNotes = ['Волновая сессия Шейко: следите за чистой техникой и равномерным темпом.'];

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
      coachingNotes: ['Делoad: одна волна на 60% с акцентом на скорость.'],
    }),
  );

  return createProgramWeek({ weekNumber, sessions });
}

function buildWorkWeek({ weekNumber, projectedOneRm, sessionDays, userInput }) {
  const dayTemplates = [
    [
      { percent: 0.7, sets: 3, reps: 5, rpe: 7.5 },
      { percent: 0.75, sets: 2, reps: 4, rpe: 8 },
    ],
    [
      { percent: 0.8, sets: 2, reps: 3, rpe: 8.5 },
      { percent: 0.7, sets: 3, reps: 5, rpe: 7.5 },
    ],
    [
      { percent: 0.77, sets: 2, reps: 3, rpe: 8.5 },
      { percent: 0.72, sets: 3, reps: 4, rpe: 8 },
    ],
  ];
  const sessions = dayTemplates.map((blocks, index) =>
    buildSheikoSession({
      dayLabel: pickDay(sessionDays, index, ['Пн', 'Ср', 'Пт'][index]),
      oneRm: projectedOneRm,
      blocks,
      userInput,
    }),
  );

  return createProgramWeek({ weekNumber, sessions });
}

export function generateSheikoStyleProgram(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const requestedWeeks = Number(userInput?.weeks) || DEFAULT_WEEKS;
  const totalWeeks = Math.max(1, Math.min(requestedWeeks, 10));
  const sessionDays = resolveSessionDays(userInput);
  const weeklyStep = resolveWeeklyProgressStep(userInput);
  const baseOneRm = safeOneRm || 100;

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
        projectedOneRm,
        sessionDays,
        userInput,
      }),
    );
  }

  return createProgram({
    id: 'sheiko-style',
    name: 'Sheiko-style',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
