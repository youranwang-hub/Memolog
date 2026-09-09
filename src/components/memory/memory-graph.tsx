"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Category, Memory } from "@/lib/types";
import { EMOTION_MAP } from "@/lib/types";
import { ExternalLink, RotateCcw } from "lucide-react";
import { getCategoryColor as categoryColor } from "@/lib/category-colors";
import { formatEventDate } from "@/lib/dates";

type NodeKind = "root" | "category" | "memory" | "tag";

type GraphNode =
  | { id: "root"; type: "root"; label: string; seedX: number; seedY: number; count: number }
  | { id: string; type: "category"; label: Category; seedX: number; seedY: number; count: number }
  | { id: string; type: "memory"; label: string; seedX: number; seedY: number; memory: Memory }
  | { id: string; type: "tag"; label: string; seedX: number; seedY: number; count: number };

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: "category" | "memory" | "tag";
}

interface Position {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Props {
  memories: Memory[];
}

const WIDTH = 840;
const HEIGHT = 520;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 + 12 };
function getCategoryColor(category: Category) { return categoryColor(category).heatmap; }

function truncateLabel(label: string, max = 8) {
  return label.length > max ? `${label.slice(0, max)}...` : label;
}

function edgeLength(edge: GraphEdge) {
  if (edge.type === "category") return 150;
  if (edge.type === "memory") return 92;
  return 118;
}

function edgeStrength(edge: GraphEdge) {
  if (edge.type === "category") return 0.014;
  if (edge.type === "memory") return 0.028;
  return 0.018;
}

export function MemoryGraph({ memories }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("root");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(true);
  const [showMemories, setShowMemories] = useState(true);
  const [showTags, setShowTags] = useState(true);
  const [tagLimit, setTagLimit] = useState(8);
  const [memoryLimit, setMemoryLimit] = useState(10);
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const positionsRef = useRef<Record<string, Position>>({});
  const draggingRef = useRef<string | null>(null);

  const graph = useMemo(() => {
    const categoryCounts = new Map<Category, number>();
    const tagCounts = new Map<string, number>();

    memories.forEach((memory) => {
      categoryCounts.set(memory.category, (categoryCounts.get(memory.category) ?? 0) + 1);
      memory.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1));
    });

    const activeCategories = Array.from(categoryCounts.keys()).sort((a, b) => a.localeCompare(b, "zh-CN"));
    const nodes: GraphNode[] = [
      {
        id: "root",
        type: "root",
        label: "我的成长",
        seedX: CENTER.x,
        seedY: CENTER.y,
        count: memories.length,
      },
    ];
    const edges: GraphEdge[] = [];
    const edgeIds = new Set<string>();
    const categoryPositions = new Map<Category, { x: number; y: number }>();

    function addEdge(edge: GraphEdge) {
      if (edgeIds.has(edge.id)) return;
      edgeIds.add(edge.id);
      edges.push(edge);
    }

    activeCategories.forEach((category, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(activeCategories.length, 1)) * Math.PI * 2;
      const radius = activeCategories.length <= 3 ? 135 : 158;
      const x = CENTER.x + Math.cos(angle) * radius;
      const y = CENTER.y + Math.sin(angle) * radius;
      categoryPositions.set(category, { x, y });

      if (showCategories) {
        nodes.push({
          id: `category:${category}`,
          type: "category",
          label: category,
          seedX: x,
          seedY: y,
          count: categoryCounts.get(category) ?? 0,
        });
        addEdge({ id: `root:${category}`, from: "root", to: `category:${category}`, type: "category" });
      }
    });

    const memoriesByCategory = new Map<Category, Memory[]>();
    memories.forEach((memory) => {
      const group = memoriesByCategory.get(memory.category) ?? [];
      group.push(memory);
      memoriesByCategory.set(memory.category, group);
    });

    const visibleMemoryIds = new Set<string>();
    if (showMemories) {
      memoriesByCategory.forEach((group, category) => {
        const base = categoryPositions.get(category) ?? CENTER;
        group.slice(0, memoryLimit).forEach((memory, index) => {
          const spread = Math.min(group.length, memoryLimit);
          const angle = -Math.PI / 2 + ((index + 0.5) / Math.max(spread, 1)) * Math.PI * 2;
          const distance = showCategories ? 88 + Math.min(index, 6) * 7 : 180;
          const x = base.x + Math.cos(angle) * distance;
          const y = base.y + Math.sin(angle) * distance;
          const memoryId = `memory:${memory.id}`;
          visibleMemoryIds.add(memoryId);

          nodes.push({
            id: memoryId,
            type: "memory",
            label: memory.title || memory.raw_input || "未命名",
            seedX: x,
            seedY: y,
            memory,
          });
          addEdge({
            id: `${showCategories ? `category:${category}` : "root"}:${memoryId}`,
            from: showCategories ? `category:${category}` : "root",
            to: memoryId,
            type: "memory",
          });
        });
      });
    }

    if (showTags) {
      Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, tagLimit)
        .forEach(([tag, count], index, tags) => {
          const angle = Math.PI / 2 + (index / Math.max(tags.length, 1)) * Math.PI * 2;
          const x = CENTER.x + Math.cos(angle) * 225;
          const y = CENTER.y + Math.sin(angle) * 225;
          const tagId = `tag:${tag}`;
          nodes.push({ id: tagId, type: "tag", label: tag, seedX: x, seedY: y, count });

          memories
            .filter((memory) => memory.tags.includes(tag))
            .slice(0, 5)
            .forEach((memory) => {
              const memoryId = `memory:${memory.id}`;
              if (visibleMemoryIds.has(memoryId)) {
                addEdge({ id: `${memoryId}:${tagId}`, from: memoryId, to: tagId, type: "tag" });
              } else if (showCategories) {
                addEdge({
                  id: `category:${memory.category}:${tagId}`,
                  from: `category:${memory.category}`,
                  to: tagId,
                  type: "tag",
                });
              } else {
                addEdge({ id: `root:${tagId}`, from: "root", to: tagId, type: "tag" });
              }
            });
        });
    }

    return { width: WIDTH, height: HEIGHT, nodes, edges };
  }, [memories, memoryLimit, showCategories, showMemories, showTags, tagLimit]);

  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  useEffect(() => {
    let frameId = 0;
    let frames = 0;
    let quietFrames = 0;

    function syncNodes() {
      const validNodeIds = new Set(graph.nodes.map((node) => node.id));
      Object.keys(positionsRef.current).forEach((id) => {
        if (!validNodeIds.has(id)) delete positionsRef.current[id];
      });
      graph.nodes.forEach((node) => {
        if (!positionsRef.current[node.id]) {
          positionsRef.current[node.id] = { x: node.seedX, y: node.seedY, vx: 0, vy: 0 };
        }
      });
    }

    function tick() {
      syncNodes();

      if (physicsEnabled) {
        const positions = positionsRef.current;
        const nodes = graph.nodes;

        nodes.forEach((node) => {
          const position = positions[node.id];
          if (!position) return;

          if (node.type === "root" && draggingRef.current !== node.id) {
            position.vx += (CENTER.x - position.x) * 0.06;
            position.vy += (CENTER.y - position.y) * 0.06;
          } else if (draggingRef.current !== node.id) {
            position.vx += (node.seedX - position.x) * 0.003;
            position.vy += (node.seedY - position.y) * 0.003;
          }
        });

        graph.edges.forEach((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return;

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const force = (distance - edgeLength(edge)) * edgeStrength(edge);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          if (draggingRef.current !== edge.from) {
            from.vx += fx;
            from.vy += fy;
          }
          if (draggingRef.current !== edge.to) {
            to.vx -= fx;
            to.vy -= fy;
          }
        });

        for (let i = 0; i < nodes.length; i += 1) {
          for (let j = i + 1; j < nodes.length; j += 1) {
            const a = positions[nodes[i].id];
            const b = positions[nodes[j].id];
            if (!a || !b) continue;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.max(12, Math.hypot(dx, dy));
            const force = 90 / (distance * distance);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            if (draggingRef.current !== nodes[i].id) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (draggingRef.current !== nodes[j].id) {
              b.vx += fx;
              b.vy += fy;
            }
          }
        }

        nodes.forEach((node) => {
          const position = positions[node.id];
          if (!position || draggingRef.current === node.id) return;

          position.vx *= 0.84;
          position.vy *= 0.84;
          position.x = Math.min(WIDTH - 42, Math.max(42, position.x + position.vx));
          position.y = Math.min(HEIGHT - 42, Math.max(42, position.y + position.vy));
        });
      }

      setPositions({ ...positionsRef.current });
      frames += 1;
      const moving = Object.values(positionsRef.current).some(p => Math.abs(p.vx) + Math.abs(p.vy) > 0.05);
      quietFrames = moving ? 0 : quietFrames + 1;
      if (physicsEnabled && quietFrames < 20 && frames < 600) frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [graph, physicsEnabled, layoutVersion]);

  const selectedNode = nodeMap.get(selectedId) ?? graph.nodes[0];
  const activeId = hoveredId ?? selectedId;
  const relatedIds = new Set<string>([activeId]);
  graph.edges.forEach((edge) => {
    if (edge.from === activeId) relatedIds.add(edge.to);
    if (edge.to === activeId) relatedIds.add(edge.from);
  });

  function nodeRadius(node: GraphNode) {
    if (node.type === "root") return 34;
    if (node.type === "category") return 22 + Math.min(node.count, 8);
    if (node.type === "memory") return 12;
    return 10 + Math.min(node.count, 5);
  }

  function nodeFill(node: GraphNode) {
    if (node.type === "root") return "#785646";
    if (node.type === "category") return getCategoryColor(node.label);
    if (node.type === "tag") return "#78716c";
    return getCategoryColor(node.memory.category);
  }

  function describeNode(node: GraphNode) {
    if (node.type === "root") return `${node.count} 条记忆正在生长`;
    if (node.type === "category") return `${node.count} 条 ${node.label} 记忆`;
    if (node.type === "tag") return `${node.count} 次出现，连接到相关经历或分类`;
    return node.memory.result || node.memory.content || formatEventDate(node.memory.event_date);
  }

  function kindLabel(kind: NodeKind) {
    if (kind === "root") return "成长树";
    if (kind === "category") return "分类";
    if (kind === "tag") return "标签";
    return "记忆";
  }

  function getPointerPosition(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function resetLayout() {
    graph.nodes.forEach((node) => {
      positionsRef.current[node.id] = { x: node.seedX, y: node.seedY, vx: 0, vy: 0 };
    });
    setPositions({ ...positionsRef.current });
    setSelectedId("root");
    setLayoutVersion(version => version + 1);
  }

  return (
    <div className="space-y-3">
      <Card className="graph-settings">
        <CardContent className="p-0">
          <details>
            <summary>
              <span>显示选项</span>
              <span>调整图谱内容与布局</span>
            </summary>
            <div className="graph-settings-body">
              <div className="graph-toggle-list">
                <label className="graph-toggle"><input type="checkbox" checked={showCategories} onChange={(event) => setShowCategories(event.target.checked)} />分类</label>
                <label className="graph-toggle"><input type="checkbox" checked={showMemories} onChange={(event) => setShowMemories(event.target.checked)} />记忆</label>
                <label className="graph-toggle"><input type="checkbox" checked={showTags} onChange={(event) => setShowTags(event.target.checked)} />标签</label>
                <label className="graph-toggle"><input type="checkbox" checked={physicsEnabled} onChange={(event) => setPhysicsEnabled(event.target.checked)} />自动排列</label>
                <Button variant="ghost" size="sm" className="graph-reset" onClick={resetLayout}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  复位布局
                </Button>
              </div>
              <div className="graph-sliders">
                <label>
                  <div><span>标签数量</span><span>{tagLimit}</span></div>
                  <input type="range" min={0} max={15} value={tagLimit} onChange={(event) => setTagLimit(Number(event.target.value))} />
                </label>
                <label>
                  <div><span>每类记忆</span><span>{memoryLimit}</span></div>
                  <input type="range" min={3} max={20} value={memoryLimit} onChange={(event) => setMemoryLimit(Number(event.target.value))} />
                </label>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative h-[420px] sm:h-[520px] bg-card">
            <svg
              viewBox={`0 0 ${graph.width} ${graph.height}`}
              className="h-full w-full touch-none"
              role="img"
              aria-label="记忆成长图谱"
              onPointerMove={(event) => {
                const draggingId = draggingRef.current;
                if (!draggingId) return;
                const position = positionsRef.current[draggingId];
                if (!position) return;
                const next = getPointerPosition(event);
                position.x = next.x;
                position.y = next.y;
                position.vx = 0;
                position.vy = 0;
                setPositions({ ...positionsRef.current });
              }}
              onPointerUp={() => {
                if (!draggingRef.current) return;
                draggingRef.current = null;
                setLayoutVersion(version => version + 1);
              }}
              onPointerLeave={() => {
                if (!draggingRef.current) return;
                draggingRef.current = null;
                setLayoutVersion(version => version + 1);
              }}
            >
              <defs>
                <radialGradient id="graphRoot" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="#9b7864" />
                  <stop offset="100%" stopColor="#785646" />
                </radialGradient>
              </defs>

              {graph.edges.map((edge) => {
                const from = positions[edge.from];
                const to = positions[edge.to];
                if (!from || !to) return null;

                const active = relatedIds.has(edge.from) && relatedIds.has(edge.to);
                return (
                  <line
                    key={edge.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={active ? "#9b7864" : "#d6d3d1"}
                    strokeOpacity={active ? 0.9 : 0.32}
                    strokeWidth={active ? 2 : 1}
                  />
                );
              })}

              {graph.nodes.map((node) => {
                const position = positions[node.id];
                if (!position) return null;

                const active = relatedIds.has(node.id);
                const selected = selectedId === node.id;
                const radius = nodeRadius(node);

                return (
                  <g
                    key={node.id}
                    className="cursor-grab active:cursor-grabbing"
                    opacity={activeId === "root" || active ? 1 : 0.36}
                    onClick={() => setSelectedId(node.id)}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      draggingRef.current = node.id;
                      setSelectedId(node.id);
                    }}
                  >
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r={selected ? radius + 5 : radius}
                      fill={node.type === "root" ? "url(#graphRoot)" : nodeFill(node)}
                      stroke={selected ? "#AE5C3D" : "#fafaf9"}
                      strokeWidth={selected ? 3 : 2}
                    />
                    {node.type === "memory" && (
                      <text
                        x={position.x}
                        y={position.y + 4}
                        textAnchor="middle"
                        className="pointer-events-none fill-white text-[13px]"
                      >
                        {EMOTION_MAP[node.memory.emotion]?.emoji ?? ""}
                      </text>
                    )}
                    {node.type !== "memory" && (
                      <text
                        x={position.x}
                        y={position.y + 4}
                        textAnchor="middle"
                        className="pointer-events-none fill-white text-[12px] font-medium"
                      >
                        {node.count}
                      </text>
                    )}
                    <text
                      x={position.x}
                      y={position.y + radius + 18}
                      textAnchor="middle"
                      className="pointer-events-none fill-stone-700 dark:fill-stone-200 text-[12px]"
                    >
                      {truncateLabel(node.label, node.type === "memory" ? 7 : 8)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      {selectedNode && (
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{selectedNode.label}</p>
                <Badge variant="secondary" className="text-xs">
                  {kindLabel(selectedNode.type)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {describeNode(selectedNode)}
              </p>
            </div>
            {selectedNode.type === "memory" && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => router.push(`/memory/${selectedNode.memory.id}`)}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                打开详情
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
