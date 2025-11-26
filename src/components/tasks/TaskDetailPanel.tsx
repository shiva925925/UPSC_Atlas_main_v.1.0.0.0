import React, { useState } from 'react';
import { Task, TaskStatus, EvidenceType, TimeLog, Evidence } from '../../types';
import { SUBJECT_COLORS } from '../../constants';
import { X, CheckSquare, Square, Paperclip, Link as LinkIcon, FileText, Trash2, Plus, Clock, Save, AlertCircle } from 'lucide-react';

interface TaskDetailPanelProps {
    task: Task;
    onClose: () => void;
    onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, onClose, onUpdate }) => {
    // Time Logging Form State
    const [logDuration, setLogDuration] = useState<string>('30');
    const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [logDescription, setLogDescription] = useState<string>('');

    // Evidence Form State
    const [evidenceType, setEvidenceType] = useState<EvidenceType>(EvidenceType.LINK);
    const [evidenceContent, setEvidenceContent] = useState('');

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

    const toggleCriterion = async (criterionId: string) => {
        if (task && task.acceptanceCriteria) {
            const updatedCriteria = task.acceptanceCriteria.map(ac =>
                ac.id === criterionId ? { ...ac, isCompleted: !ac.isCompleted } : ac
            );
            await onUpdate(task.id, { acceptanceCriteria: updatedCriteria });
        }
    };

    const handleLogTime = async () => {
        if (!logDuration) return;

        const newLog: TimeLog = {
            id: Math.random().toString(36).substr(2, 9),
            date: logDate,
            durationMinutes: parseInt(logDuration),
            subject: task.subject,
            description: logDescription || 'Task work log'
        };

        const updatedLogs = [...(task.logs || []), newLog];
        await onUpdate(task.id, { logs: updatedLogs });

        setLogDescription('');
        setLogDuration('30');
    };

    const handleAddEvidence = async () => {
        if (!evidenceContent) return;

        const newEvidence: Evidence = {
            id: Math.random().toString(36).substr(2, 9),
            type: evidenceType,
            content: evidenceContent,
            timestamp: new Date().toLocaleTimeString()
        };

        const updatedEvidences = [...(task.evidences || []), newEvidence];
        await onUpdate(task.id, { evidences: updatedEvidences });
        setEvidenceContent('');
    };

    const handleDeleteEvidence = async (id: string) => {
        const updatedEvidences = (task.evidences || []).filter(e => e.id !== id);
        await onUpdate(task.id, { evidences: updatedEvidences });
    };

    const handleStatusChange = async (newStatus: TaskStatus) => {
        await onUpdate(task.id, { status: newStatus });
    };

    return (
        <div className="w-[400px] border-l border-gray-200 bg-white h-full overflow-y-auto shadow-xl z-20 absolute right-0 top-0 bottom-0 animate-slide-in-right">
            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                        <span
                            className="text-xs font-bold px-2 py-1 rounded text-white"
                            style={{ backgroundColor: SUBJECT_COLORS[task.subject] }}
                        >
                            {task.subject}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">#{task.id}</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-6">{task.title}</h2>

                <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Description</h3>
                    <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-md border border-gray-100">
                        {task.description || "No description provided."}
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900">Acceptance Criteria</h3>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {calculateProgress(task)}% Completed
                        </span>
                    </div>

                    <div className="space-y-2">
                        {(!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) ? (
                            <p className="text-sm text-gray-400 italic">No acceptance criteria defined.</p>
                        ) : (
                            task.acceptanceCriteria.map(ac => (
                                <div
                                    key={ac.id}
                                    className={`flex items-start gap-3 p-3 rounded-md border transition-all cursor-pointer ${ac.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-blue-300'}`}
                                    onClick={() => toggleCriterion(ac.id)}
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
                            {(task.evidences || []).length} Attached
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
                        {(!task.evidences || task.evidences.length === 0) ? (
                            <p className="text-xs text-gray-400 italic text-center">No evidences attached yet.</p>
                        ) : (
                            task.evidences.map(ev => (
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
                            Total: {calculateTotalTime(task)}
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
                        {(!task.logs || task.logs.length === 0) ? (
                            <p className="text-xs text-gray-400 italic text-center py-2">No time logged yet.</p>
                        ) : (
                            task.logs.map(log => (
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
                                onClick={() => handleStatusChange(status)}
                                disabled={status === TaskStatus.DONE && (task.acceptanceCriteria || []).some(ac => !ac.isCompleted)}
                                className={`flex-1 py-2 text-xs font-medium rounded-md border ${task.status === status
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    } ${status === TaskStatus.DONE && (task.acceptanceCriteria || []).some(ac => !ac.isCompleted) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            <span>Created {task.date}</span>
                        </div>
                        {task.priority && (
                            <div className="flex items-center gap-2">
                                <AlertCircle size={14} className={task.priority === 'High' ? 'text-red-500' : 'text-gray-400'} />
                                <span>{task.priority} Priority</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TaskDetailPanel;
