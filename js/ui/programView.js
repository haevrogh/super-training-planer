// UI rendering of program weeks and sessions

const RESULT_CONTAINER_ID = 'result';
const numberFormatter = new Intl.NumberFormat('ru-RU');

function getResultContainer() {
  return document.getElementById(RESULT_CONTAINER_ID);
}

function formatMetricValue(value, unit) {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }

  const formatted = numberFormatter.format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function createIntensitySummary(summary) {
  if (!summary) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'session-intensity';
  wrapper.setAttribute('aria-label', 'Сводка интенсивности');

  const metrics = [
    { label: 'Тоннаж', value: formatMetricValue(summary.tonnage, 'кг') },
    {
      label: 'MTI',
      value: formatMetricValue(summary.mti),
      hint: 'Mechanical Tension Index — связь с ростом силы и мышц',
    },
    {
      label: 'F×V',
      value: formatMetricValue(summary.forceVelocity),
      hint: 'Force × Velocity — скоростно-силовой профиль (VBT)',
    },
    {
      label: 'NLV',
      value: formatMetricValue(summary.normalizedLoadVolume, 'кг'),
      hint: 'Normalized Load Volume — объём с учётом RPE',
    },
  ];

  metrics.forEach((metric) => {
    const metricCard = document.createElement('div');
    metricCard.className = 'session-metric';

    if (metric.hint) {
      metricCard.title = metric.hint;
    }

    const label = document.createElement('span');
    label.className = 'session-metric__label';
    label.textContent = metric.label;

    const value = document.createElement('span');
    value.className = 'session-metric__value';
    value.textContent = metric.value;

    metricCard.append(label, value);
    wrapper.appendChild(metricCard);
  });

  return wrapper;
}

function createWorkSetsSection({ topSet, backoffSets }) {
  const container = document.createElement('div');
  container.className = 'session-worksets';

  const title = document.createElement('div');
  title.className = 'session-worksets__title';
  title.textContent = 'Рабочие подходы';
  container.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'session-worksets__list';
  list.setAttribute('aria-label', 'Рабочие подходы тренировки');

  const entries = [];

  if (topSet) {
    entries.push({ text: topSet, className: 'session-worksets__top' });
  }

  if (Array.isArray(backoffSets) && backoffSets.length > 0) {
    backoffSets.forEach((line) => {
      entries.push({ text: line, className: null });
    });
  }

  if (entries.length === 0) {
    entries.push({ text: '—', className: null });
  }

  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.textContent = entry.text;

    if (entry.className) {
      item.classList.add(entry.className);
    }

    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}

function createAccessoriesSection(accessories) {
  if (!Array.isArray(accessories) || accessories.length === 0) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'session-accessories';

  const title = document.createElement('div');
  title.className = 'session-accessories__title';
  title.textContent = 'Прогрессия подсобки';
  wrapper.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'session-accessories__list';

  accessories.forEach((accessory) => {
    const item = document.createElement('li');
    item.className = 'session-accessories__item';

    const name = document.createElement('span');
    name.className = 'session-accessories__name';
    name.textContent = accessory?.name || 'Подсобка';

    const prescription = document.createElement('span');
    prescription.className = 'session-accessories__prescription';
    prescription.textContent = accessory?.prescription || '—';

    item.append(name, prescription);
    list.appendChild(item);
  });

  wrapper.appendChild(list);
  return wrapper;
}

function createSessionCard(session) {
  const card = document.createElement('div');
  card.className = 'session-card';
  card.setAttribute('role', 'group');
  card.tabIndex = 0;

  const day = document.createElement('div');
  day.className = 'session-day';
  day.textContent = session?.dayLabel || '—';

  const intensitySummary = createIntensitySummary(session?.intensitySummary);
  const workSetsSection = createWorkSetsSection(session || {});
  const accessorySection = createAccessoriesSection(session?.accessories);

  const sessionLabel = session?.dayLabel ? `Тренировка ${session.dayLabel}` : 'Тренировка';
  card.setAttribute('aria-label', `${sessionLabel}. Топ-сет: ${session?.topSet || '—'}`);
  card.append(day, workSetsSection);

  if (intensitySummary) {
    card.appendChild(intensitySummary);
  }

  if (accessorySection) {
    card.appendChild(accessorySection);
  }
  return card;
}

function createWeekBlock(week, fallbackNumber) {
  const weekBlock = document.createElement('div');
  weekBlock.className = 'week-block';
  const weekNumber = Number(week?.weekNumber) || fallbackNumber;
  weekBlock.dataset.week = String(weekNumber);
  weekBlock.setAttribute('role', 'region');
  weekBlock.setAttribute('aria-label', `Неделя ${weekNumber}`);

  const title = document.createElement('h3');
  title.className = 'week-title';
  title.textContent = `Неделя ${weekNumber}`;
  weekBlock.appendChild(title);

  const sessions = Array.isArray(week?.sessions) ? week.sessions : [];

  sessions.forEach((session) => {
    weekBlock.appendChild(createSessionCard(session));
  });

  return weekBlock;
}

function buildProgramContainer(program) {
  const container = document.createElement('div');
  container.className = 'program-container';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Сгенерированная программа тренировки');

  const title = document.createElement('h2');
  title.className = 'program-title';

  const weekCount = Array.isArray(program?.weeks) ? program.weeks.length : 0;
  const titleSuffix = weekCount > 0 ? ` — ${weekCount} нед.` : '';
  title.textContent = `Программа: ${program?.name || 'План тренировки'}${titleSuffix}`;

  container.appendChild(title);

  if (weekCount === 0) {
    const emptyState = document.createElement('p');
    emptyState.textContent = 'Нет доступных недель для отображения.';
    container.appendChild(emptyState);
    return container;
  }

  program.weeks.forEach((week, index) => {
    container.appendChild(createWeekBlock(week, index + 1));
  });

  return container;
}

export function renderProgram(program) {
  const mountNode = getResultContainer();

  if (!mountNode) {
    return;
  }

  clearProgram();

  if (!program) {
    return;
  }

  const programView = buildProgramContainer(program);
  mountNode.appendChild(programView);
}

export function clearProgram() {
  const mountNode = getResultContainer();

  if (!mountNode) {
    return;
  }

  mountNode.innerHTML = '';
}
