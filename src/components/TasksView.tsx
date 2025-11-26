import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Task, TaskStatus, Subject, Priority } from '../types';
import { Plus, Filter, RefreshCw, Upload } from 'lucide-react';
import { syncMarkdownTasks } from '../services/markdownTaskService';
import { load } from 'js-yaml';
import matter from 'gray-matter';

// Sub-components
import TaskItem from './tasks/TaskItem';
import CreateTaskModal from './tasks/CreateTaskModal';
import TaskDetailPanel from './tasks/TaskDetailPanel';

type TabType = 'ACTIVE' | 'ARCHIVED' | 'TRASH';

const TasksView: React.FC = () => {
  // Fetch live data from IndexedDB
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    console.log("Starting sync with markdown files...");
    await syncMarkdownTasks();
    console.log("Sync finished.");
    setIsSyncing(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      try {
        let importedTasks: any[] = [];

        if (file.name.toLowerCase().endsWith('.yaml') || file.name.toLowerCase().endsWith('.yml')) {
          const parsed = load(content);
          if (Array.isArray(parsed)) {
            importedTasks = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            importedTasks = [parsed];
          }
        } else if (file.name.toLowerCase().endsWith('.md')) {
          // Basic MD parsing for single task per file usually, but let's support it
          const { data, content: mdContent } = matter(content);
          importedTasks = [{ ...data, description: mdContent }];
        }

        let count = 0;
        for (const item of importedTasks) {
          if (!item.id || !item.title) continue;

          const newTask: Task = {
            id: item.id,
            userId: 'Schamala',
            title: item.title,
            date: item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            subject: item.subject as Subject || Subject.GENERAL,
            priority: item.priority as Priority || 'Medium',
            status: TaskStatus.TODO,
            description: item.description || '',
            acceptanceCriteria: item.acceptanceCriteria || [],
            logs: [],
            evidences: [],
            isArchived: false,
            isDeleted: false
          };

          // Check if exists
          const existing = await db.tasks.get(newTask.id);
          if (existing) {
            await db.tasks.update(newTask.id, newTask);
          } else {
            await db.tasks.add(newTask);
          }
          count++;
        }
        alert(`Successfully imported ${count} tasks!`);

      } catch (error) {
        console.error("Import failed:", error);
        alert("Failed to import tasks. Please check the file format.");
      }

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Sync tasks from Markdown files on initial load
  useEffect(() => {
    handleSync();
  }, []); // Empty dependency array ensures this runs only once on mount


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

    await db.tasks.add(newTask);
    setIsCreating(false);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    await db.tasks.update(taskId, updates);
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to move this task to trash?')) {
      await db.tasks.update(id, { isDeleted: true, deletedAt: new Date().toISOString() });
      if (selectedTask?.id === id) setSelectedTask(null);
    }
  };

  const handleArchive = async (id: string) => {
    await db.tasks.update(id, { isArchived: true });
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleRestore = async (id: string) => {
    await db.tasks.update(id, { isArchived: false, isDeleted: false, deletedAt: undefined });
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handlePermanentDelete = async (id: string) => {
    if (window.confirm('This action cannot be undone. Delete forever?')) {
      await db.tasks.delete(id);
      if (selectedTask?.id === id) setSelectedTask(null);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'TRASH') return t.isDeleted;
    if (activeTab === 'ARCHIVED') return t.isArchived && !t.isDeleted;
    return !t.isArchived && !t.isDeleted; // ACTIVE
  });

  return (
    <div className="flex h-full animate-fade-in relative bg-white">
      {/* List Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="p-6 border-b border-gray-200 flex justify-between items-center bg-white z-10">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Tasks</h2>
              <p className="text-gray-500">Manage your study goals and progress.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".yaml,.yml,.md"
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              title="Import Tasks from YAML/MD"
            >
              <Upload size={16} /> Import
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title="Sync from Server"
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Filter size={16} /> Filter
            </button>
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
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onCreate={handleCreateTask}
      />

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
        />
      )}
    </div>
  );
};

export default TasksView;