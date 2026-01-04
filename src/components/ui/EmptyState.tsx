import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, message, actionLabel, onAction }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full animate-fade-in">
            <div className="bg-gray-100/50 p-4 rounded-full mb-4 backdrop-blur-sm">
                <Icon size={48} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6">{message}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm text-sm"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
