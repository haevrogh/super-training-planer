export function formatWeeksLabel(weeks) {
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
