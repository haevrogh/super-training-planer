const SCHEME_BASE_WEEKS = {
  'top-set': 6,
  'linear-5x5': 6,
  'double-progression': 6,
  'texas-method': 8,
  'heavy-light-medium': 6,
  dup: 6,
  'sheiko-style': 6,
  conjugate: 6,
};

const GOAL_WEEK_ADJUSTMENTS = {
  strength: 1,
  hypertrophy: 0,
  endurance: -1,
};

const MIN_WEEKS = 4;
const MAX_WEEKS = 12;
const FALLBACK_WEEKS = 6;

function clampWeeks(value) {
  return Math.min(Math.max(value, MIN_WEEKS), MAX_WEEKS);
}

export function resolveProgramDuration(userInput = {}) {
  const baseWeeks = SCHEME_BASE_WEEKS[userInput.scheme] || FALLBACK_WEEKS;
  const adjustment = GOAL_WEEK_ADJUSTMENTS[userInput.goal] || 0;
  return clampWeeks(baseWeeks + adjustment);
}

export function getSchemeBaseWeeks(schemeKey) {
  return SCHEME_BASE_WEEKS[schemeKey] || FALLBACK_WEEKS;
}
