// Data model factory functions

export function createUserInput(weight, reps, movementType, goal, scheme, weeks) {
  return {
    weight: Number(weight),
    reps: Number(reps),
    movementType: movementType || 'compound',
    goal: goal || '',
    scheme: scheme || '',
    weeks: Number(weeks) || 0,
  };
}

export function createProgram({ id, name, userInput, oneRm, weeks } = {}) {
  return {
    id: id || '',
    name: name || '',
    userInput: userInput || null,
    oneRm: Number(oneRm) || 0,
    weeks: Array.isArray(weeks) ? weeks : [],
  };
}

export function createProgramWeek({ weekNumber, sessions } = {}) {
  return {
    weekNumber: Number(weekNumber) || 1,
    sessions: Array.isArray(sessions) ? sessions : [],
  };
}

export function createProgramSession({ dayLabel, topSet, backoffSets } = {}) {
  return {
    dayLabel: dayLabel || '',
    topSet: topSet || '',
    backoffSets: Array.isArray(backoffSets) ? backoffSets : [],
  };
}
