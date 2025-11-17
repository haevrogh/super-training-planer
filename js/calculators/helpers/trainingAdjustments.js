const EXPERIENCE_INTENSITY_ADJUSTMENTS = {
  novice: -0.025,
  intermediate: 0,
  advanced: 0.02,
};

const MOVEMENT_INTENSITY_ADJUSTMENTS = {
  compound: 0,
  isolation: -0.03,
};

const GOAL_VOLUME_MULTIPLIERS = {
  strength: 1,
  hypertrophy: 1.35,
  endurance: 1.15,
};

const SESSION_DAY_TEMPLATES = {
  2: ['Пн', 'Чт'],
  3: ['Пн', 'Ср', 'Пт'],
  4: ['Пн', 'Вт', 'Чт', 'Пт'],
};

const DOUBLE_PROGRESSION_RANGES = {
  strength: { start: 6, end: 10 },
  hypertrophy: { start: 8, end: 12 },
  endurance: { start: 10, end: 15 },
};

const EXPERIENCE_REP_SHIFT = {
  novice: 0,
  intermediate: 0,
  advanced: -1,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function resolveIntensityPercent(basePercent, userInput = {}) {
  const experienceAdjustment =
    EXPERIENCE_INTENSITY_ADJUSTMENTS[userInput.experienceLevel] || 0;
  const movementAdjustment =
    MOVEMENT_INTENSITY_ADJUSTMENTS[userInput.movementType] || 0;
  const adjusted = basePercent + experienceAdjustment + movementAdjustment;
  return clamp(adjusted, 0.5, 0.97);
}

export function resolveVolumeMultiplier(userInput = {}) {
  return GOAL_VOLUME_MULTIPLIERS[userInput.goal] || 1;
}

export function resolveSessionDays(userInput = {}) {
  const requested = Number(userInput.sessionsPerWeek);
  const normalizedCount = Number.isFinite(requested)
    ? clamp(requested, 2, 4)
    : 2;
  return SESSION_DAY_TEMPLATES[normalizedCount] || SESSION_DAY_TEMPLATES[2];
}

export function resolveDoubleProgressionRange(userInput = {}) {
  const baseRange =
    DOUBLE_PROGRESSION_RANGES[userInput.goal] || DOUBLE_PROGRESSION_RANGES.strength;
  const shift = EXPERIENCE_REP_SHIFT[userInput.experienceLevel] || 0;
  const start = clamp(baseRange.start + shift, 5, 20);
  const end = clamp(Math.max(baseRange.end + shift, start + 1), start + 1, 25);
  return { start, end };
}
