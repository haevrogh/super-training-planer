// Build week-by-week accessory progressions for non-primary lifts

import { roundToDumbbell } from './dumbbellRounding.js';

const ACCESSORY_BLUEPRINTS = [
  {
    id: 'strength',
    name: 'Силовая подсобка',
    baseRange: { start: 6, end: 10 },
    sets: 3,
    loadMultiplier: 0.62,
    increment: 2.5,
  },
  {
    id: 'pump',
    name: 'Памп/изоляция',
    baseRange: { start: 10, end: 15 },
    sets: 3,
    loadMultiplier: 0.45,
    increment: 1.5,
  },
];

const GOAL_REP_SHIFT = {
  strength: -1,
  hypertrophy: 0,
  endurance: 1,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeWeekNumber(weekNumber) {
  const numeric = Number(weekNumber);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 1;
}

function safeIndex(index) {
  const numeric = Number(index);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
}

function formatRepRange({ start, end }, shift) {
  const safeStart = clamp(start + shift, start, end - 1);
  return `${safeStart}-${end}`;
}

function resolveLoad(baseWeight, multiplier, shift, increment) {
  const raw = baseWeight * multiplier + Math.max(0, shift) * increment * 0.5;

  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }

  return roundToDumbbell(raw);
}

export function buildAccessoryProgression(weekNumber, sessionIndex, userInput = {}) {
  const safeWeek = safeWeekNumber(weekNumber);
  const safeSessionIndex = safeIndex(sessionIndex);
  const baseWeight = Number(userInput.weight) || 0;
  const movementScale = userInput.movementType === 'isolation' ? 0.85 : 1;
  const goalShift = GOAL_REP_SHIFT[userInput.goal] || 0;

  return ACCESSORY_BLUEPRINTS.map((blueprint, blueprintIndex) => {
    const progressiveShift = Math.max(
      0,
      safeWeek - 1 + safeSessionIndex + blueprintIndex + goalShift,
    );
    const repRange = formatRepRange(blueprint.baseRange, progressiveShift);
    const suggestedLoad = resolveLoad(
      baseWeight,
      blueprint.loadMultiplier * movementScale,
      progressiveShift,
      blueprint.increment,
    );

    const baseLabel = `${blueprint.sets}×${repRange} @ RPE 7`;
    const loadLabel =
      suggestedLoad > 0 ? `${suggestedLoad} кг · ${baseLabel}` : baseLabel;

    return {
      name: blueprint.name,
      prescription: `${loadLabel} · +${blueprint.increment} кг после верхней границы`,
    };
  });
}
