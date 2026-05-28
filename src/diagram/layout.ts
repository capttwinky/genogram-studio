import type { NormalizedGenogram, NormalizedUnion } from "../domain/normalize";

export type LayoutStrategyId = "simple" | "layered-v2";

export type LayoutStrategy = {
  id: LayoutStrategyId;
  name: string;
  compute(input: NormalizedGenogram): LayoutResult;
};

export type LayoutPerson = {
  id: string;
  name: string;
  gender: string;
  birthYear?: number;
  deathYear?: number;
  x: number;
  y: number;
  generation: number;
  roleLabels: string[];
};

export type LayoutUnion = {
  id: string;
  relationship: string;
  partnerIds: string[];
  childIds: string[];
  x: number;
  y: number;
  rank: number;
  lane: number;
};

export type LayoutLink = {
  id: string;
  kind: "union" | "parentChild" | "emotional";
  relationship?: string;
  emotionalKind?: string;
  source: { x: number; y: number; id: string };
  target: { x: number; y: number; id: string };
};

export type LayoutWarning = {
  code: "cycle" | "fallback-ranking";
  message: string;
};

export type LayoutResult = {
  strategyId: LayoutStrategyId;
  people: LayoutPerson[];
  unions: LayoutUnion[];
  links: LayoutLink[];
  warnings: LayoutWarning[];
  width: number;
  height: number;
};

export type DiagramLayout = LayoutResult;

type LayoutGraphNode =
  | { id: string; kind: "person"; entityId: string; rank: number; lane: number; x: number; y: number }
  | { id: string; kind: "union-anchor"; entityId: string; rank: number; lane: number; x: number; y: number }
  | { id: string; kind: "sibling-band"; unionId: string; rank: number; lane: number; x: number; y: number }
  | { id: string; kind: "junction"; unionId: string; rank: number; lane: number; x: number; y: number };

type LayoutGraph = {
  nodes: LayoutGraphNode[];
  edges: { id: string; source: string; target: string; kind: "partner" | "child" | "band" }[];
};

const X_GAP = 190;
const Y_GAP = 185;
const MARGIN = 110;
const UNION_LANE_GAP = 46;

export const simpleLayoutStrategy: LayoutStrategy = {
  id: "simple",
  name: "Simple",
  compute: (input) => computeSimpleLayout(input),
};

export const layeredV2LayoutStrategy: LayoutStrategy = {
  id: "layered-v2",
  name: "Layered v2",
  compute: (input) => computeLayeredV2Layout(input),
};

export const layoutStrategies: Record<LayoutStrategyId, LayoutStrategy> = {
  simple: simpleLayoutStrategy,
  "layered-v2": layeredV2LayoutStrategy,
};

export function computeDiagramLayout(graph: NormalizedGenogram, strategyId: LayoutStrategyId = "layered-v2"): DiagramLayout {
  return (layoutStrategies[strategyId] ?? simpleLayoutStrategy).compute(graph);
}

function computeSimpleLayout(graph: NormalizedGenogram): LayoutResult {
  return computeLayeredV2Layout(graph, "simple");
}

function computeLayeredV2Layout(graph: NormalizedGenogram, strategyId: LayoutStrategyId = "layered-v2"): LayoutResult {
  const warnings: LayoutWarning[] = [];
  const ranks = computeRanks(graph, warnings);
  const roleById = new Map(graph.roles.map((role) => [role.id, role]));
  const personHints = new Map(graph.layoutHints.filter((hint) => hint.target.kind === "person").map((hint) => [hint.target.id, hint]));
  const unionHints = new Map(graph.layoutHints.filter((hint) => hint.target.kind === "union").map((hint) => [hint.target.id, hint]));

  for (const hint of personHints.values()) {
    if (hint.rank !== undefined) ranks.set(hint.target.id, Math.max(0, hint.rank));
  }

  const grouped = new Map<number, string[]>();
  for (const person of graph.people) {
    const rank = ranks.get(person.id) ?? 0;
    grouped.set(rank, [...(grouped.get(rank) ?? []), person.id]);
  }

  for (const [rank, ids] of grouped.entries()) {
    ids.sort((a, b) => {
      const hintLane = (personHints.get(a)?.lane ?? Number.MAX_SAFE_INTEGER) - (personHints.get(b)?.lane ?? Number.MAX_SAFE_INTEGER);
      if (hintLane) return hintLane;
      const pa = graph.peopleById.get(a)!;
      const pb = graph.peopleById.get(b)!;
      const byParent = parentSortKey(pa.childOfUnionIds, graph) - parentSortKey(pb.childOfUnionIds, graph);
      const byYear = (pa.birthYear ?? 9999) - (pb.birthYear ?? 9999);
      return byParent || byYear || pa.name.localeCompare(pb.name);
    });
    grouped.set(rank, ids);
  }

  const maxRow = Math.max(...Array.from(grouped.values()).map((ids) => ids.length), 1);
  const personPositions = new Map<string, LayoutPerson>();
  for (const [rank, ids] of grouped.entries()) {
    const rowWidth = (ids.length - 1) * X_GAP;
    const offset = ((maxRow - 1) * X_GAP - rowWidth) / 2;
    ids.forEach((id, index) => {
      const person = graph.peopleById.get(id)!;
      const hint = personHints.get(id);
      const roleLabels = person.roles
        .map((assignment) => roleById.get(assignment.roleId)?.visual?.badgeLabel ?? roleById.get(assignment.roleId)?.name.slice(0, 3).toUpperCase())
        .filter(Boolean) as string[];
      personPositions.set(id, {
        id,
        name: person.name,
        gender: person.gender,
        birthYear: person.birthYear,
        deathYear: person.deathYear,
        x: hint?.pinned && hint.x !== undefined ? hint.x : MARGIN + offset + (hint?.lane ?? index) * X_GAP,
        y: hint?.pinned && hint.y !== undefined ? hint.y : MARGIN + rank * Y_GAP,
        generation: rank,
        roleLabels,
      });
    });
  }

  const unions = orderedUnions(graph).map((union) => {
    const partners = union.partners.map((id) => personPositions.get(id)).filter(Boolean) as LayoutPerson[];
    const baseX = partners.length ? partners.reduce((sum, partner) => sum + partner.x, 0) / partners.length : MARGIN;
    const rank = Math.max(...union.partners.map((id) => ranks.get(id) ?? 0), 0);
    const lane = unionLane(union, graph);
    const hint = unionHints.get(union.id);
    return {
      id: union.id,
      relationship: union.relationship,
      partnerIds: union.partners,
      childIds: union.children,
      x: hint?.pinned && hint.x !== undefined ? hint.x : baseX + lane * UNION_LANE_GAP,
      y: hint?.pinned && hint.y !== undefined ? hint.y : MARGIN + rank * Y_GAP + 58 + Math.abs(lane) * 12,
      rank,
      lane,
    };
  });

  const unionById = new Map(unions.map((union) => [union.id, union]));
  const internalGraph = buildInternalLayoutGraph(personPositions, unions);
  void internalGraph;
  const links = buildLinks(graph, personPositions, unionById);
  const people = Array.from(personPositions.values());
  const allNodes = [...people, ...unions];
  const maxX = Math.max(...allNodes.map((node) => node.x), MARGIN);
  const maxY = Math.max(...allNodes.map((node) => node.y), MARGIN);

  return {
    strategyId,
    people,
    unions,
    links,
    warnings,
    width: Math.max(maxX + MARGIN, 720),
    height: Math.max(maxY + MARGIN, 480),
  };
}

function computeRanks(graph: NormalizedGenogram, warnings: LayoutWarning[]) {
  const ranks = new Map(graph.people.map((person) => [person.id, 0]));
  const indegree = new Map(graph.people.map((person) => [person.id, 0]));
  const childEdges: { parent: string; child: string }[] = [];

  for (const union of graph.unions) {
    for (const parent of union.partners) {
      for (const child of union.children) {
        childEdges.push({ parent, child });
        indegree.set(child, (indegree.get(child) ?? 0) + 1);
      }
    }
  }

  const queue = graph.people.filter((person) => (indegree.get(person.id) ?? 0) === 0).map((person) => person.id);
  let visited = 0;
  while (queue.length) {
    const parent = queue.shift()!;
    visited += 1;
    for (const edge of childEdges.filter((candidate) => candidate.parent === parent)) {
      ranks.set(edge.child, Math.max(ranks.get(edge.child) ?? 0, (ranks.get(parent) ?? 0) + 1));
      indegree.set(edge.child, (indegree.get(edge.child) ?? 0) - 1);
      if ((indegree.get(edge.child) ?? 0) === 0) queue.push(edge.child);
    }
  }

  if (visited < graph.people.length) {
    warnings.push({ code: "cycle", message: "Parent-child data contains a cycle or contradictory ancestry; some ranks use fallback placement." });
    warnings.push({ code: "fallback-ranking", message: "Fallback ranking preserved input order for unresolved people." });
    graph.people.forEach((person, index) => {
      if ((indegree.get(person.id) ?? 0) > 0) ranks.set(person.id, ranks.get(person.id) ?? Math.floor(index / 4));
    });
  }

  return ranks;
}

function orderedUnions(graph: NormalizedGenogram) {
  const inputOrder = new Map(graph.unions.map((union, index) => [union.id, index]));
  return [...graph.unions].sort((a, b) => {
    const aDate = a.startYear ?? a.endYear;
    const bDate = b.startYear ?? b.endYear;
    if (aDate !== undefined && bDate !== undefined && aDate !== bDate) return aDate - bDate;
    if (a.startYear !== undefined && b.startYear === undefined) return -1;
    if (a.startYear === undefined && b.startYear !== undefined) return 1;
    if (a.endYear !== undefined && b.endYear !== undefined && a.endYear !== b.endYear) return a.endYear - b.endYear;
    return (inputOrder.get(a.id) ?? 0) - (inputOrder.get(b.id) ?? 0);
  });
}

function unionLane(union: NormalizedUnion, graph: NormalizedGenogram) {
  const orderedByPerson = union.partners.map((partnerId) => orderedUnionsForPerson(partnerId, graph));
  const index = Math.max(...orderedByPerson.map((unions) => unions.findIndex((candidate) => candidate.id === union.id)), 0);
  const count = Math.max(...orderedByPerson.map((unions) => unions.length), 1);
  return index - (count - 1) / 2;
}

function orderedUnionsForPerson(personId: string, graph: NormalizedGenogram) {
  const ids = graph.peopleById.get(personId)?.partnerUnionIds ?? [];
  const idSet = new Set(ids);
  return orderedUnions(graph).filter((union) => idSet.has(union.id));
}

function parentSortKey(unionIds: string[], graph: NormalizedGenogram) {
  if (!unionIds.length) return Number.MAX_SAFE_INTEGER;
  const firstUnion = graph.unions.findIndex((union) => union.id === unionIds[0]);
  return firstUnion === -1 ? Number.MAX_SAFE_INTEGER : firstUnion;
}

function buildInternalLayoutGraph(people: Map<string, LayoutPerson>, unions: LayoutUnion[]): LayoutGraph {
  const nodes: LayoutGraphNode[] = [];
  const edges: LayoutGraph["edges"] = [];
  for (const person of people.values()) {
    nodes.push({ id: `person:${person.id}`, kind: "person", entityId: person.id, rank: person.generation, lane: 0, x: person.x, y: person.y });
  }
  for (const union of unions) {
    const anchorId = `union:${union.id}`;
    const bandId = `band:${union.id}`;
    nodes.push({ id: anchorId, kind: "union-anchor", entityId: union.id, rank: union.rank, lane: union.lane, x: union.x, y: union.y });
    if (union.childIds.length > 1) nodes.push({ id: bandId, kind: "sibling-band", unionId: union.id, rank: union.rank + 1, lane: union.lane, x: union.x, y: union.y + 62 });
    union.partnerIds.forEach((partnerId) => edges.push({ id: `${partnerId}->${anchorId}`, source: `person:${partnerId}`, target: anchorId, kind: "partner" }));
    union.childIds.forEach((childId) => edges.push({ id: `${anchorId}->${childId}`, source: union.childIds.length > 1 ? bandId : anchorId, target: `person:${childId}`, kind: "child" }));
    if (union.childIds.length > 1) edges.push({ id: `${anchorId}->${bandId}`, source: anchorId, target: bandId, kind: "band" });
  }
  return { nodes, edges };
}

function buildLinks(graph: NormalizedGenogram, people: Map<string, LayoutPerson>, unions: Map<string, LayoutUnion>) {
  const links: LayoutLink[] = [];
  for (const union of unions.values()) {
    for (const partnerId of union.partnerIds) {
      const partner = people.get(partnerId);
      if (partner) links.push({ id: `${union.id}-${partnerId}`, kind: "union", relationship: union.relationship, source: partner, target: union });
    }
    for (const childId of union.childIds) {
      const child = people.get(childId);
      if (child) links.push({ id: `${union.id}-${childId}`, kind: "parentChild", source: union, target: child });
    }
  }
  for (const rel of graph.emotionalRelationships) {
    const source = people.get(rel.from);
    const target = people.get(rel.to);
    if (source && target) links.push({ id: rel.id, kind: "emotional", emotionalKind: rel.kind, source, target });
  }
  return links;
}
