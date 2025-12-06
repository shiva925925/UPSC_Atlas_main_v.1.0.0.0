import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Task, TaskStatus, Subject, SubjectCategory } from '../types';
import { Plus, Filter } from 'lucide-react';
import { syncAllTasks, saveTaskProgress, saveUserTask } from '../services/taskSyncService';
import { SUBJECT_HIERARCHY } from '../constants';

// Sub-components
import TaskItem from './tasks/TaskItem';
import CreateTaskModal from './tasks/CreateTaskModal';
import TaskDetailPanel from './tasks/TaskDetailPanel';
import GlassCard from './ui/GlassCard';

type TabType = 'ACTIVE' | 'ARCHIVED' | 'TRASH';

const TasksView: React.FC = () => {
  // Fetch live data from IndexedDB
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<'Subject' | 'Status' | 'Date' | 'Source File' | null>(null);
  const [filterValue, setFilterValue] = useState<string>('');
  const [subFilterValue, setSubFilterValue] = useState<string>('');

  // Get unique source files
  const uniqueSourceFiles = useLiveQuery(async () => {
    const allTasks = await db.tasks.toArray();
    const files = new Set<string>();
    allTasks.forEach(t => {
      if (t.sourceFile) files.add(t.sourceFile);
    });
    return Array.from(files).sort();
  }) || [];

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
    await syncAllTasks();
    setIsCreating(false);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    await db.tasks.update(taskId, updates);
    await saveTaskProgress(await db.tasks.toArray());
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to move this task to trash?')) {
      await db.tasks.update(id, { isDeleted: true, deletedAt: new Date().toISOString() });
      await saveTaskProgress(await db.tasks.toArray());
      if (selectedTask?.id === id) setSelectedTask(null);
    }
  };

  const handleArchive = async (id: string) => {
    await db.tasks.update(id, { isArchived: true });
    await saveTaskProgress(await db.tasks.toArray());
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleRestore = async (id: string) => {
    await db.tasks.update(id, { isArchived: false, isDeleted: false, deletedAt: undefined });
    await saveTaskProgress(await db.tasks.toArray());
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

    // 2. Advanced Filter
    if (filterType && filterValue) {
      if (filterType === 'Subject') {
        // Priority 1: Specific Topic Filter
        if (subFilterValue) {
          return t.subject === subFilterValue;
        }
        // Priority 2: Category Filter
        const taskCategory = SUBJECT_HIERARCHY[t.subject] || SubjectCategory.GENERAL;
        return taskCategory === filterValue;
      }
      if (filterType === 'Status') {
        return t.status === filterValue;
      }
      if (filterType === 'Source File') {
        return t.sourceFile === filterValue;
      }
      if (filterType === 'Date') {
        const taskDate = new Date(t.date);
        if (filterValue === 'This Week') {
          const { start, end } = getWeekRange(0);
          return taskDate >= start && taskDate <= end;
        }
        if (filterValue === 'Next Week') {
          const { start, end } = getWeekRange(1);
          return taskDate >= start && taskDate <= end;
        }
        if (filterValue === 'Overdue') {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          return taskDate < now && t.status !== TaskStatus.DONE;
        }
      }
    }

    return true;
  });

  return (
    <div className="flex h-full animate-fade-in gap-4 p-4">
      {/* List Area */}
      <GlassCard variant="blur" className={`flex-1 flex flex-col h-full overflow-hidden border-white/20 ${selectedTask ? 'max-w-[calc(100%-400px)]' : ''}`}>
        <header className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 z-10">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Tasks</h2>
              <p className="text-gray-500">Manage your study goals and progress.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium transition-colors ${isFilterOpen || filterType
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Filter size={16} /> Filter {filterType ? '(Active)' : ''}
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 shadow-xl rounded-lg p-4 z-50">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Filter By</label>
                      <select
                        value={filterType || ''}
                        onChange={(e) => {
                          setFilterType(e.target.value as any);
                          setFilterValue(''); // Reset value when type changes
                          setSubFilterValue(''); // Reset sub-filter
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        <option value="Subject">Subject</option>
                        <option value="Status">Status</option>
                        <option value="Date">Date</option>
                        <option value="Source File">Source File</option>
                      </select>
                    </div>

                    {filterType && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                          Select {filterType === 'Subject' ? 'Category' : filterType}
                        </label>
                        <select
                          value={filterValue}
                          onChange={(e) => {
                            setFilterValue(e.target.value);
                            setSubFilterValue(''); // Reset sub-filter when category changes
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All {filterType}s</option>

                          {filterType === 'Subject' && Object.values(SubjectCategory).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}

                          {filterType === 'Status' && Object.values(TaskStatus).map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}

                          {filterType === 'Source File' && uniqueSourceFiles.map(file => (
                            <option key={file} value={file}>{file}</option>
                          ))}

                          {filterType === 'Date' && (
                            <>
                              <option value="This Week">This Week</option>
                              <option value="Next Week">Next Week</option>
                              <option value="Overdue">Overdue</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}

                    {/* Sub-Filter for Specific Topics */}
                    {filterType === 'Subject' && filterValue && (
                      <div className="animate-fade-in">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Select Topic</label>
                        <select
                          value={subFilterValue}
                          onChange={(e) => setSubFilterValue(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Topics</option>
                          {getSubjectTopics(filterValue).map(topic => (
                            <option key={topic} value={topic}>{topic}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setFilterType(null);
                          setFilterValue('');
                          setSubFilterValue('');
                          setIsFilterOpen(false);
                        }}
                        className="text-xs text-gray-500 hover:text-red-600 font-medium"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
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
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-4">Task</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Subject</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Due Date</div>
        </div>

        {/* Task List Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p>No tasks found in {activeTab.toLowerCase()}.</p>
            </div>
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