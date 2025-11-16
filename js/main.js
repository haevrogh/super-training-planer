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

const PROGRAM_NAME_PROMPT = 'Введите имя программы';

function resolveSchemeGenerator(schemeKey) {
  if (SCHEME_GENERATORS[schemeKey]) {
    return SCHEME_GENERATORS[schemeKey];
  }

  return generateTopSetProgram;
}

function generateDefaultProgramName(userInput) {
  const movement = userInput?.movementType || 'Movement';
  const goal = userInput?.goal || 'Goal';
  const weeks = Number(userInput?.weeks) || 0;
  const weeksLabel = weeks > 0 ? `${weeks} weeks` : 'Program';
  return `${movement} - ${goal} - ${weeksLabel}`;
}

function requestProgramName(fallbackName) {
  const nameInput = window.prompt(PROGRAM_NAME_PROMPT, fallbackName);

  if (nameInput === null) {
    return fallbackName;
  }

  const trimmedName = nameInput.trim();
  return trimmedName || fallbackName;
}

function buildProgramId(program) {
  const base = program?.id ? String(program.id) : 'program';
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  return `${base}-${uniqueSuffix}`;
}

function persistProgram(program) {
  if (!program) {
    return null;
  }

  const defaultName = generateDefaultProgramName(program.userInput);
  const programName = requestProgramName(defaultName);
  const persistedProgram = {
    ...program,
    id: buildProgramId(program),
    name: programName,
  };

  saveProgram(persistedProgram);
  return persistedProgram;
}

function refreshProgramList() {
  const programs = loadPrograms();

  renderProgramList(programs, {
    onSelect: handleProgramSelect,
    onDelete: handleProgramDelete,
  });
}

function handleProgramSelect(id) {
  if (!id) {
    return;
  }

  const programs = loadPrograms();
  const program = programs.find((item) => item.id === id);

  if (!program) {
    return;
  }

  clearProgram();
  renderProgram(program);
}

function handleProgramDelete(id) {
  if (!id) {
    return;
  }

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
  const persistedProgram = persistProgram(program) || program;

  clearProgram();
  renderProgram(persistedProgram);
  refreshProgramList();
}

function init() {
  initForm();
  onGenerateProgram(handleGenerate);
  refreshProgramList();
}

init();
