// Data Storage Manager
class DataManager {
    constructor() {
        this.STORAGE_KEYS = {
            CALENDAR_DATA: 'dailyTracker_calendarData',
            WEEKLY_TEMPLATE: 'dailyTracker_weeklyTemplate',
            APP_STATE: 'dailyTracker_appState'
        };
    }

    // Save data to localStorage
    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    // Load data from localStorage
    loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    }

    // Get calendar data for a specific date
    getDateData(dateKey) {
        const calendarData = this.loadData(this.STORAGE_KEYS.CALENDAR_DATA) || {};
        return calendarData[dateKey] || this.getDefaultDateData();
    }

    // Save calendar data for a specific date
    saveDateData(dateKey, data) {
        const calendarData = this.loadData(this.STORAGE_KEYS.CALENDAR_DATA) || {};
        calendarData[dateKey] = data;
        this.saveData(this.STORAGE_KEYS.CALENDAR_DATA, calendarData);
    }

    // Get weekly template
    getWeeklyTemplate() {
        return this.loadData(this.STORAGE_KEYS.WEEKLY_TEMPLATE) || this.getDefaultWeeklyTemplate();
    }

    // Save weekly template
    saveWeeklyTemplate(template) {
        this.saveData(this.STORAGE_KEYS.WEEKLY_TEMPLATE, template);
    }

    // Get app state
    getAppState() {
        return this.loadData(this.STORAGE_KEYS.APP_STATE) || {
            currentDate: new Date().toISOString().split('T')[0],
            selectedDate: new Date().toISOString().split('T')[0],
            currentMode: 'time'
        };
    }

    // Save app state
    saveAppState(state) {
        this.saveData(this.STORAGE_KEYS.APP_STATE, state);
    }

    // Get default date data
    getDefaultDateData() {
        return {
            mode: 'time',
            tasks: [],
            status: 'pending' // pending, partial, completed
        };
    }

    // Get default weekly template
    getDefaultWeeklyTemplate() {
        return {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
        };
    }
}

// Calendar Manager
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.dataManager = new DataManager();
    }

    // Initialize calendar
    init() {
        this.renderCalendar();
        this.updateSelectedDate(new Date());
    }

    // Render calendar for current month
    renderCalendar() {
        const calendarEl = document.getElementById('calendar');
        const monthYearEl = document.getElementById('currentMonth');
        
        // Clear existing calendar
        calendarEl.innerHTML = '';
        
        // Set month/year header
        monthYearEl.textContent = this.currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        // Add day headers
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day-header';
            dayEl.textContent = day;
            calendarEl.appendChild(dayEl);
        });

        // Get first day of month and total days
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const todayKey = today.toISOString().split('T')[0];

        // Add empty cells for days before first day of month
        for (let i = 0; i < firstDay; i++) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'calendar-day empty';
            calendarEl.appendChild(emptyEl);
        }

        // Add day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = date.toISOString().split('T')[0];
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;
            dayEl.dataset.date = dateKey;

            // Check if it's today
            if (dateKey === todayKey) {
                dayEl.classList.add('today');
            }

            // Check if it's selected
            if (this.selectedDate && dateKey === this.selectedDate.toISOString().split('T')[0]) {
                dayEl.classList.add('selected');
            }

            // Add status indicator
            const dateData = this.dataManager.getDateData(dateKey);
            const statusEl = document.createElement('div');
            statusEl.className = `status-indicator status-${dateData.status || 'pending'}`;
            dayEl.appendChild(statusEl);

            // Add click event
            dayEl.addEventListener('click', () => {
                this.updateSelectedDate(date);
                this.updateCalendarSelection();
                // Update tasks view
                window.taskManager.loadTasks(dateKey);
            });

            calendarEl.appendChild(dayEl);
        }
    }

    // Update selected date
    updateSelectedDate(date) {
        this.selectedDate = date;
        this.dataManager.saveAppState({
            selectedDate: date.toISOString().split('T')[0],
            currentDate: this.currentDate.toISOString().split('T')[0]
        });
        
        // Update selected date display
        document.getElementById('selectedDate').textContent = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Update calendar selection
    updateCalendarSelection() {
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
            if (day.dataset.date === this.selectedDate.toISOString().split('T')[0]) {
                day.classList.add('selected');
            }
        });
    }

    // Navigate to previous month
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    // Navigate to next month
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    // Go to today
    goToToday() {
        this.currentDate = new Date();
        this.updateSelectedDate(new Date());
        this.renderCalendar();
        window.taskManager.loadTasks(new Date().toISOString().split('T')[0]);
    }
}

// Task Manager
class TaskManager {
    constructor() {
        this.dataManager = new DataManager();
        this.currentMode = 'time';
        this.currentDateKey = null;
        this.currentTaskIndex = null;
        this.currentTaskType = null;
    }

    // Initialize task manager
    init() {
        // Load app state
        const appState = this.dataManager.getAppState();
        this.currentMode = appState.currentMode || 'time';
        
        // Set mode buttons
        this.updateModeButtons();
        
        // Add event listeners
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Mode switching
        document.getElementById('modeA').addEventListener('click', () => this.switchMode('time'));
        document.getElementById('modeB').addEventListener('click', () => this.switchMode('simple'));

        // Add task buttons
        document.getElementById('addTimeTask').addEventListener('click', () => this.addTimeTask());
        document.getElementById('addSimpleTask').addEventListener('click', () => this.addSimpleTask());

        // Reason modal
        document.getElementById('saveReason').addEventListener('click', () => this.saveReason());
        document.getElementById('cancelReason').addEventListener('click', () => this.closeReasonModal());
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.classList.remove('active');
            });
        });
    }

    // Switch between time and simple modes
    switchMode(mode) {
        this.currentMode = mode;
        this.dataManager.saveAppState({ currentMode: mode });
        
        // Update UI
        this.updateModeButtons();
        
        // Save current mode to date data if we have a date selected
        if (this.currentDateKey) {
            const dateData = this.dataManager.getDateData(this.currentDateKey);
            dateData.mode = mode;
            this.dataManager.saveDateData(this.currentDateKey, dateData);
            
            // Reload tasks for the current mode
            this.loadTasks(this.currentDateKey);
        }
    }

    // Update mode buttons UI
    updateModeButtons() {
        const modeA = document.getElementById('modeA');
        const modeB = document.getElementById('modeB');
        const modeAContent = document.getElementById('modeAContent');
        const modeBContent = document.getElementById('modeBContent');

        if (this.currentMode === 'time') {
            modeA.classList.add('active');
            modeB.classList.remove('active');
            modeAContent.classList.add('active');
            modeBContent.classList.remove('active');
        } else {
            modeA.classList.remove('active');
            modeB.classList.add('active');
            modeAContent.classList.remove('active');
            modeBContent.classList.add('active');
        }
    }

    // Load tasks for a specific date
    loadTasks(dateKey) {
        this.currentDateKey = dateKey;
        const dateData = this.dataManager.getDateData(dateKey);
        
        // Update mode if different
        if (dateData.mode && dateData.mode !== this.currentMode) {
            this.switchMode(dateData.mode);
        }
        
        // Load tasks based on mode
        if (this.currentMode === 'time') {
            this.loadTimeTasks(dateData.tasks || []);
        } else {
            this.loadSimpleTasks(dateData.tasks || []);
        }
        
        // Update status counts
        this.updateStatusCounts(dateData.tasks || []);
    }

    // Load time-based tasks
    loadTimeTasks(tasks) {
        const container = document.getElementById('timeTasksList');
        container.innerHTML = '';

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <p>No time-based tasks scheduled</p>
                </div>
            `;
            return;
        }

        tasks.forEach((task, index) => {
            const taskEl = this.createTimeTaskElement(task, index);
            container.appendChild(taskEl);
        });
    }

    // Load simple tasks
    loadSimpleTasks(tasks) {
        const container = document.getElementById('simpleTasksList');
        container.innerHTML = '';

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list"></i>
                    <p>No simple tasks added</p>
                </div>
            `;
            return;
        }

        tasks.forEach((task, index) => {
            const taskEl = this.createSimpleTaskElement(task, index);
            container.appendChild(taskEl);
        });
    }

    // Create time task element
    createTimeTaskElement(task, index) {
        const div = document.createElement('div');
        div.className = `task-item ${task.completed ? 'completed' : task.incomplete ? 'incomplete' : ''}`;
        div.dataset.index = index;
        
        div.innerHTML = `
            <div class="task-header">
                <div class="time-slot">
                    <input type="time" class="start-time" value="${task.startTime || '09:00'}">
                    <i class="fas fa-arrow-right"></i>
                    <input type="time" class="end-time" value="${task.endTime || '10:00'}">
                </div>
                <div class="task-actions">
                    ${!task.completed && !task.incomplete ? `
                        <button class="action-btn complete-btn" data-action="complete">
                            <i class="fas fa-check"></i> Done
                        </button>
                        <button class="action-btn incomplete-btn" data-action="incomplete">
                            <i class="fas fa-times"></i> Missed
                        </button>
                    ` : ''}
                    <button class="action-btn edit-btn" data-action="edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-action="delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="task-content">
                ${task.editing ? `
                    <input type="text" class="task-title-input" value="${task.title || ''}" placeholder="Enter task title">
                ` : `
                    <div class="task-title">${task.title || 'Untitled Task'}</div>
                `}
                ${task.reason ? `
                    <div class="reason-display">
                        <div class="reason-label">Reason for missing:</div>
                        <div class="reason-text">${task.reason}</div>
                    </div>
                ` : ''}
            </div>
        `;

        // Add event listeners
        this.addTaskEventListeners(div, index, 'time');
        
        return div;
    }

    // Create simple task element
    createSimpleTaskElement(task, index) {
        const div = document.createElement('div');
        div.className = `simple-task ${task.completed ? 'completed' : task.incomplete ? 'incomplete' : ''}`;
        div.dataset.index = index;
        
        div.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} class="task-checkbox">
            ${task.editing ? `
                <input type="text" class="task-title-input" value="${task.title || ''}" placeholder="Enter task">
            ` : `
                <span class="task-title">${task.title || 'Untitled Task'}</span>
            `}
            <div class="task-actions">
                ${!task.completed && !task.incomplete ? `
                    <button class="action-btn incomplete-btn" data-action="incomplete">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
                <button class="action-btn edit-btn" data-action="edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-action="delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            ${task.reason ? `
                <div class="reason-display">
                    <div class="reason-label">Reason:</div>
                    <div class="reason-text">${task.reason}</div>
                </div>
            ` : ''}
        `;

        // Add event listeners
        this.addTaskEventListeners(div, index, 'simple');
        
        return div;
    }

    // Add event listeners to task elements
    addTaskEventListeners(taskElement, index, type) {
        // Complete button
        const completeBtn = taskElement.querySelector('[data-action="complete"]');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => {
                this.markTaskComplete(index, type);
            });
        }

        // Incomplete button
        const incompleteBtn = taskElement.querySelector('[data-action="incomplete"]');
        if (incompleteBtn) {
            incompleteBtn.addEventListener('click', () => {
                this.openReasonModal(index, type);
            });
        }

        // Edit button
        const editBtn = taskElement.querySelector('[data-action="edit"]');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.toggleTaskEdit(index, type);
            });
        }

        // Delete button
        const deleteBtn = taskElement.querySelector('[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this task?')) {
                    this.deleteTask(index, type);
                }
            });
        }

        // Checkbox for simple tasks
        const checkbox = taskElement.querySelector('.task-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                this.markTaskComplete(index, type, e.target.checked);
            });
        }

        // Title input
        const titleInput = taskElement.querySelector('.task-title-input');
        if (titleInput) {
            titleInput.addEventListener('blur', (e) => {
                this.saveTaskTitle(index, type, e.target.value);
            });
            titleInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveTaskTitle(index, type, e.target.value);
                }
            });
        }

        // Time inputs for time tasks
        const startTime = taskElement.querySelector('.start-time');
        const endTime = taskElement.querySelector('.end-time');
        if (startTime && endTime) {
            startTime.addEventListener('change', () => {
                this.saveTaskTime(index, type, 'start', startTime.value);
            });
            endTime.addEventListener('change', () => {
                this.saveTaskTime(index, type, 'end', endTime.value);
            });
        }
    }

    // Add a new time task
    addTimeTask() {
        if (!this.currentDateKey) return;
        
        const dateData = this.dataManager.getDateData(this.currentDateKey);
        const tasks = dateData.tasks || [];
        
        const newTask = {
            id: Date.now(),
            title: 'New Task',
            startTime: '09:00',
            endTime: '10:00',
            completed: false,
            incomplete: false,
            editing: true
        };
        
        tasks.push(newTask);
        dateData.tasks = tasks;
        this.dataManager.saveDateData(this.currentDateKey, dateData);
        this.loadTasks(this.currentDateKey);
    }

    // Add a new simple task
    addSimpleTask() {
        if (!this.currentDateKey) return;
        
        const dateData = this.dataManager.getDateData(this.currentDateKey);
        const tasks = dateData.tasks || [];
        
        const newTask = {
            id: Date.now(),
            title: 'New Task',
            completed: false,
            incomplete: false,
            editing: true
        };
        
        tasks.push(newTask);
        dateData.tasks = tasks;
        this.dataManager.saveDateData(this.currentDateKey, dateData);
        this.loadTasks(this.currentDateKey);
    }

    // Mark task as complete
    markTaskComplete(index, type, completed = true) {
        if (!this.currentDateKey) return;
        
        const dateData = this.dataManager.getDateData(this.currentDateKey);
        const tasks = dateData.tasks || [];
        
        if (tasks[index]) {
            tasks[index].completed = completed;
            tasks[index].incomplete = !completed;
            tasks[index].editing = false;
            
            if (!completed) {
                tasks[index].reason = '';
            }
            
            dateData.tasks = tasks;
            this.updateDateStatus(dateData);
            this.dataManager.saveDateData(this.currentDateKey, dateData);
            this.loadTasks(this.currentDateKey);
            window.calendarManager.renderCalendar();
        }
    }

    // Open reason modal
    openReasonModal(index, type) {
        this.currentTaskIndex = index;
        this.currentTaskType = type;
        document.getElementById('reasonModal').classList.add('active');
        document.getElementById('reasonInput').value = '';
        document.getElementById('reasonInput').focus();
    }

    // Close reason modal
    closeReasonModal() {
        document.getElementById('reasonModal').classList.remove('active');
        this.currentTaskIndex = null;
        this.currentTaskType = null;
    }

    // Save reason for incomplete task
    saveReason() {
        const reason = document.getElementById('reasonInput').value.trim();
        if (!reason) {
            alert('Please enter a reason before marking as incomplete.');
            return;
        }

        if (this.currentTaskIndex !== null && this.currentDateKey) {
            const dateData = this.dataManager.getDateData(this.currentDateKey);
            const tasks = dateData.tasks || [];
            
            if (tasks[this.currentTaskIndex]) {
                tasks[this.currentTaskIndex].completed = false;
                tasks[this.currentTaskIndex].incomplete = true;
                tasks[this.currentTaskIndex].reason = reason;
                tasks[this.currentTaskIndex].editing = false;
                
                dateData.tasks = tasks;
                this.updateDateStatus(dateData);
                this.dataManager.saveDateData(this.currentDateKey, dateData);
                this.loadTasks(this.currentDateKey);
                window.calendarManager.renderCalendar();
            }
        }

        this.closeReasonModal();
    }

    // Toggle task edit mode
    toggleTaskEdit(index, type) {
        if (!this.currentDateKey) return;
        
        const dateData = this.dataManager.getDateData(this.currentDateKey);
        const tasks = dateData.tasks || [];
        
        if (tasks[index]) {
            tasks[index].editing = !tasks[index].editing;
            dateData.tasks = tasks;
            this.dataManager.saveDateData(this.currentDateKey, dateData);
            this.loadTasks(this.currentDateKey);
        }
    }

    // Save task title
    saveTaskTitle(index, type, title) {
        if (!this.currentDateKey) return;
        
        const dateData = this.dataManager.getDateData(this.currentDateKey);
        const tasks = dateData.tasks || [];
        
        if (tasks[index]) {
            tasks[index].title = title.trim() || 'Untitled Task';
            tasks[index].editing = false;
            dateData.tasks = tasks;
            this.dataManager.saveDateData(this.currentDateKey, dateData);
            this.loadTasks(this.currentDateKey);
        }
    }

    // Save task time
    saveTaskTime(index, type, timeType, timeValue) {
        if (!this.currentDateKey) return;
        
        const dateData = this.dataManager.getDateData(this.currentDateKey);
        const tasks = dateData.tasks || [];
        
        if (tasks[index]) {
            if (timeType === 'start') {
                tasks[index].startTime = timeValue;
            } else {
                tasks[index].endTime = timeValue;
            }
            dateData.tasks = tasks;
            this.dataManager.saveDateData(this.currentDateKey, dateData);
        }
    }

    // Delete task
    deleteTask(index, type) {
        if (!this.currentDateKey) return;
        
        const dateData = this.dataManager.getDateData(this.currentDateKey);
        let tasks = dateData.tasks || [];
        
        tasks = tasks.filter((_, i) => i !== index);
        dateData.tasks = tasks;
        this.updateDateStatus(dateData);
        this.dataManager.saveDateData(this.currentDateKey, dateData);
        this.loadTasks(this.currentDateKey);
        window.calendarManager.renderCalendar();
    }

    // Update status counts
    updateStatusCounts(tasks) {
        const completed = tasks.filter(t => t.completed).length;
        const incomplete = tasks.filter(t => t.incomplete).length;
        const pending = tasks.filter(t => !t.completed && !t.incomplete).length;
        
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('incompleteCount').textContent = incomplete;
        document.getElementById('pendingCount').textContent = pending;
    }

    // Update date status based on tasks
    updateDateStatus(dateData) {
        const tasks = dateData.tasks || [];
        
        if (tasks.length === 0) {
            dateData.status = 'pending';
            return;
        }
        
        const completed = tasks.filter(t => t.completed).length;
        const incomplete = tasks.filter(t => t.incomplete).length;
        
        if (incomplete === tasks.length) {
            dateData.status = 'missed';
        } else if (completed === tasks.length) {
            dateData.status = 'completed';
        } else {
            dateData.status = 'partial';
        }
    }
}

// Weekly Template Manager
class TemplateManager {
    constructor() {
        this.dataManager = new DataManager();
        this.currentTemplate = null;
    }

    // Initialize template manager
    init() {
        this.loadTemplate();
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Template button
        document.getElementById('templateBtn').addEventListener('click', () => {
            this.openTemplateModal();
        });

        // Template modal buttons
        document.getElementById('saveTemplate').addEventListener('click', () => {
            this.saveCurrentTemplate();
        });

        document.getElementById('applyTemplate').addEventListener('click', () => {
            this.applyTemplateToWeek();
        });

        document.getElementById('clearTemplate').addEventListener('click', () => {
            if (confirm('Clear the entire weekly template?')) {
                this.clearTemplate();
            }
        });

        // Week day selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('week-day')) {
                const day = e.target.dataset.day;
                this.openDayTemplateEditor(day);
            }
        });
    }

    // Load template
    loadTemplate() {
        this.currentTemplate = this.dataManager.getWeeklyTemplate();
    }

    // Open template modal
    openTemplateModal() {
        const modal = document.getElementById('templateModal');
        const weekDays = modal.querySelector('.week-days');
        
        weekDays.innerHTML = '';
        
        const days = [
            { key: 'sunday', label: 'Sun' },
            { key: 'monday', label: 'Mon' },
            { key: 'tuesday', label: 'Tue' },
            { key: 'wednesday', label: 'Wed' },
            { key: 'thursday', label: 'Thu' },
            { key: 'friday', label: 'Fri' },
            { key: 'saturday', label: 'Sat' }
        ];
        
        days.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'week-day';
            dayEl.dataset.day = day.key;
            dayEl.textContent = day.label;
            
            if (this.currentTemplate[day.key] && this.currentTemplate[day.key].length > 0) {
                const count = document.createElement('div');
                count.className = 'task-count';
                count.textContent = `${this.currentTemplate[day.key].length} tasks`;
                dayEl.appendChild(count);
            }
            
            weekDays.appendChild(dayEl);
        });
        
        modal.classList.add('active');
    }

    // Open day template editor
    openDayTemplateEditor(day) {
        alert(`Editing template for ${day}. This would open a detailed editor in a full implementation.`);
        // In a full implementation, this would open another modal
        // to edit tasks for that specific day
    }

    // Save current template
    saveCurrentTemplate() {
        this.dataManager.saveWeeklyTemplate(this.currentTemplate);
        alert('Weekly template saved successfully!');
    }

    // Apply template to selected week
    applyTemplateToWeek() {
        const selectedDate = window.calendarManager.selectedDate;
        if (!selectedDate) {
            alert('Please select a date first.');
            return;
        }

        if (confirm('Apply template to the week containing the selected date? Existing tasks will be preserved.')) {
            // Get the start of the week (Sunday)
            const startDate = new Date(selectedDate);
            startDate.setDate(selectedDate.getDate() - selectedDate.getDay());
            
            // Apply template for each day of the week
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            
            for (let i = 0; i < 7; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);
                const dateKey = currentDate.toISOString().split('T')[0];
                
                // Only apply to future dates or today
                if (currentDate <= new Date()) {
                    continue;
                }
                
                const dayTemplate = this.currentTemplate[days[i]];
                if (dayTemplate && dayTemplate.length > 0) {
                    const dateData = window.dataManager.getDateData(dateKey);
                    // Only add template tasks if no tasks exist
                    if (!dateData.tasks || dateData.tasks.length === 0) {
                        dateData.tasks = JSON.parse(JSON.stringify(dayTemplate));
                        dateData.mode = dayTemplate[0]?.startTime ? 'time' : 'simple';
                        window.dataManager.saveDateData(dateKey, dateData);
                    }
                }
            }
            
            alert('Template applied successfully!');
            window.calendarManager.renderCalendar();
        }
    }

    // Clear template
    clearTemplate() {
        this.currentTemplate = this.dataManager.getDefaultWeeklyTemplate();
        this.dataManager.saveWeeklyTemplate(this.currentTemplate);
        this.openTemplateModal();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    window.dataManager = new DataManager();
    window.calendarManager = new CalendarManager();
    window.taskManager = new TaskManager();
    window.templateManager = new TemplateManager();

    // Initialize components
    window.calendarManager.init();
    window.taskManager.init();
    window.templateManager.init();

    // Set current date
    const today = new Date();
    window.calendarManager.updateSelectedDate(today);
    window.taskManager.loadTasks(today.toISOString().split('T')[0]);

    // Add event listeners for navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        window.calendarManager.previousMonth();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        window.calendarManager.nextMonth();
    });

    document.getElementById('todayBtn').addEventListener('click', () => {
        window.calendarManager.goToToday();
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Initialize with today's data
    console.log('Daily Tracker initialized successfully!');
});