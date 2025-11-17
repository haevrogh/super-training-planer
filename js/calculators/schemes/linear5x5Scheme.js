// Pure function — classic 5x5→3x3 linear periodization

import {
  createProgram,
  createProgramWeek,
  createProgramSession,
} from '../../models.js';
import { roundToDumbbell } from '../helpers/dumbbellRounding.js';
import {
  resolveIntensityPercent,
  resolveSessionDays,
  resolveVolumeMultiplier,
} from '../helpers/trainingAdjustments.js';

const DEFAULT_WEEKS = 6;

const WEEK_CONFIGS = [
  { label: 'Объём 1', percent: 0.72, sets: 5, reps: 5, rpe: '7.5-8' },
  { label: 'Объём 2', percent: 0.78, sets: 5, reps: 5, rpe: '7.5-8' },
  { label: 'Сила 1', percent: 0.82, sets: 4, reps: 4, rpe: '8' },
  { label: 'Сила 2', percent: 0.86, sets: 4, reps: 4, rpe: '8-8.5' },
  { label: 'Мощность', percent: 0.9, sets: 3, reps: 3, rpe: '8.5-9' },
  { label: 'Тестовая неделя', testWeek: true },
];

function buildLinearSession(topLine, backoffLines, sessionDays) {
  return sessionDays.map((dayLabel) =>
    createProgramSession({ dayLabel, topSet: topLine, backoffSets: [...backoffLines] }),
  );
}

function buildLinearWeek(weekNumber, config, oneRm, userInput, sessionDays, volumeMultiplier) {
  if (config.testWeek) {
    const sessions = buildLinearSession(
      'Тестовая неделя (до тяжёлых троек/синглов)',
      [],
      sessionDays,
    );

    return createProgramWeek({
      weekNumber,
      sessions,
    });
  }

  const intensityPercent = resolveIntensityPercent(config.percent, userInput);
  const workingWeight = oneRm > 0 ? roundToDumbbell(oneRm * intensityPercent) : 0;
  const topSetLine = `${workingWeight}×${config.reps} @ RPE ${config.rpe}`;
  const totalSets = Math.max(1, Math.round(config.sets * volumeMultiplier));
  const remainingSets = Math.max(0, totalSets - 1);
  const backoffLine = `${workingWeight}×${config.reps} @ RPE ${config.rpe}`;
  const backoffSets = Array.from({ length: remainingSets }, () => backoffLine);
  const sessions = buildLinearSession(topSetLine, backoffSets, sessionDays);

  return createProgramWeek({
    weekNumber,
    sessions,
  });
}

export function generateLinear5x5Program(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const requestedWeeks = Number(userInput?.weeks);
  const normalizedWeeks =
    Number.isFinite(requestedWeeks) && requestedWeeks > 0
      ? requestedWeeks
      : DEFAULT_WEEKS;
  const totalWeeks = Math.min(normalizedWeeks, WEEK_CONFIGS.length);
  const sessionDays = resolveSessionDays(userInput);
  const volumeMultiplier = resolveVolumeMultiplier(userInput);

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    weeks.push(
      buildLinearWeek(
        i + 1,
        WEEK_CONFIGS[i],
        safeOneRm,
        userInput,
        sessionDays,
        volumeMultiplier,
      ),
    );
  }

  return createProgram({
    id: 'linear-5x5',
    name: 'Линейная 5×5 → 3×3',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
