import type { NormalizedGenogram } from "../domain/normalize";

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
};

export type LayoutLink = {
  id: string;
  kind: "union" | "parentChild" | "emotional";
  relationship?: string;
  emotionalKind?: string;
  source: { x: number; y: number; id: string };
  target: { x: number; y: number; id: string };
};

export type DiagramLayout = {
  people: LayoutPerson[];
  unions: LayoutUnion[];
  links: LayoutLink[];
  width: number;
  height: number;
};

const X_GAP = 190;
const Y_GAP = 185;
const MARGIN = 110;

export function computeDiagramLayout(graph: NormalizedGenogram): DiagramLayout {
  const generation = new Map<string, number>();
  graph.people.forEach((person) => generation.set(person.id, 0));

  let changed = true;
  let guard = 0;
  while (changed && guard < graph.people.length * 3) {
    changed = false;
    guard += 1;
    for (const union of graph.unions) {
      const parentGeneration = Math.min(...union.partners.map((id) => generation.get(id) ?? 0));
      for (const childId of union.children) {
        const next = parentGeneration + 1;
        if ((generation.get(childId) ?? 0) < next) {
          generation.set(childId, next);
          changed = true;
        }
      }
    }
  }

  const grouped = new Map<number, string[]>();
  for (const person of graph.people) {
    const gen = generation.get(person.id) ?? 0;
    grouped.set(gen, [...(grouped.get(gen) ?? []), person.id]);
  }

  for (const ids of grouped.values()) {
    ids.sort((a, b) => {
      const pa = graph.peopleById.get(a)!;
      const pb = graph.peopleById.get(b)!;
      const byYear = (pa.birthYear ?? 9999) - (pb.birthYear ?? 9999);
      return byYear || pa.name.localeCompare(pb.name);
    });
  }

  const personPositions = new Map<string, LayoutPerson>();
  const roleById = new Map(graph.roles.map((role) => [role.id, role]));
  const maxRow = Math.max(...Array.from(grouped.values()).map((ids) => ids.length), 1);

  for (const [gen, ids] of grouped.entries()) {
    const rowWidth = (ids.length - 1) * X_GAP;
    const offset = ((maxRow - 1) * X_GAP - rowWidth) / 2;
    ids.forEach((id, index) => {
      const person = graph.peopleById.get(id)!;
      const roleLabels = person.roles
        .map((assignment) => roleById.get(assignment.roleId)?.visual?.badgeLabel ?? roleById.get(assignment.roleId)?.name.slice(0, 3).toUpperCase())
        .filter(Boolean) as string[];
      personPositions.set(id, {
        id,
        name: person.name,
        gender: person.gender,
        birthYear: person.birthYear,
        deathYear: person.deathYear,
        x: MARGIN + offset + index * X_GAP,
        y: MARGIN + gen * Y_GAP,
        generation: gen,
        roleLabels,
      });
    });
  }

  const unions: LayoutUnion[] = graph.unions.map((union) => {
    const partners = union.partners.map((id) => personPositions.get(id)).filter(Boolean) as LayoutPerson[];
    const x = partners.length ? partners.reduce((sum, partner) => sum + partner.x, 0) / partners.length : MARGIN;
    const y = partners.length ? partners[0].y + 58 : MARGIN;
    return {
      id: union.id,
      relationship: union.relationship,
      partnerIds: union.partners,
      childIds: union.children,
      x,
      y,
    };
  });

  const unionById = new Map(unions.map((union) => [union.id, union]));
  const links: LayoutLink[] = [];

  for (const union of unions) {
    for (const partnerId of union.partnerIds) {
      const partner = personPositions.get(partnerId);
      if (partner) links.push({ id: `${union.id}-${partnerId}`, kind: "union", relationship: union.relationship, source: partner, target: union });
    }
    for (const childId of union.childIds) {
      const child = personPositions.get(childId);
      if (child) links.push({ id: `${union.id}-${childId}`, kind: "parentChild", source: union, target: child });
    }
  }

  for (const rel of graph.emotionalRelationships) {
    const source = personPositions.get(rel.from);
    const target = personPositions.get(rel.to);
    if (source && target) {
      links.push({ id: rel.id, kind: "emotional", emotionalKind: rel.kind, source, target });
    }
  }

  const people = Array.from(personPositions.values());
  const maxX = Math.max(...people.map((person) => person.x), MARGIN);
  const maxY = Math.max(...people.map((person) => person.y), MARGIN);

  return {
    people,
    unions: Array.from(unionById.values()),
    links,
    width: Math.max(maxX + MARGIN, 720),
    height: Math.max(maxY + MARGIN, 480),
  };
}

