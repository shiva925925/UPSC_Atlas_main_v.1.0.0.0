import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, File as FileIcon } from 'lucide-react';
import { Resource } from '../types';

// Interfaces
interface TreeNodeData {
    id: string;
    name: string;
    isFile: boolean;
    resource: Resource | null;
    children: TreeNodeData[];
    path: string;
}

interface LibraryTreeProps {
    resources: Resource[];
    searchQuery: string;
    onSelectResource: (resource: Resource) => void;
    selectedResource: Resource | null;
}

interface TreeNodeProps {
    node: TreeNodeData;
    level: number;
    expandedFolders: Set<string>;
    toggleFolder: (path: string) => void;
    onSelectResource: (resource: Resource) => void;
    isSelected: boolean;
    searchHighlight: boolean;
}

// Build hierarchical tree structure from flat resource list
function buildTree(resources: Resource[]): TreeNodeData {
    const treeRoot: TreeNodeData = { id: 'root', name: 'Library', isFile: false, resource: null, children: [], path: 'root' };
    const nodeMap = new Map<string, TreeNodeData>();
    nodeMap.set('root', treeRoot);

    resources.forEach((resource) => {
        if (!resource.path) return;
        const parts = resource.path.split('/');
        let currentPath = '';
        let parent = treeRoot;

        parts.forEach((part, index) => {
            const isLastPart = index === parts.length - 1;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!nodeMap.has(currentPath)) {
                const newNode: TreeNodeData = {
                    id: currentPath,
                    name: part, // Keep full filename including extension
                    isFile: isLastPart,
                    resource: isLastPart ? resource : null,
                    children: [],
                    path: currentPath,
                };
                nodeMap.set(currentPath, newNode);
                parent.children.push(newNode);
            }
            parent = nodeMap.get(currentPath)!;
        });
    });

    // Sort the tree recursively
    const sortNode = (node: TreeNodeData) => {
        if (node.children.length > 0) {
            node.children.sort((a, b) => {
                if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
                return a.name.localeCompare(b.name);
            });
            node.children.forEach(sortNode);
        }
    };
    sortNode(treeRoot);

    return treeRoot;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, expandedFolders, toggleFolder, onSelectResource, isSelected, searchHighlight }) => {
    const isExpanded = expandedFolders.has(node.path);
    const isFolder = !node.isFile;

    const handleClick = () => {
        if (isFolder) {
            toggleFolder(node.path);
        } else if (node.resource) {
            onSelectResource(node.resource);
        }
    };

    // Typography hierarchy: Root folders larger, deeper items smaller
    const fontSize = level === 0 ? 'text-sm' : 'text-xs';
    const fontWeight = isSelected ? 'font-semibold' : (level === 0 ? 'font-semibold' : 'font-medium');

    // Glass Styling
    const baseStyle = "flex items-center mx-1 my-0.5 rounded-r-md cursor-pointer transition-all duration-200 border-l-2";

    // Selection & Hover States
    let stateStyle = "border-transparent text-gray-700 hover:bg-white/10"; // Default
    if (isSelected) {
        stateStyle = "bg-blue-500/10 border-blue-500 text-blue-700 shadow-sm";
    } else if (searchHighlight) {
        stateStyle = "bg-yellow-100/50 border-yellow-400 text-yellow-900";
    }

    return (
        <div
            className={`${baseStyle} ${stateStyle} ${fontSize} ${fontWeight} py-1.5`}
            style={{ paddingLeft: `${level === 0 ? 0.5 : 0.5}rem` }} // Reduced padding as we use border indentation for hierarchy
            onClick={handleClick}
        >
            {isFolder ? (
                <>
                    {isExpanded ?
                        <ChevronDown size={level === 0 ? 16 : 14} className="mr-1.5 opacity-60" /> :
                        <ChevronRight size={level === 0 ? 16 : 14} className="mr-1.5 opacity-60" />
                    }
                    <Folder size={level === 0 ? 16 : 14} className={`mr-2 ${isSelected ? 'text-blue-500' : 'text-blue-400/80'}`} />
                    <span className="truncate">{node.name}</span>
                </>
            ) : (
                <>
                    <div className="w-4 mr-1.5" /> {/* Spacer for file alignment */}
                    <FileIcon size={14} className={`mr-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="truncate flex-1">{node.name}</span>
                </>
            )}
        </div>
    );
};

// Main LibraryTree Component
const LibraryTree: React.FC<LibraryTreeProps> = ({ resources, searchQuery, onSelectResource, selectedResource }) => {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
    const [searchMatches, setSearchMatches] = useState<Set<string>>(new Set());

    const tree = useMemo(() => buildTree(resources), [resources]);

    useEffect(() => {
        if (!searchQuery) {
            setSearchMatches(new Set());
            return;
        }

        const newExpanded = new Set<string>(['root']);
        const newMatches = new Set<string>();

        function searchTree(node: TreeNodeData) {
            let foundInChildren = node.children.some(child => searchTree(child));
            const isMatch = node.name.toLowerCase().includes(searchQuery.toLowerCase());

            if (isMatch) {
                if (node.isFile) {
                    newMatches.add(node.path);
                } else {
                    newExpanded.add(node.path);
                }
            }

            if (isMatch || foundInChildren) {
                if (!node.isFile) newExpanded.add(node.path);
                return true;
            }
            return false;
        }

        tree.children.forEach(child => searchTree(child));
        setExpandedFolders(newExpanded);
        setSearchMatches(newMatches);

    }, [searchQuery, tree]);


    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    };

    const renderTree = (node: TreeNodeData, level: number) => {
        const searchHighlight = searchMatches.has(node.path);
        const isSelected = selectedResource?.path === node.path;

        return (
            <div key={node.id}>
                <TreeNode
                    node={node}
                    level={level}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    onSelectResource={onSelectResource}
                    isSelected={isSelected}
                    searchHighlight={searchHighlight}
                />
                {/* Recursive Children with Indentation Border */}
                {expandedFolders.has(node.path) && node.children.length > 0 && (
                    <div className="ml-3 border-l border-white/20 pl-1">
                        {node.children.map(child => renderTree(child, level + 1))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full h-full p-1">
            {tree.children.map(child => renderTree(child, 0))}
        </div>
    );
};

export default LibraryTree;