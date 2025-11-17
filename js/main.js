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

const PROGRAM_NAME_PROMPT = 'Введите название программы';
const LAST_FORM_STATE_KEY = 'lastFormState';
const TRAINING_FORM_ID = 'training-form';
const RESULT_CONTAINER_ID = 'result';
const SAVE_BUTTON_ID = 'save-program';
const COPY_BUTTON_ID = 'copy-program';
const COPY_SUCCESS_LABEL = 'Скопировано!';
const COPY_ERROR_LABEL = 'Ошибка копирования';
const COPY_RESET_DELAY = 2000;

const MOVEMENT_TYPE_LABELS = {
  compound: 'Базовое движение',
  isolation: 'Изолированное движение',
};

const GOAL_LABELS = {
  strength: 'Сила',
  hypertrophy: 'Гипертрофия',
  endurance: 'Выносливость',
};

const FORM_STATE_FIELDS = [
  'weight',
  'reps',
  'movementType',
  'goal',
  'experienceLevel',
  'recoveryLevel',
  'sessionsPerWeek',
  'scheme',
  'weeks',
];

let pendingProgram = null;
let saveButtonElement = null;
let copyButtonElement = null;
let currentProgram = null;
let copyButtonResetTimeout = null;

function getTrainingFormElement() {
  return document.getElementById(TRAINING_FORM_ID);
}

function getResultContainerElement() {
  return document.getElementById(RESULT_CONTAINER_ID);
}

function getSaveButtonElement() {
  if (saveButtonElement) {
    return saveButtonElement;
  }

  saveButtonElement = document.getElementById(SAVE_BUTTON_ID);
  return saveButtonElement;
}

function getCopyButtonElement() {
  if (copyButtonElement) {
    return copyButtonElement;
  }

  copyButtonElement = document.getElementById(COPY_BUTTON_ID);
  return copyButtonElement;
}

function updateSaveButtonState(isEnabled) {
  const button = getSaveButtonElement();

  if (!button) {
    return;
  }

  button.disabled = !isEnabled;
  button.setAttribute('aria-disabled', String(!isEnabled));
}

function setPendingProgram(program) {
  pendingProgram = program || null;
  updateSaveButtonState(Boolean(program));
}

function updateCopyButtonState(isEnabled) {
  const button = getCopyButtonElement();

  if (!button) {
    return;
  }

  button.disabled = !isEnabled;
  button.setAttribute('aria-disabled', String(!isEnabled));
}

function setCurrentProgram(program) {
  currentProgram = program || null;
  updateCopyButtonState(Boolean(currentProgram));
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

  if (storedState.talentLevel && !storedState.recoveryLevel) {
    storedState.recoveryLevel = storedState.talentLevel;
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
    setPendingProgram(null);
    setCurrentProgram(null);
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

function formatWeeksLabel(weeks) {
  if (!Number.isFinite(weeks) || weeks <= 0) {
    return 'программа';
  }

  const remainder10 = weeks % 10;
  const remainder100 = weeks % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return `${weeks} неделя`;
  }

  if (
    remainder10 >= 2 &&
    remainder10 <= 4 &&
    !(remainder100 >= 12 && remainder100 <= 14)
  ) {
    return `${weeks} недели`;
  }

  return `${weeks} недель`;
}

function translateMovementType(value) {
  if (MOVEMENT_TYPE_LABELS[value]) {
    return MOVEMENT_TYPE_LABELS[value];
  }

  return 'Движение';
}

function translateGoal(value) {
  if (GOAL_LABELS[value]) {
    return GOAL_LABELS[value];
  }

  return 'Цель';
}

function generateDefaultProgramName(userInput) {
  const movement = translateMovementType(userInput?.movementType);
  const goal = translateGoal(userInput?.goal);
  const weeks = Number(userInput?.weeks) || 0;
  const weeksLabel = formatWeeksLabel(weeks);
  return `${movement} · ${goal} · ${weeksLabel}`;
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
  setPendingProgram(null);
  setCurrentProgram(program);
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
  const userInput = createUserInput(formInput);

  saveLastFormState(formInput);

  const estimatedOneRm = calculateOneRm(userInput.weight, userInput.reps);
  const generator = resolveSchemeGenerator(userInput.scheme);
  const program = generator(userInput, estimatedOneRm);

  clearProgram();
  renderProgram(program);
  setPendingProgram(program);
  setCurrentProgram(program);
  scrollToResult();
}

function handleSaveProgram() {
  if (!pendingProgram) {
    return;
  }

  const persistedProgram = persistProgram(pendingProgram);

  if (!persistedProgram) {
    return;
  }

  renderProgram(persistedProgram);
  scrollToResult();
  setPendingProgram(null);
  setCurrentProgram(persistedProgram);
  refreshProgramList();
}

function setupSaveButton() {
  const button = getSaveButtonElement();

  if (!button) {
    return;
  }

  button.addEventListener('click', (event) => {
    event.preventDefault();
    handleSaveProgram();
  });

  updateSaveButtonState(false);
}

function formatIntensityForClipboard(summary) {
  if (!summary) {
    return 'Интенсивность: —';
  }

  const parts = [];

  const tonnage = Number(summary.tonnage);
  const mti = Number(summary.mti);
  const nlv = Number(summary.normalizedLoadVolume);

  if (Number.isFinite(tonnage) && tonnage > 0) {
    parts.push(`Тоннаж ${Math.round(tonnage)} кг`);
  }

  if (Number.isFinite(mti) && mti > 0) {
    parts.push(`MTI ${Math.round(mti)}`);
  }

  if (Number.isFinite(nlv) && nlv > 0) {
    parts.push(`NLV ${Math.round(nlv)} кг`);
  }

  if (parts.length === 0) {
    return 'Интенсивность: —';
  }

  return `Интенсивность: ${parts.join(' · ')}`;
}

function buildProgramClipboardText(program) {
  if (!program) {
    return '';
  }

  const lines = [];
  const programTitle = program.name || 'Без названия';
  lines.push(`Программа: ${programTitle}`);
  lines.push('');

  const weeks = Array.isArray(program.weeks) ? program.weeks : [];

  weeks.forEach((week, index) => {
    const weekNumber = Number(week?.weekNumber) || index + 1;
    lines.push(`Неделя ${weekNumber}`);

    const sessions = Array.isArray(week?.sessions) ? week.sessions : [];

    if (sessions.length === 0) {
      lines.push('\t— тренировок нет');
      lines.push('');
      return;
    }

    sessions.forEach((session) => {
      const dayLabel = session?.dayLabel || 'Тренировка';
      const sets = [];

      if (session?.topSet) {
        sets.push(session.topSet);
      }

      if (Array.isArray(session?.backoffSets)) {
        session.backoffSets.forEach((backoff) => {
          if (backoff === null || backoff === undefined) {
            return;
          }

          const normalized = String(backoff).trim();

          if (normalized.length > 0) {
            sets.push(normalized);
          }
        });
      }

      const workSets = sets.length > 0 ? sets.join(' | ') : '—';
      const restLine = session?.restInterval ? `Отдых ${session.restInterval}` : '';
      const intensityLine = formatIntensityForClipboard(session?.intensitySummary);
      const row = [dayLabel, workSets, intensityLine, restLine]
        .filter((part) => part && part.trim().length > 0)
        .join('\t');
      lines.push(row);
    });

    lines.push('');
  });

  return lines.join('\n').trim();
}

async function copyProgramToClipboard(program) {
  if (!program) {
    return false;
  }

  const text = buildProgramClipboardText(program);

  if (!text) {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    console.warn('Не удалось скопировать программу', error);
    return false;
  }
}

function resetCopyButtonLabel() {
  const button = getCopyButtonElement();

  if (!button) {
    return;
  }

  const originalLabel = button.dataset.originalLabel;

  if (originalLabel) {
    button.textContent = originalLabel;
  }
}

function temporarilySetCopyLabel(text) {
  const button = getCopyButtonElement();

  if (!button) {
    return;
  }

  if (!button.dataset.originalLabel) {
    button.dataset.originalLabel = button.textContent;
  }

  button.textContent = text;

  if (copyButtonResetTimeout) {
    clearTimeout(copyButtonResetTimeout);
  }

  copyButtonResetTimeout = setTimeout(() => {
    resetCopyButtonLabel();
  }, COPY_RESET_DELAY);
}

async function handleCopyProgram() {
  if (!currentProgram) {
    return;
  }

  const wasCopied = await copyProgramToClipboard(currentProgram);

  if (wasCopied) {
    temporarilySetCopyLabel(COPY_SUCCESS_LABEL);
    return;
  }

  temporarilySetCopyLabel(COPY_ERROR_LABEL);
}

function setupCopyButton() {
  const button = getCopyButtonElement();

  if (!button) {
    return;
  }

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    await handleCopyProgram();
  });

  updateCopyButtonState(false);
}

function init() {
  initForm();
  applyLastFormState();
  setupFormChangeHandler();
  onGenerateProgram(handleGenerate);
  setupSaveButton();
  setupCopyButton();
  refreshProgramList();
}

init();
