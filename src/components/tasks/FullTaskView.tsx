import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../db';
import { Task } from '../../types';
import TaskDetailPanel from './TaskDetailPanel';
import { Loader } from 'lucide-react';

const FullTaskView: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTask = async () => {
            if (!taskId) return;
            try {
                const foundTask = await db.tasks.get(taskId);
                setTask(foundTask || null);
            } catch (error) {
                console.error("Failed to fetch task:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTask();
    }, [taskId]);

    const handleUpdate = async (taskId: string, updates: Partial<Task>) => {
        await db.tasks.update(taskId, updates);
        const updated = await db.tasks.get(taskId);
        if (updated) setTask(updated);
    };

    if (loading) {
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
                    className="w-full max-w-5xl h-full shadow-none border-none"
                />
            </div>
        </div>
    );
};

export default FullTaskView;
