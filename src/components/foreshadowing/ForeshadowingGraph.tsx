import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { FORESHADOWING_STATUS_COLORS, getForeshadowingStatusColor } from '@/lib/colors';
import type { Foreshadowing } from '../../../shared/types';

interface ForeshadowingGraphProps {
  foreshadowings: Foreshadowing[];
  onNodeClick?: (foreshadowingId: string) => void;
  onNodeDoubleClick?: (foreshadowingId: string) => void;
}

interface FNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  status: string;
  degree: number;
}

type FLink = d3.SimulationLinkDatum<FNode>;

// 状态→主题 CSS 变量映射；运行时读取 documentElement 的 computed style 以兼容所有主题。
const STATUS_VAR_NAMES: Record<string, string> = {
  planted: '--warning',
  developed: '--info',
  resolved: '--success',
  abandoned: '--muted-foreground',
};

function readThemeStatusColors(): Record<string, string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return FORESHADOWING_STATUS_COLORS;
  }
  const styles = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const [status, varName] of Object.entries(STATUS_VAR_NAMES)) {
    const raw = styles.getPropertyValue(varName).trim();
    if (raw) {
      // CSS 变量存的是 "R G B" 形式，转为 rgb() 供 SVG 使用
      out[status] = raw.includes(' ') ? `rgb(${raw})` : raw;
    } else {
      out[status] = getForeshadowingStatusColor(status);
    }
  }
  return out;
}

const MIN_RADIUS = 16;
const MAX_RADIUS = 36;

function nodeRadius(degree: number, maxDegree: number): number {
  if (maxDegree <= 0) return MIN_RADIUS;
  return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, MIN_RADIUS + (degree / maxDegree) * (MAX_RADIUS - MIN_RADIUS)));
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export function ForeshadowingGraph({ foreshadowings, onNodeClick, onNodeDoubleClick }: ForeshadowingGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<FNode, FLink> | null>(null);
  const onClickRef = useRef(onNodeClick);
  onClickRef.current = onNodeClick;
  const onDblClickRef = useRef(onNodeDoubleClick);
  onDblClickRef.current = onNodeDoubleClick;

  const { nodes, links } = useMemo(() => {
    const idSet = new Set(foreshadowings.map((f) => f.id));
    const degree = new Map<string, number>();
    const rawLinks: { source: string; target: string }[] = [];
    const seen = new Set<string>();

    for (const f of foreshadowings) {
      const related = f.relatedForeshadowingIds ?? [];
      for (const rid of related) {
        if (!idSet.has(rid)) continue;
        const key = f.id < rid ? `${f.id}|${rid}` : `${rid}|${f.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rawLinks.push({ source: f.id, target: rid });
        degree.set(f.id, (degree.get(f.id) ?? 0) + 1);
        degree.set(rid, (degree.get(rid) ?? 0) + 1);
      }
    }

    const nodeList: FNode[] = foreshadowings.map((f) => ({
      id: f.id,
      title: f.title,
      status: f.status,
      degree: degree.get(f.id) ?? 0,
    }));
    return { nodes: nodeList, links: rawLinks as FLink[] };
  }, [foreshadowings]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    const rect = svgEl.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    svg.selectAll('*').remove();

    const root = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        root.attr('transform', event.transform.toString());
      });
    svg.call(zoom);

    svg.append('defs').append('marker')
      .attr('id', 'fs-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'rgb(var(--foreground))')
      .attr('opacity', 0.6);

    const localNodes: FNode[] = nodes.map((n) => ({
      ...n,
      x: n.x ?? width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: n.y ?? height / 2 + (Math.random() - 0.5) * height * 0.6,
    }));
    const localLinks: FLink[] = links.map((l) => ({ ...l }));

    const maxDegree = d3.max(localNodes, (d) => d.degree) ?? 0;
    const statusColors = readThemeStatusColors();

    const link = root
      .append('g')
      .attr('stroke', 'rgb(var(--foreground))')
      .attr('stroke-opacity', 0.4)
      .selectAll('line')
      .data(localLinks)
      .join('line')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#fs-arrow)');

    const node = root
      .append('g')
      .selectAll<SVGGElement, FNode>('g')
      .data(localNodes)
      .join('g')
      .attr('class', 'fnode')
      .style('cursor', 'pointer');

    node
      .append('circle')
      .attr('r', (d) => nodeRadius(d.degree, maxDegree))
      .attr('fill', (d) => statusColors[d.status] ?? getForeshadowingStatusColor('abandoned'))
      .attr('stroke', 'rgb(var(--foreground))')
      .attr('stroke-width', 2);

    node
      .append('text')
      .text((d) => truncate(d.title, 8))
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-family', 'var(--font-sans)')
      .attr('fill', 'rgb(var(--foreground))')
      .attr('y', (d) => nodeRadius(d.degree, maxDegree) + 12)
      .style('pointer-events', 'none');

    let highlightedId: string | null = null;
    const adjacency = new Map<string, Set<string>>();
    for (const l of localLinks) {
      const s = typeof l.source === 'object' ? (l.source as FNode).id : (l.source as string);
      const t = typeof l.target === 'object' ? (l.target as FNode).id : (l.target as string);
      if (!adjacency.has(s)) adjacency.set(s, new Set());
      if (!adjacency.has(t)) adjacency.set(t, new Set());
      adjacency.get(s)!.add(t);
      adjacency.get(t)!.add(s);
    }

    const applyHighlight = () => {
      const active = !!highlightedId;
      const linked = active ? adjacency.get(highlightedId!) ?? new Set<string>() : new Set<string>();
      node.style('opacity', (d) => {
        if (!active) return 1;
        if (d.id === highlightedId || linked.has(d.id)) return 1;
        return 0.3;
      });
      node.select('circle')
        .attr('stroke-width', (d) => (active && d.id === highlightedId ? 4 : 2))
        .attr('stroke', (d) => (active && d.id === highlightedId ? 'rgb(var(--ring))' : 'rgb(var(--foreground))'));
      link.style('opacity', (d) => {
        if (!active) return 0.4;
        const s = typeof d.source === 'object' ? (d.source as FNode).id : (d.source as string);
        const t = typeof d.target === 'object' ? (d.target as FNode).id : (d.target as string);
        return s === highlightedId || t === highlightedId ? 0.8 : 0.1;
      });
    };

    node.on('click', (event: MouseEvent, d) => {
      event.stopPropagation();
      highlightedId = highlightedId === d.id ? null : d.id;
      applyHighlight();
      onClickRef.current?.(d.id);
    });

    node.on('dblclick', (event: MouseEvent, d) => {
      event.stopPropagation();
      onDblClickRef.current?.(d.id);
    });

    svg.on('click', () => {
      highlightedId = null;
      applyHighlight();
    });

    const drag = d3
      .drag<SVGGElement, FNode>()
      .on('start', (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    const simulation = d3
      .forceSimulation<FNode>(localNodes)
      .force(
        'link',
        d3
          .forceLink<FNode, FLink>(localLinks)
          .id((d) => d.id)
          .distance(80)
          .strength(0.2),
      )
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3
          .forceCollide<FNode>()
          .radius((d) => nodeRadius(d.degree, maxDegree) + 6),
      )
      .alphaDecay(0.04);

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as FNode).x ?? 0)
        .attr('y1', (d) => (d.source as FNode).y ?? 0)
        .attr('x2', (d) => (d.target as FNode).x ?? 0)
        .attr('y2', (d) => (d.target as FNode).y ?? 0);
      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
      svg.on('click', null);
    };
  }, [nodes, links]);

  if (foreshadowings.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground font-sans">暂无伏笔</p>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className="h-full w-full"
      style={{ color: 'rgb(var(--foreground))' }}
    />
  );
}
