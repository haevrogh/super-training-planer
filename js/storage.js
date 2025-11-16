const STORAGE_KEY = 'trainingPrograms';

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

export function loadPrograms() {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  const rawValue = storage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse programs from storage', error);
    return [];
  }
}

export function saveProgram(program) {
  if (!program) {
    return;
  }

  const storage = getStorage();

  if (!storage) {
    return;
  }

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
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const programs = loadPrograms();
  const filtered = programs.filter((program) => program.id !== id);

  storage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
