// ==================== 存储键名 ====================
const STORAGE_KEYS = {
    TODO_LIST: 'smart-todo-list',
    POMODORO: 'pomodoro-timer',
    APP_STATE: 'app-workspace-state'
};

// ==================== 待办清单部分 ====================

const STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    DUE_SOON: 'due-soon',
    EXPIRED: 'expired',
    COMPLETED: 'completed'
};

const CATEGORIES = {
    work: { label: '工作', color: 'blue' },
    study: { label: '学习', color: 'green' },
    life: { label: '生活', color: 'purple' },
    other: { label: '其他', color: 'gray' }
};

const PRIORITIES = {
    high: { label: '高', order: 1 },
    medium: { label: '中', order: 2 },
    low: { label: '低', order: 3 }
};

function getTasks() {
    const stored = localStorage.getItem(STORAGE_KEYS.TODO_LIST);
    return stored ? JSON.parse(stored) : [];
}

function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEYS.TODO_LIST, JSON.stringify(tasks));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getTaskStatus(task) {
    if (task.completed) return STATUS.COMPLETED;
    if (task.status === STATUS.IN_PROGRESS) return STATUS.IN_PROGRESS;
    if (!task.dueDate) return STATUS.PENDING;
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 0) return STATUS.EXPIRED;
    if (diffHours <= 24) return STATUS.DUE_SOON;
    return STATUS.PENDING;
}

function getStatusLabel(status) {
    const labels = {
        [STATUS.PENDING]: '待处理',
        [STATUS.IN_PROGRESS]: '进行中',
        [STATUS.DUE_SOON]: '即将到期',
        [STATUS.EXPIRED]: '已过期',
        [STATUS.COMPLETED]: '已完成'
    };
    return labels[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr;
}

function getTodayCompletedCount(tasks) {
    const today = new Date().toDateString();
    return tasks.filter(task => {
        if (!task.completed || !task.completedAt) return false;
        return new Date(task.completedAt).toDateString() === today;
    }).length;
}

function getWeekCompletionRate(tasks) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    const weekTasks = tasks.filter(task => {
        const createdAt = new Date(task.createdAt);
        return createdAt >= startOfWeek && createdAt <= endOfWeek;
    });
    const completedWeekTasks = weekTasks.filter(task => task.completed);
    if (weekTasks.length === 0) return 0;
    return Math.round((completedWeekTasks.length / weekTasks.length) * 100);
}

function getPendingCount(tasks) {
    return tasks.filter(task => !task.completed && getTaskStatus(task) === STATUS.PENDING).length;
}

function getDueSoonCount(tasks) {
    return tasks.filter(task => !task.completed && getTaskStatus(task) === STATUS.DUE_SOON).length;
}

function getCategoryStats(tasks) {
    const stats = { work: 0, study: 0, life: 0, other: 0 };
    const total = tasks.length;
    if (total === 0) return { work: 0, study: 0, life: 0, other: 0 };
    tasks.forEach(task => { stats[task.category]++; });
    return {
        work: Math.round((stats.work / total) * 100),
        study: Math.round((stats.study / total) * 100),
        life: Math.round((stats.life / total) * 100),
        other: Math.round((stats.other / total) * 100)
    };
}

function renderStats(tasks) {
    document.getElementById('today-completed').textContent = getTodayCompletedCount(tasks);
    document.getElementById('week-completion').textContent = getWeekCompletionRate(tasks) + '%';
    document.getElementById('pending-count').textContent = getPendingCount(tasks);
    document.getElementById('due-soon-count').textContent = getDueSoonCount(tasks);
    const categoryStats = getCategoryStats(tasks);
    document.getElementById('cat-work').textContent = categoryStats.work + '%';
    document.getElementById('cat-study').textContent = categoryStats.study + '%';
    document.getElementById('cat-life').textContent = categoryStats.life + '%';
    document.getElementById('cat-other').textContent = categoryStats.other + '%';
}

function filterTasks(tasks, category, status) {
    return tasks.filter(task => {
        if (category !== 'all' && task.category !== category) return false;
        const taskStatus = getTaskStatus(task);
        if (status === 'all') return true;
        return taskStatus === status;
    });
}

function sortTasks(tasks, sortBy) {
    const sorted = [...tasks];
    switch (sortBy) {
        case 'created-desc': sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
        case 'created-asc': sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
        case 'priority': sorted.sort((a, b) => PRIORITIES[a.priority].order - PRIORITIES[b.priority].order); break;
        case 'due-date': sorted.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        }); break;
    }
    return sorted;
}

function createTaskCard(task) {
    const status = getTaskStatus(task);
    return `
        <div class="bg-white rounded-xl shadow-sm p-4 task-card ${task.completed ? 'task-completed' : ''}" data-id="${task.id}">
            <div class="flex items-start gap-4">
                <input type="checkbox" class="task-checkbox mt-1" ${task.completed ? 'checked' : ''}>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="task-title font-medium text-gray-800 truncate">${escapeHtml(task.title)}</h3>
                        <span class="status-${status} text-xs px-2 py-0.5 rounded-full">${getStatusLabel(status)}</span>
                        <span class="priority-${task.priority} text-xs px-2 py-0.5 rounded-full border">${PRIORITIES[task.priority].label}优先级</span>
                    </div>
                    ${task.description ? `<p class="task-description text-sm text-gray-500 mb-2">${escapeHtml(task.description)}</p>` : ''}
                    <div class="flex flex-wrap items-center gap-3 text-sm">
                        <span class="category-${task.category} px-2 py-0.5 rounded-full">${CATEGORIES[task.category].label}</span>
                        ${task.dueDate ? `<span class="due-date text-gray-500"><i class="fa fa-calendar"></i>${formatDate(task.dueDate)}${task.reminder ? `<i class="fa fa-bell ml-2"></i>${formatTime(task.reminder)}` : ''}</span>` : ''}
                        <span class="text-gray-400 text-xs">创建于 ${formatDate(task.createdAt)}</span>
                    </div>
                </div>
                <div class="task-actions flex flex-col gap-2">
                    <button class="edit-btn text-gray-400 hover:text-indigo-600 p-1" title="编辑"><i class="fa fa-pencil"></i></button>
                    <button class="delete-btn text-gray-400 hover:text-red-600 p-1" title="删除"><i class="fa fa-trash"></i></button>
                    ${!task.completed && status !== STATUS.IN_PROGRESS ? `<button class="start-btn text-gray-400 hover:text-blue-600 p-1" title="开始任务"><i class="fa fa-play"></i></button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderTaskList(tasks) {
    const container = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    const emptyTitle = document.getElementById('empty-title');
    const emptyDesc = document.getElementById('empty-desc');
    const category = document.getElementById('filter-category').value;
    const status = document.getElementById('filter-status').value;
    const sortBy = document.getElementById('sort-by').value;
    let filtered = filterTasks(tasks, category, status);
    filtered = sortTasks(filtered, sortBy);
    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        const hasFilter = category !== 'all' || status !== 'all';
        if (hasFilter) {
            emptyTitle.textContent = '没有找到匹配的任务';
            emptyDesc.textContent = '尝试调整筛选条件';
        } else {
            emptyTitle.textContent = '暂无任务';
            emptyDesc.textContent = '点击右上角添加你的第一个任务';
        }
    } else {
        emptyState.classList.add('hidden');
        container.innerHTML = filtered.map(createTaskCard).join('');
    }
}

function showModal(task = null) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('modal-title');
    if (task) {
        title.textContent = '编辑任务';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-category').value = task.category;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-due-date').value = task.dueDate || '';
        document.getElementById('task-reminder').value = task.reminder || '';
    } else {
        title.textContent = '添加任务';
        document.getElementById('task-form').reset();
        document.getElementById('task-id').value = '';
    }
    modal.classList.remove('hidden');
}

function hideModal() {
    document.getElementById('task-modal').classList.add('hidden');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    if (!title) { alert('请输入任务标题'); return; }
    if (title.length > 100) { alert('标题不能超过100个字符'); return; }
    if (description.length > 500) { alert('描述不能超过500个字符'); return; }
    const id = document.getElementById('task-id').value;
    const tasks = getTasks();
    const taskData = {
        title: title,
        description: description,
        category: document.getElementById('task-category').value,
        priority: document.getElementById('task-priority').value,
        dueDate: document.getElementById('task-due-date').value || null,
        reminder: document.getElementById('task-reminder').value || null
    };
    if (id) {
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) { tasks[index] = { ...tasks[index], ...taskData }; }
    } else {
        tasks.push({
            ...taskData,
            id: generateId(),
            createdAt: new Date().toISOString(),
            completed: false,
            completedAt: null,
            status: STATUS.PENDING
        });
    }
    saveTasks(tasks);
    hideModal();
    renderTasks();
}

let pendingDeleteId = null;

function showConfirmModal(id) {
    pendingDeleteId = id;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

function hideConfirmModal() {
    pendingDeleteId = null;
    document.getElementById('confirm-modal').classList.add('hidden');
}

function handleDelete(id) { showConfirmModal(id); }

function confirmDelete() {
    if (pendingDeleteId) {
        const tasks = getTasks().filter(t => t.id !== pendingDeleteId);
        saveTasks(tasks);
        renderTasks();
    }
    hideConfirmModal();
}

function handleToggleComplete(id) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        saveTasks(tasks);
        renderTasks();
    }
}

function handleStartTask(id) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = STATUS.IN_PROGRESS;
        saveTasks(tasks);
        renderTasks();
    }
}

function handleEdit(id) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) { showModal(task); }
}

function renderTasks() {
    const tasks = getTasks();
    renderStats(tasks);
    renderTaskList(tasks);
}

// ==================== 工作台 Tab 导航 ====================
let currentTool = 'todo';

function switchTool(tool) {
    if (tool === currentTool) return;
    currentTool = tool;
    saveAppState();
    const tabTodo = document.getElementById('tab-todo');
    const tabPomodoro = document.getElementById('tab-pomodoro');
    if (tool === 'todo') {
        tabTodo.classList.add('active');
        tabPomodoro.classList.remove('active');
        document.getElementById('todo-panel').classList.remove('hidden');
        document.getElementById('pomodoro-panel').classList.add('hidden');
        document.getElementById('add-task-btn').classList.remove('hidden');
    } else {
        tabTodo.classList.remove('active');
        tabPomodoro.classList.add('active');
        document.getElementById('todo-panel').classList.add('hidden');
        document.getElementById('pomodoro-panel').classList.remove('hidden');
        document.getElementById('add-task-btn').classList.add('hidden');
        renderPomodoroStats();
        renderPomodoroHistory();
    }
}

function saveAppState() {
    const state = { currentTool: currentTool };
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(state));
}

function loadAppState() {
    const stored = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (stored) {
        const state = JSON.parse(stored);
        currentTool = state.currentTool || 'todo';
    }
}

// ==================== 专注番茄钟部分 ====================
const POMODORO_STATES = {
    IDLE: 'idle',
    FOCUSING: 'focusing',
    PAUSED: 'paused',
    BREAKING: 'breaking'
};

const POMODORO_CONFIG = {
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    focusRingColor: '#3b82f6',
    breakRingColor: '#10b981',
    pauseRingColor: '#f59e0b'
};

let pomodoroData = {
    state: POMODORO_STATES.IDLE,
    duration: 25,
    timeLeft: 25 * 60,
    focusCount: 0,
    todayDuration: 0,
    totalCount: 0,
    totalDuration: 0,
    isSoundEnabled: true,
    history: []
};

let timerInterval = null;

function initPomodoro() {
    loadPomodoroData();
    renderPomodoroStats();
    renderPomodoroHistory();
    updateTimerDisplay();
    bindPomodoroEvents();
}

function loadPomodoroData() {
    const stored = localStorage.getItem(STORAGE_KEYS.POMODORO);
    if (stored) {
        const data = JSON.parse(stored);
        pomodoroData = { ...pomodoroData, ...data };
        pomodoroData.state = POMODORO_STATES.IDLE;
        pomodoroData.timeLeft = pomodoroData.duration * 60;
        updateDurationButtons();
        updateSoundToggle();
    }
}

function savePomodoroData() {
    try {
        localStorage.setItem(STORAGE_KEYS.POMODORO, JSON.stringify(pomodoroData));
    } catch (error) {
        console.error('保存番茄钟数据失败:', error);
    }
}

function bindPomodoroEvents() {
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const duration = parseInt(e.target.dataset.duration);
            setFocusDuration(duration);
        });
    });
    document.getElementById('start-btn').addEventListener('click', handleStartPause);
    document.getElementById('reset-btn').addEventListener('click', handleReset);
    document.getElementById('sound-toggle').addEventListener('change', (e) => {
        pomodoroData.isSoundEnabled = e.target.checked;
        updateSoundToggle();
        savePomodoroData();
    });
    document.getElementById('view-all-history').addEventListener('click', showAllHistory);
    document.getElementById('close-history-modal').addEventListener('click', hideHistoryModal);
    document.getElementById('history-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('history-modal')) { hideHistoryModal(); }
    });
}

function setFocusDuration(duration) {
    if (pomodoroData.state !== POMODORO_STATES.IDLE) return;
    pomodoroData.duration = duration;
    pomodoroData.timeLeft = duration * 60;
    updateDurationButtons();
    updateTimerDisplay();
    savePomodoroData();
}

function updateDurationButtons() {
    document.querySelectorAll('.duration-btn').forEach(btn => {
        const duration = parseInt(btn.dataset.duration);
        if (duration === pomodoroData.duration) { btn.classList.add('active'); }
        else { btn.classList.remove('active'); }
    });
}

function updateSoundToggle() {
    const soundToggle = document.getElementById('sound-toggle');
    const soundSwitch = document.getElementById('sound-switch');
    const soundKnob = document.getElementById('sound-knob');
    soundToggle.checked = pomodoroData.isSoundEnabled;
    if (pomodoroData.isSoundEnabled) {
        soundSwitch.classList.add('bg-indigo-600');
        soundSwitch.classList.remove('bg-gray-300');
        soundKnob.classList.add('translate-x-4');
        soundKnob.classList.remove('translate-x-0');
    } else {
        soundSwitch.classList.remove('bg-indigo-600');
        soundSwitch.classList.add('bg-gray-300');
        soundKnob.classList.remove('translate-x-4');
        soundKnob.classList.add('translate-x-0');
    }
}

function handleStartPause() {
    if (pomodoroData.state === POMODORO_STATES.IDLE) { startFocus(); }
    else if (pomodoroData.state === POMODORO_STATES.FOCUSING) { pauseTimer(); }
    else if (pomodoroData.state === POMODORO_STATES.PAUSED) { resumeTimer(); }
    else if (pomodoroData.state === POMODORO_STATES.BREAKING) { skipBreak(); }
}

function startFocus() {
    pomodoroData.state = POMODORO_STATES.FOCUSING;
    startTimer();
    updateTimerDisplay();
    updateButtonState();
    playSound('start');
}

function pauseTimer() {
    pomodoroData.state = POMODORO_STATES.PAUSED;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    updateTimerDisplay();
    updateButtonState();
}

function resumeTimer() {
    pomodoroData.state = POMODORO_STATES.FOCUSING;
    startTimer();
    updateTimerDisplay();
    updateButtonState();
}

function handleReset() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    pomodoroData.state = POMODORO_STATES.IDLE;
    pomodoroData.timeLeft = pomodoroData.duration * 60;
    updateTimerDisplay();
    updateButtonState();
    updateProgressRing(1.0);
}

function startTimer() {
    if (timerInterval) { clearInterval(timerInterval); }
    timerInterval = setInterval(() => {
        pomodoroData.timeLeft--;
        if (pomodoroData.timeLeft <= 0) { handleTimerComplete(); }
        updateTimerDisplay();
    }, 1000);
}

function handleTimerComplete() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (pomodoroData.state === POMODORO_STATES.FOCUSING) {
        const duration = pomodoroData.duration;
        pomodoroData.focusCount++;
        pomodoroData.todayDuration += duration;
        pomodoroData.totalCount++;
        pomodoroData.totalDuration += duration;
        addFocusHistory(duration, true);
        playSound('complete');
        showNotification('专注完成！', '该休息一下了');
        if (pomodoroData.focusCount % POMODORO_CONFIG.longBreakInterval === 0) { startBreak(POMODORO_CONFIG.longBreakDuration); }
        else { startBreak(POMODORO_CONFIG.shortBreakDuration); }
        savePomodoroData();
        renderPomodoroStats();
        renderPomodoroHistory();
    } else if (pomodoroData.state === POMODORO_STATES.BREAKING) {
        pomodoroData.state = POMODORO_STATES.IDLE;
        pomodoroData.timeLeft = pomodoroData.duration * 60;
        playSound('breakComplete');
        showNotification('休息结束！', '准备开始下一个专注周期');
        updateTimerDisplay();
        updateButtonState();
        updateProgressRing(1.0);
        savePomodoroData();
    }
}

function startBreak(duration) {
    pomodoroData.state = POMODORO_STATES.BREAKING;
    pomodoroData.timeLeft = duration * 60;
    updateTimerDisplay();
    updateButtonState();
    startTimer();
}

function skipBreak() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    pomodoroData.state = POMODORO_STATES.IDLE;
    pomodoroData.timeLeft = pomodoroData.duration * 60;
    updateTimerDisplay();
    updateButtonState();
    updateProgressRing(1.0);
}

function addFocusHistory(duration, completed) {
    const history = {
        id: generateId(),
        startTime: new Date().toISOString(),
        duration: duration,
        completed: completed
    };
    pomodoroData.history.unshift(history);
    if (pomodoroData.history.length > 100) { pomodoroData.history = pomodoroData.history.slice(0, 100); }
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    const status = document.getElementById('timer-status');
    const focusCount = document.getElementById('focus-count');
    const progressRing = document.getElementById('progress-ring');
    const minutes = Math.floor(pomodoroData.timeLeft / 60);
    const seconds = pomodoroData.timeLeft % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const stateLabels = {
        [POMODORO_STATES.IDLE]: '准备开始',
        [POMODORO_STATES.FOCUSING]: '专注中',
        [POMODORO_STATES.PAUSED]: '已暂停',
        [POMODORO_STATES.BREAKING]: '休息中'
    };
    status.textContent = stateLabels[pomodoroData.state];
    const nextCount = pomodoroData.focusCount + 1;
    focusCount.textContent = `第 ${nextCount} 个番茄`;
    let totalTime;
    if (pomodoroData.state === POMODORO_STATES.BREAKING) {
        const breakDuration = pomodoroData.timeLeft > POMODORO_CONFIG.longBreakDuration * 60 ? POMODORO_CONFIG.longBreakDuration : POMODORO_CONFIG.shortBreakDuration;
        totalTime = breakDuration * 60;
    } else { totalTime = pomodoroData.duration * 60; }
    const progress = pomodoroData.timeLeft / totalTime;
    updateProgressRing(progress);
    if (pomodoroData.state === POMODORO_STATES.BREAKING) { progressRing.setAttribute('stroke', POMODORO_CONFIG.breakRingColor); }
    else if (pomodoroData.state === POMODORO_STATES.PAUSED) { progressRing.setAttribute('stroke', POMODORO_CONFIG.pauseRingColor); }
    else { progressRing.setAttribute('stroke', POMODORO_CONFIG.focusRingColor); }
}

function updateProgressRing(progress) {
    const progressRing = document.getElementById('progress-ring');
    const circumference = 2 * Math.PI * 110;
    const offset = circumference * (1 - progress);
    progressRing.style.strokeDashoffset = offset;
}

function updateButtonState() {
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const buttonLabels = {
        [POMODORO_STATES.IDLE]: { text: '开始专注', icon: 'fa-play' },
        [POMODORO_STATES.FOCUSING]: { text: '暂停', icon: 'fa-pause' },
        [PODORO_STATES.PAUSED]: { text: '继续', icon: 'fa-play' },
        [POMODORO_STATES.BREAKING]: { text: '跳过休息', icon: 'fa-forward' }
    };
    const config = buttonLabels[pomodoroData.state];
    startBtn.innerHTML = `<i class="fa ${config.icon} mr-2"></i>${config.text}`;
    if (pomodoroData.state === POMODORO_STATES.IDLE) { resetBtn.classList.add('hidden'); }
    else { resetBtn.classList.remove('hidden'); }
}

function renderPomodoroStats() {
    const weekStats = calculateWeekStats();
    document.getElementById('today-focus-count').textContent = pomodoroData.focusCount;
    document.getElementById('today-focus-duration').textContent = `${pomodoroData.todayDuration}分钟`;
    document.getElementById('week-focus-count').textContent = weekStats.count;
    document.getElementById('week-focus-duration').textContent = `${weekStats.duration}分钟`;
    document.getElementById('total-focus-count').textContent = pomodoroData.totalCount;
    document.getElementById('total-focus-duration').textContent = `${pomodoroData.totalDuration}分钟`;
}

function calculateWeekStats() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    let count = 0;
    let duration = 0;
    pomodoroData.history.forEach(record => {
        const recordDate = new Date(record.startTime);
        if (recordDate >= startOfWeek && record.completed) {
            count++;
            duration += record.duration;
        }
    });
    return { count, duration };
}

function renderPomodoroHistory() {
    const container = document.getElementById('history-list');
    if (pomodoroData.history.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">暂无专注记录，开始你的第一次专注吧！</p>';
        return;
    }
    const recentHistory = pomodoroData.history.slice(0, 5);
    container.innerHTML = recentHistory.map(record => {
        const date = new Date(record.startTime);
        const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const statusIcon = record.completed ? '<i class="fa fa-check-circle text-green-500"></i>' : '<i class="fa fa-times-circle text-red-500"></i>';
        const statusText = record.completed ? '已完成' : '已中断';
        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                    <i class="fa fa-clock-o text-indigo-600"></i>
                    <span class="text-sm font-medium text-gray-700">${timeStr}</span>
                    <span class="text-sm text-gray-500">${record.duration}分钟</span>
                </div>
                <div class="flex items-center gap-2">
                    ${statusIcon}
                    <span class="text-xs ${record.completed ? 'text-green-600' : 'text-red-600'}">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');
}

function showAllHistory() {
    const modal = document.getElementById('history-modal');
    const content = document.getElementById('history-modal-content');
    if (pomodoroData.history.length === 0) {
        content.innerHTML = '<p class="text-gray-400 text-center py-8">暂无专注记录</p>';
    } else {
        content.innerHTML = pomodoroData.history.map(record => {
            const date = new Date(record.startTime);
            const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            const statusIcon = record.completed ? '<i class="fa fa-check-circle text-green-500"></i>' : '<i class="fa fa-times-circle text-red-500"></i>';
            const statusText = record.completed ? '已完成' : '已中断';
            return `
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-2">
                    <div class="flex items-center gap-3">
                        <div class="text-center">
                            <div class="text-sm font-medium text-gray-800">${dateStr}</div>
                            <div class="text-xs text-gray-500">${timeStr}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-sm font-medium text-gray-700">${record.duration}分钟</span>
                        <div class="flex items-center gap-2">
                            ${statusIcon}
                            <span class="text-xs ${record.completed ? 'text-green-600' : 'text-red-600'}">${statusText}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    modal.classList.remove('hidden');
}

function hideHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
}

function playSound(type) {
    if (!pomodoroData.isSoundEnabled) return;
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        if (type === 'start') {
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.3;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } else if (type === 'complete') {
            oscillator.frequency.value = 1000;
            gainNode.gain.value = 0.4;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.15);
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.frequency.value = 1200;
                gain2.gain.value = 0.4;
                osc2.start();
                osc2.stop(audioContext.currentTime + 0.15);
            }, 200);
        } else if (type === 'breakComplete') {
            oscillator.frequency.value = 600;
            gainNode.gain.value = 0.3;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        }
    } catch (error) {
        console.error('播放提示音失败:', error);
    }
}

function showNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        new Notification(title, { body: body });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') { new Notification(title, { body: body }); }
        });
    }
}

// ==================== 初始化 ====================
function initTodoEventListeners() {
    document.getElementById('add-task-btn').addEventListener('click', () => showModal());
    document.getElementById('close-modal').addEventListener('click', hideModal);
    document.getElementById('cancel-btn').addEventListener('click', hideModal);
    document.getElementById('task-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('task-modal')) { hideModal(); }
    });
    document.getElementById('task-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('filter-category').addEventListener('change', renderTasks);
    document.getElementById('filter-status').addEventListener('change', renderTasks);
    document.getElementById('sort-by').addEventListener('change', renderTasks);
    document.getElementById('task-list').addEventListener('change', (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            const id = e.target.closest('.task-card').dataset.id;
            handleToggleComplete(id);
        }
    });
    document.getElementById('task-list').addEventListener('click', (e) => {
        const card = e.target.closest('.task-card');
        if (!card) return;
        const id = card.dataset.id;
        if (e.target.closest('.delete-btn')) { handleDelete(id); }
        else if (e.target.closest('.edit-btn')) { handleEdit(id); }
        else if (e.target.closest('.start-btn')) { handleStartTask(id); }
    });
    document.getElementById('confirm-cancel').addEventListener('click', hideConfirmModal);
    document.getElementById('confirm-ok').addEventListener('click', confirmDelete);
    document.getElementById('confirm-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('confirm-modal')) { hideConfirmModal(); }
    });
}

function initTabNavigation() {
    document.getElementById('tab-todo').addEventListener('click', () => switchTool('todo'));
    document.getElementById('tab-pomodoro').addEventListener('click', () => switchTool('pomodoro'));
}

function initApp() {
    loadAppState();
    const tasks = getTasks();
    if (tasks.length === 0) {
        const sampleTasks = [
            {
                id: generateId(),
                title: '完成项目报告',
                description: '整理Q1季度的项目进展和成果报告',
                category: 'work',
                priority: 'high',
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reminder: '09:00',
                createdAt: new Date().toISOString(),
                completed: false,
                completedAt: null,
                status: STATUS.PENDING
            },
            {
                id: generateId(),
                title: '学习TypeScript',
                description: '完成TypeScript基础语法学习',
                category: 'study',
                priority: 'medium',
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reminder: null,
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                completed: false,
                completedAt: null,
                status: STATUS.IN_PROGRESS
            },
            {
                id: generateId(),
                title: '购买生活用品',
                description: '购买牛奶、面包、鸡蛋等日常用品',
                category: 'life',
                priority: 'low',
                dueDate: null,
                reminder: null,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                completed: true,
                completedAt: new Date().toISOString(),
                status: STATUS.COMPLETED
            }
        ];
        saveTasks(sampleTasks);
    }
    renderTasks();
    initTodoEventListeners();
    initPomodoro();
    initTabNavigation();
    switchTool(currentTool);
}

document.addEventListener('DOMContentLoaded', initApp);