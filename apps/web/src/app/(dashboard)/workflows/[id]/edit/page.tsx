'use client';

import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type NodeTypes,
  type OnConnect,
  type OnSelectionChangeParams,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParams, useRouter } from 'next/navigation';
import { DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { type WorkflowNode as WFNode, workflowApi } from '@/api/workflow';
import { Button } from '@/components/ui/button';
import { DebugResultPanel } from '@/components/workflow/debug-result-panel';
import { NodeConfigPanel } from '@/components/workflow/node-config-panel';
import { NodePalette } from '@/components/workflow/node-palette';
import { getNodeHandles, NODE_DEFAULTS, NODE_LABELS } from '@/components/workflow/nodes/constants';
import type { WorkflowNodeData } from '@/components/workflow/nodes/workflow-node';
import { WorkflowNode } from '@/components/workflow/nodes/workflow-node';

// ---- nodeTypes outside component (prevents re-renders) ----
const nodeTypes: NodeTypes = { workflow: WorkflowNode };

// ---- connection validation ----
function isValidConnection(conn: Connection | Edge): boolean {
  // Prevent connecting a node to itself
  if (conn.source === conn.target) return false;
  // start nodes cannot be targets, end nodes cannot be sources
  return true;
}

// ---- helpers ----
function convertToFlowNode(n: WFNode, selected?: boolean): Node {
  const handles = getNodeHandles(n.type);
  return {
    id: n.id,
    type: 'workflow',
    position: n.position,
    selected,
    data: { label: n.label, nodeType: n.type, config: n.config },
  };
}

function convertFromFlowNode(n: Node): WFNode {
  const data = n.data as unknown as WorkflowNodeData;
  return {
    id: n.id,
    type: data.nodeType,
    label: data.label,
    position: n.position,
    config: data.config || {},
  };
}

function convertFromFlowEdge(e: Edge): {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
} {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: (e as any).sourceHandle || undefined,
  };
}

// ---- page ----
export default function WorkflowEditPage() {
  const params = useParams();
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // React Flow controlled state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // UI state
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const initialized = useRef(false);

  // ---- data loading ----
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    workflowApi
      .get(params.id as string)
      .then((wf) => {
        setName(wf.name);
        setNodes((wf.graph.nodes || []).map((n) => convertToFlowNode(n)));
        setEdges(
          (wf.graph.edges || []).map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
          }))
        );
      })
      .catch((err) => {
        console.error('Failed to load workflow', err);
      });
  }, [params.id, setNodes, setEdges]);

  // ---- connection handler ----
  const onConnect: OnConnect = useCallback(
    (conn: Connection) => {
      // Update sourceHandle based on which handle was dragged from
      const sourceNode = nodes.find((n) => n.id === conn.source);
      if (sourceNode) {
        const nodeData = sourceNode.data as unknown as WorkflowNodeData;
        const handles = getNodeHandles(nodeData.nodeType);

        // If node has multiple source handles, use the handle that was actually connected
        // Default to first source handle if not specified
        if (handles.sources.length === 0) return; // cannot connect from end node

        const handle = conn.sourceHandle || handles.sources[0];

        setEdges((eds) =>
          addEdge(
            {
              ...conn,
              id: `e${Date.now()}`,
              sourceHandle: handle,
            },
            eds
          )
        );
      }
    },
    [nodes, setEdges]
  );

  // ---- selection handler ----
  const onSelectionChange = useCallback(({ nodes: selectedNodes }: OnSelectionChangeParams) => {
    if (selectedNodes.length === 1) {
      setSelectedNode(selectedNodes[0]);
      setConfigOpen(true);
    }
  }, []);

  // ---- keyboard handler (Delete key) ----
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Don't delete when typing in inputs
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT'
        )
          return;

        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) =>
          eds.filter((e) => {
            const anyNodeSelected = nodes.some(
              (n) => n.selected && (n.id === e.source || n.id === e.target)
            );
            return !anyNodeSelected;
          })
        );
      }
    },
    [nodes, setNodes, setEdges]
  );

  // ---- node config save ----
  const handleConfigSave = useCallback(
    (config: Record<string, any>) => {
      if (!selectedNode) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? {
                ...n,
                data: { ...(n.data as any), config, label: config.label || (n.data as any).label },
              }
            : n
        )
      );
    },
    [selectedNode, setNodes]
  );

  // ---- add node from palette / drop ----
  const handleAddNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const id = `${type}_${Date.now()}`;
      const newNode: Node = {
        id,
        type: 'workflow',
        position,
        data: {
          label: NODE_LABELS[type] || type,
          nodeType: type,
          config: NODE_DEFAULTS[type] ? { ...NODE_DEFAULTS[type] } : {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // ---- drop handler (drag from palette) ----
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow-type');
      if (!type) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: event.clientX - bounds.left - 50, // center offset
        y: event.clientY - bounds.top - 20,
      };

      handleAddNode(type, position);
    },
    [handleAddNode]
  );

  // ---- save ----
  const handleSave = async () => {
    setSaving(true);
    try {
      const graph = {
        nodes: nodes.map(convertFromFlowNode),
        edges: edges.map(convertFromFlowEdge),
      };
      await workflowApi.update(params.id as string, { name, graph });
      toast.success('保存成功');
    } catch (err: any) {
      toast.error(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ---- debug run ----
  const handleDebug = async () => {
    try {
      // Save first
      await handleSaveSilent();
      const result = await workflowApi.executeDebug(params.id as string, { query: 'test' });
      setDebugResult(result);
      toast.success(`调试完成: ${result.status}`);
    } catch (err: any) {
      toast.error(`运行失败: ${err?.message || 'unknown'}`);
    }
  };

  const handleSaveSilent = async () => {
    const graph = {
      nodes: nodes.map(convertFromFlowNode),
      edges: edges.map(convertFromFlowEdge),
    };
    await workflowApi.update(params.id as string, { name, graph });
  };

  // ---- computed data for config panel ----
  const selectedNodeData = selectedNode ? (selectedNode.data as unknown as WorkflowNodeData) : null;

  return (
    <div className='h-[calc(100vh-60px)] flex flex-col' onKeyDown={onKeyDown} tabIndex={-1}>
      {/* ---- Header bar ---- */}
      <div className='flex items-center justify-between bg-background shrink-0 mb-4'>
        <h2 className='text-lg font-semibold'>{name}</h2>
        <div className='flex items-center gap-2'>
          <Button variant='secondary' onClick={handleDebug}>
            调试运行
          </Button>
          <Button variant='ghost' onClick={() => router.push(`/workflows/${params.id}/runs`)}>
            运行历史
          </Button>
        </div>
      </div>

      {/* ---- Body: palette + canvas ---- */}
      <div className='flex flex-1 min-h-0'>
        {/* Left: node palette */}
        <div className='w-56 shrink-0'>
          <NodePalette onAddNode={handleAddNode} />
        </div>

        {/* Canvas */}
        <div className='flex-1' ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onDragOver={onDragOver}
            onDrop={onDrop}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            deleteKeyCode={['Delete', 'Backspace']}
            fitView
            className='bg-muted/20'
          >
            <MiniMap pannable zoomable className='!bottom-4 !right-4' />
            <Controls className='!bottom-4 !right-28' />
            <Background gap={20} size={1} />

            {/* Floating panel: node count hint */}
            <Panel position='top-left' className='ml-2 mt-2'>
              <span className='text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded shadow-sm'>
                {nodes.length} 个节点, {edges.length} 条边
              </span>
            </Panel>

            {/* Floating panel: save shortcut hint */}
            <Panel position='bottom-center' className='mb-2'>
              <span className='text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded shadow-sm'>
                {'拖拽左侧节点到画布 · 拖拽圆点连线 · 选中节点编辑 · Delete 删除 · Ctrl+S 保存'}
              </span>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Node Config Panel (Sheet drawer) */}
      {selectedNodeData && (
        <NodeConfigPanel
          open={configOpen}
          onOpenChange={setConfigOpen}
          nodeData={selectedNodeData}
          onSave={handleConfigSave}
        />
      )}

      {/* Debug Result Panel (bottom drawer) */}
      {debugResult && (
        <DebugResultPanel
          status={debugResult.status}
          outputs={debugResult.outputs}
          nodeExecutions={debugResult.nodeExecutions}
          onClose={() => setDebugResult(null)}
        />
      )}
    </div>
  );
}
