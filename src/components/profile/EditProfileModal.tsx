import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { X, Save } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfile;
    onSave: (updatedProfile: UserProfile) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, userProfile, onSave }) => {
    const [name, setName] = useState(userProfile.name);
    const [targetYear, setTargetYear] = useState(userProfile.targetYear.toString());
    const [isSaving, setIsSaving] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setName(userProfile.name);
            setTargetYear(userProfile.targetYear.toString());
        }
    }, [isOpen, userProfile]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const updated: UserProfile = {
                ...userProfile,
                name: name,
                targetYear: parseInt(targetYear),
            };
            await onSave(updated);
            onClose();
        } catch (error) {
            console.error("Failed to update profile:", error);
            alert("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <GlassCard variant="opaque" className="w-full max-w-md relative overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Year</label>
                        <input
                            type="number"
                            value={targetYear}
                            onChange={(e) => setTargetYear(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            min="2024"
                            max="2030"
                            required
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <Save size={16} />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};

export default EditProfileModal;
