// Pure function — generate program using Top Set scheme

import {
  createProgram,
  createProgramWeek,
  createProgramSession,
} from '../../models.js';
import {
  roundToDumbbell,
  getLowerDumbbellStep,
} from '../helpers/dumbbellRounding.js';
import {
  resolveIntensityPercent,
  resolveSessionDays,
  resolveVolumeMultiplier,
  resolveRestInterval,
} from '../helpers/trainingAdjustments.js';
import { buildIntensitySummary } from '../helpers/intensitySummary.js';

const DEFAULT_WEEKS = 6;
const WEEK_CONFIGS = [
  {
    label: 'Аккумуляция 1',
    percent: 0.74,
    reps: '6-8',
    rpe: '7-8',
    backoff: { sets: 2, reps: 6, rpe: '6-7' },
  },
  {
    label: 'Аккумуляция 2',
    percent: 0.78,
    reps: '6-8',
    rpe: '7-8',
    backoff: { sets: 2, reps: 6, rpe: '6-7' },
  },
  {
    label: 'Трансмутация',
    percent: 0.84,
    reps: '4',
    rpe: '~8',
    backoff: { sets: 2, reps: 4, rpe: '~7' },
  },
  {
    label: 'Тяжёлые тройки',
    percent: 0.88,
    reps: '3',
    rpe: '8-9',
    backoff: { sets: 2, reps: 3, rpe: '7-8' },
  },
  {
    label: 'Пиковые двойки',
    percent: 0.92,
    reps: '2-3',
    rpe: '~9',
    backoff: { sets: 2, reps: 2, rpe: '8-9' },
  },
  {
    label: 'Тестовая неделя',
    testWeek: true,
  },
];

function buildSession(topSetLine, backoffSetLines, sessionDays, summary, restInterval) {
  return sessionDays.map((dayLabel) =>
    createProgramSession({
      dayLabel,
      topSet: topSetLine,
      backoffSets: [...backoffSetLines],
      intensitySummary: summary,
      restInterval,
    }),
  );
}

function buildWeekPayload(weekNumber, config, oneRm, userInput, sessionDays, volumeMultiplier) {
  if (config.testWeek) {
    const restInterval = resolveRestInterval(userInput);
    const sessions = buildSession(
      'Тестовая неделя (1–2 тяжёлых сингла)',
      [],
      sessionDays,
      null,
      restInterval,
    );

    return createProgramWeek({
      weekNumber,
      sessions,
    });
  }

  const intensityPercent = resolveIntensityPercent(config.percent, userInput);
  const topSetWeight = oneRm > 0 ? roundToDumbbell(oneRm * intensityPercent) : 0;
  const topSetLine = `${topSetWeight}×${config.reps} @ RPE ${config.rpe}`;
  const backoffWeight = topSetWeight > 0 ? getLowerDumbbellStep(topSetWeight) : 0;
  const backoffLine = `${backoffWeight}×${config.backoff.reps} @ RPE ${config.backoff.rpe}`;
  const totalBackoffSets = Math.max(1, Math.round(config.backoff.sets * volumeMultiplier));
  const backoffSets = Array.from({ length: totalBackoffSets }, () => backoffLine);
  const restInterval = resolveRestInterval(userInput, {
    reps: config.reps,
    intensityPercent,
  });
  const intensitySummary = buildIntensitySummary({
    topWeight: topSetWeight,
    topReps: config.reps,
    backoffWeight,
    backoffReps: config.backoff.reps,
    backoffSets: totalBackoffSets,
    intensityPercent,
    oneRm,
    rpe: config.rpe,
  });
  const sessions = buildSession(
    topSetLine,
    backoffSets,
    sessionDays,
    intensitySummary,
    restInterval,
  );

  return createProgramWeek({
    weekNumber,
    sessions,
  });
}

export function generateTopSetProgram(userInput, oneRm) {
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
    const config = WEEK_CONFIGS[i];
    weeks.push(
      buildWeekPayload(i + 1, config, safeOneRm, userInput, sessionDays, volumeMultiplier),
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
