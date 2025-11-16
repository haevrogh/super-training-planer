// Main entry — wiring modules (implementation later)

import { loadPrograms, saveProgram, deleteProgram } from './storage.js';
import { createUserInput, createProgram, createProgramWeek, createProgramSession } from './models.js';
import { calculateOneRm } from './calculators/oneRmCalculator.js';
import { generateTopSetProgram } from './calculators/schemes/topSetScheme.js';
import { generateLinear5x5Program } from './calculators/schemes/linear5x5Scheme.js';
import { generateDoubleProgressionProgram } from './calculators/schemes/doubleProgressionScheme.js';
import { initForm, readFormInput, onGenerateProgram } from './ui/form.js';
import { renderProgram, clearProgram } from './ui/programView.js';
