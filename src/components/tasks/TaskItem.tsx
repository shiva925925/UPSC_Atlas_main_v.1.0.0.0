import { Task, TaskStatus, Subject, SubjectCategory } from '../../types';
import { SUBJECT_HIERARCHY, CATEGORY_COLORS } from '../../constants';
import { AlertCircle, Calendar, Archive, Trash2, RotateCcw, Ban, Edit } from 'lucide-react';

interface TaskItemProps {
    task: Task;
    isSelected: boolean;
    activeTab: 'ACTIVE' | 'ARCHIVED' | 'TRASH';
    onClick: (task: Task) => void;
    onArchive: (id: string) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
    task,
    isSelected,
    activeTab,
    onClick,
    onArchive,
    onDelete,
    onRestore,
    onPermanentDelete
}) => {
    const calculateProgress = (task: Task) => {
        if (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) return 0;
        const completed = task.acceptanceCriteria.filter(ac => ac.isCompleted).length;
        return Math.round((completed / task.acceptanceCriteria.length) * 100);
    };

    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case TaskStatus.TODO: return 'bg-gray-500/10 text-gray-600 border border-gray-500/20';
            case TaskStatus.IN_PROGRESS: return 'bg-blue-500/10 text-blue-700 border border-blue-500/20';
            case TaskStatus.DONE: return 'bg-green-500/10 text-green-700 border border-green-500/20';
            default: return 'bg-gray-500/10 text-gray-600';
        }
    };

    const subjectCategory = SUBJECT_HIERARCHY[task.subject] || SubjectCategory.GENERAL;
    const colors = CATEGORY_COLORS[subjectCategory] || CATEGORY_COLORS[SubjectCategory.GENERAL];

    return (
        <div
            onClick={() => onClick(task)}
            className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 items-center hover:bg-white/10 cursor-pointer transition-colors group ${isSelected ? 'bg-blue-500/5' : ''}`}
        >
            {/* Task Title & Progress */}
            <div className="col-span-4">
                <h4 className="text-sm font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200/50 rounded-full h-1.5">
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
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.background} ${colors.text}`}
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

            {/* Due Date & Actions */}
            <div className="col-span-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>{task.date}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onClick(task); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Task"
                    >
                        <Edit size={16} />
                    </button>
                    {activeTab === 'ACTIVE' && (
                        <>
                            {task.status === TaskStatus.DONE && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onArchive(task.id); }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    title="Archive"
                                >
                                    <Archive size={16} />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                title="Move to Trash"
                            >
                                <Trash2 size={16} />
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
