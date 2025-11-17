// UI for input form — collects user data only

let formElement;
let generateButton;

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
  const weeks = Number(formData.get('weeks')) || 0;

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
    weeks,
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
