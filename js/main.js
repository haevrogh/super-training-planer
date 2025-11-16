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
const LAST_FORM_STATE_KEY = 'lastFormState';
const TRAINING_FORM_ID = 'training-form';
const RESULT_CONTAINER_ID = 'result';

const FORM_STATE_FIELDS = ['weight', 'reps', 'movementType', 'goal', 'scheme', 'weeks'];

function getTrainingFormElement() {
  return document.getElementById(TRAINING_FORM_ID);
}

function getResultContainerElement() {
  return document.getElementById(RESULT_CONTAINER_ID);
}

function saveLastFormState(formInput) {
  if (!formInput) {
    return;
  }

  const state = FORM_STATE_FIELDS.reduce((acc, field) => {
    if (formInput[field] !== undefined) {
      acc[field] = formInput[field];
    }
    return acc;
  }, {});

  try {
    localStorage.setItem(LAST_FORM_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Не удалось сохранить состояние формы', error);
  }
}

function loadLastFormState() {
  try {
    const storedValue = localStorage.getItem(LAST_FORM_STATE_KEY);

    if (!storedValue) {
      return null;
    }

    return JSON.parse(storedValue);
  } catch (error) {
    console.warn('Не удалось загрузить состояние формы', error);
    return null;
  }
}

function applyLastFormState() {
  const form = getTrainingFormElement();
  const storedState = loadLastFormState();

  if (!form || !storedState) {
    return;
  }

  FORM_STATE_FIELDS.forEach((field) => {
    if (storedState[field] === undefined || storedState[field] === null) {
      return;
    }

    const element = form.elements.namedItem(field);

    if (element) {
      element.value = storedState[field];
    }
  });
}

function setupFormChangeHandler() {
  const form = getTrainingFormElement();

  if (!form) {
    return;
  }

  const handleFormChange = () => {
    clearProgram();
  };

  form.addEventListener('input', handleFormChange);
  form.addEventListener('change', handleFormChange);
}

function scrollToResult() {
  const resultContainer = getResultContainerElement();

  if (resultContainer) {
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  }
}

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
  scrollToResult();
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

  saveLastFormState(formInput);

  const estimatedOneRm = calculateOneRm(userInput.weight, userInput.reps);
  const generator = resolveSchemeGenerator(userInput.scheme);
  const program = generator(userInput, estimatedOneRm);
  const persistedProgram = persistProgram(program) || program;

  clearProgram();
  renderProgram(persistedProgram);
  scrollToResult();
  refreshProgramList();
}

function init() {
  initForm();
  applyLastFormState();
  setupFormChangeHandler();
  onGenerateProgram(handleGenerate);
  refreshProgramList();
}

init();
