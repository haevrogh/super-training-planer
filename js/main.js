// Main entry — wiring modules for the basic form flow

import { initForm, onGenerateProgram } from './ui/form.js';
import { createUserInput } from './models.js';
import { calculateOneRm } from './calculators/oneRmCalculator.js';
import { renderProgram, clearProgram } from './ui/programView.js';
import { generateTopSetProgram } from './calculators/schemes/topSetScheme.js';
import { generateLinear5x5Program } from './calculators/schemes/linear5x5Scheme.js';
import { generateDoubleProgressionProgram } from './calculators/schemes/doubleProgressionScheme.js';

const SCHEME_GENERATORS = {
  'top-set': generateTopSetProgram,
  'linear-5x5': generateLinear5x5Program,
  'double-progression': generateDoubleProgressionProgram,
};

function resolveSchemeGenerator(schemeKey) {
  if (SCHEME_GENERATORS[schemeKey]) {
    return SCHEME_GENERATORS[schemeKey];
  }

  return generateTopSetProgram;
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

  clearProgram();
  renderProgram(program);
}

initForm();
onGenerateProgram(handleGenerate);
