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
                    name: isLastPart ? part.replace(/.pdf$/, '') : part,
                    isFile: isLastPart,
                    resource: isLastPart ? resource : null,
                    children: [],
                    path: currentPath,
                };
                nodeMap.set(currentPath, newNode);
                parent.children.push(newNode);
                parent.children.sort((a, b) => {
                    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
                    return a.name.localeCompare(b.name);
                });
            }
            parent = nodeMap.get(currentPath)!;
        });
    });

    return treeRoot;
}

// TreeNode Component
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

    const style = isSelected
        ? 'bg-blue-100 text-blue-800'
        : searchHighlight
        ? 'bg-yellow-200'
        : 'hover:bg-gray-100';

    return (
        <div>
            <div
                className={`flex items-center p-1.5 rounded-md cursor-pointer transition-colors ${style}`}
                style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
                onClick={handleClick}
            >
                {isFolder ? (
                    <>
                        {isExpanded ? <ChevronDown size={18} className="mr-2 text-gray-500" /> : <ChevronRight size={18} className="mr-2 text-gray-500" />}
                        <Folder size={18} className="mr-2 text-blue-500" />
                        <span className="font-medium text-gray-800">{node.name}</span>
                    </>
                ) : (
                    <>
                        <FileIcon size={18} className="mr-2 text-gray-700" />
                        <span className={`flex-1 ${isSelected ? 'font-semibold' : 'text-gray-700'}`}>{node.name}</span>
                    </>
                )}
            </div>
            {isFolder && isExpanded && (
                <div>
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            expandedFolders={expandedFolders}
                            toggleFolder={toggleFolder}
                            onSelectResource={onSelectResource}
                            isSelected={false} // Only direct selection is highlighted this way
                            searchHighlight={false}
                        />
                    ))}
                </div>
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

            if (isMatch && node.isFile) {
                newMatches.add(node.path);
            }

            if ((isMatch && node.isFile) || foundInChildren) {
                 if(!node.isFile) newExpanded.add(node.path);
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
                {expandedFolders.has(node.path) && node.children.map(child => renderTree(child, level + 1))}
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