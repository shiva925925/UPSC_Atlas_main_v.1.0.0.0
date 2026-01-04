import React, { useState } from 'react';
import { Task, TaskStatus } from '../../types';
import { X, Search, CheckCircle, Circle } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface TaskSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    onSelectTask: (task: Task) => void;
}

const TaskSelectorModal: React.FC<TaskSelectorModalProps> = ({ isOpen, onClose, tasks, onSelectTask }) => {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (task.status === TaskStatus.TODO || task.status === TaskStatus.IN_PROGRESS)
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <GlassCard
                variant="opaque"
                className="w-full max-w-lg relative overflow-hidden flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Link Task</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            <p>No matching active tasks found.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredTasks.map(task => (
                                <button
                                    key={task.id}
                                    onClick={() => onSelectTask(task)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all text-left group"
                                >
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700">{task.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${task.status === TaskStatus.TODO ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                                                }`}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-gray-400">#{task.id}</span>
                                        </div>
                                    </div>
                                    <div className="text-gray-300 group-hover:text-blue-500">
                                        <Circle size={20} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
};

export default TaskSelectorModal;
