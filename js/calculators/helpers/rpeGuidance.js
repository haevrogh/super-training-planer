const RPE_TRANSLATIONS = {
  6: 'Разминка, очень легко',
  7: 'Вес движется быстро',
  8: 'Тяжело, но ещё 2 повтора в запасе',
  9: 'Очень тяжело, остался 1 повтор',
  10: 'Предел, ни одного повтора сверху',
};

function parseRpeValues(rpeInput) {
  if (rpeInput === undefined || rpeInput === null) {
    return [];
  }

  const matches = String(rpeInput)
    .replace(',', '.')
    .match(/(\d+(?:\.\d+)?)/g);

  if (!matches || matches.length === 0) {
    const numeric = Number(rpeInput);
    return Number.isFinite(numeric) ? [numeric] : [];
  }

  return matches
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function translateSingleRpe(rpeValue) {
  const rounded = Math.round(rpeValue);
  if (RPE_TRANSLATIONS[rounded]) {
    return `RPE ${rounded}: ${RPE_TRANSLATIONS[rounded]}`;
  }
  return null;
}

export function buildRpeGuide(rpeInput, experienceLevel) {
  if (experienceLevel !== 'novice') {
    return null;
  }

  const values = parseRpeValues(rpeInput);

  if (values.length === 0) {
    return null;
  }

  const hints = values
    .map((value) => translateSingleRpe(value))
    .filter(Boolean);

  if (hints.length === 0) {
    return null;
  }

  return hints.join(' · ');
}
