// localStorage operations only

const STORAGE_KEY = 'trainingPrograms';

function getStorage() {
  return window.localStorage;
}

export function loadPrograms() {
  const storage = getStorage();
  const rawValue = storage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.slice() : [];
  } catch (error) {
    console.error('Failed to parse training programs from storage', error);
    return [];
  }
}

export function saveProgram(program) {
  if (!program || !program.id) {
    return;
  }

  const storage = getStorage();
  const programs = loadPrograms();
  const existingIndex = programs.findIndex((item) => item.id === program.id);

  if (existingIndex >= 0) {
    programs[existingIndex] = program;
  } else {
    programs.push(program);
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(programs));
}

export function deleteProgram(id) {
  if (!id) {
    return;
  }

  const storage = getStorage();
  const programs = loadPrograms();
  const filteredPrograms = programs.filter((program) => program.id !== id);

  storage.setItem(STORAGE_KEY, JSON.stringify(filteredPrograms));
}
