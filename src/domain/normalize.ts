import type { GenogramDocument, Person, RoleAssignment, Union } from "./schema";

export type ValidationIssue = {
  message: string;
  path?: string;
};

export type NormalizedPerson = Person & {
  roles: RoleAssignment[];
  childOfUnionIds: string[];
  partnerUnionIds: string[];
};

export type NormalizedUnion = Union & {
  children: string[];
  roles: RoleAssignment[];
};

export type NormalizedGenogram = {
  people: NormalizedPerson[];
  unions: NormalizedUnion[];
  emotionalRelationships: GenogramDocument["emotionalRelationships"];
  roles: GenogramDocument["roles"];
  roleAssignments: GenogramDocument["roleAssignments"];
  layoutHints: GenogramDocument["layoutHints"];
  peopleById: Map<string, NormalizedPerson>;
  unionsById: Map<string, NormalizedUnion>;
};

export function normalizeGenogram(doc: GenogramDocument): { graph?: NormalizedGenogram; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const entityIds = new Set<string>();
  const roleIds = new Set<string>();
  const relationshipIds = new Set<string>();
  const assignmentIds = new Set<string>();

  const peopleById = new Map<string, NormalizedPerson>();
  const unionsById = new Map<string, NormalizedUnion>();

  doc.people.forEach((person, index) => {
    if (entityIds.has(person.id)) issues.push({ message: `Duplicate person or union id "${person.id}". Ids must be unique across people and unions.`, path: `people.${index}.id` });
    entityIds.add(person.id);
    peopleById.set(person.id, { ...person, roles: [], childOfUnionIds: [], partnerUnionIds: [] });
  });

  doc.unions.forEach((union, index) => {
    if (entityIds.has(union.id)) issues.push({ message: `Duplicate person or union id "${union.id}". Ids must be unique across people and unions.`, path: `unions.${index}.id` });
    entityIds.add(union.id);
    const normalized: NormalizedUnion = { ...union, children: [], roles: [] };
    unionsById.set(union.id, normalized);

    union.partners.forEach((partnerId, partnerIndex) => {
      const partner = peopleById.get(partnerId);
      if (!partner) {
        issues.push({ message: `Union "${union.id}" references missing partner "${partnerId}". Add a matching people entry or fix the partner id.`, path: `unions.${index}.partners.${partnerIndex}` });
      } else {
        partner.partnerUnionIds.push(union.id);
      }
    });
  });

  doc.parentChildLinks.forEach((link, index) => {
    const union = unionsById.get(link.parentUnionId);
    const child = peopleById.get(link.childId);
    if (!union) issues.push({ message: `Parent-child link references missing union "${link.parentUnionId}".`, path: `parentChildLinks.${index}.parentUnionId` });
    if (!child) issues.push({ message: `Parent-child link references missing child "${link.childId}".`, path: `parentChildLinks.${index}.childId` });
    if (union && child) {
      union.children.push(child.id);
      child.childOfUnionIds.push(union.id);
    }
  });

  doc.roles.forEach((role, index) => {
    if (roleIds.has(role.id)) issues.push({ message: `Duplicate role id "${role.id}".`, path: `roles.${index}.id` });
    roleIds.add(role.id);
  });

  doc.emotionalRelationships.forEach((rel, index) => {
    if (relationshipIds.has(rel.id)) issues.push({ message: `Duplicate emotional relationship id "${rel.id}".`, path: `emotionalRelationships.${index}.id` });
    relationshipIds.add(rel.id);
    if (!peopleById.has(rel.from)) issues.push({ message: `Emotional relationship "${rel.id}" has missing source "${rel.from}".`, path: `emotionalRelationships.${index}.from` });
    if (!peopleById.has(rel.to)) issues.push({ message: `Emotional relationship "${rel.id}" has missing target "${rel.to}".`, path: `emotionalRelationships.${index}.to` });
  });

  doc.roleAssignments.forEach((assignment, index) => {
    if (assignmentIds.has(assignment.id)) issues.push({ message: `Duplicate role assignment id "${assignment.id}".`, path: `roleAssignments.${index}.id` });
    assignmentIds.add(assignment.id);
    if (!roleIds.has(assignment.roleId)) {
      issues.push({ message: `Role assignment "${assignment.id}" references missing role "${assignment.roleId}".`, path: `roleAssignments.${index}.roleId` });
    }
    if (assignment.target.kind === "person") {
      const person = peopleById.get(assignment.target.id);
      if (!person) issues.push({ message: `Role assignment "${assignment.id}" targets missing person "${assignment.target.id}".`, path: `roleAssignments.${index}.target.id` });
      else person.roles.push(assignment);
    }
    if (assignment.target.kind === "union") {
      const union = unionsById.get(assignment.target.id);
      if (!union) issues.push({ message: `Role assignment "${assignment.id}" targets missing union "${assignment.target.id}".`, path: `roleAssignments.${index}.target.id` });
      else union.roles.push(assignment);
    }
    if (assignment.scope?.kind === "person" && !peopleById.has(assignment.scope.id)) {
      issues.push({ message: `Role assignment "${assignment.id}" scopes to missing person "${assignment.scope.id}".`, path: `roleAssignments.${index}.scope.id` });
    }
    if (assignment.scope?.kind === "union" && !unionsById.has(assignment.scope.id)) {
      issues.push({ message: `Role assignment "${assignment.id}" scopes to missing union "${assignment.scope.id}".`, path: `roleAssignments.${index}.scope.id` });
    }
  });

  doc.layoutHints.forEach((hint, index) => {
    if (hint.target.kind === "person" && !peopleById.has(hint.target.id)) {
      issues.push({ message: `Layout hint targets missing person "${hint.target.id}".`, path: `layoutHints.${index}.target.id` });
    }
    if (hint.target.kind === "union" && !unionsById.has(hint.target.id)) {
      issues.push({ message: `Layout hint targets missing union "${hint.target.id}".`, path: `layoutHints.${index}.target.id` });
    }
  });

  if (issues.length) return { issues };

  return {
    graph: {
      people: Array.from(peopleById.values()),
      unions: Array.from(unionsById.values()),
      emotionalRelationships: doc.emotionalRelationships,
      roles: doc.roles,
      roleAssignments: doc.roleAssignments,
      layoutHints: doc.layoutHints,
      peopleById,
      unionsById,
    },
    issues,
  };
}
