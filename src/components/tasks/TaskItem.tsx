import React from 'react';
import { Task, TaskStatus, Subject, SubjectCategory } from '../../types';
import { SUBJECT_HIERARCHY, CATEGORY_COLORS } from '../../constants';
import { AlertCircle, Calendar, Archive, Trash2, RotateCcw, Ban, Edit } from 'lucide-react';
import { SearchMatch } from '../../utils/searchHelper';

interface TaskItemProps {
    task: Task;
    isSelected: boolean;
    activeTab: 'ACTIVE' | 'ARCHIVED' | 'TRASH';
    onClick: (task: Task) => void;
    onArchive: (id: string) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    searchMatch?: SearchMatch;
}

const TaskItem: React.FC<TaskItemProps> = ({
    task,
    isSelected,
    activeTab,
    onClick,
    onArchive,
    onDelete,
    onRestore,
    onPermanentDelete,
    searchMatch
}) => {
    const calculateProgress = (task: Task) => {
        if (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) return 0;
        const completed = task.acceptanceCriteria.filter(ac => ac.isCompleted).length;
        return Math.round((completed / task.acceptanceCriteria.length) * 100);
    };

    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case TaskStatus.TODO: return 'bg-text-muted/10 text-text-muted border border-text-muted/20';
            case TaskStatus.IN_PROGRESS: return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
            case TaskStatus.DONE: return 'bg-green-500/10 text-green-400 border border-green-500/20';
            default: return 'bg-text-muted/10 text-text-muted';
        }
    };

    const subjectCategory = SUBJECT_HIERARCHY[task.subject] || SubjectCategory.GENERAL;
    const colors = CATEGORY_COLORS[subjectCategory] || CATEGORY_COLORS[SubjectCategory.GENERAL];

    return (
        <div
            onClick={() => onClick(task)}
            className={`grid grid-cols-12 gap-4 px-6 py-2.5 border-b border-card-border/50 items-center hover:bg-text-main/5 cursor-pointer transition-all group ${isSelected ? 'bg-blue-600/15 ring-1 ring-blue-500/50 z-10' : ''}`}
        >
            {/* Task Title & Progress */}
            <div className="col-span-4 flex flex-col justify-center pr-4 overflow-hidden">
                <div className="flex items-center justify-between gap-4 mb-0.5">
                    <h4 className="text-sm font-bold text-text-main group-hover:text-blue-500 transition-colors truncate" title={task.title}>{task.title}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 bg-text-main/10 dark:bg-white/5 rounded-full h-1.5 border border-white/5">
                            <div
                                className="bg-blue-500 h-full rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)] transition-all duration-500"
                                style={{ width: `${calculateProgress(task)}%` }}
                            ></div>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted w-6 text-right font-bold">{calculateProgress(task)}%</span>
                    </div>
                </div>

                {/* Search Match Snippet */}
                {searchMatch && searchMatch.snippet && (
                    <div className="text-[10px] text-text-muted italic truncate mt-0.5">
                        <span className="font-bold uppercase text-[8px] bg-blue-500/10 px-1 rounded mr-1">
                            {searchMatch.field}
                        </span>
                        {searchMatch.snippet.split(new RegExp(`(${searchMatch.keyword})`, 'gi')).map((part, i) => (
                            part.toLowerCase() === searchMatch.keyword.toLowerCase()
                                ? <mark key={i} className="bg-yellow-500/30 text-text-main rounded-sm px-0.5">{part}</mark>
                                : <span key={i}>{part}</span>
                        ))}
                    </div>
                )}
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
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colors.background} ${colors.text} dark:bg-white/5 dark:text-text-main dark:border-white/20`}
                >
                    {task.subject}
                </span>
            </div>

            {/* Priority */}
            <div className="col-span-2 flex items-center gap-2">
                {task.priority === 'High' && <AlertCircle size={14} className="text-red-500" />}
                <span className={`text-[11px] font-bold uppercase tracking-wider ${task.priority === 'High' ? 'text-red-500' : 'text-text-muted'}`}>
                    {task.priority || 'Normal'}
                </span>
            </div>

            {/* Due Date & Actions */}
            <div className="col-span-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
                    <Calendar size={12} />
                    <span>{task.date}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onClick(task); }}
                        className="p-1.5 text-text-muted hover:text-blue-500 hover:bg-white/10 rounded transition-all"
                        title="Edit Task"
                    >
                        <Edit size={14} />
                    </button>
                    {activeTab === 'ACTIVE' && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); onArchive(task.id); }}
                                className="p-1.5 text-text-muted hover:text-blue-500 hover:bg-white/10 rounded transition-all"
                                title="Archive"
                            >
                                <Archive size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                className="p-1.5 text-text-muted hover:text-red-500 hover:bg-white/10 rounded transition-all"
                                title="Delete Permanently"
                            >
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                    {activeTab === 'ARCHIVED' && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRestore(task.id); }}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                                title="Restore"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                title="Move to Trash"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                    {activeTab === 'TRASH' && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRestore(task.id); }}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                                title="Restore"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onPermanentDelete(task.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Delete Forever"
                            >
                                <Ban size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskItem;
