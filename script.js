/* ──────────────────────────────────────────────────────────
   STATE
────────────────────────────────────────────────────────── */
const STORE_KEY = 'taskflow_v1';

let state = {
  tasks: [],
  filter: 'all',
  sort: 'newest',
  search: '',
};

let selectedPriority = 'medium';
let editingId = null;

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

/* ──────────────────────────────────────────────────────────
   PERSISTENCE
────────────────────────────────────────────────────────── */
function saveToStorage() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.tasks));
  } catch (e) {
    showToast('Storage full — older tasks may not be saved.', 'yellow');
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      state.tasks = JSON.parse(raw);
    } else {
      // Default sample tasks on first launch
      state.tasks = [
        {
          id: `t_${Date.now()}_1`,
          text: 'Design updated wireframes for project review',
          done: false,
          priority: 'high',
          createdAt: Date.now() - 3600000
        },
        {
          id: `t_${Date.now()}_2`,
          text: 'Review pull requests and give feedback',
          done: true,
          priority: 'medium',
          createdAt: Date.now() - 7200000
        }
      ];
      saveToStorage();
    }
  } catch (e) {
    state.tasks = [];
  }
}

/* ──────────────────────────────────────────────────────────
   TASK CRUD
────────────────────────────────────────────────────────── */
function createTask(text, priority) {
  return {
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    text: text.trim(),
    done: false,
    priority,
    createdAt: Date.now(),
  };
}

function addTask(text, priority) {
  if (!text.trim()) return false;
  const task = createTask(text, priority);
  state.tasks.unshift(task);
  saveToStorage();
  render();
  showToast('Task added', 'accent');
  return true;
}

function toggleTask(id) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  saveToStorage();
  render();
  if (t.done) showToast('Task completed ✓', 'green');
}

function deleteTask(id) {
  const idx = state.tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  state.tasks.splice(idx, 1);
  saveToStorage();
  render();
  showToast('Task deleted', 'red');
}

function updateTask(id, newText) {
  const t = state.tasks.find(t => t.id === id);
  if (!t || !newText.trim()) return;
  t.text = newText.trim();
  saveToStorage();
}

function clearCompleted() {
  const n = state.tasks.filter(t => t.done).length;
  if (!n) { showToast('No completed tasks to clear', 'yellow'); return; }
  state.tasks = state.tasks.filter(t => !t.done);
  saveToStorage();
  render();
  showToast(`Cleared ${n} completed task${n > 1 ? 's' : ''}`, 'red');
}

/* ──────────────────────────────────────────────────────────
   FILTER + SORT
────────────────────────────────────────────────────────── */
function getVisible() {
  let list = [...state.tasks];

  // search
  if (state.search.trim()) {
    const q = state.search.toLowerCase();
    list = list.filter(t => t.text.toLowerCase().includes(q));
  }

  // filter
  if (state.filter === 'active')    list = list.filter(t => !t.done);
  if (state.filter === 'completed') list = list.filter(t =>  t.done);

  // sort
  if (state.sort === 'newest')   list.sort((a,b) => b.createdAt - a.createdAt);
  if (state.sort === 'oldest')   list.sort((a,b) => a.createdAt - b.createdAt);
  if (state.sort === 'priority') list.sort((a,b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  if (state.sort === 'alpha')    list.sort((a,b) => a.text.localeCompare(b.text));

  return list;
}

/* ──────────────────────────────────────────────────────────
   RENDER
────────────────────────────────────────────────────────── */
function render() {
  const list = getVisible();
  const container = document.getElementById('task-list');
  const empty     = document.getElementById('empty');

  // stats
  const total  = state.tasks.length;
  const done   = state.tasks.filter(t => t.done).length;
  const active = total - done;
  document.getElementById('stat-total').textContent  = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-done').textContent   = done;

  // progress
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-pct').textContent  = pct + '%';
  document.getElementById('progress-label').textContent = `${done} of ${total} done`;

  // empty state
  if (!list.length) {
    container.innerHTML = '';
    empty.classList.add('show');
    const title = document.getElementById('empty-title');
    const sub   = document.getElementById('empty-sub');
    if (state.search.trim()) {
      title.textContent = 'No results';
      sub.textContent   = `Nothing matches "${state.search}". Try a different search.`;
    } else if (state.filter === 'active') {
      title.textContent = 'All done!';
      sub.textContent   = 'Every task is completed. Add more or switch filters.';
    } else if (state.filter === 'completed') {
      title.textContent = 'Nothing completed yet';
      sub.textContent   = 'Finish some tasks and they\'ll appear here.';
    } else {
      title.textContent = 'No tasks yet';
      sub.textContent   = 'Add your first task above and start getting things done.';
    }
    return;
  }

  empty.classList.remove('show');

  // diff render: update items
  const existing = new Set([...container.querySelectorAll('[data-id]')].map(el => el.dataset.id));
  const incoming = new Set(list.map(t => t.id));

  // remove deleted
  existing.forEach(id => {
    if (!incoming.has(id)) {
      const el = container.querySelector(`[data-id="${id}"]`);
      if (el) el.remove();
    }
  });

  // insert/update in correct order
  list.forEach((task, idx) => {
    let el = container.querySelector(`[data-id="${task.id}"]`);
    if (!el) {
      el = buildTaskEl(task);
      container.appendChild(el);
    } else {
      syncTaskEl(el, task);
    }
    // maintain sort order in DOM
    const children = [...container.children];
    const currentIdx = children.indexOf(el);
    if (currentIdx !== idx) container.insertBefore(el, container.children[idx] || null);
  });
}

function buildTaskEl(task) {
  const el = document.createElement('div');
  el.className = 'task-item' + (task.done ? ' done' : '');
  el.dataset.id = task.id;
  el.dataset.priority = task.priority;
  el.setAttribute('role', 'listitem');
  el.innerHTML = taskHTML(task);
  attachTaskListeners(el, task);
  return el;
}

function syncTaskEl(el, task) {
  el.className = 'task-item' + (task.done ? ' done' : '');
  el.dataset.priority = task.priority;

  const cb  = el.querySelector('input[type="checkbox"]');
  const txt = el.querySelector('.task-text');
  if (cb && cb.checked !== task.done) cb.checked = task.done;
  if (txt && txt !== document.activeElement) txt.textContent = task.text;
}

function taskHTML(task) {
  const date = new Date(task.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                  ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return `
    <div class="check-wrap">
      <input type="checkbox" id="cb_${task.id}" ${task.done ? 'checked' : ''}>
      <label class="check-box" for="cb_${task.id}" title="${task.done ? 'Mark incomplete' : 'Mark complete'}">
        <svg class="tick" viewBox="0 0 13 13">
          <path d="M2 7L5 10L11 3"/>
        </svg>
      </label>
    </div>
    <div class="task-body">
      <div class="task-row">
        <span
          class="task-text"
          contenteditable="false"
          spellcheck="false"
          title="Double-click to edit"
        >${escapeHTML(task.text)}</span>
        <div class="task-actions">
          <button class="action-btn edit" title="Edit task" data-action="edit">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 1.5L12.5 4.5L5 12H2V9L9.5 1.5Z"
                stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="action-btn del" title="Delete task" data-action="delete">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2.5h3V3.5M5 6v5M9 6v5M3.5 3.5L4 12h6l.5-8.5"
                stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="task-meta">
        <span class="prio-tag ${task.priority}">${task.priority}</span>
        <span class="task-date">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          ${dateStr}
        </span>
      </div>
    </div>`;
}

function attachTaskListeners(el, task) {
  // checkbox
  const cb = el.querySelector('input[type="checkbox"]');
  cb.addEventListener('change', () => toggleTask(task.id));

  // edit / delete buttons
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'delete') { deleteTask(task.id); return; }
    if (btn.dataset.action === 'edit')   { startEdit(el, task.id); return; }
  });

  // double-click on text to edit
  const txt = el.querySelector('.task-text');
  txt.addEventListener('dblclick', () => startEdit(el, task.id));

  // finish edit on blur / enter
  txt.addEventListener('blur', () => finishEdit(el, task.id));
  txt.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); txt.blur(); }
    if (e.key === 'Escape') { cancelEdit(el, task.id); }
  });
}

function startEdit(el, id) {
  const txt = el.querySelector('.task-text');
  txt.contentEditable = 'true';
  txt.focus();
  const range = document.createRange();
  range.selectNodeContents(txt);
  range.collapse(false);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  editingId = id;
}

function finishEdit(el, id) {
  const txt = el.querySelector('.task-text');
  txt.contentEditable = 'false';
  const newText = txt.textContent.trim();
  if (newText) {
    updateTask(id, newText);
    txt.textContent = newText;
  } else {
    const task = state.tasks.find(t => t.id === id);
    if (task) txt.textContent = task.text;
  }
  editingId = null;
}

function cancelEdit(el, id) {
  const task = state.tasks.find(t => t.id === id);
  const txt  = el.querySelector('.task-text');
  if (task) txt.textContent = task.text;
  txt.contentEditable = 'false';
  txt.blur();
  editingId = null;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ──────────────────────────────────────────────────────────
   TOAST
────────────────────────────────────────────────────────── */
const TOAST_COLORS = {
  accent: '#6366f1',
  green:  '#34d399',
  red:    '#f87171',
  yellow: '#fbbf24',
};

function showToast(msg, type = 'accent') {
  const wrap = document.getElementById('toast-wrap');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-dot" style="background:${TOAST_COLORS[type] || TOAST_COLORS.accent}"></span>${escapeHTML(msg)}`;
  wrap.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

/* ──────────────────────────────────────────────────────────
   EVENT LISTENERS
────────────────────────────────────────────────────────── */
// Priority selection
document.getElementById('prio-pick').addEventListener('click', e => {
  const btn = e.target.closest('.prio-btn');
  if (!btn) return;
  document.querySelectorAll('.prio-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedPriority = btn.dataset.p;
});

// Add Task
function handleAdd() {
  const input = document.getElementById('task-input');
  const text  = input.value;
  if (addTask(text, selectedPriority)) {
    input.value = '';
    input.focus();
  } else {
    input.focus();
    document.getElementById('input-card').style.boxShadow = '0 0 0 3px rgba(248,113,113,0.25)';
    setTimeout(() => {
      document.getElementById('input-card').style.boxShadow = '';
    }, 1200);
  }
}

document.getElementById('add-btn').addEventListener('click', handleAdd);
document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAdd();
});

// Search
document.getElementById('search-input').addEventListener('input', e => {
  state.search = e.target.value;
  render();
});

// Keyboard shortcut: Ctrl+K or Cmd+K to focus search
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search-input').focus();
  }
});

// Filter tabs
document.querySelector('.filter-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  state.filter = tab.dataset.filter;
  render();
});

// Sort dropdown
document.getElementById('sort-select').addEventListener('change', e => {
  state.sort = e.target.value;
  render();
});

// Clear completed button
document.getElementById('clear-btn').addEventListener('click', clearCompleted);

/* ──────────────────────────────────────────────────────────
   INIT
────────────────────────────────────────────────────────── */
loadFromStorage();
render();