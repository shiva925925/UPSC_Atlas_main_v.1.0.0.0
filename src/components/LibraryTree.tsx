import React, { useEffect, useMemo } from 'react';
import {
    ReactFlow,
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';

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

    console.log('Building tree from resources:', resources);

    resources.forEach((resource) => {
        if (!resource.path) {
            console.warn('Resource missing path:', resource);
            return;
        }

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
                console.log(`Created ${isFile ? 'file' : 'folder'} node:`, part, 'at path:', currentPath);
            }

            parent = nodeMap.get(currentPath);
        });
    });

    console.log('Final tree structure:', tree);
    return tree;
}

// Convert tree to ReactFlow nodes and edges using dagre layout
function treeToFlowElements(tree: any) {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 150 });

    let nodeId = 0;

    function traverse(node: any, parentId: string | null = null) {
        const id = `node-${nodeId++}`;

        // Add node to dagre for layout calculation
        dagreGraph.setNode(id, { width: 150, height: 50 });

        nodes.push({
            id,
            data: {
                label: node.name,
                isFile: node.isFile,
                resource: node.resource
            },
            position: { x: 0, y: 0 }, // Will be set by dagre
            type: node.isFile ? 'default' : 'default',
            style: {
                background: node.isFile ? '#e0f2fe' : '#ddd6fe',
                border: '2px solid',
                borderColor: node.isFile ? '#0ea5e9' : '#8b5cf6',
                borderRadius: '20px',
                padding: '10px',
                fontSize: '12px',
                fontWeight: '500',
            }
        });

        if (parentId) {
            dagreGraph.setEdge(parentId, id);
            edges.push({
                id: `edge-${parentId}-${id}`,
                source: parentId,
                target: id,
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#94a3b8', strokeWidth: 2 }
            });
        }

        node.children?.forEach((child: any) => traverse(child, id));
    }

    traverse(tree);

    // Apply dagre layout
    dagre.layout(dagreGraph);

    // Update node positions from dagre
    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.position = {
            x: nodeWithPosition.x - 75,
            y: nodeWithPosition.y - 25,
        };
    });

    return { nodes, edges };
}

const LibraryTree: React.FC<LibraryTreeProps> = ({ resources }) => {
    const tree = useMemo(() => buildTree(resources), [resources]);
    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => treeToFlowElements(tree),
        [tree]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = treeToFlowElements(tree);
        setNodes(newNodes);
        setEdges(newEdges);
    }, [tree, setNodes, setEdges]);

    return (
        <div style={{ width: '100%', height: '600px' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                attributionPosition="bottom-left"
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
};

export default LibraryTree;
