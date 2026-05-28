import { z } from "zod";

const requiredString = (label: string) => z.string({ required_error: `${label} is required.` }).trim().min(1, `${label} cannot be empty.`);
const optionalYear = (label: string) =>
  z
    .number({ invalid_type_error: `${label} must be a number.` })
    .int(`${label} must be a whole year.`)
    .min(1800, `${label} must be 1800 or later.`)
    .max(2200, `${label} must be 2200 or earlier.`)
    .optional();

export const GenderSchema = z.enum(["female", "male", "nonbinary", "unknown", "other"], {
  invalid_type_error: "gender must be one of: female, male, nonbinary, unknown, other.",
});
export const UnionRelationshipSchema = z.enum([
  "married",
  "partnered",
  "separated",
  "divorced",
  "cohabiting",
  "unknown",
]);
export const ParentChildKindSchema = z.enum(["biological", "adoptive", "foster", "step", "guardian", "unknown"], {
  invalid_type_error: "parent-child kind must be one of: biological, adoptive, foster, step, guardian, unknown.",
});
export const EmotionalKindSchema = z.enum([
  "close",
  "distant",
  "conflict",
  "cutoff",
  "enmeshed",
  "abuse",
  "supportive",
  "unknown",
]);

export const PersonSchema = z
  .object({
    id: requiredString("person.id"),
    name: requiredString("person.name"),
    gender: GenderSchema.default("unknown"),
    birthYear: optionalYear("birthYear"),
    deathYear: optionalYear("deathYear"),
    notes: z.string().optional(),
  })
  .refine((person) => !person.birthYear || !person.deathYear || person.deathYear >= person.birthYear, {
    message: "deathYear cannot be earlier than birthYear.",
    path: ["deathYear"],
  });

export const UnionSchema = z
  .object({
    id: requiredString("union.id"),
    partners: z
      .array(requiredString("partner id"), { required_error: "union.partners is required." })
      .min(1, "A union must include at least one partner id.")
      .max(2, "A union can include at most two partner ids."),
    relationship: UnionRelationshipSchema.default("unknown"),
    startYear: optionalYear("startYear"),
    endYear: optionalYear("endYear"),
  })
  .refine((union) => new Set(union.partners).size === union.partners.length, {
    message: "union.partners cannot contain the same person more than once.",
    path: ["partners"],
  })
  .refine((union) => !union.startYear || !union.endYear || union.endYear >= union.startYear, {
    message: "endYear cannot be earlier than startYear.",
    path: ["endYear"],
  });

export const ParentChildLinkSchema = z.object({
  parentUnionId: requiredString("parentUnionId"),
  childId: requiredString("childId"),
  kind: ParentChildKindSchema.default("unknown"),
});

export const EmotionalRelationshipSchema = z.object({
  id: requiredString("emotionalRelationship.id"),
  from: requiredString("emotionalRelationship.from"),
  to: requiredString("emotionalRelationship.to"),
  kind: EmotionalKindSchema.default("unknown"),
  notes: z.string().optional(),
}).refine((relationship) => relationship.from !== relationship.to, {
  message: "emotional relationship endpoints must be different people.",
  path: ["to"],
});

export const RoleSchema = z.object({
  id: requiredString("role.id"),
  name: requiredString("role.name"),
  category: requiredString("role.category").default("general"),
  canonicalKey: requiredString("role.canonicalKey").optional(),
  visual: z
    .object({
      badgeLabel: z.string().trim().min(1, "badgeLabel cannot be empty.").max(5, "badgeLabel must be 5 characters or fewer.").optional(),
      color: z.string().optional(),
    })
    .optional(),
});

const RoleTargetSchema = z.object({
  kind: z.enum(["person", "union"]),
  id: requiredString("target.id"),
});

export const EntityRefSchema = z.object({
  kind: z.enum(["person", "union"]),
  id: requiredString("target.id"),
});

export const RoleAssignmentSchema = z.object({
  id: requiredString("roleAssignment.id"),
  roleId: requiredString("roleId"),
  target: RoleTargetSchema,
  scope: RoleTargetSchema.optional(),
  confidence: z.enum(["reported", "observed", "inferred", "unknown"]).default("unknown"),
});

export const LayoutHintSchema = z.object({
  target: EntityRefSchema,
  x: z.number().optional(),
  y: z.number().optional(),
  pinned: z.boolean().optional(),
  rank: z.number().int().optional(),
  lane: z.number().int().optional(),
});

export const GenogramSchema = z.object({
  people: z.array(PersonSchema, { required_error: "people is required." }).min(1, "At least one person is required."),
  unions: z.array(UnionSchema).default([]),
  parentChildLinks: z.array(ParentChildLinkSchema).default([]),
  emotionalRelationships: z.array(EmotionalRelationshipSchema).default([]),
  roles: z.array(RoleSchema).default([]),
  roleAssignments: z.array(RoleAssignmentSchema).default([]),
  layoutHints: z.array(LayoutHintSchema).default([]),
});

export type GenogramDocument = z.infer<typeof GenogramSchema>;
export type EntityRef = z.infer<typeof EntityRefSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Union = z.infer<typeof UnionSchema>;
export type ParentChildLink = z.infer<typeof ParentChildLinkSchema>;
export type EmotionalRelationship = z.infer<typeof EmotionalRelationshipSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;
export type LayoutHint = z.infer<typeof LayoutHintSchema>;
