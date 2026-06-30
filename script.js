const STORAGE_KEY = 'proactive-ai-state';
const defaultState = {
  tasks: [
    {
      id: crypto.randomUUID(),
      title: 'Prepare interview story bank',
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      priority: 'High',
      category: 'Work',
      completed: false,
    },
    {
      id: crypto.randomUUID(),
      title: 'Review budget and pay bills',
      dueDate: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
      priority: 'Medium',
      category: 'Personal',
      completed: false,
    },
  ],
  habits: [
    { id: crypto.randomUUID(), name: '10-minute planning session', streak: 4, completed: false },
    { id: crypto.randomUUID(), name: 'Walk after lunch', streak: 6, completed: false },
  ],
};

let state = loadState();
const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const recommendations = document.getElementById('recommendations');
const habitList = document.getElementById('habitList');
const habitForm = document.getElementById('habitForm');
const voiceButton = document.getElementById('voiceButton');
const focusSummary = document.getElementById('focusSummary');

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultState;
  } catch {
    return defaultState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getDaysUntil(dateString) {
  const due = new Date(`${dateString}T23:59:59`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getPriorityScore(task) {
  const days = getDaysUntil(task.dueDate);
  const base = task.priority === 'High' ? 3 : task.priority === 'Medium' ? 2 : 1;
  const urgency = days <= 1 ? 4 : days <= 3 ? 3 : days <= 7 ? 2 : 1;
  return base + urgency;
}

function getRecommendation(task) {
  const days = getDaysUntil(task.dueDate);
  if (days <= 1) {
    return 'Start now and break it into a 20-minute sprint.';
  }
  if (days <= 3) {
    return 'Block a focused session today and move it to the calendar.';
  }
  return 'Schedule a light prep step now to avoid last-minute stress.';
}

function renderTasks() {
  if (!state.tasks.length) {
    taskList.innerHTML = '<div class="task-item"><p class="muted">No tasks yet. Add the first one to start building momentum.</p></div>';
    return;
  }

  taskList.innerHTML = state.tasks
    .slice()
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
    .map((task) => {
      const days = getDaysUntil(task.dueDate);
      const badge = days <= 1 ? 'Due soon' : days <= 3 ? 'Needs attention' : 'Planned';
      return `
        <article class="task-item">
          <div class="task-main">
            <strong>${task.title}</strong>
            <span class="tag">${task.category} • ${task.priority}</span>
            <span class="muted">${badge} • due in ${days >= 0 ? days : Math.abs(days)} ${days === 1 ? 'day' : 'days'} ${days < 0 ? 'overdue' : ''}</span>
          </div>
          <div class="task-actions">
            <button class="icon-btn" data-action="complete" data-id="${task.id}">✓</button>
            <button class="icon-btn" data-action="delete" data-id="${task.id}">✕</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderRecommendations() {
  const pendingTasks = state.tasks.filter((task) => !task.completed);
  if (!pendingTasks.length) {
    recommendations.innerHTML = '<div class="recommendation-item"><strong>Everything is clear.</strong><p class="muted">Add a new goal to keep the momentum going.</p></div>';
    focusSummary.textContent = 'You are on track. Add one more commitment to keep your plan moving.';
    return;
  }

  const nextTask = pendingTasks.sort((a, b) => getPriorityScore(b) - getPriorityScore(a))[0];
  const days = getDaysUntil(nextTask.dueDate);
  focusSummary.textContent = `${nextTask.title} is your best next move. ${getRecommendation(nextTask)}`;

  recommendations.innerHTML = `
    <div class="recommendation-item">
      <strong>Best next action</strong>
      <p class="muted">${nextTask.title}</p>
      <p>${getRecommendation(nextTask)}</p>
    </div>
    <div class="recommendation-item">
      <strong>Suggested timing</strong>
      <p class="muted">${days <= 1 ? 'Start in the next 30 minutes.' : 'Block a 45-minute focus window this afternoon.'}</p>
    </div>
    <div class="recommendation-item">
      <strong>Progress snapshot</strong>
      <p class="muted">${pendingTasks.length} active task${pendingTasks.length > 1 ? 's' : ''} • ${state.tasks.filter((task) => task.completed).length} completed</p>
    </div>
  `;
}

function renderHabits() {
  if (!state.habits.length) {
    habitList.innerHTML = '<div class="task-item"><p class="muted">No habits yet. Add a tiny routine to build consistency.</p></div>';
    return;
  }

  habitList.innerHTML = state.habits
    .map((habit) => `
      <div class="habit-item">
        <label class="checkbox-pill">
          <input type="checkbox" data-habit-id="${habit.id}" ${habit.completed ? 'checked' : ''} />
          <span>${habit.name}</span>
        </label>
        <span class="muted">Streak: ${habit.streak} days</span>
      </div>
    `)
    .join('');
}

function render() {
  renderTasks();
  renderRecommendations();
  renderHabits();
  saveState();
}

function addTask(title, dueDate, priority, category) {
  state.tasks.push({
    id: crypto.randomUUID(),
    title,
    dueDate,
    priority,
    category,
    completed: false,
  });
  render();
}

function completeTask(id) {
  state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, completed: true } : task));
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  render();
}

function addHabit(name) {
  state.habits.push({ id: crypto.randomUUID(), name, streak: 1, completed: false });
  render();
}

function toggleHabit(id) {
  state.habits = state.habits.map((habit) => {
    if (habit.id !== id) return habit;
    return { ...habit, completed: !habit.completed, streak: habit.completed ? Math.max(1, habit.streak - 1) : habit.streak + 1 };
  });
  render();
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = document.getElementById('taskTitle').value.trim();
  const dueDate = document.getElementById('taskDate').value;
  const priority = document.getElementById('taskPriority').value;
  const category = document.getElementById('taskCategory').value;

  if (!title || !dueDate) return;
  addTask(title, dueDate, priority, category);
  taskForm.reset();
  document.getElementById('taskDate').value = new Date().toISOString().slice(0, 10);
});

habitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('habitName').value.trim();
  if (!name) return;
  addHabit(name);
  habitForm.reset();
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'complete') completeTask(id);
  if (action === 'delete') deleteTask(id);
});

document.addEventListener('change', (event) => {
  const checkbox = event.target.closest('input[data-habit-id]');
  if (!checkbox) return;
  toggleHabit(checkbox.dataset.habitId);
});

voiceButton.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    focusSummary.textContent = 'Voice capture is not supported in this browser. You can still add tasks manually.';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.start();
  voiceButton.textContent = 'Listening…';
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    if (!transcript) return;
    const dueDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    addTask(transcript, dueDate, 'Medium', 'Personal');
    focusSummary.textContent = `Added “${transcript}” to your plan.`;
  };
  recognition.onend = () => {
    voiceButton.textContent = '🎤 Add task by voice';
  };
});

render();
