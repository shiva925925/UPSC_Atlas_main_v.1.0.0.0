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
            <div className="bg-text-main/5 p-6 rounded-full mb-6 backdrop-blur-sm border border-card-border/50">
                <Icon size={48} className="text-text-muted/60" />
            </div>
            <h3 className="text-xl font-black text-text-main mb-2 uppercase tracking-tight">{title}</h3>
            <p className="text-sm text-text-muted max-w-xs mb-8 leading-relaxed font-medium">{message}</p>
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
