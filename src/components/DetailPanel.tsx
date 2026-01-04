import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Resource, CustomLink, Subject, SubjectCategory } from '../types';
import { X, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { SUBJECT_HIERARCHY, CATEGORY_COLORS } from '../constants';

interface DetailPanelProps {
    selectedResource: Resource;
    allResources: Resource[];
    onClose: () => void;
    onSelectResource: (resource: Resource) => void;
}

import { Task } from '../types';
import TaskSelectorModal from './library/TaskSelectorModal';
import { CheckCircle2, CircleDot } from 'lucide-react';

interface DetailPanelProps {
    selectedResource: Resource;
    allResources: Resource[];
    onClose: () => void;
    onSelectResource: (resource: Resource) => void;
    onNavigateToTask?: (taskId: string) => void; // New Prop for navigation
}

const DetailPanel: React.FC<DetailPanelProps> = ({ selectedResource, allResources, onClose, onSelectResource, onNavigateToTask }) => {
    const { path: selectedPath, id: selectedId } = selectedResource;
    const [isLinkModalOpen, setIsLinkModalOpen] = React.useState(false);

    // Find all custom links where this resource is either the source or the target
    // Use path if available, otherwise use id
    const lookupKey = selectedPath || selectedId;

    const connections = useLiveQuery(() =>
        db.customLinks
            .where('sourceNodeId').equals(lookupKey)
            .or('targetNodeId').equals(lookupKey)
            .toArray(),
        [lookupKey]
    ) || [];

    // Fetch all tasks for lookup and selection
    const allTasks = useLiveQuery(() => db.tasks.toArray()) || [];

    // Split connections into Tasks and Resources
    const linkedTasks = React.useMemo(() => {
        const tasks: { linkId: string, task: Task }[] = [];
        connections.forEach(link => {
            if (link.type === 'task_link') {
                const otherId = link.sourceNodeId === lookupKey ? link.targetNodeId : link.sourceNodeId;
                const task = allTasks.find(t => t.id === otherId);
                if (task) {
                    tasks.push({ linkId: link.id, task });
                }
            }
        });
        return tasks;
    }, [connections, allTasks, lookupKey]);

    const linkedResources = React.useMemo(() => {
        const resources: { linkId: string, resource: Resource, link: CustomLink }[] = [];
        connections.forEach(link => {
            if (link.type !== 'task_link') { // Default to resource link if not task_link
                const otherId = link.sourceNodeId === lookupKey ? link.targetNodeId : link.sourceNodeId;
                const resource = allResources.find(r => (r.path === otherId) || (r.id === otherId));
                if (resource) {
                    resources.push({ linkId: link.id, resource, link });
                }
            }
        });
        return resources;
    }, [connections, allResources, lookupKey]);


    const handleOpenFile = () => {
        if (selectedResource.url) {
            window.open(selectedResource.url, '_blank');
        }
    };

    const handleLinkTask = async (task: Task) => {
        // Create link in DB
        const newLink: CustomLink = {
            id: Math.random().toString(36).substr(2, 9),
            userId: 'Schamala',
            sourceNodeId: lookupKey, // Resource is Source
            targetNodeId: task.id,   // Task is Target
            type: 'task_link',
            bidirectional: true,
            createdAt: new Date().toISOString()
        };
        await db.customLinks.add(newLink);
        setIsLinkModalOpen(false);
    };

    const handleUnlink = async (linkId: string) => {
        if (window.confirm("Remove this link?")) {
            await db.customLinks.delete(linkId);
        }
    };

    const selectedSubjectCategory = SUBJECT_HIERARCHY[selectedResource.subject] || SubjectCategory.GENERAL;
    const selectedColors = CATEGORY_COLORS[selectedSubjectCategory] || CATEGORY_COLORS[SubjectCategory.GENERAL];

    return (
        <div className="bg-white/30 backdrop-blur-xl h-full flex flex-col border-l border-white/20 shadow-2xl rounded-r-lg overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedColors.background} ${selectedColors.text}`}
                    >
                        {selectedResource.subject}
                    </span>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <X size={20} />
                    </button>
                </div>
                <h2 className="text-xl font-bold text-gray-800">{selectedResource.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedResource.description || 'No description available.'}</p>
                <button
                    onClick={handleOpenFile}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                    <ExternalLink size={16} />
                    Open File
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Linked Tasks Section */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-md font-semibold text-gray-700">Linked Tasks</h3>
                        <button
                            onClick={() => setIsLinkModalOpen(true)}
                            className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium"
                        >
                            + Link Task
                        </button>
                    </div>

                    {linkedTasks.length > 0 ? (
                        <ul className="space-y-2">
                            {linkedTasks.map(({ linkId, task }) => (
                                <li key={linkId} className="group flex justify-between items-center p-3 bg-white/50 border border-white/40 rounded-lg hover:bg-white/80 transition-all shadow-sm">
                                    <button
                                        className="flex-1 text-left"
                                        onClick={() => onNavigateToTask && onNavigateToTask(task.id)}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <CircleDot size={12} className={task.status === 'DONE' ? 'text-green-500' : 'text-blue-500'} />
                                            <span className="text-xs text-gray-500 font-mono">#{task.id}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                                            {task.title}
                                        </span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleUnlink(linkId); }}
                                        className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-4 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-xs text-gray-400">No tasks linked to this resource.</p>
                        </div>
                    )}
                </div>

                {/* Connections (Resources) */}
                <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-3">Related Resources</h3>
                    {linkedResources.length > 0 ? (
                        <ul className="space-y-3">
                            {linkedResources.map(({ linkId, resource, link }) => {
                                const otherSubjectCategory = SUBJECT_HIERARCHY[resource.subject] || SubjectCategory.GENERAL;
                                const otherColors = CATEGORY_COLORS[otherSubjectCategory] || CATEGORY_COLORS[SubjectCategory.GENERAL];

                                return (
                                    <li key={linkId} className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors relative">
                                        <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center" style={{ color: link.color || '#6b7280' }}>
                                            <LinkIcon size={12} className="mr-1.5" />
                                            <span>{link.label || 'Related To'}</span>
                                        </div>
                                        <button
                                            onClick={() => onSelectResource(resource)}
                                            className="text-left w-full"
                                        >
                                            <p className="font-semibold text-blue-600 hover:underline">{resource.title}</p>
                                            <p
                                                className={`text-xs font-medium px-1.5 py-0.5 rounded-full mt-1 ${otherColors.background} ${otherColors.text}`}
                                                style={{ display: 'inline-block' }}
                                            >
                                                {resource.subject}
                                            </p>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUnlink(linkId); }}
                                            className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="text-center py-4 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-xs text-gray-400">No related resources found.</p>
                        </div>
                    )}
                </div>
            </div>

            <TaskSelectorModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                tasks={allTasks}
                onSelectTask={handleLinkTask}
            />
        </div>
    );
};

export default DetailPanel;
