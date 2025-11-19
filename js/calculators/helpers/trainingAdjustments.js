const EXPERIENCE_INTENSITY_ADJUSTMENTS = {
  novice: -0.025,
  intermediate: 0,
  advanced: 0.02,
};

const MOVEMENT_INTENSITY_ADJUSTMENTS = {
  compound: 0,
  isolation: -0.03,
};

const TALENT_INTENSITY_ADJUSTMENTS = {
  limited: -0.03,
  balanced: 0,
  gifted: 0.02,
};

const GOAL_VOLUME_MULTIPLIERS = {
  strength: 1,
  hypertrophy: 1.35,
  endurance: 1.15,
};

const TALENT_VOLUME_MULTIPLIERS = {
  limited: 0.85,
  balanced: 1,
  gifted: 1.1,
};

const EXPERIENCE_VOLUME_MULTIPLIERS = {
  novice: 0.92,
  intermediate: 1,
  advanced: 1.15,
};

const EXPERIENCE_PROGRESS_RATES = {
  novice: 1.1,
  intermediate: 0.85,
  advanced: 0.6,
};

const SESSION_DAY_TEMPLATES = {
  2: ['Пн', 'Чт'],
  3: ['Пн', 'Ср', 'Пт'],
  4: ['Пн', 'Вт', 'Чт', 'Пт'],
};

const REST_INTERVAL_RULES = {
  strength: {
    compound: { base: '3–4 мин', heavy: '4–6 мин' },
    isolation: { base: '2–3 мин', heavy: '3–4 мин' },
  },
  hypertrophy: {
    compound: { base: '2–3 мин', heavy: '3–4 мин' },
    isolation: { base: '60–90 сек', heavy: '90–120 сек' },
  },
  endurance: {
    compound: { base: '60–90 сек', heavy: '90–120 сек' },
    isolation: { base: '45–75 сек', heavy: '60–90 сек' },
  },
};

const DEFAULT_REST_INTERVAL = '2–3 мин';

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

const TALENT_REP_SHIFT = {
  limited: 1,
  balanced: 0,
  gifted: -1,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseRepsValue(repsInput) {
  if (repsInput === undefined || repsInput === null) {
    return null;
  }

  const match = String(repsInput).match(/(\d+(?:\.\d+)?)/);

  if (!match || match.length === 0) {
    const numeric = Number(repsInput);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const numericValue = Number(match[1]);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function resolveIntensityPercent(basePercent, userInput = {}) {
  const experienceAdjustment =
    EXPERIENCE_INTENSITY_ADJUSTMENTS[userInput.experienceLevel] || 0;
  const movementAdjustment =
    MOVEMENT_INTENSITY_ADJUSTMENTS[userInput.movementType] || 0;
  const talentAdjustment =
    TALENT_INTENSITY_ADJUSTMENTS[userInput.talentLevel] || 0;
  const adjusted =
    basePercent + experienceAdjustment + movementAdjustment + talentAdjustment;
  return clamp(adjusted, 0.5, 0.97);
}

export function resolveVolumeMultiplier(userInput = {}) {
  const baseMultiplier = GOAL_VOLUME_MULTIPLIERS[userInput.goal] || 1;
  const talentMultiplier = TALENT_VOLUME_MULTIPLIERS[userInput.talentLevel] || 1;
  const experienceMultiplier =
    EXPERIENCE_VOLUME_MULTIPLIERS[userInput.experienceLevel] || 1;
  return baseMultiplier * talentMultiplier * experienceMultiplier;
}

export function resolveProgressRate(userInput = {}) {
  return EXPERIENCE_PROGRESS_RATES[userInput.experienceLevel] || EXPERIENCE_PROGRESS_RATES.intermediate;
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
  const experienceShift = EXPERIENCE_REP_SHIFT[userInput.experienceLevel] || 0;
  const talentShift = TALENT_REP_SHIFT[userInput.talentLevel] || 0;
  const shift = experienceShift + talentShift;
  const start = clamp(baseRange.start + shift, 5, 20);
  const end = clamp(Math.max(baseRange.end + shift, start + 1), start + 1, 25);
  return { start, end };
}

export function resolveRestInterval(userInput = {}, context = {}) {
  const goalKey = REST_INTERVAL_RULES[userInput.goal] ? userInput.goal : 'strength';
  const movementKey = userInput.movementType === 'isolation' ? 'isolation' : 'compound';
  const rules = REST_INTERVAL_RULES[goalKey][movementKey] || {};
  const intensityPercent = Number(context.intensityPercent);
  const repsValue = parseRepsValue(context.reps);
  const isHeavyIntensity = Number.isFinite(intensityPercent) && intensityPercent >= 0.85;
  const isLowRep = Number.isFinite(repsValue) && repsValue <= 4;
  const useHeavyRecommendation = isHeavyIntensity || isLowRep;

  if (useHeavyRecommendation && rules.heavy) {
    return rules.heavy;
  }

  if (rules.base) {
    return rules.base;
  }

  return DEFAULT_REST_INTERVAL;
}
