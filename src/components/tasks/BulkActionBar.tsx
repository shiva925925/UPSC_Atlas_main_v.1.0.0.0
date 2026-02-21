import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Subject, Priority } from '../../types';
import { SUBJECT_HIERARCHY } from '../../constants';
import { Check, X, Calendar, List, AlertCircle, BookOpen } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface BulkActionBarProps {
    selectedTasks: Task[];
    onSave: (updates: Partial<Task>) => void;
    onCancel: () => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({ selectedTasks, onSave, onCancel }) => {
    const [status, setStatus] = useState<string | 'MULTIPLE'>('MULTIPLE');
    const [priority, setPriority] = useState<string | 'MULTIPLE'>('MULTIPLE');
    const [subject, setSubject] = useState<string | 'MULTIPLE'>('MULTIPLE');
    const [date, setDate] = useState<string | 'MULTIPLE'>('MULTIPLE');

    // Calculate Indeterminate States on mount or selection change
    useEffect(() => {
        if (selectedTasks.length === 0) return;

        const first = selectedTasks[0];
        const isSameStatus = selectedTasks.every(t => t.status === first.status);
        const isSamePriority = selectedTasks.every(t => t.priority === first.priority);
        const isSameSubject = selectedTasks.every(t => t.subject === first.subject);
        const isSameDate = selectedTasks.every(t => t.date === first.date);

        setStatus(isSameStatus ? first.status : 'MULTIPLE');
        setPriority(isSamePriority ? first.priority : 'MULTIPLE');
        setSubject(isSameSubject ? first.subject : 'MULTIPLE');
        setDate(isSameDate ? first.date : 'MULTIPLE');
    }, [selectedTasks]);

    const handleApply = () => {
        const updates: Partial<Task> = {};
        if (status !== 'MULTIPLE') updates.status = status as TaskStatus;
        if (priority !== 'MULTIPLE') updates.priority = priority as Priority;
        if (subject !== 'MULTIPLE') updates.subject = subject as Subject;
        if (date !== 'MULTIPLE') updates.date = date;

        if (Object.keys(updates).length > 0) {
            onSave(updates);
        }
    };

    return (
        <div className="animate-in slide-in-from-top-4 duration-300 mb-4 z-30">
            <GlassCard variant="blur" className="flex items-center justify-between gap-4 px-6 py-3 border-blue-500/30 bg-blue-500/5 shadow-lg shadow-blue-500/10 rounded-xl">
                <div className="flex items-center gap-6 flex-1 overflow-x-auto custom-scrollbar-hide">
                    {/* Selection Count Label */}
                    <div className="flex flex-col shrink-0 min-w-[80px]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Targeting</span>
                        <span className="text-sm font-bold text-text-main leading-tight">{selectedTasks.length} Tasks</span>
                    </div>

                    <div className="w-px h-8 bg-card-border shrink-0" />

                    {/* Status Dropdown */}
                    <div className="flex flex-col gap-1 min-w-[120px]">
                        <label className="text-[9px] font-bold text-text-muted flex items-center gap-1.5 uppercase">
                            <List size={10} /> Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="bg-card-bg/50 border border-card-border rounded-lg px-2 py-1 text-xs font-bold text-text-main focus:ring-1 focus:ring-blue-500/50 outline-none cursor-pointer"
                        >
                            <option value="MULTIPLE" disabled={status !== 'MULTIPLE'}>— Multiple —</option>
                            {Object.values(TaskStatus).map(s => (
                                <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {/* Priority Dropdown */}
                    <div className="flex flex-col gap-1 min-w-[100px]">
                        <label className="text-[9px] font-bold text-text-muted flex items-center gap-1.5 uppercase">
                            <AlertCircle size={10} /> Priority
                        </label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="bg-card-bg/50 border border-card-border rounded-lg px-2 py-1 text-xs font-bold text-text-main focus:ring-1 focus:ring-blue-500/50 outline-none cursor-pointer"
                        >
                            <option value="MULTIPLE" disabled={priority !== 'MULTIPLE'}>— Multiple —</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>

                    {/* Subject Dropdown */}
                    <div className="flex flex-col gap-1 min-w-[140px]">
                        <label className="text-[9px] font-bold text-text-muted flex items-center gap-1.5 uppercase">
                            <BookOpen size={10} /> Domain
                        </label>
                        <select
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="bg-card-bg/50 border border-card-border rounded-lg px-2 py-1 text-xs font-bold text-text-main focus:ring-1 focus:ring-blue-500/50 outline-none cursor-pointer truncate"
                        >
                            <option value="MULTIPLE" disabled={subject !== 'MULTIPLE'}>— Multiple —</option>
                            {Object.keys(SUBJECT_HIERARCHY).map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Picker */}
                    <div className="flex flex-col gap-1 min-w-[130px]">
                        <label className="text-[9px] font-bold text-text-muted flex items-center gap-1.5 uppercase">
                            <Calendar size={10} /> Deadline
                        </label>
                        <input
                            type="date"
                            value={date === 'MULTIPLE' ? '' : date}
                            onChange={(e) => setDate(e.target.value)}
                            placeholder={date === 'MULTIPLE' ? 'Multiple' : ''}
                            className={`bg-card-bg/50 border border-card-border rounded-lg px-2 py-1 text-xs font-bold text-text-main focus:ring-1 focus:ring-blue-500/50 outline-none cursor-pointer ${date === 'MULTIPLE' ? 'text-text-muted' : ''}`}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pl-4">
                    <button
                        onClick={onCancel}
                        className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Discard Changes"
                    >
                        <X size={18} />
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <Check size={16} /> Apply Changes
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

export default BulkActionBar;
