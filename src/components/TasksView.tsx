import React, { useState } from 'react';
import { MOCK_TASKS, MOCK_TIME_LOGS, SUBJECT_COLORS } from '../constants';
import { Task, TaskStatus, Subject, TimeLog, Evidence, EvidenceType } from '../types';
import { Plus, X, Calendar, Clock, AlertCircle, CheckSquare, Square, Save, Paperclip, Link as LinkIcon, FileText, Trash2, ChevronDown, Filter } from 'lucide-react';

const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>(MOCK_TIME_LOGS);

  // Evidences State (Local mock for this view)
  const [evidences, setEvidences] = useState<Evidence[]>([]);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Time Logging Form State
  const [logDuration, setLogDuration] = useState<string>('30');
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logDescription, setLogDescription] = useState<string>('');

  // Evidence Form State
  const [evidenceType, setEvidenceType] = useState<EvidenceType>(EvidenceType.LINK);
  const [evidenceContent, setEvidenceContent] = useState('');

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const toggleCriterion = (taskId: string, criterionId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId && t.acceptanceCriteria) {
        const updatedCriteria = t.acceptanceCriteria.map(ac =>
          ac.id === criterionId ? { ...ac, isCompleted: !ac.isCompleted } : ac
        );
        return { ...t, acceptanceCriteria: updatedCriteria };
      }
      return t;
    });
    setTasks(updatedTasks);

    if (selectedTask?.id === taskId) {
      const updatedTask = updatedTasks.find(t => t.id === taskId);
      if (updatedTask) setSelectedTask(updatedTask);
    }
  };

  const handleLogTime = () => {
    if (!selectedTask || !logDuration) return;

    const newLog: TimeLog = {
      id: Date.now().toString(),
      taskId: selectedTask.id,
      date: logDate,
      durationMinutes: parseInt(logDuration),
      subject: selectedTask.subject,
      description: logDescription || 'Task work log'
    };

    setTimeLogs([newLog, ...timeLogs]);
    MOCK_TIME_LOGS.push(newLog);
    setLogDescription('');
    setLogDuration('30');
  };

  const handleAddEvidence = () => {
    if (!selectedTask || !evidenceContent) return;

    const newEvidence: Evidence = {
      id: Date.now().toString(),
      taskId: selectedTask.id,
      type: evidenceType,
      content: evidenceContent,
      timestamp: new Date().toLocaleTimeString()
    };

    setEvidences([newEvidence, ...evidences]);
    setEvidenceContent('');
  };

  const handleDeleteEvidence = (id: string) => {
    setEvidences(evidences.filter(e => e.id !== id));
  };

  const calculateProgress = (task: Task) => {
    if (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) return 0;
    const completed = task.acceptanceCriteria.filter(ac => ac.isCompleted).length;
    return Math.round((completed / task.acceptanceCriteria.length) * 100);
  };

  const calculateTotalTime = (taskId: string) => {
    const logs = timeLogs.filter(l => l.taskId === taskId);
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
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2">
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
          {tasks.map(task => (
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
          ))}
        </div>
      </div>

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
                  {evidences.filter(e => e.taskId === selectedTask.id).length} Attached
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
                {evidences.filter(e => e.taskId === selectedTask.id).length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center">No evidences attached yet.</p>
                ) : (
                  evidences.filter(e => e.taskId === selectedTask.id).map(ev => (
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
                  Total: {calculateTotalTime(selectedTask.id)}
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
                {timeLogs.filter(l => l.taskId === selectedTask.id).length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-2">No time logged yet.</p>
                ) : (
                  timeLogs.filter(l => l.taskId === selectedTask.id).map(log => (
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