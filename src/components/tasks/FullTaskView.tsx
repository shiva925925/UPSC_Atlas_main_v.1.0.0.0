import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../db';
import { Task } from '../../types';
import TaskDetailPanel from './TaskDetailPanel';
import { Loader } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { updateTaskProgress } from '../../services/taskSyncService';

const FullTaskView: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();

    // Reactively fetch task from Dexie
    const task = useLiveQuery(
        () => taskId ? db.tasks.get(taskId) : Promise.resolve(null),
        [taskId]
    );

    const handleUpdate = async (id: string, updates: Partial<Task>) => {
        await db.tasks.update(id, updates);
        await updateTaskProgress(id, updates);
    };

    if (task === undefined) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
                <Loader className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-gray-500">
                Task not found.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex justify-center">
            <div className="w-full max-w-4xl h-[90vh]">
                <TaskDetailPanel
                    task={task}
                    onClose={() => window.close()}
                    onUpdate={handleUpdate}
                    onSelectTask={(id) => navigate(`/task/${id}`)}
                    className="w-full max-w-5xl h-full shadow-none border-none"
                />
            </div>
        </div>
    );
};

export default FullTaskView;
