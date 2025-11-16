// Pure function — double progression logic

import {
  createProgram,
  createProgramWeek,
  createProgramSession,
} from '../../models.js';
import { roundToDumbbell } from '../helpers/dumbbellRounding.js';

const DEFAULT_WEEKS = 6;
const SESSION_DAYS = ['Пн', 'Чт'];
const BASE_PERCENT = 0.7;
const NOTE = 'Consider adding weight next week';

function buildDoubleProgressionWeek(weekNumber, targetReps, workingWeight) {
  const setLine = `${workingWeight}×${targetReps}`;
  const baseBackoffSets = Array.from({ length: 2 }, () => setLine);
  const reachedCap = targetReps >= 12;
  const backoffWithNote = reachedCap
    ? [...baseBackoffSets, NOTE]
    : baseBackoffSets;

  const sessions = SESSION_DAYS.map((dayLabel) =>
    createProgramSession({ dayLabel, topSet: setLine, backoffSets: [...backoffWithNote] }),
  );

  return createProgramWeek({
    weekNumber,
    sessions,
  });
}

export function generateDoubleProgressionProgram(userInput, oneRm) {
  const safeOneRm = Number(oneRm) || 0;
  const requestedWeeks = Number(userInput?.weeks) || DEFAULT_WEEKS;
  const totalWeeks = Math.max(1, requestedWeeks);
  const workingWeight = safeOneRm > 0 ? roundToDumbbell(safeOneRm * BASE_PERCENT) : 0;

  const weeks = [];

  for (let i = 0; i < totalWeeks; i += 1) {
    const targetReps = Math.min(8 + i, 12);
    weeks.push(buildDoubleProgressionWeek(i + 1, targetReps, workingWeight));
  }

  return createProgram({
    id: 'double-progression',
    name: 'Double Progression 8–12',
    userInput: userInput || null,
    oneRm: safeOneRm,
    weeks,
  });
}
