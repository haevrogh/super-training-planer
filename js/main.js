// Main entry — wiring modules for the basic form flow

import { initForm, onGenerateProgram } from './ui/form.js';
import { createUserInput } from './models.js';
import { calculateOneRm } from './calculators/oneRmCalculator.js';

function renderOneRmResult(userInput, estimatedOneRm) {
  const resultElement = document.getElementById('result');

  if (!resultElement) {
    return;
  }

  resultElement.innerHTML = '';

  const rmLine = document.createElement('p');
  rmLine.textContent = `Ваш 1RM: ${estimatedOneRm} кг`;

  const schemeLine = document.createElement('p');
  schemeLine.textContent = `Выбранная схема: ${userInput.scheme || '—'}`;

  resultElement.append(rmLine, schemeLine);
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
  renderOneRmResult(userInput, estimatedOneRm);
}

initForm();
onGenerateProgram(handleGenerate);
