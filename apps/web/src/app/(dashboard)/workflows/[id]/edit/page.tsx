'use client';

import {
  addEdge,
  Background,
  type Connection,
  type Edge,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeTypes,
  type OnConnect,
  Panel,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDebounceEffect } from 'ahooks';
import { useParams, useRouter } from 'next/navigation';
import { DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { type WorkflowNode as WFNode, workflowApi } from '@/api/workflow';
import { Button } from '@/components/ui/button';
import { DebugResultPanel } from '@/components/workflow/debug-result-panel';
import { NodeConfigPanel } from '@/components/workflow/node-config-panel';
import { NodePalette } from '@/components/workflow/node-palette';
import {
  getNodeHandles,
  NODE_COLORS,
  NODE_DEFAULTS,
  NODE_LABELS,
} from '@/components/workflow/nodes/constants';
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
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // React Flow controlled state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // ---- suppress select during drag ----
  const dragOccurred = useRef(false);

  // UI state
  const [name, setName] = useState('');
  const [debugResult, setDebugResult] = useState<any>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Synced ref so handleNodesChange can read panel state without recreating.
  const panelOpenRef = useRef(false);
  useEffect(() => {
    panelOpenRef.current = configOpen && !!selectedNode;
  }, [configOpen, selectedNode]);
  const initialized = useRef(false);

  // ---- auto-save state ----
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const prevGraphRef = useRef<string>('');

  // ---- auto-save: debounce 2s after graph changes (ahooks) ----
  useDebounceEffect(
    () => {
      if (nodes.length === 0) return;

      const graphKey = JSON.stringify({
        nodes: nodes.map(convertFromFlowNode),
        edges: edges.map(convertFromFlowEdge),
      });
      if (graphKey === prevGraphRef.current) return;
      prevGraphRef.current = graphKey;

      workflowApi
        .update(params.id as string, {
          name,
          graph: JSON.parse(graphKey),
        })
        .then(() => setLastSavedAt(new Date()))
        .catch((err) => console.error('Auto-save failed:', err));
    },
    [nodes, edges, name, params.id],
    { wait: 2000 }
  );

  // ---- pending node state (Dify-style click to place) ----
  const [pendingNodeType, setPendingNodeType] = useState<string | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const mouseScreenRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);

  // RAF loop: reads ref + bounds once per frame, batches reflow to animation frame
  useEffect(() => {
    if (!pendingNodeType) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      return;
    }
    const tick = () => {
      const screen = mouseScreenRef.current;
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (screen && bounds) {
        setGhostPos({
          x: screen.x - bounds.left - 50,
          y: screen.y - bounds.top - 14,
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pendingNodeType]);

  // ---- data loading ----
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    workflowApi
      .get(params.id as string)
      .then((wf) => {
        setName(wf.name);
        setLastSavedAt(new Date(wf.updatedAt));
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

  // ---- node click/drag handling ----
  // Track drag state: React Flow may fire onNodeClick synchronously
  // after a drag. We suppress it and schedule a flag clear for the next click.

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (dragOccurred.current) {
        dragOccurred.current = false; // consume the flag for next click
        return;
      }
      if (node.data?.nodeType === 'start' || node.data?.nodeType === 'end') return;
      // When panel is open, handleNodesChange blocks all React Flow select changes,
      // so we must manage visual selection explicitly.
      setSelectedNode(node);
      setConfigOpen(true);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === node.id,
        }))
      );
    },
    [setNodes]
  );

  // Intercept NodeChange to protect the panel-open node's selection state.
  // When the config panel is open, suppress ALL select changes from React Flow
  // — whether triggered by click, drag, or internal selection management.
  // Selection is managed exclusively through onNodeClick.
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (panelOpenRef.current) {
        changes = changes.filter((c) => c.type !== 'select');
      }
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  const onNodeDragStart = useCallback(() => {
    dragOccurred.current = true;
  }, []);

  const onNodeDragStop = useCallback(() => {
    setTimeout(() => {
      dragOccurred.current = false;
    }, 0);
  }, []);

  const onPaneClick = useCallback(() => {
    // Do nothing — the panel is only closed via its own close button.
  }, []);

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

  // ---- keyboard handler (Delete key) ----
  const deleteSelected = useCallback((nds: Node[], eds: Edge[]) => {
    const selectedNodeIds = new Set(nds.filter((n) => n.selected).map((n) => n.id));
    return eds.filter((e) => {
      if (e.selected) return false;
      return !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target);
    });
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT'
        )
          return;

        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => deleteSelected(nodes, eds));
      }
    },
    [nodes, setNodes, setEdges, deleteSelected]
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

  // ---- canvas mouse tracking for pending node ----
  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!pendingNodeType) return;
      mouseScreenRef.current = { x: event.clientX, y: event.clientY };
    },
    [pendingNodeType]
  );

  const onCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      if (!pendingNodeType) return;
      // Don't place if click originated from the palette
      const target = event.target as HTMLElement;
      if (target.closest('[data-palette]')) return;
      const instance = reactFlowInstance.current;
      if (!instance) return;
      handleAddNode(
        pendingNodeType,
        instance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      );
      setPendingNodeType(null);
      setGhostPos(null);
      mouseScreenRef.current = null;
    },
    [pendingNodeType, handleAddNode]
  );

  const onCanvasContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setPendingNodeType(null);
    setGhostPos(null);
    mouseScreenRef.current = null;
  }, []);

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
        <h2 className='text-lg font-semibold'>
          {name}
          {lastSavedAt && (
            <span className='text-xs text-muted-foreground ml-3'>
              上次保存：
              {lastSavedAt.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
        </h2>

        <div className='flex items-center gap-2'>
          <Button variant='secondary' onClick={handleDebug}>
            调试运行
          </Button>
          <Button variant='ghost' onClick={() => router.push(`/workflows/${params.id}/runs`)}>
            运行历史
          </Button>
        </div>
      </div>

      {/* ---- Body: canvas ---- */}
      <div
        className='flex-1 relative'
        ref={reactFlowWrapper}
        onMouseMove={onMouseMove}
        onClick={onCanvasClick}
        onContextMenu={onCanvasContextMenu}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setPendingNodeType(null);
        }}
        role='region'
        tabIndex={-1}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onInit={(instance) => {
            reactFlowInstance.current = instance;
          }}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          deleteKeyCode={['Delete', 'Backspace']}
          fitView
          className='bg-muted/20'
        >
          <MiniMap position='bottom-left' pannable zoomable />
          <Background gap={20} size={1} />
          <Panel position='top-left'>
            <div data-palette>
              <NodePalette onSelect={setPendingNodeType} activeType={pendingNodeType} />
            </div>
          </Panel>
        </ReactFlow>

        {/* Pending node ghost (follows cursor) */}
        {pendingNodeType && ghostPos && (
          <div
            className='absolute pointer-events-none z-50'
            style={{ left: ghostPos.x, top: ghostPos.y, opacity: 0.7 }}
          >
            <div
              className='px-3 py-2 rounded-lg text-sm font-medium min-w-25 text-center shadow-lg border-2 border-dashed'
              style={{
                background: (NODE_COLORS[pendingNodeType] ?? { bg: '#f5f5f5' }).bg,
                borderColor: (NODE_COLORS[pendingNodeType] ?? { border: '#d9d9d9' }).border,
              }}
            >
              {NODE_LABELS[pendingNodeType] || pendingNodeType}
            </div>
          </div>
        )}
      </div>
      {/* Node Config Panel inside the flow container */}
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
