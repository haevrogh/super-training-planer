// Main entry — wiring modules for the basic form flow

import { initForm, onGenerateProgram } from './ui/form.js';
import { createUserInput } from './models.js';
import { calculateOneRm } from './calculators/oneRmCalculator.js';
import { renderProgram, clearProgram } from './ui/programView.js';
import { generateTopSetProgram } from './calculators/schemes/topSetScheme.js';
import { generateLinear5x5Program } from './calculators/schemes/linear5x5Scheme.js';
import { generateDoubleProgressionProgram } from './calculators/schemes/doubleProgressionScheme.js';
import { loadPrograms, saveProgram, deleteProgram } from './storage.js';
import { renderProgramList } from './ui/programList.js';

const SCHEME_GENERATORS = {
  'top-set': generateTopSetProgram,
  'linear-5x5': generateLinear5x5Program,
  'double-progression': generateDoubleProgressionProgram,
};

let cachedPrograms = [];

function resolveSchemeGenerator(schemeKey) {
  if (SCHEME_GENERATORS[schemeKey]) {
    return SCHEME_GENERATORS[schemeKey];
  }

  return generateTopSetProgram;
}

function createProgramId() {
  return `program-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildDefaultProgramName(userInput) {
  const movement = userInput?.movementType || 'movement';
  const goal = userInput?.goal || 'goal';
  const weeksLabel = userInput?.weeks ? `${userInput.weeks} weeks` : 'custom plan';

  return `${movement} — ${goal} — ${weeksLabel}`;
}

function requestProgramName(defaultName) {
  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    const response = window.prompt('Введите имя программы', defaultName);
    const trimmed = response ? response.trim() : '';

    if (trimmed) {
      return trimmed;
    }
  }

  return defaultName;
}

function enrichProgramMetadata(program, userInput) {
  const defaultName = buildDefaultProgramName(userInput);
  const resolvedName = requestProgramName(defaultName);

  return {
    ...program,
    id: createProgramId(),
    name: resolvedName,
  };
}

function refreshProgramList() {
  cachedPrograms = loadPrograms();

  renderProgramList(cachedPrograms, {
    onSelect: handleProgramSelect,
    onDelete: handleProgramDelete,
  });
}

function handleProgramSelect(id) {
  const selectedProgram = cachedPrograms.find((program) => program.id === id);

  if (!selectedProgram) {
    return;
  }

  clearProgram();
  renderProgram(selectedProgram);
}

function handleProgramDelete(id) {
  deleteProgram(id);
  refreshProgramList();
}

function handleGenerate(formInput) {
  const userInput = createUserInput(
    formInput.weight,
    formInput.reps,
    formInput.movementType,
    formInput.goal,
    formInput.scheme,
    formInput.weeks,
  );

  const estimatedOneRm = calculateOneRm(userInput.weight, userInput.reps);
  const generator = resolveSchemeGenerator(userInput.scheme);
  const program = generator(userInput, estimatedOneRm);
  const enrichedProgram = enrichProgramMetadata(program, userInput);

  clearProgram();
  saveProgram(enrichedProgram);
  refreshProgramList();
  renderProgram(enrichedProgram);
}

initForm();
refreshProgramList();
onGenerateProgram(handleGenerate);
