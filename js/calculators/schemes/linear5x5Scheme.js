// Pure function — classic 5x5→3x3 linear periodization

import {
  createProgram,
  createProgramWeek,
  createProgramSession,
} from '../../models.js';
import { roundToDumbbell } from '../helpers/dumbbellRounding.js';

const DEFAULT_WEEKS = 6;
const SESSION_DAYS = ['Пн', 'Чт'];

const WEEK_CONFIGS = [
  { label: 'Volume 1', percent: 0.72, sets: 5, reps: 5, rpe: '7.5-8' },
  { label: 'Volume 2', percent: 0.78, sets: 5, reps: 5, rpe: '7.5-8' },
  { label: 'Strength 1', percent: 0.82, sets: 4, reps: 4, rpe: '8' },
  { label: 'Strength 2', percent: 0.86, sets: 4, reps: 4, rpe: '8-8.5' },
  { label: 'Power', percent: 0.9, sets: 3, reps: 3, rpe: '8.5-9' },
  { label: 'Test Week', testWeek: true },
];

function buildLinearSession(topLine, backoffLines) {
  return SESSION_DAYS.map((dayLabel) =>
    createProgramSession({ dayLabel, topSet: topLine, backoffSets: [...backoffLines] }),
  );
}

function buildLinearWeek(weekNumber, config, oneRm) {
  if (config.testWeek) {
    const sessions = buildLinearSession('Test week (work up to heavy triples/singles)', []);

    return createProgramWeek({
      weekNumber,
      sessions,
    });
  }

  const workingWeight = oneRm > 0 ? roundToDumbbell(oneRm * config.percent) : 0;
  const topSetLine = `${workingWeight}×${config.reps} @ RPE ${config.rpe}`;
  const remainingSets = Math.max(0, config.sets - 1);
  const backoffLine = `${workingWeight}×${config.reps} @ RPE ${config.rpe}`;
  const backoffSets = Array.from({ length: remainingSets }, () => backoffLine);
  const sessions = buildLinearSession(topSetLine, backoffSets);

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

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    weeks.push(buildLinearWeek(i + 1, WEEK_CONFIGS[i], safeOneRm));
  }

  return createProgram({
    id: 'linear-5x5',
    name: 'Linear 5×5 → 3×3',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
