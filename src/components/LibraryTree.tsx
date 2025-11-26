import React, { useEffect, useMemo, useState } from 'react';
import {
    ReactFlow,
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Connection,
    Panel,
    MarkerType,
    Position,
    Handle,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { db } from '../db';
import { CustomLink } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Save, Trash2, ExternalLink } from 'lucide-react';

interface LibraryResource {
    id: string;
    title: string;
    path: string;
    subject: string;
    url?: string;
}

interface LibraryTreeProps {
    resources: LibraryResource[];
}

// Build hierarchical tree structure from flat resource list
function buildTree(resources: LibraryResource[]) {
    const tree: any = { name: 'Library', children: [] };
    const nodeMap = new Map<string, any>();
    nodeMap.set('root', tree);

    console.log('Building tree from resources:', resources.length, 'resources');

    resources.forEach((resource) => {
        if (!resource.path) return;

        const parts = resource.path.split('/');
        let currentPath = '';
        let parent = tree;

        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!nodeMap.has(currentPath)) {
                const isFile = index === parts.length - 1;
                const node = {
                    id: currentPath,
                    name: part.replace('.pdf', ''),
                    isFile,
                    resource: isFile ? resource : null,
                    children: []
                };
                nodeMap.set(currentPath, node);
                parent.children.push(node);
            }

            parent = nodeMap.get(currentPath);
        });
    });

    console.log('Final tree:', tree);
    console.log('Tree children count:', tree.children.length);
    return tree;
}

// Define distinct colors for different branches (subjects) - Modern Pastel & Radiant
const BRANCH_COLORS = [
    { bg: '#fce7f3', border: '#ec4899' }, // Pink - Vibrant & Modern
    { bg: '#ddd6fe', border: '#8b5cf6' }, // Purple - Rich & Elegant
    { bg: '#bfdbfe', border: '#3b82f6' }, // Sky Blue - Fresh & Clean
    { bg: '#a7f3d0', border: '#10b981' }, // Emerald - Lively & Natural
    { bg: '#fef08a', border: '#eab308' }, // Amber - Warm & Inviting
    { bg: '#fed7aa', border: '#f97316' }, // Peach - Soft & Friendly
    { bg: '#fecaca', border: '#ef4444' }, // Coral - Energetic & Bold
    { bg: '#e0e7ff', border: '#6366f1' }, // Lavender - Calm & Sophisticated
];

// Convert tree to ReactFlow nodes and edges using dagre layout
function treeToFlowElements(tree: any, customLinks: CustomLink[], sourceNodeId: string | null = null) {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeIdMap = new Map<string, string>(); // path -> reactflow id

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 150 });

    let nodeId = 0;

    function traverse(node: any, parentId: string | null = null, branchIndex: number = -1, depth: number = 0) {
        const id = `node-${nodeId++}`;
        nodeIdMap.set(node.id, id); // Map path to reactflow id

        // Determine color based on branch
        let nodeColor = { bg: '#f8fafc', border: '#64748b' }; // Default Slate

        if (parentId === null) {
            // Root Node
            nodeColor = { bg: '#1e293b', border: '#0f172a' };
        } else if (branchIndex >= 0) {
            // Branch Node (cycle through colors)
            nodeColor = BRANCH_COLORS[branchIndex % BRANCH_COLORS.length];
        }

        // Add node to dagre for layout calculation
        dagreGraph.setNode(id, { width: 180, height: 60 });

        const isRoot = parentId === null;
        const isSelected = id === sourceNodeId;
        const isFile = node.isFile;

        // File nodes get a darker, more saturated version of the branch color
        let fileNodeColor = nodeColor;
        if (isFile && branchIndex >= 0) {
            fileNodeColor = {
                bg: nodeColor.border, // Use border color as background
                border: nodeColor.border
            };
        }

        nodes.push({
            id,
            data: {
                label: node.name,
                isFile: node.isFile,
                resource: node.resource,
                pathId: node.id, // Store original path for linking
                branchColor: nodeColor.border,
                isRoot: isRoot
            },
            position: { x: 0, y: 0 }, // Will be set by dagre
            type: isFile ? 'fileNode' : 'default',
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: {
                background: isRoot ? '#1e293b' : (isFile ? fileNodeColor.bg : nodeColor.bg),
                color: isRoot || isFile ? '#ffffff' : '#1e293b',
                border: isSelected ? '3px solid #f59e0b' : `3px solid ${isFile ? fileNodeColor.border : nodeColor.border}`,
                borderRadius: '12px',
                padding: isFile ? '10px 12px' : '12px',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: isSelected ? '0 0 15px #f59e0b' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                width: 180,
                textAlign: 'center',
                transition: 'all 0.2s ease',
                cursor: isFile ? 'pointer' : 'default'
            }
        });

        // Add tree structure edges
        if (parentId) {
            dagreGraph.setEdge(parentId, id);

            // Hierarchical Thickness: Thicker at root, thinner at leaves
            const strokeWidth = Math.max(2, 8 - (depth * 3));

            // Use fileNodeColor for edges leading to files
            const edgeColor = isFile ? fileNodeColor.border : nodeColor.border;

            edges.push({
                id: `edge-${parentId}-${id}`,
                source: parentId,
                target: id,
                type: 'default', // Curved bezier edges
                animated: false,
                style: {
                    stroke: edgeColor,
                    strokeWidth: strokeWidth,
                },
                data: { isTreeEdge: true }
            });
        }

        node.children?.forEach((child: any, index: number) => {
            const nextBranchIndex = parentId === null ? index : branchIndex;
            console.log('Traversing child:', child.name, 'branchIndex:', nextBranchIndex);
            traverse(child, id, nextBranchIndex, depth + 1);
        });
    }

    console.log('Starting traverse with tree:', tree.name, 'children:', tree.children?.length);
    traverse(tree);

    // Add custom links
    customLinks.forEach((link) => {
        const sourceId = nodeIdMap.get(link.sourceNodeId);
        const targetId = nodeIdMap.get(link.targetNodeId);

        if (sourceId && targetId) {
            edges.push({
                id: link.id,
                source: sourceId,
                target: targetId,
                type: 'bezier',
                animated: true,
                label: link.label,
                style: {
                    stroke: link.color || '#f59e0b',
                    strokeWidth: 3,
                    strokeDasharray: '5,5'
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: link.color || '#f59e0b',
                },
                data: {
                    isCustomLink: true,
                    linkData: link
                }
            });
        }
    });

    // Apply dagre layout
    dagre.layout(dagreGraph);

    // Update node positions from dagre
    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.position = {
            x: nodeWithPosition.x - 90,
            y: nodeWithPosition.y - 30,
        };
    });

    return { nodes, edges };
}

// Custom File Node Component with Icon and Handles
const FileNode = ({ data }: { data: any }) => {
    return (
        <>
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                height: '100%'
            }}>
                <span style={{ flex: 1, textAlign: 'center' }}>{data.label}</span>
                <ExternalLink
                    size={16}
                    style={{
                        opacity: 0.8,
                        flexShrink: 0
                    }}
                />
            </div>
            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        </>
    );
};

// Define custom node types
const nodeTypes = {
    fileNode: FileNode
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("LibraryTree Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
                    <h3 className="font-bold">Something went wrong in the Tree View</h3>
                    <p className="text-sm mt-2">{this.state.error?.message}</p>
                </div>
            );
        }

        return this.props.children;
    }
}

const EMPTY_ARRAY: CustomLink[] = [];

const LibraryTree: React.FC<LibraryTreeProps> = ({ resources }) => {
    return (
        <ErrorBoundary>
            <LibraryTreeContent resources={resources} />
        </ErrorBoundary>
    );
};

const LibraryTreeContent: React.FC<LibraryTreeProps> = ({ resources }) => {
    const [connectionMode, setConnectionMode] = useState(false);
    const [editingLink, setEditingLink] = useState<CustomLink | null>(null);
    const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);

    // Load custom links from IndexedDB
    const customLinks = useLiveQuery(() => db.customLinks.toArray()) || EMPTY_ARRAY;

    const tree = useMemo(() => buildTree(resources), [resources]);

    // Calculate nodes - only depends on tree structure
    const initialNodes = useMemo(() => {
        const { nodes } = treeToFlowElements(tree, [], sourceNodeId);
        return nodes;
    }, [tree, sourceNodeId]);

    // Calculate edges - depends on tree AND custom links
    const initialEdges = useMemo(() => {
        const { edges } = treeToFlowElements(tree, customLinks, sourceNodeId);
        return edges;
    }, [tree, customLinks, sourceNodeId]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update when customLinks change
    useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = treeToFlowElements(tree, customLinks, sourceNodeId);
        setNodes(newNodes);
        setEdges(newEdges);
    }, [customLinks, tree, setNodes, setEdges, sourceNodeId]);

    // Handle node clicks - linking or opening resources
    const onNodeClick = async (event: React.MouseEvent, node: Node) => {
        if (connectionMode) {
            // Linking mode
            if (!sourceNodeId) {
                setSourceNodeId(node.id);
            } else {
                if (sourceNodeId === node.id) {
                    setSourceNodeId(null);
                    return;
                }

                const sourceNode = nodes.find(n => n.id === sourceNodeId);
                if (sourceNode) {
                    const newLink: CustomLink = {
                        id: `link_${Date.now()}`,
                        userId: 'Schamala',
                        sourceNodeId: sourceNode.data.pathId as string,
                        targetNodeId: node.data.pathId as string,
                        type: 'custom',
                        color: '#f59e0b',
                        bidirectional: false,
                        createdAt: new Date().toISOString()
                    };

                    await db.customLinks.add(newLink);
                    setSourceNodeId(null);
                }
            }
        } else {
            // Open resource mode
            if (node.data.isFile && node.data.resource) {
                const resource = node.data.resource as any;
                if (resource.content) {
                    const url = URL.createObjectURL(resource.content);
                    window.open(url, '_blank');
                } else if (resource.url) {
                    window.open(resource.url, '_blank');
                }
            }
        }
    };

    const onEdgeClick = (event: React.MouseEvent, edge: Edge) => {
        if (edge.data?.isCustomLink && edge.data.linkData) {
            setEditingLink(edge.data.linkData as CustomLink);
        }
    };

    const handleUpdateLink = async () => {
        if (editingLink) {
            await db.customLinks.update(editingLink.id, editingLink);
            setEditingLink(null);
        }
    };

    const handleDeleteLink = async () => {
        if (editingLink && window.confirm('Delete this link?')) {
            await db.customLinks.delete(editingLink.id);
            setEditingLink(null);
        }
    };

    return (
        <div style={{
            width: '100%',
            height: '600px',
            position: 'relative',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            borderRadius: '12px',
            overflow: 'hidden'
        }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                nodesConnectable={false}
                fitView
                attributionPosition="bottom-left"
            >
                <Background />
                <Controls />
                <MiniMap />

                <Panel position="top-right" className="bg-white p-3 rounded-lg shadow-lg space-y-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setConnectionMode(!connectionMode);
                                setSourceNodeId(null);
                            }}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${connectionMode
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {connectionMode ? '🔗 Linking ON' : '🔗 Linking OFF'}
                        </button>
                    </div>
                    <div className="text-xs text-gray-500 border-t pt-2">
                        {connectionMode
                            ? (sourceNodeId ? 'Select TARGET node' : 'Select SOURCE node')
                            : 'Click file nodes to open'}
                    </div>
                </Panel>
            </ReactFlow>

            {editingLink && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-4 w-80">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800">Edit Link</h3>
                            <button onClick={() => setEditingLink(null)} className="text-gray-500 hover:text-gray-700">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                                <input
                                    type="text"
                                    value={editingLink.label || ''}
                                    onChange={(e) => setEditingLink({ ...editingLink, label: e.target.value })}
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                    placeholder="e.g. Prerequisite"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                <select
                                    value={editingLink.type}
                                    onChange={(e) => setEditingLink({ ...editingLink, type: e.target.value as any })}
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                >
                                    <option value="custom">Custom</option>
                                    <option value="prerequisite">Prerequisite</option>
                                    <option value="related">Related</option>
                                    <option value="example">Example</option>
                                    <option value="reference">Reference</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={editingLink.color || '#f59e0b'}
                                        onChange={(e) => setEditingLink({ ...editingLink, color: e.target.value })}
                                        className="w-8 h-8 rounded cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-500">{editingLink.color}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleUpdateLink}
                                    className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1"
                                >
                                    <Save size={14} /> Save
                                </button>
                                <button
                                    onClick={handleDeleteLink}
                                    className="flex-1 bg-red-100 text-red-600 py-1.5 rounded text-sm font-medium hover:bg-red-200 flex items-center justify-center gap-1"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LibraryTree;
