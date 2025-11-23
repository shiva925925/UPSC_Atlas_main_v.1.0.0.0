import React, { useState } from 'react';
import { MOCK_TASKS, MOCK_TIME_LOGS, SUBJECT_COLORS } from '../constants';
import { Task, TaskStatus, Subject, TimeLog, Evidence, EvidenceType } from '../types';
import { Plus, X, Calendar, Clock, AlertCircle, CheckSquare, Square, Save, Paperclip, Link as LinkIcon, FileText, Trash2 } from 'lucide-react';

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

  // Derived state for columns
  const todoTasks = tasks.filter(t => t.status === TaskStatus.TODO);
  const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
  const doneTasks = tasks.filter(t => t.status === TaskStatus.DONE);

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

  const renderCard = (task: Task) => {
    const progress = calculateProgress(task);
    
    return (
      <div 
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className="bg-white p-3 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow group mb-3 min-w-[200px]"
      >
        <div className="flex justify-between items-start mb-2">
          <span 
            className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
            style={{ backgroundColor: SUBJECT_COLORS[task.subject] }}
          >
            {task.subject}
          </span>
          {task.priority === 'High' && <AlertCircle size={14} className="text-red-500" />}
        </div>
        
        <h4 className="text-sm font-medium text-gray-800 mb-2 leading-tight group-hover:text-blue-600">
          {task.title}
        </h4>

        {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
          <div className="mb-3">
             <div className="flex justify-between text-[10px] text-gray-500 mb-1">
               <span>Progress</span>
               <span>{progress}%</span>
             </div>
             <div className="w-full bg-gray-100 rounded-full h-1.5">
               <div 
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
               ></div>
             </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
           <div className="flex items-center text-gray-400 text-xs gap-1">
             <Calendar size={12} />
             <span>{task.date}</span>
           </div>
           <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600 font-bold">
             AP
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full animate-fade-in relative">
      {/* Board Area */}
      <div className="flex-1 p-4 md:p-6 overflow-x-auto">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Task Board</h2>
            <p className="text-gray-500 hidden md:block">Manage your study stories and acceptance criteria.</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-4 rounded-md text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> <span className="hidden sm:inline">Create Task</span>
          </button>
        </header>

        {/* Scrollable Columns Container */}
        <div className="flex gap-4 md:gap-6 h-[calc(100vh-180px)] min-w-[800px] md:min-w-0 overflow-x-auto md:overflow-visible pb-4">
          {/* TODO Column */}
          <div className="flex-1 min-w-[260px] bg-gray-100/50 rounded-lg p-3 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Do</h3>
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{todoTasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
              {todoTasks.map(renderCard)}
            </div>
          </div>

          {/* IN PROGRESS Column */}
          <div className="flex-1 min-w-[260px] bg-gray-100/50 rounded-lg p-3 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">In Progress</h3>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{inProgressTasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
              {inProgressTasks.map(renderCard)}
            </div>
          </div>

          {/* DONE Column */}
          <div className="flex-1 min-w-[260px] bg-gray-100/50 rounded-lg p-3 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider">Done</h3>
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{doneTasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
              {doneTasks.map(renderCard)}
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Modal / Side Panel */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 md:absolute md:inset-y-0 md:right-0 md:w-[500px] md:bg-transparent md:pointer-events-none">
           {/* Mobile Backdrop handled by parent div logic, Desktop is transparent */}
           
           <div className="w-full md:w-[500px] bg-white shadow-2xl border-l border-gray-200 h-full overflow-y-auto animate-slide-in-right pointer-events-auto">
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
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-6">{selectedTask.title}</h2>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Description (Story)</h3>
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

              {/* Evidence Section - NEW */}
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

                {/* Evidence List */}
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

                {/* History List */}
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
                      className={`flex-1 py-2 text-xs font-medium rounded-md border ${
                        selectedTask.status === status 
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
        </div>
      )}
    </div>
  );
};

export default TasksView;