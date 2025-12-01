// Global variables for tasks and state
let tasks = JSON.parse(localStorage.getItem('tasks')) || []; // Array of task objects
let currentEditId = null; // ID of task being edited
let deletedTask = null; // For undo functionality
let isDarkMode = localStorage.getItem('theme') === 'dark'; // Theme state

// DOM elements
const taskForm = document.getElementById('task-form');
const editForm = document.getElementById('edit-form');
const searchInput = document.getElementById('search-input');
const filterPriority = document.getElementById('filter-priority');
const sortBy = document.getElementById('sort-by');
const pendingTasksContainer = document.getElementById('pending-tasks');
const completedTasksContainer = document.getElementById('completed-tasks');
const editModal = document.getElementById('edit-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const undoSnackbar = document.getElementById('undo-snackbar');
const undoBtn = document.getElementById('undo-btn');
const undoMessage = document.getElementById('undo-message');
const themeToggle = document.getElementById('theme-toggle');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');
const signature = document.getElementById('signature');

// Initialize app on load
document.addEventListener('DOMContentLoaded', function() {
    applyTheme();
    renderTasks();
    signature.style.display = 'block'; // Show signature
    
    // Event listeners
    taskForm.addEventListener('submit', handleAddTask);
    editForm.addEventListener('submit', handleEditTask);
    cancelEditBtn.addEventListener('click', closeEditModal);
    searchInput.addEventListener('input', renderTasks);
    filterPriority.addEventListener('change', renderTasks);
    sortBy.addEventListener('change', renderTasks);
    themeToggle.addEventListener('click', toggleTheme);
    exportBtn.addEventListener('click', exportTasks);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', importTasks);
    undoBtn.addEventListener('click', undoDelete);
    
    // Keyboard support
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            if (editModal.classList.contains('show')) {
                editForm.dispatchEvent(new Event('submit'));
            } else {
                taskForm.dispatchEvent(new Event('submit'));
            }
        }
        if (event.key === 'Escape') {
            closeEditModal();
            hideUndoSnackbar();
        }
    });
    
    // Close modal on outside click
    editModal.addEventListener('click', function(event) {
        if (event.target === editModal) {
            closeEditModal();
        }
    });
});

// Handle adding a new task
function handleAddTask(event) {
    event.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    
    // Validation
    clearErrors();
    let hasError = false;
    if (!title) {
        showError('title-error', 'Title is required.');
        hasError = true;
    }
    if (!description) {
        showError('description-error', 'Description is required.');
        hasError = true;
    }
    if (hasError) return;
    
    // Create task object
    const newTask = {
        id: Date.now(), // Unique ID
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        isCompleted: false
    };
    
    tasks.push(newTask);
    saveTasksToStorage();
    renderTasks();
    taskForm.reset();
    clearErrors();
}

// Handle editing a task
function handleEditTask(event) {
    event.preventDefault();
    const title = document.getElementById('edit-task-title').value.trim();
    const description = document.getElementById('edit-task-description').value.trim();
    const priority = document.getElementById('edit-task-priority').value;
    const dueDate = document.getElementById('edit-task-due-date').value;
    
    // Validation
    clearEditErrors();
    let hasError = false;
    if (!title) {
        showError('edit-title-error', 'Title is required.');
        hasError = true;
    }
    if (!description) {
        showError('edit-description-error', 'Description is required.');
        hasError = true;
    }
    if (hasError) return;
    
    // Update task
    const task = tasks.find(t => t.id === currentEditId);
    if (task) {
        task.title = title;
        task.description = description;
        task.priority = priority;
        task.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
        saveTasksToStorage();
        renderTasks();
        closeEditModal();
    }
}

// Open edit modal for a task
function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        currentEditId = taskId;
        document.getElementById('edit-task-title').value = task.title;
        document.getElementById('edit-task-description').value = task.description;
        document.getElementById('edit-task-priority').value = task.priority;
        document.getElementById('edit-task-due-date').value = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '';
        editModal.classList.add('show');
        editModal.setAttribute('aria-hidden', 'false');
    }
}

// Close edit modal
function closeEditModal() {
    editModal.classList.remove('show');
    editModal.setAttribute('aria-hidden', 'true');
    editForm.reset();
    currentEditId = null;
    clearEditErrors();
}

// Mark task as completed
function completeTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.isCompleted) {
        task.isCompleted = true;
        task.completedAt = new Date().toISOString();
        saveTasksToStorage();
        renderTasks();
    }
}

// Delete a task with undo option
function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        deletedTask = tasks.splice(taskIndex, 1)[0];
        saveTasksToStorage();
        renderTasks();
        showUndoSnackbar(`Task "${deletedTask.title}" deleted.`);
    }
}


// Render tasks based on filters and search
function renderTasks() {
    const searchTerm = searchInput.value.toLowerCase();
    const filter = filterPriority.value;
    const sort = sortBy.value;
    
    // Filter tasks
    let filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm) || task.description.toLowerCase().includes(searchTerm);
        const matchesFilter = filter === 'all' || task.priority === filter;
        return matchesSearch && matchesFilter;
    });
    
    // Sort tasks
    filteredTasks.sort((a, b) => {
        if (sort === 'created') {
            return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (sort === 'due') {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        } else if (sort === 'priority') {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return 0;
    });
    
    // Clear containers
    pendingTasksContainer.innerHTML = '';
    completedTasksContainer.innerHTML = '';
    
    // Render tasks
    filteredTasks.forEach(task => {
        const taskCard = createTaskCard(task);
        if (task.isCompleted) {
            completedTasksContainer.appendChild(taskCard);
        } else {
            pendingTasksContainer.appendChild(taskCard);
        }
    });
}

// Create a task card element
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card ${task.priority}`;
    
    // Check if due soon (within 24 hours)
    const now = new Date();
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    if (dueDate && !task.isCompleted && dueDate - now < 86400000 && dueDate > now) {
        card.classList.add('due-soon');
    }
    
    card.innerHTML = `
        <div class="task-title">${task.title}</div>
        <div class="task-description">${task.description}</div>
        <div class="task-meta">
            <span class="priority-chip ${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
            ${task.dueDate ? `<span class="due-chip">Due: ${formatDate(task.dueDate)}</span>` : ''}
            <span>Created: ${getRelativeTime(task.createdAt)}</span>
            ${task.completedAt ? `<span>Completed: ${formatDate(task.completedAt)}</span>` : ''}
        </div>
        <div class="task-actions">
            ${!task.isCompleted ? `<button class="btn-secondary" onclick="openEditModal(${task.id})" aria-label="Edit task">Edit</button>` : ''}
            ${!task.isCompleted ? `<button class="btn-primary" onclick="completeTask(${task.id})" aria-label="Mark task as complete">Complete</button>` : ''}
            <button class="btn-secondary" onclick="deleteTask(${task.id})" aria-label="Delete task">Delete</button>
        </div>
    `;
    
    return card;
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Get relative time (e.g., "2h ago")
function getRelativeTime(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
}

// Save tasks to localStorage
function saveTasksToStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Toggle theme
function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    applyTheme();
}

// Apply theme
function applyTheme() {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
}

// Export tasks to JSON
function exportTasks() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tasks-export.json';
    link.click();
    URL.revokeObjectURL(url);
}

// Import tasks from JSON
function importTasks(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedTasks = JSON.parse(e.target.result);
                tasks = importedTasks;
                saveTasksToStorage();
                renderTasks();
                alert('Tasks imported successfully!');
            } catch (error) {
                alert('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
    }
}

// Utility functions for errors
function showError(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

function clearErrors() {
    document.querySelectorAll('.error').forEach(el => el.textContent = '');
}

function clearEditErrors() {
    document.querySelectorAll('#edit-modal .error').forEach(el => el.textContent = '');
}
