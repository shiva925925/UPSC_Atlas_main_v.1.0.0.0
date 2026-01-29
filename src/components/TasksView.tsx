import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Task, TaskStatus, Subject, SubjectCategory } from '../types';
import { Plus, List, Calendar, BookOpen, X, Search, RefreshCw, CheckSquare, Moon, Sun, ChevronUp, ChevronDown } from 'lucide-react';
import { pullProgressOnly, fullLibrarySync, saveUserTask, updateTaskProgress, deleteTaskPermanently, triggerManualRescan } from '../services/taskSyncService';
import { SUBJECT_HIERARCHY } from '../constants';
import { getSearchSnippet, SearchMatch } from '../utils/searchHelper';


// Sub-components
import TaskItem from './tasks/TaskItem';
import CreateTaskModal from './tasks/CreateTaskModal';
import TaskDetailPanel from './tasks/TaskDetailPanel';
import GlassCard from './ui/GlassCard';
import Skeleton from './ui/Skeleton';
import EmptyState from './ui/EmptyState';
import FilterDropdown from './ui/FilterDropdown';

type TabType = 'ACTIVE' | 'ARCHIVED';

interface TasksViewProps {
  initialSelectedTaskId?: string | null;
  onTaskSelected?: () => void;
}

const TasksView: React.FC<TasksViewProps> = ({ initialSelectedTaskId, onTaskSelected }) => {
  // Fetch live data from IndexedDB
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const isLoading = tasks === undefined; // Data hasn't arrived from DB yet

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = selectedTaskId ? (tasks || []).find(t => t.id === selectedTaskId) || null : null;

  useEffect(() => {
    if (initialSelectedTaskId && tasks && tasks.length > 0) {
      setSelectedTaskId(initialSelectedTaskId);
      if (onTaskSelected) onTaskSelected();
    }
  }, [initialSelectedTaskId, tasks, onTaskSelected]);

  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Filter State
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(TaskStatus.IN_PROGRESS);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [isSubjectsCollapsed, setIsSubjectsCollapsed] = useState(true);

  // Helper to get topics for a category
  const getSubjectTopics = (category: string) => {
    return Object.entries(SUBJECT_HIERARCHY)
      .filter(([_, cat]) => cat === category)
      .map(([subject, _]) => subject);
  };

  // Instant Sync on initial load
  useEffect(() => {
    const runSync = async () => {
      try {
        // fullLibrarySync now handles library + progress in one go
        await fullLibrarySync();
      } catch (error) {
        console.error("[TasksView] Auto sync failed:", error);
      }
    };
    runSync();
  }, []);

  // MANUAL RESCAN Button
  const handleManualRescan = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await triggerManualRescan();
      alert("System synchronized with Master Content.");
    } catch (error: any) {
      console.error("[TasksView] Manual rescan failed:", error);
      alert("Sync failed: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

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
    await db.tasks.add(newTask);
    setIsCreating(false);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    await db.tasks.update(taskId, updates);
    await updateTaskProgress(taskId, updates);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this task permanently? This cannot be undone.')) {
      try {
        await deleteTaskPermanently(id);
        if (selectedTaskId === id) setSelectedTaskId(null);
      } catch (e) {
        alert('Failed to delete task');
      }
    }
  };

  const handleArchive = async (id: string) => {
    const updates = { isArchived: true };
    await db.tasks.update(id, updates);
    await updateTaskProgress(id, updates);
    if (selectedTaskId === id) setSelectedTaskId(null);
  };

  const handleRestore = async (id: string) => {
    const updates = { isArchived: false };
    await db.tasks.update(id, updates);
    await updateTaskProgress(id, updates);
    if (selectedTaskId === id) setSelectedTaskId(null);
  };

  const getWeekRange = (offsetWeeks: number = 0) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + (offsetWeeks * 7));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const tasksList = tasks || [];

  // 1. Filter and Score
  const scoredTasks = tasksList.map(t => {
    // Basic Tab & Filter check
    if (activeTab === 'ARCHIVED') { if (!t.isArchived) return null; }
    else { if (t.isArchived) return null; }

    if (filterSubject && (SUBJECT_HIERARCHY[t.subject] || SubjectCategory.GENERAL) !== filterSubject) return null;
    if (filterTopic && t.subject !== filterTopic) return null;
    if (filterStatus && t.status !== filterStatus) return null;

    if (filterDate) {
      const taskDate = new Date(t.date);
      const { start: twS, end: twE } = getWeekRange(0);
      const { start: nwS, end: nwE } = getWeekRange(1);
      const { start: lwS, end: lwE } = getWeekRange(-1);

      if (filterDate === 'This Week' && !(taskDate >= twS && taskDate <= twE)) return null;
      if (filterDate === 'Next Week' && !(taskDate >= nwS && taskDate <= nwE)) return null;
      if (filterDate === 'Last Week' && !(taskDate >= lwS && taskDate <= lwE)) return null;
      if (filterDate === 'Next 2 Weeks' && !(taskDate >= twS && taskDate <= nwE)) return null;
      if (filterDate === 'Overdue') {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (!(taskDate < now && t.status !== TaskStatus.DONE)) return null;
      }
    }

    // 2. Deep Search Logic
    if (!searchQuery) return { task: t, score: 0, match: null };

    const query = searchQuery.toLowerCase();
    let score = 0;
    let match: SearchMatch | null = null;

    // Title Match (Highest Priority)
    if (t.title.toLowerCase() === query) score = 100;
    else if (t.title.toLowerCase().includes(query)) score = 80;

    // Criteria Match (Medium Priority)
    if (score < 80) {
      const criteriaMatch = (t.acceptanceCriteria || []).find(ac => ac.text.toLowerCase().includes(query));
      if (criteriaMatch) {
        score = 60;
        match = { field: 'criteria', keyword: query, snippet: getSearchSnippet(criteriaMatch.text, query) || criteriaMatch.text };
      }
    }

    // Description Match (Lowest Priority)
    if (score < 60 && t.description?.toLowerCase().includes(query)) {
      score = 40;
      match = { field: 'description', keyword: query, snippet: getSearchSnippet(t.description, query) || t.description };
    }

    if (score === 0) return null;
    return { task: t, score, match };
  }).filter((res): res is { task: Task; score: number; match: SearchMatch | null } => res !== null);

  // 3. Final Sort
  const filteredTasks = scoredTasks
    .sort((a, b) => b.score - a.score);

  const activeTasks = tasksList.filter(t => !t.isArchived);
  const subjectStats = Object.values(SubjectCategory).map(category => {
    const categoryTasks = activeTasks.filter(t => (SUBJECT_HIERARCHY[t.subject] || SubjectCategory.GENERAL) === category);
    const completed = categoryTasks.filter(t => t.status === TaskStatus.DONE).length;
    const total = categoryTasks.length;
    return { category, total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }).filter(stat => stat.total > 0 || stat.category === SubjectCategory.GENERAL);

  const clearAllFilters = () => {
    setFilterSubject(null); setFilterStatus(null); setFilterDate(null); setFilterTopic(null); setSearchQuery('');
  };

  const hasActiveFilters = filterSubject || filterStatus || filterDate || filterTopic || searchQuery;

  return (
    <div className="flex flex-col h-full animate-fade-in bg-app-bg transition-colors duration-300">
      {/* Full-Width Top Header */}
      <header className="p-3 border-b border-card-border flex justify-between items-center bg-card-bg/50 backdrop-blur-md z-40 sticky top-0 px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-text-main tracking-tight">Tasks</h2>
        </div>

        <div className="flex gap-4 items-center">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={14} />
            <input
              type="text"
              placeholder="Search syllabus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 py-1.5 bg-card-bg/50 border border-card-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 w-48 lg:w-72 transition-all shadow-sm text-text-main placeholder-text-muted"
            />
          </div>

          {/* Filter Group */}
          <div className="flex items-center gap-2">
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
              <button onClick={clearAllFilters} className="text-[10px] text-red-500 hover:text-red-600 font-bold px-2 py-1 flex items-center gap-1">
                <X size={10} /> CLEAR
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-card-border mx-1"></div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRescan}
              disabled={isSyncing}
              title="Manual Rescan: Checks for new YAML file updates"
              className={`p-1.5 rounded-lg transition-all ${isSyncing ? 'text-blue-500 animate-spin' : 'text-text-muted hover:bg-white/10 hover:text-blue-500'}`}
            >
              <RefreshCw size={15} />
            </button>

            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              <Plus size={14} /> Create Task
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto custom-scrollbar relative">
        {/* Subject Area Toggle */}
        <div className="flex justify-between items-center bg-card-bg/30 px-3 py-1 rounded-lg border border-card-border/50">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Syllabus Overview</div>
          <button
            onClick={() => setIsSubjectsCollapsed(!isSubjectsCollapsed)}
            className="text-text-muted hover:text-blue-500 transition-colors p-1"
            title={isSubjectsCollapsed ? "Show Overview" : "Collapse Overview"}
          >
            {isSubjectsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Subject Cards - Slimmer */}
        {!isSubjectsCollapsed && (
          <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))
            ) : (
              subjectStats.map((stat) => (
                <GlassCard
                  key={stat.category}
                  variant="blur"
                  onClick={() => {
                    setFilterSubject(stat.category === filterSubject ? null : stat.category);
                    setFilterTopic(null);
                  }}
                  className={`p-3 cursor-pointer transition-all hover:translate-y-[-2px] border-card-border min-w-[120px] ${filterSubject === stat.category ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'hover:bg-card-bg/20'}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-tighter truncate">{stat.category}</span>
                      <span className="text-[9px] font-mono bg-white/10 px-1 rounded text-text-muted">{stat.completed}/{stat.total}</span>
                    </div>
                    <div className="text-lg font-bold text-text-main leading-none py-1">{stat.percentage}%</div>
                    <div className="w-full bg-gray-200/10 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-700"
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}

        <div className="flex flex-1 gap-4 overflow-hidden relative">
          {/* Main Task List */}
          <GlassCard variant="blur" className="flex-1 flex flex-col border-card-border overflow-hidden transition-all duration-300">
            {/* Tabs */}
            <div className="flex border-b border-card-border px-4 bg-card-bg/40 backdrop-blur-sm z-30">
              {['ACTIVE', 'ARCHIVED'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as TabType)}
                  className={`py-3 px-5 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-text-muted hover:text-text-main'}`}
                >
                  {tab === 'ACTIVE' ? 'Tasks' : tab}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-12 gap-4 px-6 py-2 bg-text-main/5 border-b border-card-border text-[10px] font-black text-text-muted uppercase tracking-widest sticky top-0 bg-card-bg/80 backdrop-blur-sm z-20">
                <div className="col-span-4">Objective</div>
                <div className="col-span-2">Progress</div>
                <div className="col-span-2">Domain</div>
                <div className="col-span-2">Priority</div>
                <div className="col-span-2">Deadline</div>
              </div>

              <div className="divide-y divide-card-border/50">
                {isLoading ? (
                  // Skeleton Loading Rows - Matches TaskItem Grid
                  Array(6).fill(0).map((_, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-card-border/50 items-center">
                      <div className="col-span-4"><Skeleton className="h-4 w-3/4 rounded" /></div>
                      <div className="col-span-2"><Skeleton className="h-2 w-full rounded-full" /></div>
                      <div className="col-span-2"><Skeleton className="h-5 w-20 rounded-full" /></div>
                      <div className="col-span-2"><Skeleton className="h-3 w-12 rounded" /></div>
                      <div className="col-span-2"><Skeleton className="h-3 w-16 rounded" /></div>
                    </div>
                  ))
                ) : filteredTasks.length === 0 ? (
                  <EmptyState
                    icon={CheckSquare}
                    title="Clear Horizon"
                    message="No tasks matching your current view."
                    onAction={activeTab === 'ACTIVE' ? () => setIsCreating(true) : undefined}
                    actionLabel="Initialize Task"
                  />
                ) : (
                  filteredTasks.map(({ task, match }) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isSelected={selectedTaskId === task.id}
                      activeTab={activeTab === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE'}
                      onClick={(t) => setSelectedTaskId(t.id)}
                      onArchive={handleArchive}
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                      onPermanentDelete={handleDelete}
                      searchMatch={match || undefined}
                    />
                  ))
                )}
              </div>
            </div>
          </GlassCard>

          {/* Right Floating Detail Panel Overlay (Zen Mode Drawer) */}
          {selectedTask && (
            <>
              {/* Backdrop */}
              <div
                className="absolute inset-0 z-40 bg-black/5 backdrop-blur-[2px] animate-in fade-in duration-300"
                onClick={() => setSelectedTaskId(null)}
              />
              <div className="absolute right-0 bottom-0 top-0 w-[400px] z-50 animate-in slide-in-from-right duration-300 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
                <TaskDetailPanel
                  task={selectedTask}
                  onClose={() => setSelectedTaskId(null)}
                  onUpdate={handleUpdateTask}
                  onSelectTask={(id) => setSelectedTaskId(id)}
                  className="h-full rounded-none md:rounded-l-2xl border-l border-card-border bg-card-bg"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <CreateTaskModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onCreate={handleCreateTask}
      />
    </div>
  );
};

export default TasksView;