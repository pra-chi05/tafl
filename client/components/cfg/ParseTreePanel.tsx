import { useState, useRef, useCallback, useEffect } from "react";
import type { TreeNode } from "@/types/cfg";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// ─── Tree layout ──────────────────────────────────────────────────────────

interface LayoutNode {
  node: TreeNode;
  x: number;
  y: number;
  width: number; // subtree width (for centering)
}

const NODE_WIDTH = 48;
const NODE_RADIUS = 22;
const V_GAP = 70;
const H_PAD = 12; // extra padding between siblings

/** Recursively compute subtree widths and positions */
function layout(
  node: TreeNode,
  depth: number,
  xOffset: number
): LayoutNode[] {
  if (node.children.length === 0) {
    return [{ node, x: xOffset + NODE_WIDTH / 2, y: depth * V_GAP + 40, width: NODE_WIDTH }];
  }

  // Layout each child
  let childX = xOffset;
  const childLayouts: LayoutNode[][] = [];
  let totalChildWidth = 0;

  for (const child of node.children) {
    const childItems = layout(child, depth + 1, childX);
    const w = childItems.reduce((acc, c) => {
      const rightEdge = c.x + c.width / 2;
      return Math.max(acc, rightEdge - childX);
    }, NODE_WIDTH);
    childLayouts.push(childItems);
    childX += w + H_PAD;
    totalChildWidth += w + H_PAD;
  }
  totalChildWidth -= H_PAD;

  // Center this node over all its children
  const firstChildX = childLayouts[0][0].x;
  const lastChildX =
    childLayouts[childLayouts.length - 1][0].x;
  const cx = (firstChildX + lastChildX) / 2;

  const result: LayoutNode[] = [
    {
      node,
      x: cx,
      y: depth * V_GAP + 40,
      width: totalChildWidth,
    },
  ];

  for (const cl of childLayouts) {
    for (const item of cl) result.push(item);
  }

  return result;
}

function computeLayout(root: TreeNode) {
  const items = layout(root, 0, 0);
  // Normalise so min x = NODE_RADIUS
  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x));
  const maxY = Math.max(...items.map((i) => i.y));
  const shift = NODE_RADIUS - minX + 8;
  return {
    items: items.map((i) => ({ ...i, x: i.x + shift })),
    svgWidth: maxX - minX + NODE_RADIUS * 2 + 16,
    svgHeight: maxY + NODE_RADIUS + 20,
  };
}

// ─── Single Node Renderer ─────────────────────────────────────────────────

function TreeNodeSVG({
  item,
  allItems,
  highlighted,
  onHover,
  onLeave,
}: {
  item: LayoutNode;
  allItems: LayoutNode[];
  highlighted: Set<string>;
  onHover: (id: string) => void;
  onLeave: () => void;
}) {
  const { node, x, y } = item;
  const isHL = highlighted.has(node.id);

  // Draw edges to children
  const childEdges = node.children.map((child) => {
    const childItem = allItems.find((i) => i.node.id === child.id);
    if (!childItem) return null;
    return (
      <line
        key={`edge-${node.id}-${child.id}`}
        x1={x}
        y1={y + NODE_RADIUS}
        x2={childItem.x}
        y2={childItem.y - NODE_RADIUS}
        stroke={isHL && highlighted.has(child.id) ? "#6366f1" : "#d1d5db"}
        strokeWidth={isHL && highlighted.has(child.id) ? 2 : 1.5}
        strokeLinecap="round"
      />
    );
  });

  const isLeaf = node.children.length === 0;
  const fillColor = node.symbol === "ε"
    ? "#f3f4f6"
    : isLeaf
      ? (isHL ? "#059669" : "#d1fae5")
      : (isHL ? "#4f46e5" : "#c7d2fe");

  const strokeColor = node.symbol === "ε"
    ? "#9ca3af"
    : isLeaf
      ? (isHL ? "#065f46" : "#059669")
      : (isHL ? "#3730a3" : "#4f46e5");

  const textColor = isHL
    ? "#fff"
    : isLeaf
      ? "#065f46"
      : "#3730a3";

  const shape = isLeaf ? (
    <circle
      cx={x}
      cy={y}
      r={NODE_RADIUS}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={2}
    />
  ) : (
    <rect
      x={x - NODE_RADIUS}
      y={y - NODE_RADIUS + 4}
      width={NODE_RADIUS * 2}
      height={NODE_RADIUS * 2 - 8}
      rx={8}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={2}
    />
  );

  return (
    <g
      key={node.id}
      className="cursor-pointer"
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={onLeave}
    >
      {childEdges}
      {shape}
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={node.symbol.length > 2 ? "9" : "12"}
        fontWeight="700"
        fill={textColor}
        fontFamily="monospace"
        className="pointer-events-none select-none"
      >
        {node.symbol}
      </text>
    </g>
  );
}

// ─── Find path from root to node ─────────────────────────────────────────

function findPath(root: TreeNode, targetId: string): string[] {
  if (root.id === targetId) return [root.id];
  for (const child of root.children) {
    const sub = findPath(child, targetId);
    if (sub.length > 0) return [root.id, ...sub];
  }
  return [];
}

// ─── Main Component ───────────────────────────────────────────────────────

interface ParseTreePanelProps {
  tree: TreeNode;
}

export default function ParseTreePanel({ tree }: ParseTreePanelProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const { items, svgWidth, svgHeight } = computeLayout(tree);

  // Reset zoom/pan when tree changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHighlighted(new Set());
  }, [tree]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => setIsDragging(false);

  const handleNodeHover = (nodeId: string) => {
    const path = findPath(tree, nodeId);
    setHighlighted(new Set(path));
  };

  const handleNodeLeave = () => setHighlighted(new Set());

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Parse Tree</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            title="Zoom in"
            id="tree-zoom-in"
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 w-10 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            title="Zoom out"
            id="tree-zoom-out"
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            title="Reset view"
            id="tree-reset"
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative bg-gradient-to-br from-slate-50 to-indigo-50 border-2 border-gray-200 rounded-xl overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          height: Math.min(400, svgHeight * zoom + 40),
        }}
        id="parse-tree-canvas"
      >
        <svg
          width={svgWidth * zoom}
          height={svgHeight * zoom}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top left",
            transition: isDragging ? "none" : "transform 0.1s ease",
            userSelect: "none",
          }}
        >
          {items.map((item) => (
            <TreeNodeSVG
              key={item.node.id}
              item={item}
              allItems={items}
              highlighted={highlighted}
              onHover={handleNodeHover}
              onLeave={handleNodeLeave}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-indigo-200 border border-indigo-600" />
          <span>Non-terminal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-600" />
          <span>Terminal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 italic">Hover a node to highlight its path</span>
        </div>
      </div>
    </div>
  );
}
