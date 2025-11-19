// UI rendering of program weeks and sessions

import { REST_GUIDANCE_NOTE } from '../calculators/helpers/trainingAdjustments.js';

const RESULT_CONTAINER_ID = 'result';
const numberFormatter = new Intl.NumberFormat('ru-RU');
const METRIC_CONFIGS = [
  { key: 'tonnage', label: 'Суммарный тоннаж', unit: 'кг', color: '#7c3aed' },
  {
    key: 'normalizedLoadVolume',
    label: 'NLV — нормализованный объём',
    unit: 'кг',
    color: '#0a84ff',
  },
  { key: 'mti', label: 'MTI (условные ед.)', unit: 'ед.', color: '#16a34a' },
];

const FORMULA_LABELS = {
  epley: 'Эпли',
  brzycki: 'Бжицки',
  lombardi: 'Ломбарди',
  oconner: 'О’Коннер',
  wendler: 'Вендлер',
};

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

function createSummaryCard(title, contentNode) {
  const card = document.createElement('div');
  card.className = 'summary-card';

  const heading = document.createElement('h3');
  heading.className = 'summary-card__title';
  heading.textContent = title;
  card.appendChild(heading);

  card.appendChild(contentNode);
  return card;
}

function createOneRmList(program) {
  const list = document.createElement('dl');
  list.className = 'summary-list';

  const variants = program?.oneRmVariants || {};

  Object.entries(variants).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    const term = document.createElement('dt');
    term.textContent = FORMULA_LABELS[key] || key;
    const definition = document.createElement('dd');
    definition.textContent = `${numberFormatter.format(value)} кг`;
    list.appendChild(term);
    list.appendChild(definition);
  });

  if (list.children.length === 0) {
    const fallback = document.createElement('p');
    fallback.textContent = 'Нет данных для расчёта 1RM';
    return fallback;
  }

  return list;
}

function createRepMaxTable(program) {
  const table = document.createElement('table');
  table.className = 'repmax-table';
  const header = document.createElement('thead');
  header.innerHTML = '<tr><th>RM</th><th>% от 1RM</th><th>Вес</th></tr>';
  table.appendChild(header);

  const body = document.createElement('tbody');
  const repMaxes = Array.isArray(program?.repMaxes) ? program.repMaxes : [];

  if (repMaxes.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = 'Недостаточно данных для таблицы RM';
    row.appendChild(cell);
    body.appendChild(row);
  } else {
    repMaxes.forEach((item) => {
      const row = document.createElement('tr');
      const rmCell = document.createElement('td');
      rmCell.textContent = `${item.reps}RM`;
      const percentCell = document.createElement('td');
      percentCell.textContent = `${item.percent}%`;
      const weightCell = document.createElement('td');
      weightCell.textContent = `${numberFormatter.format(item.weight)} кг`;
      row.append(rmCell, percentCell, weightCell);
      body.appendChild(row);
    });
  }

  table.appendChild(body);
  return table;
}

function buildProgramSummary(program) {
  const hasVariants = program?.oneRmVariants && Object.keys(program.oneRmVariants).length > 0;
  const hasRepMaxes = Array.isArray(program?.repMaxes) && program.repMaxes.length > 0;

  if (!hasVariants && !hasRepMaxes) {
    return null;
  }

  const summaryGrid = document.createElement('div');
  summaryGrid.className = 'summary-grid';

  if (hasVariants) {
    summaryGrid.appendChild(
      createSummaryCard('Оценка 1RM', createOneRmList(program)),
    );
  }

  if (hasRepMaxes) {
    summaryGrid.appendChild(
      createSummaryCard('Реп-максы по процентам', createRepMaxTable(program)),
    );
  }

  return summaryGrid;
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

function normalizeTrend(values) {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (finiteValues.length === 0) {
    return [];
  }

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }

  if (max === min) {
    return values.map(() => 50);
  }

  return values.map((value) => Math.max(0, Math.min(((value - min) / (max - min)) * 100, 100)));
}

function formatTrendChange(values) {
  if (!Array.isArray(values) || values.length < 2) {
    return 'нет данных для динамики';
  }

  const start = values[0];
  const end = values[values.length - 1];
  const delta = end - start;

  if (!Number.isFinite(start) || !Number.isFinite(end) || Math.abs(delta) < 0.1) {
    return 'без изменений';
  }

  const direction = delta > 0 ? 'рост' : 'падение';
  return `${direction} ${Math.abs(delta).toFixed(0)}%`;
}

function createTrendChart(aggregatedWeeks) {
  if (aggregatedWeeks.length === 0) {
    return null;
  }

  const series = METRIC_CONFIGS.map((config) => {
    const values = aggregatedWeeks.map((week) => Number(week[config.key]) || 0);
    const normalized = normalizeTrend(values);

    if (normalized.length === 0) {
      return null;
    }

    return { ...config, values, normalized };
  }).filter(Boolean);

  if (series.length === 0) {
    return null;
  }

  const chartWidth = 1000;
  const chartHeight = 260;
  const padding = 32;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;
  const step = aggregatedWeeks.length > 1 ? innerWidth / (aggregatedWeeks.length - 1) : 0;

  const container = document.createElement('div');
  container.className = 'chart-card chart-card--trend';

  const title = document.createElement('h4');
  title.className = 'chart-card__title';
  title.textContent = 'Тренд нагрузок по неделям';
  container.appendChild(title);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Относительная динамика тоннажа, NLV и MTI по неделям');
  svg.classList.add('trend-chart');

  const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  grid.setAttribute('class', 'trend-chart__grid');

  [0, 25, 50, 75, 100].forEach((percent) => {
    const y = padding + (1 - percent / 100) * innerHeight;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padding);
    line.setAttribute('y1', y);
    line.setAttribute('x2', chartWidth - padding);
    line.setAttribute('y2', y);
    line.setAttribute('aria-hidden', 'true');
    grid.appendChild(line);
  });

  svg.appendChild(grid);

  series.forEach((metric) => {
    const pathData = metric.normalized
      .map((value, index) => {
        const x = padding + step * index;
        const y = padding + (1 - value / 100) * innerHeight;
        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('class', 'trend-chart__line');
    path.setAttribute('stroke', metric.color);
    path.setAttribute('aria-label', `${metric.label} — ${formatTrendChange(metric.normalized)}`);
    svg.appendChild(path);

    metric.normalized.forEach((value, index) => {
      const x = padding + step * index;
      const y = padding + (1 - value / 100) * innerHeight;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', 6);
      circle.setAttribute('fill', '#fff');
      circle.setAttribute('stroke', metric.color);
      circle.setAttribute('stroke-width', '2');

      const tooltip = `${metric.label} — ${formatTrendChange(metric.normalized)}. ${
        aggregatedWeeks[index]?.weekLabel || ''
      }`;
      circle.setAttribute('aria-label', tooltip.trim());
      circle.setAttribute('role', 'img');
      circle.title = tooltip.trim();
      svg.appendChild(circle);
    });
  });

  container.appendChild(svg);

  const legend = document.createElement('div');
  legend.className = 'trend-legend';

  series.forEach((metric) => {
    const item = document.createElement('div');
    item.className = 'trend-legend__item';

    const swatch = document.createElement('span');
    swatch.className = 'trend-legend__swatch';
    swatch.style.backgroundColor = metric.color;

    const label = document.createElement('span');
    label.className = 'trend-legend__label';
    label.textContent = metric.label;

    const trend = document.createElement('span');
    trend.className = 'trend-legend__trend';
    trend.textContent = formatTrendChange(metric.normalized);

    item.append(swatch, label, trend);
    legend.appendChild(item);
  });

  const weeks = document.createElement('div');
  weeks.className = 'trend-weeks';
  aggregatedWeeks.forEach((week) => {
    const label = document.createElement('span');
    label.className = 'trend-weeks__item';
    label.textContent = week.weekLabel;
    weeks.appendChild(label);
  });

  container.append(legend, weeks);
  return container;
}

function createChartsSection(program) {
  const aggregatedWeeks = aggregateWeekMetrics(program);

  if (aggregatedWeeks.length === 0) {
    return null;
  }

  const trendChart = createTrendChart(aggregatedWeeks);

  if (!trendChart) {
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
  body.classList.remove('chart-body--visible');
  const bodyId = `program-charts-${chartInstanceCounter}`;
  body.id = bodyId;
  toggle.setAttribute('aria-controls', bodyId);
  toggle.setAttribute('aria-expanded', 'false');

  const grid = document.createElement('div');
  grid.className = 'chart-grid';
  grid.appendChild(trendChart);

  const hint = document.createElement('p');
  hint.className = 'chart-hint';
  hint.textContent =
    'Линии показывают относительную динамику (0–100%) без точных значений, чтобы видеть тенденции роста/спада.';

  body.append(grid, hint);

  toggle.addEventListener('click', () => {
    const willShow = body.hidden;
    body.hidden = !willShow;
    body.classList.toggle('chart-body--visible', willShow);
    toggle.setAttribute('aria-expanded', String(willShow));
    toggle.textContent = willShow ? 'Скрыть графики' : 'Показать графики прогресса';
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
  details.classList.remove('session-intensity__details--visible');
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
    details.classList.toggle('session-intensity__details--visible', willShow);
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

  const rule = document.createElement('span');
  rule.className = 'session-rest__rule';
  rule.textContent = REST_GUIDANCE_NOTE;

  wrapper.append(label, value, rule);
  return wrapper;
}

function createRpeGuideSection(rpeGuide) {
  if (!rpeGuide) {
    return null;
  }

  const paragraph = document.createElement('p');
  paragraph.className = 'session-rpe-guide';
  paragraph.textContent = rpeGuide;
  return paragraph;
}

function createCoachingNotesSection(notes) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'session-notes';

  const title = document.createElement('div');
  title.className = 'session-notes__title';
  title.textContent = 'Подсказки тренера';

  const list = document.createElement('ul');
  list.className = 'session-notes__list';

  notes.forEach((note) => {
    const item = document.createElement('li');
    item.className = 'session-notes__item';
    item.textContent = note;
    list.appendChild(item);
  });

  wrapper.append(title, list);
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
  const rpeGuideSection = createRpeGuideSection(session?.rpeGuide);
  const notesSection = createCoachingNotesSection(session?.coachingNotes);
  const restSection = createRestSection(session?.restInterval);

  const sessionLabel = session?.dayLabel ? `Тренировка ${session.dayLabel}` : 'Тренировка';
  card.setAttribute('aria-label', `${sessionLabel}. Топ-сет: ${session?.topSet || '—'}`);
  card.appendChild(header);

  if (intensitySummary) {
    card.appendChild(intensitySummary);
  }

  card.appendChild(workSetsSection);

  if (rpeGuideSection) {
    card.appendChild(rpeGuideSection);
  }

  if (notesSection) {
    card.appendChild(notesSection);
  }

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

  const summary = buildProgramSummary(program);

  if (summary) {
    container.appendChild(summary);
  }

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
