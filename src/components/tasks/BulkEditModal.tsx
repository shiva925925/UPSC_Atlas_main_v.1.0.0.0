import React, { useState } from 'react';
import { Task, TaskStatus, Subject, SubjectCategory, Priority } from '../../types';
import { SUBJECT_HIERARCHY } from '../../constants';
import { X, Check } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface BulkEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updates: Partial<Task>) => Promise<void>;
    selectedCount: number;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ isOpen, onClose, onSave, selectedCount }) => {
    const [activeFields, setActiveFields] = useState<Set<string>>(new Set());
    const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkStatus, setBulkStatus] = useState<TaskStatus>(TaskStatus.TODO);
    const [bulkPriority, setBulkPriority] = useState<Priority>('Medium');
    const [bulkSubject, setBulkSubject] = useState<Subject>(Subject.GENERAL);

    const toggleField = (field: string) => {
        setActiveFields(prev => {
            const next = new Set(prev);
            if (next.has(field)) next.delete(field);
            else next.add(field);
            return next;
        });
    };

    const handleSave = async () => {
        const updates: Partial<Task> = {};
        if (activeFields.has('date')) updates.date = bulkDate;
        if (activeFields.has('status')) updates.status = bulkStatus;
        if (activeFields.has('priority')) updates.priority = bulkPriority;
        if (activeFields.has('subject')) updates.subject = bulkSubject;

        if (Object.keys(updates).length > 0) {
            await onSave(updates);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <GlassCard variant="blur" className="max-w-md w-full p-6 border-white/10 animate-scale-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white">Bulk Edit Tasks</h3>
                        <p className="text-xs text-text-muted mt-1">Updating {selectedCount} selected items</p>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Status Field */}
                    <div className={`p-3 rounded-xl border transition-all ${activeFields.has('status') ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-black uppercase tracking-widest text-text-muted">Status</label>
                            <button
                                onClick={() => toggleField('status')}
                                className={`w-5 h-5 rounded flex items-center justify-center transition-all ${activeFields.has('status') ? 'bg-blue-600' : 'bg-white/10'}`}
                            >
                                {activeFields.has('status') && <Check size={14} className="text-white" />}
                            </button>
                        </div>
                        <select
                            disabled={!activeFields.has('status')}
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value as TaskStatus)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-30"
                        >
                            {Object.values(TaskStatus).map(s => (
                                <option key={s} value={s} className="bg-aside-bg">{s.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {/* Priority Field */}
                    <div className={`p-3 rounded-xl border transition-all ${activeFields.has('priority') ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-black uppercase tracking-widest text-text-muted">Priority</label>
                            <button
                                onClick={() => toggleField('priority')}
                                className={`w-5 h-5 rounded flex items-center justify-center transition-all ${activeFields.has('priority') ? 'bg-blue-600' : 'bg-white/10'}`}
                            >
                                {activeFields.has('priority') && <Check size={14} className="text-white" />}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            {(['High', 'Medium', 'Low'] as Priority[]).map((p) => (
                                <button
                                    key={p}
                                    disabled={!activeFields.has('priority')}
                                    onClick={() => setBulkPriority(p)}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${!activeFields.has('priority') ? 'opacity-30' :
                                        bulkPriority === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-text-muted hover:bg-white/10'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Field */}
                    <div className={`p-3 rounded-xl border transition-all ${activeFields.has('date') ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-black uppercase tracking-widest text-text-muted">Date</label>
                            <button
                                onClick={() => toggleField('date')}
                                className={`w-5 h-5 rounded flex items-center justify-center transition-all ${activeFields.has('date') ? 'bg-blue-600' : 'bg-white/10'}`}
                            >
                                {activeFields.has('date') && <Check size={14} className="text-white" />}
                            </button>
                        </div>
                        <input
                            type="date"
                            disabled={!activeFields.has('date')}
                            value={bulkDate}
                            onChange={(e) => setBulkDate(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-30 [color-scheme:dark]"
                        />
                    </div>

                    {/* Subject Field */}
                    <div className={`p-3 rounded-xl border transition-all ${activeFields.has('subject') ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-black uppercase tracking-widest text-text-muted">Domain</label>
                            <button
                                onClick={() => toggleField('subject')}
                                className={`w-5 h-5 rounded flex items-center justify-center transition-all ${activeFields.has('subject') ? 'bg-blue-600' : 'bg-white/10'}`}
                            >
                                {activeFields.has('subject') && <Check size={14} className="text-white" />}
                            </button>
                        </div>
                        <select
                            disabled={!activeFields.has('subject')}
                            value={bulkSubject}
                            onChange={(e) => setBulkSubject(e.target.value as Subject)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-30"
                        >
                            {Object.keys(SUBJECT_HIERARCHY).map(s => (
                                <option key={s} value={s} className="bg-aside-bg">{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={activeFields.size === 0}
                        className="flex-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
                    >
                        Apply Changes to {selectedCount} Tasks
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

export default BulkEditModal;
