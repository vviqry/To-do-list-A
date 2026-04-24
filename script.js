// ===== 1. KONFIGURASI STORAGE (localStorage) =====
const STORAGE_KEY = "todoAppData";

// ===== 2. DOM Elements =====
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const todoList = document.getElementById("todoList");
const doneList = document.getElementById("doneList");
const todoCount = document.getElementById("todoCount");
const doneCount = document.getElementById("doneCount");
const emptyTodo = document.getElementById("emptyTodo");
const emptyDone = document.getElementById("emptyDone");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const currentDayEl = document.getElementById("currentDay");
const currentDateEl = document.getElementById("currentDate");
const addSubtaskBtn = document.getElementById("addSubtaskBtn");
const subtaskInputs = document.getElementById("subtaskInputs");

// ===== 3. State (Wadah Sementara di Browser) =====
let tasks = {
  todo: [],
  done: [],
};

// ===== 4. Konfigurasi Tanggal =====
const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// ===== 5. Initialize App =====
function init() {
  updateDateTime();
  loadTasks();
  setInterval(updateDateTime, 60000);
  setInterval(renderTasks, 60000); // Re-render buat update status overdue
}

// ===== 6. STORAGE: LOAD DATA =====
function loadTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      tasks = JSON.parse(data);
    }
  } catch (error) {
    console.error("Gagal load data:", error);
    tasks = { todo: [], done: [] };
  }
  renderTasks();
}

// ===== 7. STORAGE: SAVE DATA =====
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Gagal simpan data:", error);
  }
}

// ===== 8. GENERATE UNIQUE ID =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// ===== 9. CORE: TAMBAH TUGAS =====
function addTask(text, priority, subtasks) {
  const newTask = {
    id: generateId(),
    text: text,
    priority: priority,
    isCompleted: false,
    createdAt: Date.now(),
    completedAt: null,
    subtasks: subtasks || [], // Array of { id, text, isDone }
  };

  tasks.todo.unshift(newTask); // Tambah di awal
  saveTasks();
  renderTasks();
}

// ===== 10. CORE: TOGGLE COMPLETE (Tugas Tanpa Subtask) =====
function toggleComplete(taskId, isDone) {
  if (isDone) {
    // Pindah dari todo ke done
    const index = tasks.todo.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      const task = tasks.todo.splice(index, 1)[0];
      task.isCompleted = true;
      task.completedAt = Date.now();
      // Tandai semua subtask selesai juga
      task.subtasks.forEach((st) => (st.isDone = true));
      tasks.done.unshift(task);
    }
  } else {
    // Pindah dari done ke todo (un-complete)
    const index = tasks.done.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      const task = tasks.done.splice(index, 1)[0];
      task.isCompleted = false;
      task.completedAt = null;
      // Reset semua subtask jadi belum selesai
      task.subtasks.forEach((st) => (st.isDone = false));
      tasks.todo.unshift(task);
    }
  }

  saveTasks();
  renderTasks();
}

// ===== 11. CORE: TOGGLE SUBTASK CHECKBOX =====
function toggleSubtask(taskId, subtaskId) {
  const task = tasks.todo.find((t) => t.id === taskId);
  if (!task) return;

  const subtask = task.subtasks.find((st) => st.id === subtaskId);
  if (!subtask) return;

  subtask.isDone = !subtask.isDone;

  // Cek apakah semua subtask sudah selesai -> auto-complete tugas utama
  const allDone = task.subtasks.every((st) => st.isDone);
  if (allDone && task.subtasks.length > 0) {
    // Kasih delay kecil biar user liat progress 100% dulu
    saveTasks();
    renderTasks();
    setTimeout(() => {
      toggleComplete(taskId, true);
    }, 600);
    return;
  }

  saveTasks();
  renderTasks();
}

// ===== 12. CORE: HAPUS TUGAS =====
function deleteTask(taskId) {
  // Efek visual optimis
  const el = document.querySelector(`[data-id="${taskId}"]`);
  if (el) el.classList.add("removing");

  setTimeout(() => {
    tasks.todo = tasks.todo.filter((t) => t.id !== taskId);
    tasks.done = tasks.done.filter((t) => t.id !== taskId);
    saveTasks();
    renderTasks();
  }, 300);
}

// ===== 13. CORE: HAPUS SEMUA =====
function deleteAll() {
  if (!confirm("Yakin mau hapus semua tugas?")) return;

  tasks.todo = [];
  tasks.done = [];
  saveTasks();
  renderTasks();
}

// ===== 14. HELPER FUNCTIONS =====
function updateDateTime() {
  const now = new Date();
  currentDayEl.textContent = days[now.getDay()];
  currentDateEl.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function formatTaskDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} - ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ===== 15. PROGRESS CALCULATION =====
function getProgress(task) {
  if (task.isCompleted) return 100;
  if (task.subtasks.length === 0) return 0; // Tugas tanpa subtask -> 0 atau 100 (toggle langsung)
  const done = task.subtasks.filter((st) => st.isDone).length;
  return Math.round((done / task.subtasks.length) * 100);
}

// ===== 16. RENDER ENGINE =====
function renderTasks() {
  const now = Date.now();
  const overdueThreshold = 24 * 60 * 60 * 1000;

  // Cek Overdue Logic
  tasks.todo.forEach(
    (t) => (t.isOverdue = now - t.createdAt > overdueThreshold),
  );

  // Render Todo
  const todoHTML = tasks.todo.map((t) => createTaskHTML(t, "todo")).join("");
  todoList.innerHTML = "";
  if (tasks.todo.length > 0) {
    emptyTodo.classList.add("hidden");
    todoList.insertAdjacentHTML("beforeend", todoHTML);
  } else {
    emptyTodo.classList.remove("hidden");
  }

  // Render Done
  const doneHTML = tasks.done.map((t) => createTaskHTML(t, "done")).join("");
  doneList.innerHTML = "";
  if (tasks.done.length > 0) {
    emptyDone.classList.add("hidden");
    doneList.insertAdjacentHTML("beforeend", doneHTML);
  } else {
    emptyDone.classList.remove("hidden");
  }

  // Update Counts & Buttons
  todoCount.textContent = tasks.todo.length;
  doneCount.textContent = tasks.done.length;
  deleteAllBtn.disabled = tasks.todo.length === 0 && tasks.done.length === 0;

  attachEventListeners();
}

function createTaskHTML(task, listType) {
  const isCompleted = listType === "done";
  const overdueClass = task.isOverdue && !isCompleted ? "overdue" : "";
  const completedClass = isCompleted ? "completed" : "";
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const progress = getProgress(task);

  // Progress bar color logic
  let progressColorClass = "progress-active"; // Accent purple-ish
  if (progress === 100) progressColorClass = "progress-done";
  if (progress === 0 && !hasSubtasks) progressColorClass = "progress-empty";

  // Build subtask list HTML
  let subtaskHTML = "";
  if (hasSubtasks) {
    const subtaskItems = task.subtasks
      .map(
        (st) => `
      <div class="subtask-item" data-subtask-id="${st.id}">
        <div class="subtask-checkbox-wrapper">
          <input type="checkbox" class="subtask-checkbox" ${st.isDone ? "checked" : ""} ${isCompleted ? "disabled" : ""}>
        </div>
        <span class="subtask-text ${st.isDone ? "subtask-done" : ""}">${escapeHTML(st.text)}</span>
      </div>`,
      )
      .join("");

    subtaskHTML = `
      <div class="subtask-dropdown">
        <button type="button" class="subtask-toggle-btn" aria-label="Toggle subtasks">
          <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span class="subtask-summary">${task.subtasks.filter((s) => s.isDone).length}/${task.subtasks.length} sub-tugas selesai</span>
        </button>
        <div class="subtask-list collapsed">
          ${subtaskItems}
        </div>
      </div>`;
  }

  // Main checkbox: hanya muncul jika TIDAK punya subtask
  const checkboxHTML = hasSubtasks
    ? `<div class="checkbox-wrapper checkbox-placeholder"></div>`
    : `<div class="checkbox-wrapper">
         <input type="checkbox" class="task-checkbox" ${isCompleted ? "checked" : ""}>
       </div>`;

  return `
    <div class="task-item ${overdueClass} ${completedClass} ${hasSubtasks ? "has-subtasks" : ""}" data-id="${task.id}" data-list="${listType}">
        <div class="task-item-header">
            ${checkboxHTML}
            <div class="task-content">
                <p class="task-text">${escapeHTML(task.text)}</p>
                <div class="task-meta">
                    <span class="task-date">${formatTaskDate(isCompleted ? task.completedAt : task.createdAt)}</span>
                    <span class="priority-badge ${task.priority}">${task.priority}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="delete-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>
        </div>
        ${subtaskHTML}
        <div class="progress-bar-container">
            <div class="progress-bar-fill ${progressColorClass}" style="width: ${progress}%"></div>
        </div>
        <div class="progress-label">
            <span>${progress}%</span>
        </div>
    </div>`;
}

// ===== 17. EVENT LISTENERS =====
function attachEventListeners() {
  // Main task checkboxes (hanya tugas tanpa subtask)
  document.querySelectorAll(".task-checkbox").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const id = e.target.closest(".task-item").dataset.id;
      const isDone = e.target.checked;
      toggleComplete(id, isDone);
    });
  });

  // Subtask checkboxes
  document.querySelectorAll(".subtask-checkbox").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const taskItem = e.target.closest(".task-item");
      const subtaskItem = e.target.closest(".subtask-item");
      const taskId = taskItem.dataset.id;
      const subtaskId = subtaskItem.dataset.subtaskId;
      toggleSubtask(taskId, subtaskId);
    });
  });

  // Delete buttons
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.closest(".task-item").dataset.id;
      deleteTask(id);
    });
  });

  // Subtask dropdown toggles
  document.querySelectorAll(".subtask-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const dropdown = e.target.closest(".subtask-dropdown");
      const list = dropdown.querySelector(".subtask-list");
      const chevron = dropdown.querySelector(".chevron-icon");
      list.classList.toggle("collapsed");
      chevron.classList.toggle("rotated");
    });
  });
}

// ===== 18. SUBTASK FORM BUILDER =====
let subtaskCounter = 0;

addSubtaskBtn.addEventListener("click", () => {
  subtaskCounter++;
  const inputRow = document.createElement("div");
  inputRow.className = "subtask-input-row";
  inputRow.innerHTML = `
    <span class="subtask-input-number">${subtaskCounter}</span>
    <input type="text" class="subtask-text-input" placeholder="Sub tugas..." />
    <button type="button" class="remove-subtask-btn" aria-label="Hapus sub tugas">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  // Remove button handler
  inputRow.querySelector(".remove-subtask-btn").addEventListener("click", () => {
    inputRow.classList.add("removing");
    setTimeout(() => {
      inputRow.remove();
      renumberSubtasks();
    }, 250);
  });

  subtaskInputs.appendChild(inputRow);

  // Auto-focus the new input
  inputRow.querySelector(".subtask-text-input").focus();
});

function renumberSubtasks() {
  const rows = subtaskInputs.querySelectorAll(".subtask-input-row");
  subtaskCounter = rows.length;
  rows.forEach((row, i) => {
    row.querySelector(".subtask-input-number").textContent = i + 1;
  });
}

// ===== 19. FORM SUBMIT =====
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  const priority = document.querySelector(
    'input[name="priority"]:checked',
  ).value;

  // Ambil semua sub-tugas dari form builder
  const subtaskEls = subtaskInputs.querySelectorAll(".subtask-text-input");
  const subtasks = [];
  subtaskEls.forEach((input) => {
    const val = input.value.trim();
    if (val) {
      subtasks.push({
        id: generateId(),
        text: val,
        isDone: false,
      });
    }
  });

  addTask(text, priority, subtasks);

  // Reset form
  taskInput.value = "";
  subtaskInputs.innerHTML = "";
  subtaskCounter = 0;

  // Reset priority ke Low
  document.getElementById("priorityLow").checked = true;
});

deleteAllBtn.addEventListener("click", deleteAll);

// Start
document.addEventListener("DOMContentLoaded", init);
