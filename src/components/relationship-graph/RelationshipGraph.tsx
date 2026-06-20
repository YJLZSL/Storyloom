import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getNodeColor } from '@/lib/colors';

export type GraphNodeType = 'character' | 'event' | 'world-setting';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  rawId: string;
  type: GraphNodeType;
  label: string;
  degree: number;
}

export type GraphLink = d3.SimulationLinkDatum<GraphNode>;

interface RelationshipGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (node: GraphNode) => void;
  highlightedNodeIds?: Set<string> | null;
}

const MIN_RADIUS = 20;
const MAX_RADIUS = 40;

function nodeRadius(degree: number, maxDegree: number): number {
  if (maxDegree <= 0) return MIN_RADIUS;
  const scaled = MIN_RADIUS + (degree / maxDegree) * (MAX_RADIUS - MIN_RADIUS);
  return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, scaled));
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export function RelationshipGraph({ nodes, links, onNodeClick, highlightedNodeIds }: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const highlightedRef = useRef(highlightedNodeIds);
  highlightedRef.current = highlightedNodeIds;

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    const rect = svgEl.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    const localNodes: GraphNode[] = nodes.map((n) => ({
      ...n,
      x: n.x ?? width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: n.y ?? height / 2 + (Math.random() - 0.5) * height * 0.6,
    }));

    const localLinks: GraphLink[] = links.map((l) => ({ ...l }));

    const maxDegree = d3.max(localNodes, (d) => d.degree) ?? 0;

    const link = g
      .append('g')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.3)
      .selectAll('line')
      .data(localLinks)
      .join('line')
      .attr('stroke-width', 1.5);

    const node = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(localNodes)
      .join('g')
      .attr('class', 'gnode')
      .style('cursor', 'pointer');

    node
      .append('circle')
      .attr('r', (d) => nodeRadius(d.degree, maxDegree))
      .attr('fill', (d) => getNodeColor(d.type))
      .style('stroke', 'rgb(var(--background))')
      .attr('stroke-width', 2);

    node
      .append('text')
      .text((d) => truncate(d.label, 8))
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-family', 'var(--font-sans)')
      .attr('fill', 'currentColor')
      .attr('y', (d) => nodeRadius(d.degree, maxDegree) + 14)
      .style('pointer-events', 'none');

    node.on('click', (event: MouseEvent, d) => {
      event.stopPropagation();
      onNodeClickRef.current(d);
    });

    const drag = d3
      .drag<SVGGElement, GraphNode>()
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
      .forceSimulation<GraphNode>(localNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(localLinks)
          .id((d) => d.id)
          .distance(90)
          .strength(0.1),
      )
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3
          .forceCollide<GraphNode>()
          .radius((d) => nodeRadius(d.degree, maxDegree) + 8),
      )
      .alphaDecay(0.03);

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);
      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [nodes, links]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const hasHighlight = !!(highlightedNodeIds && highlightedNodeIds.size > 0);
    svg.selectAll<SVGGElement, GraphNode>('g.gnode')
      .each(function (datum) {
        const group = d3.select(this as SVGGElement);
        if (!datum || typeof datum !== 'object' || !('id' in datum)) return;
        const matched = hasHighlight && highlightedNodeIds!.has(datum.id);
        group.style('opacity', hasHighlight ? (matched ? 1 : 0.4) : 1);
        group.select('circle')
          .attr('stroke', matched ? '#facc15' : 'rgb(var(--background))')
          .attr('stroke-width', matched ? 4 : 2);
      });
    svg.selectAll<SVGLineElement, GraphLink>('line')
      .style('opacity', (d) => {
        if (!hasHighlight) return 0.3;
        const sId = typeof d.source === 'object' ? (d.source as GraphNode).id : (d.source as string);
        const tId = typeof d.target === 'object' ? (d.target as GraphNode).id : (d.target as string);
        return highlightedNodeIds!.has(sId) || highlightedNodeIds!.has(tId) ? 0.6 : 0.1;
      });
  }, [highlightedNodeIds, nodes]);

  return (
    <svg
      ref={svgRef}
      className="h-full w-full"
      style={{ color: 'rgb(var(--foreground))' }}
    />
  );
}
