const PROGRAM_LIST_CONTAINER_ID = 'program-list';

function getProgramListContainer() {
  return document.getElementById(PROGRAM_LIST_CONTAINER_ID);
}

export function clearProgramList() {
  const container = getProgramListContainer();

  if (container) {
    container.textContent = '';
  }
}

function createActionButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'program-list-button';
  button.textContent = label;

  if (typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }

  return button;
}

function renderEmptyState(container) {
  const emptyState = document.createElement('p');
  emptyState.className = 'program-list-empty';
  emptyState.textContent = 'Пока нет сохранённых программ';
  container.appendChild(emptyState);
}

export function renderProgramList(programs = [], { onSelect, onDelete } = {}) {
  const container = getProgramListContainer();

  if (!container) {
    return;
  }

  clearProgramList();

  if (!Array.isArray(programs) || programs.length === 0) {
    renderEmptyState(container);
    return;
  }

  programs.forEach((program) => {
    const item = document.createElement('div');
    item.className = 'program-list-item';

    const title = document.createElement('div');
    title.className = 'program-list-title';
    title.textContent = program?.name || 'Без названия';

    const actions = document.createElement('div');
    actions.className = 'program-list-actions';

    const selectButton = createActionButton('Выбрать', () => {
      if (typeof onSelect === 'function') {
        onSelect(program.id);
      }
    });

    const deleteButton = createActionButton('Удалить', () => {
      if (typeof onDelete === 'function') {
        onDelete(program.id);
      }
    });

    actions.appendChild(selectButton);
    actions.appendChild(deleteButton);

    item.appendChild(title);
    item.appendChild(actions);

    container.appendChild(item);
  });
}
