import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SUBJECT_COLORS } from '../constants';
import { Task, TaskStatus, Subject, TimeLog, Evidence, EvidenceType } from '../types';
import { Plus, X, Calendar, Clock, AlertCircle, CheckSquare, Square, Save, Paperclip, Link as LinkIcon, FileText, Trash2, ChevronDown, Filter } from 'lucide-react';

const TasksView: React.FC = () => {
  // Fetch live data from IndexedDB
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Create Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState<Subject>(Subject.POLITY);
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskDescription, setNewTaskDescription] = useState('');

  // Time Logging Form State
  const [logDuration, setLogDuration] = useState<string>('30');
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logDescription, setLogDescription] = useState<string>('');

  // Evidence Form State
  const [evidenceType, setEvidenceType] = useState<EvidenceType>(EvidenceType.LINK);
  const [evidenceContent, setEvidenceContent] = useState('');

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      userId: 'Schamala',
      title: newTaskTitle,
      subject: newTaskSubject,
      priority: newTaskPriority,
      date: newTaskDate,
      status: TaskStatus.TODO,
      description: newTaskDescription,
      acceptanceCriteria: [],
      logs: [],
      evidences: []
    };

    await db.tasks.add(newTask);
    setIsCreating(false);
    // Reset form
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskSubject(Subject.POLITY);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await db.tasks.update(taskId, { status: newStatus });

    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const toggleCriterion = async (taskId: string, criterionId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.acceptanceCriteria) {
      const updatedCriteria = task.acceptanceCriteria.map(ac =>
        ac.id === criterionId ? { ...ac, isCompleted: !ac.isCompleted } : ac
      );
      await db.tasks.update(taskId, { acceptanceCriteria: updatedCriteria });

      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, acceptanceCriteria: updatedCriteria } : null);
      }
    }
  };

  const handleLogTime = async () => {
    if (!selectedTask || !logDuration) return;

    const newLog: TimeLog = {
      id: Math.random().toString(36).substr(2, 9),
      date: logDate,
      durationMinutes: parseInt(logDuration),
      subject: selectedTask.subject,
      description: logDescription || 'Task work log'
    };

    // Use current task from live query to ensure we have latest logs
    const currentTask = tasks.find(t => t.id === selectedTask.id);
    if (!currentTask) return;

    const updatedLogs = [...(currentTask.logs || []), newLog];

    await db.tasks.update(selectedTask.id, { logs: updatedLogs });

    // Update local state
    setSelectedTask({ ...selectedTask, logs: updatedLogs });

    setLogDescription('');
    setLogDuration('30');
  };

  const handleAddEvidence = async () => {
    if (!selectedTask || !evidenceContent) return;

    const newEvidence: Evidence = {
      id: Math.random().toString(36).substr(2, 9),
      type: evidenceType,
      content: evidenceContent,
      timestamp: new Date().toLocaleTimeString()
    };

    // Use current task from live query
    const currentTask = tasks.find(t => t.id === selectedTask.id);
    if (!currentTask) return;

    const updatedEvidences = [...(currentTask.evidences || []), newEvidence];

    await db.tasks.update(selectedTask.id, { evidences: updatedEvidences });

    // Update local state
    setSelectedTask({ ...selectedTask, evidences: updatedEvidences });

    setEvidenceContent('');
  };

  const handleDeleteEvidence = async (id: string) => {
    if (!selectedTask) return;

    // Use current task from live query
    const currentTask = tasks.find(t => t.id === selectedTask.id);
    if (!currentTask) return;

    const updatedEvidences = (currentTask.evidences || []).filter(e => e.id !== id);

    await db.tasks.update(selectedTask.id, { evidences: updatedEvidences });

    // Update local state
    setSelectedTask({ ...selectedTask, evidences: updatedEvidences });
  };

  const calculateProgress = (task: Task) => {
    if (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) return 0;
    const completed = task.acceptanceCriteria.filter(ac => ac.isCompleted).length;
    return Math.round((completed / task.acceptanceCriteria.length) * 100);
  };

  const calculateTotalTime = (task: Task) => {
    const logs = task.logs || [];
    const totalMinutes = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO: return 'bg-gray-100 text-gray-600';
      case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700';
      case TaskStatus.DONE: return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="flex h-full animate-fade-in relative bg-white">
      {/* List Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="p-6 border-b border-gray-200 flex justify-between items-center bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Tasks</h2>
            <p className="text-gray-500">Manage your study goals and progress.</p>
          </div>
          <div className="flex gap-3">
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
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p>No tasks found. Create one to get started!</p>
            </div>
          ) : (
            tasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 items-center hover:bg-blue-50/50 cursor-pointer transition-colors group ${selectedTask?.id === task.id ? 'bg-blue-50' : ''}`}
              >
                {/* Task Title & Progress */}
                <div className="col-span-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${calculateProgress(task)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-gray-400">{calculateProgress(task)}%</span>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Subject */}
                <div className="col-span-2">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: SUBJECT_COLORS[task.subject] }}
                  >
                    {task.subject}
                  </span>
                </div>

                {/* Priority */}
                <div className="col-span-2 flex items-center gap-2">
                  {task.priority === 'High' && <AlertCircle size={16} className="text-red-500" />}
                  <span className={`text-sm ${task.priority === 'High' ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    {task.priority || 'Normal'}
                  </span>
                </div>

                {/* Due Date */}
                <div className="col-span-2 flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={14} />
                  <span>{task.date}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Create New Task</h3>
              <button onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  required
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Complete Chapter 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    value={newTaskSubject}
                    onChange={(e) => setNewTaskSubject(e.target.value as Subject)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.values(Subject).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                  placeholder="Task details..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <div className="w-[400px] border-l border-gray-200 bg-white h-full overflow-y-auto shadow-xl z-20 absolute right-0 top-0 bottom-0 animate-slide-in-right">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-1 rounded text-white"
                  style={{ backgroundColor: SUBJECT_COLORS[selectedTask.subject] }}
                >
                  {selectedTask.subject}
                </span>
                <span className="text-xs text-gray-500 font-mono">#{selectedTask.id}</span>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-6">{selectedTask.title}</h2>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Description</h3>
              <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-md border border-gray-100">
                {selectedTask.description || "No description provided."}
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">Acceptance Criteria</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {calculateProgress(selectedTask)}% Completed
                </span>
              </div>

              <div className="space-y-2">
                {(!selectedTask.acceptanceCriteria || selectedTask.acceptanceCriteria.length === 0) ? (
                  <p className="text-sm text-gray-400 italic">No acceptance criteria defined.</p>
                ) : (
                  selectedTask.acceptanceCriteria.map(ac => (
                    <div
                      key={ac.id}
                      className={`flex items-start gap-3 p-3 rounded-md border transition-all cursor-pointer ${ac.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-blue-300'}`}
                      onClick={() => toggleCriterion(selectedTask.id, ac.id)}
                    >
                      <button className={`mt-0.5 flex-shrink-0 ${ac.isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                        {ac.isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                      <span className={`text-sm ${ac.isCompleted ? 'text-green-800 line-through decoration-green-800/50' : 'text-gray-700'}`}>
                        {ac.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Evidence Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Paperclip size={16} /> Evidences
                </h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {(selectedTask.evidences || []).length} Attached
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <div className="flex gap-2 mb-3">
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                    className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-1/3"
                  >
                    <option value={EvidenceType.LINK}>Link</option>
                    <option value={EvidenceType.TEXT}>Note</option>
                  </select>
                  <input
                    type="text"
                    value={evidenceContent}
                    onChange={(e) => setEvidenceContent(e.target.value)}
                    placeholder={evidenceType === EvidenceType.LINK ? "Paste URL here..." : "Type your note..."}
                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={handleAddEvidence}
                  disabled={!evidenceContent}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={14} /> Attach Evidence
                </button>
              </div>

              <div className="space-y-2">
                {(!selectedTask.evidences || selectedTask.evidences.length === 0) ? (
                  <p className="text-xs text-gray-400 italic text-center">No evidences attached yet.</p>
                ) : (
                  selectedTask.evidences.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-md group">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {ev.type === EvidenceType.LINK ? <LinkIcon size={14} className="text-blue-500 shrink-0" /> : <FileText size={14} className="text-gray-500 shrink-0" />}
                        <span className="text-xs text-gray-700 truncate">{ev.content}</span>
                      </div>
                      <button onClick={() => handleDeleteEvidence(ev.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Time Logging Section */}
            <div className="mb-8 border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock size={16} /> Time Tracking
                </h3>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Total: {calculateTotalTime(selectedTask)}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={logDuration}
                      onChange={(e) => setLogDuration(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Work Description (Optional)</label>
                  <input
                    type="text"
                    value={logDescription}
                    onChange={(e) => setLogDescription(e.target.value)}
                    placeholder="What did you work on?"
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={handleLogTime}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <Save size={14} /> Log Work
                </button>
              </div>

              <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {(!selectedTask.logs || selectedTask.logs.length === 0) ? (
                  <p className="text-xs text-gray-400 italic text-center py-2">No time logged yet.</p>
                ) : (
                  selectedTask.logs.map(log => (
                    <div key={log.id} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-mono">{log.date}</span>
                        <span className="text-gray-700 font-medium">{log.description}</span>
                      </div>
                      <span className="font-bold text-blue-600">{log.durationMinutes}m</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Status Status */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Status</h3>
              <div className="flex gap-2">
                {[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE].map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(selectedTask.id, status)}
                    className={`flex-1 py-2 text-xs font-medium rounded-md border ${selectedTask.status === status
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>Created {selectedTask.date}</span>
                </div>
                {selectedTask.priority && (
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className={selectedTask.priority === 'High' ? 'text-red-500' : 'text-gray-400'} />
                    <span>{selectedTask.priority} Priority</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default TasksView;