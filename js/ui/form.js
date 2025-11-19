// UI for input form — collects user data only

import { resolveProgramDuration } from '../calculators/helpers/programDuration.js';
import { formatWeeksLabel } from './formatters.js';

let formElement;
let generateButton;
let durationPreviewElement;

const DURATION_PREVIEW_ID = 'program-duration';

function getFormElement() {
  if (formElement) {
    return formElement;
  }

  formElement = document.getElementById('training-form');
  return formElement;
}

function getGenerateButton() {
  if (generateButton) {
    return generateButton;
  }

  generateButton = document.getElementById('generate-program');
  return generateButton;
}

function getDurationPreviewElement() {
  if (durationPreviewElement) {
    return durationPreviewElement;
  }

  durationPreviewElement = document.getElementById(DURATION_PREVIEW_ID);
  return durationPreviewElement;
}

export function initForm() {
  const form = getFormElement();

  if (!form) {
    console.warn('Training form is missing in DOM.');
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });
}

function readDurationInput() {
  const form = getFormElement();

  if (!form) {
    return {};
  }

  const formData = new FormData(form);
  return {
    goal: formData.get('goal') || 'strength',
    scheme: formData.get('scheme') || 'top-set',
  };
}

export function updateDurationPreview() {
  const durationNode = getDurationPreviewElement();

  if (!durationNode) {
    return;
  }

  const previewInput = readDurationInput();
  const totalWeeks = resolveProgramDuration(previewInput);
  durationNode.textContent = `${formatWeeksLabel(totalWeeks)} · автоматический расчёт`;
}

export function readFormInput() {
  const form = getFormElement();

  if (!form) {
    throw new Error('Форма не найдена.');
  }

  const formData = new FormData(form);
  const weight = Number(formData.get('weight'));
  const reps = Number(formData.get('reps'));
  const movementType = formData.get('movementType') || 'compound';
  const goal = formData.get('goal') || '';
  const experienceLevel = formData.get('experienceLevel') || 'intermediate';
  const talentLevel = formData.get('talentLevel') || 'balanced';
  const sessionsPerWeek = Number(formData.get('sessionsPerWeek')) || 2;
  const scheme = formData.get('scheme') || '';

  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error('Вес должен быть больше нуля.');
  }

  if (!Number.isFinite(reps) || reps <= 0) {
    throw new Error('Повторения должны быть больше нуля.');
  }

  if (!Number.isFinite(sessionsPerWeek) || sessionsPerWeek < 2 || sessionsPerWeek > 4) {
    throw new Error('Количество тренировок должно быть от 2 до 4.');
  }

  return {
    weight,
    reps,
    movementType,
    goal,
    experienceLevel,
    talentLevel,
    sessionsPerWeek,
    scheme,
  };
}

export function onGenerateProgram(callback) {
  const button = getGenerateButton();

  if (!button || typeof callback !== 'function') {
    return;
  }

  button.addEventListener('click', (event) => {
    event.preventDefault();

    try {
      const input = readFormInput();
      callback(input);
    } catch (error) {
      console.warn(error.message);
    }
  });
}
