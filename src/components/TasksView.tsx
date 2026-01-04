import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Task, TaskStatus, Subject, SubjectCategory } from '../types';
import { Plus, Filter, Calendar, List, BookOpen, X, Search } from 'lucide-react';
import { syncAllTasks, saveTaskProgress, saveUserTask, updateTaskProgress } from '../services/taskSyncService';
import { SUBJECT_HIERARCHY } from '../constants';

// Sub-components
import TaskItem from './tasks/TaskItem';
import CreateTaskModal from './tasks/CreateTaskModal';
import TaskDetailPanel from './tasks/TaskDetailPanel';
import GlassCard from './ui/GlassCard';
import Skeleton from './ui/Skeleton';
import EmptyState from './ui/EmptyState';
import FilterDropdown from './ui/FilterDropdown';
import { CheckSquare } from 'lucide-react';

type TabType = 'ACTIVE' | 'ARCHIVED' | 'TRASH';

interface TasksViewProps {
  initialSelectedTaskId?: string | null;
  onTaskSelected?: () => void;
}

const TasksView: React.FC<TasksViewProps> = ({ initialSelectedTaskId, onTaskSelected }) => {
  // Fetch live data from IndexedDB
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (initialSelectedTaskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === initialSelectedTaskId);
      if (task) {
        setSelectedTask(task);
        if (onTaskSelected) onTaskSelected();
      }
    }
  }, [initialSelectedTaskId, tasks, onTaskSelected]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Filter State
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [filterTopic, setFilterTopic] = useState<string | null>(null);

  // Helper to get topics for a category
  const getSubjectTopics = (category: string) => {
    return Object.entries(SUBJECT_HIERARCHY)
      .filter(([_, cat]) => cat === category)
      .map(([subject, _]) => subject);
  };

  // Sync tasks from Server & Markdown files on initial load
  useEffect(() => {
    const runSync = async () => {
      console.log("Starting auto-sync...");
      try {
        await syncAllTasks();
        console.log("Auto-sync finished.");
      } catch (error) {
        console.error("Auto-sync failed:", error);
      }
    };
    runSync();
  }, []); // Run once on mount

  const handleCreateTask = async (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      userId: 'Schamala',
      title: taskData.title || 'New Task',
      subject: taskData.subject || Subject.GENERAL,
      priority: taskData.priority || 'Medium',
      date: taskData.date || new Date().toISOString().split('T')[0],
      status: TaskStatus.TODO,
      description: taskData.description || '',
      acceptanceCriteria: [],
      logs: [],
      evidences: [],
      isArchived: false,
      isDeleted: false,
      ...taskData
    };

    await saveUserTask(newTask);
    // Optimization: Directly add to local DB instead of full sync
    await db.tasks.add(newTask);
    setIsCreating(false);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic UI Update
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }

    await db.tasks.update(taskId, updates);
    await updateTaskProgress(taskId, updates);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to move this task to trash?')) {
      const updates = { isDeleted: true, deletedAt: new Date().toISOString() };
      await db.tasks.update(id, updates);
      await updateTaskProgress(id, updates);
      if (selectedTask?.id === id) setSelectedTask(null);
    }
  };

  const handleArchive = async (id: string) => {
    const updates = { isArchived: true };
    await db.tasks.update(id, updates);
    await updateTaskProgress(id, updates);
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleRestore = async (id: string) => {
    const updates = { isArchived: false, isDeleted: false, deletedAt: undefined };
    await db.tasks.update(id, updates);
    await updateTaskProgress(id, updates);
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handlePermanentDelete = async (id: string) => {
    if (window.confirm('This action cannot be undone. Delete forever?')) {
      await db.tasks.delete(id);
      await saveTaskProgress(await db.tasks.toArray());
      if (selectedTask?.id === id) setSelectedTask(null);
    }
  };

  const getWeekRange = (offsetWeeks: number = 0) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + (offsetWeeks * 7)); // Start on Sunday
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  const filteredTasks = tasks.filter(t => {
    // 1. Tab Filter
    let matchesTab = false;
    if (activeTab === 'TRASH') matchesTab = t.isDeleted;
    else if (activeTab === 'ARCHIVED') matchesTab = t.isArchived && !t.isDeleted;
    else matchesTab = !t.isArchived && !t.isDeleted; // ACTIVE

    if (!matchesTab) return false;

    // 2. Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = t.title.toLowerCase().includes(query);
      const matchesDesc = t.description?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDesc) return false;
    }

    // 3. Advanced Multi-Filter (AND Logic)

    // Subject Filter
    if (filterSubject) {
      const taskCategory = SUBJECT_HIERARCHY[t.subject] || SubjectCategory.GENERAL;
      if (taskCategory !== filterSubject) return false;
    }

    // Topic Filter (Sub-filter of Subject)
    if (filterTopic) {
      if (t.subject !== filterTopic) return false;
    }

    // Status Filter
    if (filterStatus) {
      if (t.status !== filterStatus) return false;
    }

    // Date Filter
    if (filterDate) {
      const taskDate = new Date(t.date);

      if (filterDate === 'This Week') {
        const { start, end } = getWeekRange(0);
        if (!(taskDate >= start && taskDate <= end)) return false;
      }
      else if (filterDate === 'Next Week') {
        const { start, end } = getWeekRange(1);
        if (!(taskDate >= start && taskDate <= end)) return false;
      }
      else if (filterDate === 'Last Week') {
        const { start, end } = getWeekRange(-1);
        if (!(taskDate >= start && taskDate <= end)) return false;
      }
      else if (filterDate === 'Next 2 Weeks') {
        const { start } = getWeekRange(0);
        const { end } = getWeekRange(1);
        if (!(taskDate >= start && taskDate <= end)) return false;
      }
      else if (filterDate === 'Overdue') {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (!(taskDate < now && t.status !== TaskStatus.DONE)) return false;
      }
    }

    return true;
  });

  const clearAllFilters = () => {
    setFilterSubject(null);
    setFilterStatus(null);
    setFilterDate(null);
    setFilterTopic(null);
    setSearchQuery('');
  };

  const hasActiveFilters = filterSubject || filterStatus || filterDate || filterTopic || searchQuery;

  return (
    <div className="flex h-full animate-fade-in gap-4 p-4">
      {/* List Area */}
      <GlassCard variant="blur" className={`flex-1 flex flex-col h-full overflow-hidden border-white/20 ${selectedTask ? 'max-w-[calc(100%-400px)]' : ''}`}>
        <header className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 z-20">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Tasks</h2>
              <p className="text-gray-500">Manage your study goals and progress.</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">

            {/* Search Bar */}
            <div className="relative mr-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-1.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all shadow-sm hover:border-gray-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 mr-2">
              <FilterDropdown
                label="Subject"
                value={filterSubject}
                options={Object.values(SubjectCategory)}
                onChange={(val) => { setFilterSubject(val); setFilterTopic(null); }}
                icon={<BookOpen size={14} />}
              />

              {filterSubject && (
                <FilterDropdown
                  label="Topic"
                  value={filterTopic}
                  options={getSubjectTopics(filterSubject)}
                  onChange={setFilterTopic}
                  className="animate-fade-in"
                />
              )}

              <FilterDropdown
                label="Status"
                value={filterStatus ? filterStatus.replace('_', ' ') : null}
                options={Object.values(TaskStatus).map(s => s.replace('_', ' '))}
                onChange={(val) => setFilterStatus(val ? val.replace(' ', '_') : null)}
                icon={<List size={14} />}
              />

              <FilterDropdown
                label="Date"
                value={filterDate}
                options={['This Week', 'Next Week', 'Last Week', 'Next 2 Weeks', 'Overdue']}
                onChange={setFilterDate}
                icon={<Calendar size={14} />}
              />

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Create Task
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ACTIVE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('ARCHIVED')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ARCHIVED' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Archived
          </button>
          <button
            onClick={() => setActiveTab('TRASH')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'TRASH' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Trash
          </button>
        </div>

        {/* Task List Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-2 bg-white/5 border-b border-white/10 text-xs font-semibold text-gray-500 uppercase tracking-wider backdrop-blur-md z-10 sticky top-0">
          <div className="col-span-4">Task</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Subject</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Due Date</div>
        </div>

        {/* Task List Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {(!tasks || tasks.length === 0) && !filteredTasks.length ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title={activeTab === 'ACTIVE' ? "All Caught Up!" : "No Tasks Found"}
              message={`No tasks found in ${activeTab.toLowerCase()}. ${activeTab === 'ACTIVE' ? "Enjoy your free time!" : ""}`}
              actionLabel={activeTab === 'ACTIVE' ? "Create New Task" : undefined}
              onAction={activeTab === 'ACTIVE' ? () => setIsCreating(true) : undefined}
            />
          ) : (
            filteredTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={selectedTask?.id === task.id}
                activeTab={activeTab}
                onClick={setSelectedTask}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
              />
            ))
          )}
        </div>
      </GlassCard>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onCreate={handleCreateTask}
      />

      {/* Task Detail Sidebar */}
      {
        selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={handleUpdateTask}
          />
        )
      }
    </div>
  );
};

export default TasksView;