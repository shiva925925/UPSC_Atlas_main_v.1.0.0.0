import React, { useState } from 'react';
import { Subject, Task, TaskStatus } from '../../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (task: Partial<Task>) => Promise<void>;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskSubject, setNewTaskSubject] = useState<Subject>(Subject.GENERAL);
    const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
    const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newCriterion, setNewCriterion] = useState('');
    const [criteria, setCriteria] = useState<string[]>([]);

    const handleAddCriterion = () => {
        if (newCriterion.trim()) {
            setCriteria([...criteria, newCriterion.trim()]);
            setNewCriterion('');
        }
    };

    const handleRemoveCriterion = (index: number) => {
        setCriteria(criteria.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const formattedCriteria = criteria.map(text => ({
            id: Math.random().toString(36).substr(2, 9),
            text,
            isCompleted: false
        }));

        await onCreate({
            title: newTaskTitle,
            subject: newTaskSubject,
            priority: newTaskPriority,
            date: newTaskDate,
            description: newTaskDescription,
            status: TaskStatus.TODO,
            acceptanceCriteria: formattedCriteria,
            logs: [],
            evidences: [],
            isArchived: false,
            isDeleted: false
        });

        // Reset form
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskSubject(Subject.GENERAL);
        setNewTaskPriority('Medium');
        setNewTaskDate(new Date().toISOString().split('T')[0]);
        setCriteria([]);
        setNewCriterion('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Create New Task</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                        <div className="flex gap-6">
                            {(['High', 'Medium', 'Low'] as const).map((p) => (
                                <label key={p} className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${newTaskPriority === p ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}>
                                        {newTaskPriority === p && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <input
                                        type="radio"
                                        name="priority"
                                        value={p}
                                        checked={newTaskPriority === p}
                                        onChange={(e) => setNewTaskPriority(e.target.value as any)}
                                        className="hidden"
                                    />
                                    <span className={`text-sm ${newTaskPriority === p ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{p}</span>
                                </label>
                            ))}
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
                    
                    {/* Acceptance Criteria Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Criteria</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newCriterion}
                                onChange={(e) => setNewCriterion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCriterion())}
                                placeholder="Add checklist item..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                            <button
                                type="button"
                                onClick={handleAddCriterion}
                                disabled={!newCriterion.trim()}
                                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        
                        {criteria.length > 0 && (
                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar bg-gray-50 p-2 rounded-md border border-gray-100">
                                {criteria.map((text, index) => (
                                    <div key={index} className="flex items-center justify-between group bg-white p-2 rounded border border-gray-100 shadow-sm">
                                        <span className="text-sm text-gray-700 truncate mr-2">{text}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCriterion(index)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
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
    );
};

export default CreateTaskModal;
