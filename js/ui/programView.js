// UI rendering of program weeks and sessions

const RESULT_CONTAINER_ID = 'result';

function getResultContainer() {
  return document.getElementById(RESULT_CONTAINER_ID);
}

function createBackoffList(backoffSets) {
  const list = document.createElement('ul');
  list.className = 'session-backoffs';
  list.setAttribute('aria-label', 'Дополнительные подходы');

  const entries = Array.isArray(backoffSets) && backoffSets.length > 0 ? backoffSets : ['—'];

  entries.forEach((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    list.appendChild(item);
  });

  return list;
}

function createSessionCard(session) {
  const card = document.createElement('div');
  card.className = 'session-card';
  card.setAttribute('role', 'group');
  card.tabIndex = 0;

  const day = document.createElement('div');
  day.className = 'session-day';
  day.textContent = session?.dayLabel || '—';

  const topSet = document.createElement('div');
  topSet.className = 'session-topset';
  topSet.textContent = session?.topSet || '—';

  const backoffList = createBackoffList(session?.backoffSets);

  const sessionLabel = session?.dayLabel ? `Тренировка ${session.dayLabel}` : 'Тренировка';
  card.setAttribute('aria-label', `${sessionLabel}. Топ-сет: ${session?.topSet || '—'}`);
  card.append(day, topSet, backoffList);
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
  title.textContent = `Week ${weekNumber}`;
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
  const titleSuffix = weekCount > 0 ? ` — ${weekCount} Weeks` : '';
  title.textContent = `Program: ${program?.name || 'Training Plan'}${titleSuffix}`;

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
