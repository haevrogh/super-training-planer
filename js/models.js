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

export function createProgram() {
  return {
    // TODO: define program structure
  };
}

export function createProgramWeek() {
  return {
    // TODO: define week structure
  };
}

export function createProgramSession() {
  return {
    // TODO: define session structure
  };
}
