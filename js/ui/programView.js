// UI rendering of program weeks and sessions

const RESULT_CONTAINER_ID = 'result';
const numberFormatter = new Intl.NumberFormat('ru-RU');
const METRIC_CONFIGS = [
  { key: 'tonnage', label: 'Суммарный тоннаж', unit: 'кг' },
  { key: 'normalizedLoadVolume', label: 'NLV — нормализованный объём', unit: 'кг' },
  { key: 'mti', label: 'MTI (условные ед.)', unit: 'ед.' },
];

let chartInstanceCounter = 0;
let intensitySummaryCounter = 0;

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

function computeLogScaleHeight(value, maxValue) {
  const numericValue = Number(value);
  const numericMax = Number(maxValue);

  if (!Number.isFinite(numericValue) || !Number.isFinite(numericMax) || numericValue <= 0 || numericMax <= 0) {
    return 0;
  }

  const safeValue = Math.log10(numericValue + 1);
  const safeMax = Math.log10(numericMax + 1);

  if (safeMax <= 0) {
    return 0;
  }

  return Math.max(0, Math.min((safeValue / safeMax) * 100, 100));
}

function aggregateWeekMetrics(program) {
  if (!program || !Array.isArray(program.weeks)) {
    return [];
  }

  return program.weeks
    .map((week, index) => {
      const sessions = Array.isArray(week?.sessions) ? week.sessions : [];
      const totals = {
        tonnage: 0,
        normalizedLoadVolume: 0,
        mti: 0,
        sessionCount: 0,
      };

      sessions.forEach((session) => {
        const summary = session?.intensitySummary;

        if (!summary) {
          return;
        }

        totals.sessionCount += 1;
        totals.tonnage += Number(summary.tonnage) || 0;
        totals.normalizedLoadVolume += Number(summary.normalizedLoadVolume) || 0;
        totals.mti += Number(summary.mti) || 0;
      });

      if (
        totals.sessionCount === 0 &&
        totals.tonnage === 0 &&
        totals.normalizedLoadVolume === 0 &&
        totals.mti === 0
      ) {
        return null;
      }

      return {
        weekLabel: `Неделя ${week?.weekNumber || index + 1}`,
        tonnage: Math.round(totals.tonnage),
        normalizedLoadVolume: Math.round(totals.normalizedLoadVolume),
        mti:
          totals.sessionCount > 0 ? Math.round(totals.mti / totals.sessionCount) : 0,
      };
    })
    .filter(Boolean);
}

function createChartCard(metricConfig, aggregatedWeeks) {
  const values = aggregatedWeeks.map((week) => Number(week[metricConfig.key]) || 0);
  const maxValue = Math.max(...values);

  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return null;
  }

  const card = document.createElement('div');
  card.className = 'chart-card';

  const title = document.createElement('h4');
  title.className = 'chart-card__title';
  title.textContent = metricConfig.label;
  card.appendChild(title);

  const bars = document.createElement('div');
  bars.className = 'chart-bars';

  aggregatedWeeks.forEach((week, index) => {
    const value = values[index];
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-bar-wrapper';

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    const height = computeLogScaleHeight(value, maxValue);
    bar.style.height = `${height}%`;

    const formattedValue = formatMetricValue(value, metricConfig.unit);
    bar.title = `${week.weekLabel}: ${formattedValue}`;
    bar.setAttribute('aria-label', `${week.weekLabel}: ${formattedValue}`);

    const valueLabel = document.createElement('span');
    valueLabel.className = 'chart-bar__value';
    valueLabel.textContent = formattedValue;

    const weekLabel = document.createElement('span');
    weekLabel.className = 'chart-bar__label';
    weekLabel.textContent = week.weekLabel;

    wrapper.append(bar, valueLabel, weekLabel);
    bars.appendChild(wrapper);
  });

  card.appendChild(bars);
  return card;
}

function createChartsSection(program) {
  const aggregatedWeeks = aggregateWeekMetrics(program);

  if (aggregatedWeeks.length === 0) {
    return null;
  }

  const chartCards = METRIC_CONFIGS.map((config) =>
    createChartCard(config, aggregatedWeeks),
  ).filter(Boolean);

  if (chartCards.length === 0) {
    return null;
  }

  chartInstanceCounter += 1;
  const section = document.createElement('section');
  section.className = 'program-charts';
  section.setAttribute('role', 'region');
  section.setAttribute('aria-label', 'Графики прогресса интенсивности');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ui-button ui-button--secondary chart-toggle';
  toggle.textContent = 'Показать графики прогресса';

  const body = document.createElement('div');
  body.className = 'chart-body';
  body.hidden = true;
  const bodyId = `program-charts-${chartInstanceCounter}`;
  body.id = bodyId;
  toggle.setAttribute('aria-controls', bodyId);
  toggle.setAttribute('aria-expanded', 'false');

  const grid = document.createElement('div');
  grid.className = 'chart-grid';
  chartCards.forEach((card) => grid.appendChild(card));

  const hint = document.createElement('p');
  hint.className = 'chart-hint';
  hint.textContent =
    'Высота столбцов строится по логарифмической шкале, чтобы уместить разные нагрузки.';

  body.append(grid, hint);

  toggle.addEventListener('click', () => {
    const wasHidden = body.hidden;
    body.hidden = !body.hidden;
    toggle.setAttribute('aria-expanded', String(wasHidden));
    toggle.textContent = wasHidden ? 'Скрыть графики' : 'Показать графики прогресса';
  });

  section.append(toggle, body);
  return section;
}

function createIntensitySummary(summary) {
  if (!summary) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'session-intensity';
  wrapper.setAttribute('aria-label', 'Сводка интенсивности');

  const previewParts = [];
  const tonnage = formatMetricValue(summary.tonnage, 'кг');
  const mti = formatMetricValue(summary.mti);

  if (tonnage !== '—') {
    previewParts.push(`Тоннаж ${tonnage}`);
  }

  if (mti !== '—') {
    previewParts.push(`MTI ${mti}`);
  }

  if (previewParts.length === 0) {
    previewParts.push('Интенсивность не рассчитана');
  }

  const preview = document.createElement('div');
  preview.className = 'session-intensity__preview';
  preview.textContent = previewParts.join(' · ');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'session-intensity__toggle';
  toggle.textContent = 'Показать метрики';
  toggle.setAttribute('aria-expanded', 'false');

  const details = document.createElement('div');
  details.className = 'session-intensity__details';
  details.hidden = true;
  intensitySummaryCounter += 1;
  const detailsId = `session-intensity-${intensitySummaryCounter}`;
  details.id = detailsId;
  toggle.setAttribute('aria-controls', detailsId);

  const metricsGrid = document.createElement('div');
  metricsGrid.className = 'session-metric-grid';

  const metrics = [
    { label: 'Тоннаж', value: tonnage },
    {
      label: 'MTI',
      value: mti,
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
    metricsGrid.appendChild(metricCard);
  });

  details.appendChild(metricsGrid);

  toggle.addEventListener('click', () => {
    const willShow = details.hidden;
    details.hidden = !willShow;
    toggle.setAttribute('aria-expanded', String(willShow));
    toggle.textContent = willShow ? 'Скрыть метрики' : 'Показать метрики';
  });

  wrapper.append(preview, toggle, details);
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
    item.className = 'session-worksets__item';

    if (entry.className) {
      item.classList.add(entry.className);
    }

    item.textContent = entry.text;
    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}

function createRestSection(restInterval) {
  if (!restInterval) {
    return null;
  }

  const wrapper = document.createElement('p');
  wrapper.className = 'session-rest';

  const label = document.createElement('span');
  label.className = 'session-rest__label';
  label.textContent = 'Отдых между подходами: ';

  const value = document.createElement('span');
  value.className = 'session-rest__value';
  value.textContent = restInterval;

  wrapper.append(label, value);
  return wrapper;
}

function formatAdditionalSetsLabel(count) {
  if (!Number.isFinite(count) || count <= 0) {
    return '';
  }

  if (count === 1) {
    return '+1 доп. подход';
  }

  if (count >= 5) {
    return `+${count} доп. подходов`;
  }

  return `+${count} доп. подхода`;
}

function buildSessionSummaryText(session) {
  if (!session) {
    return 'Подходы не указаны';
  }

  const summaryParts = [];

  if (session.topSet) {
    summaryParts.push(session.topSet);
  }

  const backoffs = Array.isArray(session.backoffSets)
    ? session.backoffSets
        .map((item) => {
          if (item === null || item === undefined) {
            return '';
          }

          return String(item).trim();
        })
        .filter((item) => item.length > 0)
    : [];

  if (backoffs.length > 0) {
    summaryParts.push(backoffs[0]);
    const extraCount = backoffs.length - 1;

    const extraLabel = formatAdditionalSetsLabel(extraCount);

    if (extraLabel) {
      summaryParts.push(extraLabel);
    }
  }

  if (summaryParts.length === 0) {
    return 'Подходы не указаны';
  }

  return summaryParts.join(' · ');
}

function createSessionCard(session) {
  const card = document.createElement('div');
  card.className = 'session-card';
  card.setAttribute('role', 'group');
  card.tabIndex = 0;

  const header = document.createElement('div');
  header.className = 'session-card__header';

  const day = document.createElement('div');
  day.className = 'session-day';
  day.textContent = session?.dayLabel || '—';

  const summary = document.createElement('div');
  summary.className = 'session-card__summary';
  summary.textContent = buildSessionSummaryText(session);

  header.append(day, summary);

  const intensitySummary = createIntensitySummary(session?.intensitySummary);
  const workSetsSection = createWorkSetsSection(session || {});
  const restSection = createRestSection(session?.restInterval);

  const sessionLabel = session?.dayLabel ? `Тренировка ${session.dayLabel}` : 'Тренировка';
  card.setAttribute('aria-label', `${sessionLabel}. Топ-сет: ${session?.topSet || '—'}`);
  card.appendChild(header);

  if (intensitySummary) {
    card.appendChild(intensitySummary);
  }

  card.appendChild(workSetsSection);

  if (restSection) {
    card.appendChild(restSection);
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

  const chartsSection = createChartsSection(program);

  if (chartsSection) {
    container.appendChild(chartsSection);
  }

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
