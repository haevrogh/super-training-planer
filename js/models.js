// Data model factory functions

export function createUserInput(input = {}) {
  const safeSessions = Number(input.sessionsPerWeek);

  return {
    weight: Number(input.weight),
    reps: Number(input.reps),
    movementType: input.movementType || 'compound',
    goal: input.goal || '',
    experienceLevel: input.experienceLevel || 'intermediate',
    talentLevel: input.talentLevel || 'balanced',
    sessionsPerWeek:
      Number.isFinite(safeSessions) && safeSessions > 0 ? safeSessions : 2,
    scheme: input.scheme || '',
    weeks: Number(input.weeks) || 0,
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

export function createProgramSession({
  dayLabel,
  topSet,
  backoffSets,
  intensitySummary,
  restInterval,
  rpeGuide,
  coachingNotes,
} = {}) {
  return {
    dayLabel: dayLabel || '',
    topSet: topSet || '',
    backoffSets: Array.isArray(backoffSets) ? backoffSets : [],
    intensitySummary: intensitySummary || null,
    restInterval: restInterval || '',
    rpeGuide: rpeGuide || null,
    coachingNotes: Array.isArray(coachingNotes) ? coachingNotes : [],
  };
}
