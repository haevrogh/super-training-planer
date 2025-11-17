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

const DEFAULT_WEEKS = 6;
const SESSION_DAYS = ['Пн', 'Чт'];

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

function buildSession(topSetLine, backoffSetLines) {
  return SESSION_DAYS.map((dayLabel) =>
    createProgramSession({ dayLabel, topSet: topSetLine, backoffSets: [...backoffSetLines] }),
  );
}

function buildWeekPayload(weekNumber, config, oneRm) {
  if (config.testWeek) {
    const sessions = buildSession('Тестовая неделя (1–2 тяжёлых сингла)', []);

    return createProgramWeek({
      weekNumber,
      sessions,
    });
  }

  const topSetWeight = oneRm > 0 ? roundToDumbbell(oneRm * config.percent) : 0;
  const topSetLine = `${topSetWeight}×${config.reps} @ RPE ${config.rpe}`;
  const backoffWeight = topSetWeight > 0 ? getLowerDumbbellStep(topSetWeight) : 0;
  const backoffLine = `${backoffWeight}×${config.backoff.reps} @ RPE ${config.backoff.rpe}`;
  const backoffSets = Array.from({ length: config.backoff.sets }, () => backoffLine);
  const sessions = buildSession(topSetLine, backoffSets);

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

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    const config = WEEK_CONFIGS[i];
    weeks.push(buildWeekPayload(i + 1, config, safeOneRm));
  }

  return createProgram({
    id: 'top-set-backoff',
    name: 'Топ-сет + добивка',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
