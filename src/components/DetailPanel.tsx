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

const DetailPanel: React.FC<DetailPanelProps> = ({ selectedResource, allResources, onClose, onSelectResource }) => {
    const { path: selectedPath, id: selectedId } = selectedResource;

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

    const handleOpenFile = () => {
        if (selectedResource.url) {
            window.open(selectedResource.url, '_blank');
        }
    };

    // Create a map for quick resource lookup by path or id
    const resourceMap = React.useMemo(() => {
        const map = new Map();
        allResources.forEach(r => {
            if (r.path) map.set(r.path, r);
            if (r.id) map.set(r.id, r);
        });
        return map;
    }, [allResources]);

    const selectedSubjectCategory = SUBJECT_HIERARCHY[selectedResource.subject] || SubjectCategory.GENERAL;
    const selectedColors = CATEGORY_COLORS[selectedSubjectCategory] || CATEGORY_COLORS[SubjectCategory.GENERAL];

    return (
        <div className="bg-white/95 backdrop-blur-sm h-full flex flex-col border-l border-gray-300 shadow-xl rounded-r-lg overflow-hidden">
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

            {/* Connections */}
            <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-md font-semibold text-gray-700 mb-3">Connections</h3>
                {connections.length > 0 ? (
                    <ul className="space-y-3">
                        {connections.map(link => {
                            const isSource = link.sourceNodeId === selectedPath;
                            const otherNodePath = isSource ? link.targetNodeId : link.sourceNodeId;
                            const otherResource = resourceMap.get(otherNodePath);

                            if (!otherResource) return null;

                            const otherSubjectCategory = SUBJECT_HIERARCHY[otherResource.subject] || SubjectCategory.GENERAL;
                            const otherColors = CATEGORY_COLORS[otherSubjectCategory] || CATEGORY_COLORS[SubjectCategory.GENERAL];

                            return (
                                <li key={link.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center" style={{ color: link.color || '#6b7280' }}>
                                        <LinkIcon size={12} className="mr-1.5" />
                                        <span>{link.label || 'Related To'}</span>
                                    </div>
                                    <button
                                        onClick={() => onSelectResource(otherResource)}
                                        className="text-left w-full"
                                    >
                                        <p className="font-semibold text-blue-600 hover:underline">{otherResource.title}</p>
                                        <p
                                            className={`text-xs font-medium px-1.5 py-0.5 rounded-full mt-1 ${otherColors.background} ${otherColors.text}`}
                                            style={{ display: 'inline-block' }}
                                        >
                                            {otherResource.subject}
                                        </p>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="text-center py-8 px-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">No connections found.</p>
                        <p className="text-xs text-gray-400 mt-2">Use the 'Linking' mode in the main tree view to create connections.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailPanel;
