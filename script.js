// ===== 1. DOM Elements (Mengambil elemen HTML yang dibutuhkan) =====
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

// ===== 2. State (Penyimpanan Data Sementara) =====
// Menggunakan object dengan dua array: 'todo' untuk yang belum selesai, 'done' untuk yang selesai.
let tasks = {
  todo: [],
  done: [],
};

// ===== 3. Konfigurasi Tanggal & Waktu (Bahasa Indonesia) =====
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

// ===== 4. Initialize App (Fungsi yang jalan saat aplikasi dibuka) =====
function init() {
  loadFromStorage(); // Ambil data dari LocalStorage
  updateDateTime(); // Update jam di header
  renderTasks(); // Tampilkan daftar tugas ke layar

  // Update waktu setiap 1 menit
  setInterval(updateDateTime, 60000);

  // Cek tugas yang kadaluarsa (overdue) setiap 1 menit
  setInterval(checkOverdueTasks, 60000);
}

// ===== 5. Fungsi Update Tanggal Header =====
function updateDateTime() {
  const now = new Date();
  const dayName = days[now.getDay()];
  const date = now.getDate();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();

  currentDayEl.textContent = dayName;
  currentDateEl.textContent = `${date} ${monthName} ${year}`;
}

// ===== 6. Helper: Format Tanggal untuk Tugas =====
function formatTaskDate(timestamp) {
  const date = new Date(timestamp);
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const monthName = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${dayName}, ${day} ${monthName} - ${hours}:${minutes}`;
}

// ===== 7. Helper: Generate ID Unik =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== 8. CORE FUNCTION: Tambah Tugas Baru =====
function addTask(text, priority) {
  const task = {
    id: generateId(),
    text: text.trim(),
    priority: priority, // low, medium, atau high
    createdAt: Date.now(),
    isOverdue: false,
  };

  // Masukkan ke array 'todo' paling depan (unshift)
  tasks.todo.unshift(task);
  saveToStorage();
  renderTasks();
}

// ===== 9. CORE FUNCTION: Tandai Selesai (Pindah ke Done) =====
function toggleComplete(taskId) {
  // Cari tugas di array todo
  const taskIndex = tasks.todo.findIndex((t) => t.id === taskId);

  if (taskIndex !== -1) {
    // Hapus dari todo, simpan di variabel sementara
    const task = tasks.todo.splice(taskIndex, 1)[0];
    // Tambahkan properti waktu selesai
    task.completedAt = Date.now();
    task.isOverdue = false; // Reset overdue jika sudah selesai
    // Masukkan ke array done
    tasks.done.unshift(task);
  }

  saveToStorage();
  renderTasks();
}

// ===== 10. CORE FUNCTION: Batalkan Selesai (Kembali ke Todo) =====
function undoComplete(taskId) {
  const taskIndex = tasks.done.findIndex((t) => t.id === taskId);

  if (taskIndex !== -1) {
    const task = tasks.done.splice(taskIndex, 1)[0];
    delete task.completedAt; // Hapus properti waktu selesai
    tasks.todo.unshift(task);
  }

  saveToStorage();
  renderTasks();
}

// ===== 11. CORE FUNCTION: Hapus Satu Tugas =====
function deleteTask(taskId, listType) {
  // Tambahkan efek animasi dulu
  const taskElement = document.querySelector(`[data-id="${taskId}"]`);

  if (taskElement) {
    taskElement.classList.add("removing");

    // Tunggu animasi selesai (300ms) baru hapus data
    setTimeout(() => {
      if (listType === "todo") {
        tasks.todo = tasks.todo.filter((t) => t.id !== taskId);
      } else {
        tasks.done = tasks.done.filter((t) => t.id !== taskId);
      }

      saveToStorage();
      renderTasks();
    }, 300);
  }
}

// ===== 12. CORE FUNCTION: Hapus Semua =====
function deleteAll() {
  if (tasks.todo.length === 0 && tasks.done.length === 0) return;

  if (confirm("Apakah Anda yakin ingin menghapus semua tugas?")) {
    tasks.todo = [];
    tasks.done = [];
    saveToStorage();
    renderTasks();
  }
}

// ===== 13. Logic: Cek Keterlambatan (Overdue) =====
function checkOverdueTasks() {
  const now = Date.now();
  const overdueThreshold = 24 * 60 * 60 * 1000; // Batas waktu 24 jam
  let hasChanges = false;

  tasks.todo.forEach((task) => {
    const isOverdue = now - task.createdAt > overdueThreshold;
    if (task.isOverdue !== isOverdue) {
      task.isOverdue = isOverdue;
      hasChanges = true;
    }
  });

  if (hasChanges) {
    saveToStorage();
    renderTasks();
  }
}

// ===== 14. RENDER: Menampilkan Data ke HTML =====
function renderTasks() {
  // Update status overdue sebelum render
  const now = Date.now();
  const overdueThreshold = 24 * 60 * 60 * 1000;

  tasks.todo.forEach((task) => {
    task.isOverdue = now - task.createdAt > overdueThreshold;
  });

  // --- Render List Todo ---
  const todoHTML = tasks.todo
    .map((task) => createTaskHTML(task, "todo"))
    .join("");

  // Bersihkan list lama
  const existingTodoItems = todoList.querySelectorAll(".task-item");
  existingTodoItems.forEach((item) => item.remove());

  // Tampilkan item baru atau pesan kosong
  if (tasks.todo.length > 0) {
    emptyTodo.classList.add("hidden");
    todoList.insertAdjacentHTML("beforeend", todoHTML);
  } else {
    emptyTodo.classList.remove("hidden");
  }

  // --- Render List Done ---
  const doneHTML = tasks.done
    .map((task) => createTaskHTML(task, "done"))
    .join("");

  const existingDoneItems = doneList.querySelectorAll(".task-item");
  existingDoneItems.forEach((item) => item.remove());

  if (tasks.done.length > 0) {
    emptyDone.classList.add("hidden");
    doneList.insertAdjacentHTML("beforeend", doneHTML);
  } else {
    emptyDone.classList.remove("hidden");
  }

  // Update angka counter di header section
  todoCount.textContent = tasks.todo.length;
  doneCount.textContent = tasks.done.length;

  // Matikan tombol hapus semua jika tidak ada data
  deleteAllBtn.disabled = tasks.todo.length === 0 && tasks.done.length === 0;

  // Pasang event listener ke elemen yang baru dibuat
  attachEventListeners();
}

// ===== 15. HTML Generator: Membuat Template Item Tugas =====
function createTaskHTML(task, listType) {
  const isCompleted = listType === "done";
  const overdueClass = task.isOverdue && !isCompleted ? "overdue" : "";
  const completedClass = isCompleted ? "completed" : "";
  const displayDate = isCompleted
    ? formatTaskDate(task.completedAt)
    : formatTaskDate(task.createdAt);

  // Mengembalikan string HTML (Template String)
  return `
        <div class="task-item ${overdueClass} ${completedClass}" data-id="${task.id}" data-list="${listType}">
            <div class="checkbox-wrapper">
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    ${isCompleted ? "checked" : ""}
                    aria-label="Mark task as ${isCompleted ? "incomplete" : "complete"}"
                >
            </div>
            <div class="task-content">
                <p class="task-text">${escapeHTML(task.text)}</p>
                <div class="task-meta">
                    <span class="task-date">${displayDate}</span>
                    <span class="priority-badge ${task.priority}">${task.priority}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="delete-btn" aria-label="Delete task">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// ===== 16. Security: Mencegah XSS (Cross Site Scripting) =====
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ===== 17. Event Binding: Menghubungkan Klik User ke Fungsi =====
function attachEventListeners() {
  // Listener untuk Checkbox (Selesai/Belum)
  document.querySelectorAll(".task-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const taskItem = e.target.closest(".task-item");
      const taskId = taskItem.dataset.id;
      const listType = taskItem.dataset.list;

      if (listType === "todo") {
        toggleComplete(taskId);
      } else {
        undoComplete(taskId);
      }
    });
  });

  // Listener untuk Tombol Hapus per Item
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const taskItem = e.target.closest(".task-item");
      const taskId = taskItem.dataset.id;
      const listType = taskItem.dataset.list;

      deleteTask(taskId, listType);
    });
  });
}

// ===== 18. Local Storage: Simpan & Muat Data dari Browser =====
function saveToStorage() {
  try {
    localStorage.setItem("todoApp_tasks", JSON.stringify(tasks));
  } catch (e) {
    console.error("Error saving to localStorage:", e);
  }
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem("todoApp_tasks");
    if (stored) {
      tasks = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error loading from localStorage:", e);
    tasks = { todo: [], done: [] };
  }
}

// ===== 19. Main Event Listeners (Tombol Submit & Hapus Semua) =====
taskForm.addEventListener("submit", (e) => {
  e.preventDefault(); // Mencegah reload halaman

  const text = taskInput.value.trim();
  if (!text) return;

  // Ambil nilai radio button yang dipilih
  const priority = document.querySelector(
    'input[name="priority"]:checked',
  ).value;

  addTask(text, priority);

  // Reset form setelah submit
  taskInput.value = "";
  document.getElementById("priorityLow").checked = true;
  taskInput.focus();
});

deleteAllBtn.addEventListener("click", deleteAll);

// ===== 20. Start Application saat Halaman Siap =====
document.addEventListener("DOMContentLoaded", init);
