import React, { useState, useRef } from 'react';
import { Task, TaskStatus, Subject, EvidenceType, TimeLog, Evidence, SubjectCategory, Priority } from '../../types';
import { SUBJECT_HIERARCHY, CATEGORY_COLORS } from '../../constants';
import { X, CheckSquare, Square, Paperclip, Link as LinkIcon, FileText, Trash2, Plus, Clock, Save, AlertCircle, Edit, Upload, ExternalLink, Share2, ArrowUpCircle, Search, Calendar } from 'lucide-react';
import PremiumStar from '../ui/PremiumStar';
import GlassCard from '../ui/GlassCard';
import { uploadFile } from '../../services/uploadService';
import { ensureProtocol } from '../../utils/urlHelper';
import { linkTasks, promoteCriterionToTask, unlinkTasks } from '../../services/taskSyncService';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TaskDetailPanelProps {
    task: Task;
    onClose: () => void;
    onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
    onSelectTask?: (taskId: string) => void;
    className?: string;
}

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, onClose, onUpdate, onSelectTask, className }) => {
    // Time Logging Form State
    const [logDuration, setLogDuration] = useState<string>('30');
    const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [logDescription, setLogDescription] = useState<string>('');

    // Evidence Form State
    const [evidenceType, setEvidenceType] = useState<EvidenceType>(EvidenceType.LINK);
    const [evidenceContent, setEvidenceContent] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Description Edit State
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');

    // Acceptance Criteria Edit State
    const [newCriterion, setNewCriterion] = useState('');
    const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
    const [editedCriterionText, setEditedCriterionText] = useState('');

    // Linking State
    const [linkingQuery, setLinkingQuery] = useState('');
    const [isSearchingTasks, setIsSearchingTasks] = useState(false);

    // Fetch all tasks for linking search
    const allTasks = useLiveQuery(() => db.tasks.toArray()) || [];

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleAddEvidence = async () => {
        if (evidenceType === EvidenceType.FILE && !selectedFile) return;
        if (evidenceType !== EvidenceType.FILE && !evidenceContent) return;

        let finalContent = evidenceContent;
        let finalType = evidenceType;

        if (evidenceType === EvidenceType.FILE && selectedFile) {
            try {
                const result = await uploadFile(selectedFile);
                finalContent = result.url;
                // Files uploaded become links to that file
                finalType = EvidenceType.LINK;
            } catch (error) {
                alert('Failed to upload file.');
                console.error(error);
                return;
            }
        }

        const newEvidence: Evidence = {
            id: Math.random().toString(36).substr(2, 9),
            type: finalType,
            content: finalContent,
            timestamp: new Date().toLocaleTimeString()
        };

        const updatedEvidences = [...(task.evidences || []), newEvidence];
        await onUpdate(task.id, { evidences: updatedEvidences });

        // Reset form
        setEvidenceContent('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeleteEvidence = async (id: string) => {
        const updatedEvidences = (task.evidences || []).filter(e => e.id !== id);
        await onUpdate(task.id, { evidences: updatedEvidences });
    };

    const handleStatusChange = async (newStatus: TaskStatus) => {
        await onUpdate(task.id, { status: newStatus });
    };

    const handleSaveDescription = async () => {
        await onUpdate(task.id, { description: editedDescription });
        setIsEditingDescription(false);
    };

    const handleAddCriterion = async () => {
        if (!newCriterion.trim()) return;
        const newAC = {
            id: Math.random().toString(36).substr(2, 9),
            text: newCriterion,
            isCompleted: false
        };
        const updated = [...(task.acceptanceCriteria || []), newAC];
        await onUpdate(task.id, { acceptanceCriteria: updated });
        setNewCriterion('');
    };

    const handleDeleteCriterion = async (id: string) => {
        const updated = (task.acceptanceCriteria || []).filter(ac => ac.id !== id);
        await onUpdate(task.id, { acceptanceCriteria: updated });
    };

    const startEditingCriterion = (id: string, text: string) => {
        setEditingCriterionId(id);
        setEditedCriterionText(text);
    };

    const saveCriterion = async () => {
        if (!editingCriterionId) return;
        const updated = (task.acceptanceCriteria || []).map(ac =>
            ac.id === editingCriterionId ? { ...ac, text: editedCriterionText } : ac
        );
        await onUpdate(task.id, { acceptanceCriteria: updated });
        setEditingCriterionId(null);
    };

    const handlePromoteToTask = async (criterionText: string) => {
        if (window.confirm(`Create a new task for "${criterionText}"?`)) {
            await promoteCriterionToTask(task.id, criterionText);
            // The onUpdate in promoteCriterionToTask will handle parent state refresh
        }
    };

    const handleAddLink = async (targetTaskId: string) => {
        if (targetTaskId === task.id) return;
        await linkTasks(task.id, targetTaskId);
        // Refresh local UI state (redundant but safe with the new TasksView refactor)
        setLinkingQuery('');
        setIsSearchingTasks(false);
    };

    const handleRemoveLink = async (targetTaskId: string) => {
        await unlinkTasks(task.id, targetTaskId);
    };

    const filteredLinkingTasks = allTasks
        .filter(t => t.id !== task.id && !(task.linkedTaskIds || []).includes(t.id))
        .filter(t => t.title.toLowerCase().includes(linkingQuery.toLowerCase()))
        .slice(0, 5);

    const linkedTasks = allTasks.filter(t => (task.linkedTaskIds || []).includes(t.id));

    const subjectCategory = SUBJECT_HIERARCHY[task.subject] || SubjectCategory.GENERAL;
    // Safe access in case category is missing from colors map
    const colors = CATEGORY_COLORS[subjectCategory] || CATEGORY_COLORS[SubjectCategory.GENERAL];

    return (
        <GlassCard variant="blur" className={twMerge(clsx("w-full border-card-border h-full overflow-y-auto shadow-2xl rounded-2xl bg-card-bg transition-colors duration-300", className))}>
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex gap-2 flex-1 min-w-0">
                            <div className="min-w-0 flex-1">
                                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Subject</label>
                                <select
                                    value={subjectCategory}
                                    onChange={(e) => {
                                        const newCategory = e.target.value as SubjectCategory;
                                        const firstTopic = Object.entries(SUBJECT_HIERARCHY)
                                            .find(([_, cat]) => cat === newCategory)?.[0] as Subject;
                                        if (firstTopic) onUpdate(task.id, { subject: firstTopic });
                                    }}
                                    className="w-full text-xs font-bold px-2 py-1.5 rounded border border-card-border bg-card-bg text-text-main hover:border-blue-500/50 focus:border-blue-500 focus:outline-none cursor-pointer truncate transition-all duration-200"
                                >
                                    {Object.values(SubjectCategory).map(category => (
                                        <option key={category} value={category} className="bg-app-bg">{category}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="min-w-0 flex-1">
                                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Topic</label>
                                <select
                                    value={task.subject}
                                    onChange={(e) => onUpdate(task.id, { subject: e.target.value as Subject })}
                                    className="w-full text-xs font-bold px-2 py-1.5 rounded border border-card-border bg-card-bg text-text-main hover:border-blue-500/50 focus:border-blue-500 focus:outline-none cursor-pointer truncate transition-all duration-200"
                                >
                                    {Object.entries(SUBJECT_HIERARCHY)
                                        .filter(([_, cat]) => cat === subjectCategory)
                                        .map(([subject, _]) => (
                                            <option key={subject} value={subject} className="bg-app-bg">{subject}</option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <PremiumStar
                            isStarred={task.isStarred || false}
                            size={20}
                            onClick={() => onUpdate(task.id, { isStarred: !task.isStarred })}
                            className="bg-white/5 p-1 rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={() => window.open(`/task/${task.id}`, '_blank')}
                            className="p-1 hover:bg-white/10 rounded text-text-muted transition-colors flex-shrink-0 ml-1"
                            title="Open in New Tab"
                        >
                            <ExternalLink size={20} />
                        </button>
                        <button type="button" onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-muted transition-colors flex-shrink-0 ml-1">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <h2 className="text-xl font-bold text-text-main mb-4">{task.title}</h2>

                <div className="mb-5">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-text-main">Description</h3>
                        {!isEditingDescription && (
                            <button
                                type="button"
                                onClick={() => { setEditedDescription(task.description || ''); setIsEditingDescription(true); }}
                                className="text-text-muted hover:text-blue-600 p-1"
                                title="Edit Description"
                            >
                                <Edit size={14} />
                            </button>
                        )}
                    </div>
                    {isEditingDescription ? (
                        <div className="space-y-2">
                            <textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="w-full text-sm border border-card-border bg-card-bg text-text-main rounded-md p-3 min-h-[120px] focus:ring-1 focus:ring-blue-500 outline-none resize-y"
                                placeholder="Enter task description..."
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsEditingDescription(false)}
                                    className="text-xs text-text-muted px-3 py-1.5 border border-card-border rounded hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveDescription}
                                    className="text-xs text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                    <Save size={12} /> Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-text-main leading-relaxed bg-text-main/5 p-3 rounded-md border border-card-border whitespace-pre-wrap">
                            {task.description || "No description provided."}
                        </div>
                    )}
                </div>

                {/* Linked Tasks Section */}
                <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                            <Share2 size={16} className="text-blue-500" /> Linked Topics
                        </h3>
                        <button
                            onClick={() => setIsSearchingTasks(!isSearchingTasks)}
                            className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase"
                        >
                            {isSearchingTasks ? 'Cancel' : '+ Add Link'}
                        </button>
                    </div>

                    {isSearchingTasks && (
                        <div className="mb-3 relative">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={12} />
                                <input
                                    type="text"
                                    value={linkingQuery}
                                    onChange={(e) => setLinkingQuery(e.target.value)}
                                    placeholder="Search task to link..."
                                    className="w-full text-xs bg-card-bg border border-card-border rounded-md pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>

                            {linkingQuery && filteredLinkingTasks.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-card-bg border border-card-border rounded-md shadow-xl z-50 overflow-hidden divide-y divide-card-border">
                                    {filteredLinkingTasks.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleAddLink(t.id);
                                            }}
                                            className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-500/10 text-text-main transition-colors flex flex-col"
                                        >
                                            <span className="font-bold truncate">{t.title}</span>
                                            <span className="text-[9px] text-text-muted">{t.subject}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {linkedTasks.length === 0 && !isSearchingTasks && (
                            <p className="text-[11px] text-text-muted italic">No linked tasks.</p>
                        )}
                        {linkedTasks.map(t => (
                            <div
                                key={t.id}
                                className="flex items-center gap-2 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md group cursor-pointer transition-all"
                                onClick={() => onSelectTask?.(t.id)}
                            >
                                <LinkIcon size={10} className="text-blue-500" />
                                <span className="text-[11px] text-text-main font-bold hover:text-blue-600 transition-colors uppercase tracking-tight">{t.title}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveLink(t.id);
                                    }}
                                    className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-text-main">Acceptance Criteria</h3>
                        <span className="text-xs text-text-muted bg-text-main/5 px-2 py-1 rounded">
                            {calculateProgress(task)}% Completed
                        </span>
                    </div>

                    <div className="space-y-2 mb-2">
                        {(!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) ? (
                            <p className="text-sm text-text-muted italic">No acceptance criteria defined.</p>
                        ) : (
                            task.acceptanceCriteria.map(ac => (
                                <div
                                    key={ac.id}
                                    className={`group flex items-start gap-3 p-2 rounded-md border transition-all ${ac.isCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-card-border hover:border-blue-500/50'}`}
                                >
                                    <div
                                        className="flex items-start gap-3 flex-1 cursor-pointer"
                                        onClick={() => editingCriterionId !== ac.id && toggleCriterion(ac.id)}
                                    >
                                        <button type="button" className={`mt-0.5 flex-shrink-0 ${ac.isCompleted ? 'text-green-600' : 'text-text-muted'}`}>
                                            {ac.isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>

                                        {editingCriterionId === ac.id ? (
                                            <div className="flex-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={editedCriterionText}
                                                    onChange={(e) => setEditedCriterionText(e.target.value)}
                                                    className="flex-1 text-sm border border-card-border bg-card-bg rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none text-text-main"
                                                    autoFocus
                                                />
                                                <button type="button" onClick={saveCriterion} className="text-green-600 hover:bg-green-500/10 p-1 rounded"><Save size={14} /></button>
                                                <button type="button" onClick={() => setEditingCriterionId(null)} className="text-text-muted hover:bg-white/10 p-1 rounded"><X size={14} /></button>
                                            </div>
                                        ) : (
                                            <span className={`text-sm flex-1 ${ac.isCompleted ? 'text-green-500/80 line-through decoration-green-500/50' : 'text-text-main'}`}>
                                                {ac.text}
                                            </span>
                                        )}
                                    </div>

                                    {editingCriterionId !== ac.id && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!ac.text.includes('PROMOTED →') && (
                                                <button
                                                    type="button"
                                                    onClick={() => handlePromoteToTask(ac.text)}
                                                    className="text-gray-400 hover:text-green-600 p-1 rounded hover:bg-gray-100"
                                                    title="Promote to standalone Task"
                                                >
                                                    <ArrowUpCircle size={14} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => startEditingCriterion(ac.id, ac.text)}
                                                className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-gray-100"
                                                title="Edit"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCriterion(ac.id)}
                                                className="text-text-muted hover:text-red-600 p-1 rounded hover:bg-white/10"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add New Criterion Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCriterion}
                            onChange={(e) => setNewCriterion(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
                            placeholder="Add new criterion..."
                            className="flex-1 text-sm border border-card-border bg-card-bg/50 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none text-text-main"
                        />
                        <button
                            type="button"
                            onClick={handleAddCriterion}
                            disabled={!newCriterion.trim()}
                            className="bg-card-bg/50 hover:bg-card-bg/80 text-text-main px-3 py-2 rounded border border-card-border transition-colors disabled:opacity-50"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Evidence Section */}
                <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                            <Paperclip size={16} /> Evidences
                        </h3>
                        <span className="text-xs bg-text-main/5 text-text-muted px-2 py-1 rounded">
                            {(task.evidences || []).length} Attached
                        </span>
                    </div>

                    <div className="bg-text-main/5 p-3 rounded-lg border border-card-border mb-3">
                        <div className="flex gap-2 mb-2">
                            <select
                                value={evidenceType}
                                onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                                className="text-xs border border-card-border bg-card-bg rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none min-w-[80px] text-text-main"
                            >
                                <option value={EvidenceType.LINK}>Link</option>
                                <option value={EvidenceType.TEXT}>Note</option>
                                <option value={EvidenceType.FILE}>File</option>
                            </select>

                            {evidenceType === EvidenceType.FILE ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1 px-2 py-1.5 border border-dashed border-card-border rounded bg-card-bg/50 text-xs text-text-muted truncate cursor-pointer hover:bg-white/5" onClick={() => fileInputRef.current?.click()}>
                                        {selectedFile ? selectedFile.name : 'Choose a file...'}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={evidenceContent}
                                    onChange={(e) => setEvidenceContent(e.target.value)}
                                    placeholder={evidenceType === EvidenceType.LINK ? "Paste URL here..." : "Type your note..."}
                                    className="flex-1 text-sm border border-card-border bg-card-bg rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-text-main"
                                />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleAddEvidence}
                            disabled={evidenceType !== EvidenceType.FILE && !evidenceContent}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus size={14} />
                            {evidenceType === EvidenceType.FILE ? 'Upload & Attach' : 'Attach Evidence'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {(!task.evidences || task.evidences.length === 0) ? (
                            <p className="text-xs text-text-muted italic text-center">No evidences attached yet.</p>
                        ) : (
                            task.evidences.map(ev => (
                                <div key={ev.id} className="flex items-center justify-between bg-card-bg/50 border border-card-border p-2 rounded-md group">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {ev.type === EvidenceType.LINK ? (
                                            <LinkIcon size={14} className="text-blue-500 shrink-0" />
                                        ) : (
                                            <FileText size={14} className="text-text-muted shrink-0" />
                                        )}
                                        {ev.type === EvidenceType.LINK ? (
                                            <a
                                                href={ensureProtocol(ev.content)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 truncate hover:underline"
                                            >
                                                {ev.content}
                                            </a>
                                        ) : (
                                            <span className="text-xs text-text-main truncate">{ev.content}</span>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => handleDeleteEvidence(ev.id)} className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Time Logging Section */}
                <div className="mb-5 border-t border-card-border pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                            <Clock size={16} /> Time Tracking
                        </h3>
                        <span className="text-xs font-bold bg-blue-500/10 text-blue-500 px-2 py-1 rounded">
                            {calculateTotalTime(task)}
                        </span>
                    </div>

                    <div className="bg-card-bg/30 p-3 rounded-lg border border-card-border">
                        <div className="flex gap-2 mb-2">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-text-muted mb-1">Duration (min)</label>
                                <input
                                    type="number"
                                    value={logDuration}
                                    onChange={(e) => setLogDuration(e.target.value)}
                                    className="w-full text-sm border border-card-border bg-card-bg rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-text-main"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-text-muted mb-1">Date</label>
                                <input
                                    type="date"
                                    value={logDate}
                                    onChange={(e) => setLogDate(e.target.value)}
                                    className="w-full text-sm border border-card-border bg-card-bg rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-text-main"
                                />
                            </div>
                        </div>
                        <div className="mb-2">
                            <label className="block text-xs font-medium text-text-muted mb-1">Work Description (Optional)</label>
                            <input
                                type="text"
                                value={logDescription}
                                onChange={(e) => setLogDescription(e.target.value)}
                                placeholder="What did you work on?"
                                className="w-full text-sm border border-card-border bg-card-bg rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-text-main"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleLogTime}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                        >
                            <Save size={14} /> Log Work
                        </button>
                    </div>

                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {(!task.logs || task.logs.length === 0) ? (
                            <p className="text-xs text-text-muted italic text-center py-2">No time logged yet.</p>
                        ) : (
                            task.logs.map(log => (
                                <div key={log.id} className="flex justify-between items-center bg-card-bg border border-card-border p-2 rounded text-xs shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-text-muted font-mono">{log.date}</span>
                                        <span className="text-text-main font-medium">{log.description}</span>
                                    </div>
                                    <span className="font-bold text-blue-500">{log.durationMinutes}m</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Priority Selection */}
                <div className="mb-5">
                    <h3 className="text-sm font-bold text-text-main mb-2">Priority</h3>
                    <select
                        value={task.priority}
                        onChange={(e) => onUpdate(task.id, { priority: e.target.value as Priority })}
                        className="w-full px-3 py-2 border border-card-border bg-card-bg rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-text-main"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                </div>

                {/* Status Status */}
                <div className="mb-5">
                    <h3 className="text-sm font-bold text-text-main mb-2">Status</h3>
                    <div className="flex gap-2">
                        {[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE].map(status => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(status)}
                                disabled={status === TaskStatus.DONE && (task.acceptanceCriteria || []).some(ac => !ac.isCompleted)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md border transition-all ${task.status === status
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                    : 'bg-card-bg/50 text-text-muted border-card-border hover:bg-white/10'
                                    } ${status === TaskStatus.DONE && (task.acceptanceCriteria || []).some(ac => !ac.isCompleted) ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                                {status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-card-border pt-6">
                    <div className="flex justify-between items-center text-xs text-text-muted">
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-text-muted uppercase mb-1">Due Date</label>
                                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 hover:border-blue-500/40 transition-all group shadow-sm">
                                    <Calendar size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                    <input
                                        type="date"
                                        value={task.date}
                                        onChange={(e) => onUpdate(task.id, { date: e.target.value })}
                                        className="bg-transparent border-none p-0 text-[11px] font-bold text-text-main focus:ring-0 cursor-pointer appearance-none min-w-[90px]"
                                        style={{ colorScheme: 'auto' }}
                                    />
                                </div>
                            </div>
                        </div>
                        {task.priority && (
                            <div className="flex items-center gap-2">
                                <AlertCircle size={14} className={task.priority === 'High' ? 'text-red-500' : 'text-text-muted'} />
                                <span>{task.priority} Priority</span>
                            </div>
                        )}
                        <span className="text-xs text-text-muted font-mono ml-4">#{task.id}</span>
                    </div>
                </div>

            </div>
        </GlassCard>

    );
};

export default TaskDetailPanel;
