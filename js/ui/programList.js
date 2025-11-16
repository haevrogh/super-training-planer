// UI rendering for saved programs list

const PROGRAM_LIST_ID = 'program-list';

function getProgramListContainer() {
  return document.getElementById(PROGRAM_LIST_ID);
}

function createEmptyState() {
  const emptyState = document.createElement('p');
  emptyState.className = 'program-list-empty';
  emptyState.textContent = 'Пока нет сохранённых программ';
  emptyState.setAttribute('role', 'status');
  emptyState.setAttribute('aria-live', 'polite');
  return emptyState;
}

function createActionButton(label, onClick, ariaLabel) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'program-list-button';
  button.textContent = label;
  button.setAttribute('role', 'button');
  button.setAttribute('aria-label', ariaLabel || label);
  button.addEventListener('click', (event) => {
    event.preventDefault();

    if (typeof onClick === 'function') {
      onClick();
    }
  });
  return button;
}

function createProgramListItem(program, callbacks) {
  const item = document.createElement('div');
  item.className = 'program-list-item';
  item.setAttribute('role', 'listitem');
  item.tabIndex = 0;

  const title = document.createElement('span');
  title.className = 'program-list-title';
  title.textContent = program?.name || 'Без названия';
  item.setAttribute('aria-label', `Программа: ${title.textContent}`);

  const actions = document.createElement('div');
  actions.className = 'program-list-actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', 'Действия программы');

  const selectButton = createActionButton(
    'Выбрать',
    () => {
      callbacks?.onSelect?.(program.id);
    },
    `Выбрать программу ${title.textContent}`,
  );

  const deleteButton = createActionButton(
    'Удалить',
    () => {
      callbacks?.onDelete?.(program.id);
    },
    `Удалить программу ${title.textContent}`,
  );

  actions.append(selectButton, deleteButton);
  item.append(title, actions);
  return item;
}

export function clearProgramList() {
  const container = getProgramListContainer();

  if (!container) {
    return;
  }

  container.innerHTML = '';
}

export function renderProgramList(programs = [], callbacks = {}) {
  const container = getProgramListContainer();

  if (!container) {
    return;
  }

  clearProgramList();
  container.setAttribute('role', 'list');
  container.setAttribute('aria-label', 'Сохранённые программы');

  if (!Array.isArray(programs) || programs.length === 0) {
    container.appendChild(createEmptyState());
    return;
  }

  programs.forEach((program) => {
    const item = createProgramListItem(program, callbacks);
    container.appendChild(item);
  });
}
