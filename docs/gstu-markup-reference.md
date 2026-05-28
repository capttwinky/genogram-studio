# gstu Markup Reference

## Purpose

Genogram Studio reads Markdown containing a fenced `genogram-json` block, extracts the JSON, validates it with Zod, normalizes references into an internal graph model, computes layout, and renders an interactive SVG genogram with D3.

The current gstu markup is an MVP JSON-in-Markdown format. It is designed for human-authored diagrams and for developers extending the schema.

## Basic Markdown Wrapper

Preferred wrapper:

````markdown
```genogram-json
{
  "people": [],
  "unions": [],
  "parentChildLinks": [],
  "emotionalRelationships": [],
  "roles": [],
  "roleAssignments": []
}
```
````

The skeleton above shows the object shape. A renderable document must include at least one person in `people`.

Current parser fallback behavior:

- A fenced `json` block is also accepted.
- If no `genogram-json` or `json` fence is found, the app tries to parse the entire editor contents as raw JSON.
- Only the first matching fence is extracted.

## Top-Level Object

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `people` | `Person[]` | Required | People rendered as genogram person symbols. Must contain at least one person. |
| `unions` | `Union[]` | Optional, defaults to `[]` | Partner relationships and parent-set anchors. |
| `parentChildLinks` | `ParentChildLink[]` | Optional, defaults to `[]` | Links children to a parent union. |
| `emotionalRelationships` | `EmotionalRelationship[]` | Optional, defaults to `[]` | Overlay edges between people. These do not determine structural ancestry layout. |
| `roles` | `Role[]` | Optional, defaults to `[]` | Role definitions used by role assignments and badges. |
| `roleAssignments` | `RoleAssignment[]` | Optional, defaults to `[]` | Assigns a role to a person or union, optionally scoped to another person or union. |
| `layoutHints` | `LayoutHint[]` | Optional, defaults to `[]` | Optional placement hints for people and unions. Currently used by the layered layout. |

Unknown fields are not part of the supported markup. The current Zod object schemas do not expose unknown fields to the normalized graph or renderer.

## Entity IDs and References

IDs should be stable strings. Prefer semantic ids such as `p_joel`, `u_parents`, `role_caregiver`, and `er_joel_parent_conflict`.

Reference model:

- Person ids are referenced by `unions[].partners`, `parentChildLinks[].childId`, `emotionalRelationships[].from`, `emotionalRelationships[].to`, role assignment targets/scopes, and layout hint targets.
- Union ids are referenced by `parentChildLinks[].parentUnionId`, role assignment targets/scopes, and layout hint targets.
- Role ids are referenced by `roleAssignments[].roleId`.
- Entity references are objects shaped as `{ "kind": "person", "id": "p_example" }` or `{ "kind": "union", "id": "u_example" }`.

Duplicate and missing-reference behavior:

- Person ids and union ids must be unique across both `people` and `unions`.
- Role ids must be unique within `roles`.
- Emotional relationship ids must be unique within `emotionalRelationships`.
- Role assignment ids must be unique within `roleAssignments`.
- Missing referenced people, unions, or roles are reported as validation issues during normalization.

## People

`Person` objects define individual people in the diagram.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Required | Stable person id. Empty strings are invalid. |
| `name` | `string` | Required | Display name. Empty strings are invalid. |
| `gender` | enum | Optional, defaults to `unknown` | Determines the rendered genogram symbol. |
| `birthYear` | integer | Optional | Whole year from 1800 through 2200. |
| `deathYear` | integer | Optional | Whole year from 1800 through 2200. Must not be earlier than `birthYear` when both are present. |
| `notes` | `string` | Optional | Free text notes. Currently validated but not rendered. |

Accepted `gender` values:

- `female`
- `male`
- `nonbinary`
- `unknown`
- `other`

Example:

```json
{
  "id": "p_maya",
  "name": "Maya Rivera",
  "gender": "female",
  "birthYear": 1980
}
```

## Unions

`Union` objects define partner relationships and act as parent-set anchors for children.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Required | Stable union id. Empty strings are invalid. |
| `partners` | `string[]` | Required | One or two person ids. Partner ids must be unique within the union. |
| `relationship` | enum | Optional, defaults to `unknown` | Relationship style and label. |
| `startYear` | integer | Optional | Whole year from 1800 through 2200. Used for union ordering. |
| `endYear` | integer | Optional | Whole year from 1800 through 2200. Must not be earlier than `startYear` when both are present. Used for union ordering. |

Accepted `relationship` values:

- `married`
- `partnered`
- `separated`
- `divorced`
- `cohabiting`
- `unknown`

Unions connect partners and serve as the `parentUnionId` target for parent-child links. The renderer draws union links from each partner to a small union anchor, then draws parent-child links from that anchor to children.

Example:

```json
{
  "id": "u_maya_daniel",
  "partners": ["p_maya", "p_daniel"],
  "relationship": "divorced",
  "startYear": 2006,
  "endYear": 2018
}
```

## Parent-Child Links

`ParentChildLink` objects attach one child person to one parent union.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `parentUnionId` | `string` | Required | Union id for the parent set. |
| `childId` | `string` | Required | Person id for the child. |
| `kind` | enum | Optional, defaults to `unknown` | Parent-child relationship kind. Validated but not visually distinguished yet. |

Accepted `kind` values:

- `biological`
- `adoptive`
- `foster`
- `step`
- `guardian`
- `unknown`

Example:

```json
{
  "parentUnionId": "u_maya_daniel",
  "childId": "p_lena",
  "kind": "biological"
}
```

## Emotional Relationships

`EmotionalRelationship` objects define overlay edges between people. They are rendered over the structural genogram and should not be used to represent parent-child ancestry.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Required | Stable emotional relationship id. Empty strings are invalid. |
| `from` | `string` | Required | Source person id. |
| `to` | `string` | Required | Target person id. Must be different from `from`. |
| `kind` | enum | Optional, defaults to `unknown` | Emotional relationship style. |
| `notes` | `string` | Optional | Free text notes. Currently validated but not rendered. |

Accepted `kind` values:

- `close`
- `distant`
- `conflict`
- `cutoff`
- `enmeshed`
- `abuse`
- `supportive`
- `unknown`

`direction` is not supported by the current schema. Emotional relationships are currently stored with `from` and `to` endpoints and rendered with an arrow marker, but there is no separate `direction` enum.

Example:

```json
{
  "id": "er_lena_daniel_conflict",
  "from": "p_lena",
  "to": "p_daniel",
  "kind": "conflict"
}
```

## Roles

`Role` objects define semantic overlays that can be assigned to people or unions.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Required | Stable role id. Empty strings are invalid. |
| `name` | `string` | Required | Human-readable role name. Empty strings are invalid. |
| `category` | `string` | Optional, defaults to `general` | Any non-empty string. There is no fixed category enum in the current schema. |
| `canonicalKey` | `string` | Optional | Stable semantic key for downstream use. Empty strings are invalid when present. |
| `visual` | object | Optional | Visual role metadata. |
| `visual.badgeLabel` | `string` | Optional | Badge text shown on assigned people. Must be 1 to 5 characters when present. |
| `visual.color` | `string` | Optional | Accepted by the schema. Currently not used by the renderer. |

`description` is not supported by the current schema.

Example:

```json
{
  "id": "role_caregiver",
  "name": "Caregiver",
  "category": "family",
  "canonicalKey": "caregiver",
  "visual": {
    "badgeLabel": "CG",
    "color": "#25313d"
  }
}
```

## Role Assignments

`RoleAssignment` objects assign a role to a person or union, optionally scoped to another person or union.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Required | Stable role assignment id. Empty strings are invalid. |
| `roleId` | `string` | Required | Existing role id. |
| `target` | `EntityRef` | Required | Person or union receiving the role. |
| `scope` | `EntityRef` | Optional | Person or union that scopes the role. |
| `confidence` | enum | Optional, defaults to `unknown` | Confidence/provenance level. |

Accepted `confidence` values:

- `reported`
- `observed`
- `inferred`
- `unknown`

`startDate`, `endDate`, `source`, and `notes` are not supported by the current schema.

Example:

```json
{
  "id": "ra_maya_caregiver",
  "roleId": "role_caregiver",
  "target": { "kind": "person", "id": "p_maya" },
  "scope": { "kind": "person", "id": "p_lena" },
  "confidence": "reported"
}
```

## Layout Hints

`LayoutHint` objects provide optional placement hints for people and unions. They are supported by the schema and used by the current layered layout.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | `EntityRef` | Required | Person or union to hint. Missing targets are validation issues. |
| `x` | `number` | Optional | Absolute SVG x-position. Used only when `pinned` is `true`. |
| `y` | `number` | Optional | Absolute SVG y-position. Used only when `pinned` is `true`. |
| `pinned` | `boolean` | Optional | When `true`, uses provided `x` and/or `y` instead of computed coordinates for that axis. |
| `rank` | integer | Optional | Overrides person generation rank before grouping. Currently applied to person hints only. |
| `lane` | integer | Optional | Ordering lane. For people, affects ordering and x-position. For unions, accepted by the schema but not currently used directly; union lanes are computed from union order. |

Examples:

```json
{
  "target": { "kind": "person", "id": "p_maya" },
  "rank": 1,
  "lane": 2
}
```

```json
{
  "target": { "kind": "union", "id": "u_maya_daniel" },
  "pinned": true,
  "x": 360,
  "y": 210
}
```

## Enumerations Reference

### `Person.gender`

| Value |
| --- |
| `female` |
| `male` |
| `nonbinary` |
| `unknown` |
| `other` |

### `Union.relationship`

| Value |
| --- |
| `married` |
| `partnered` |
| `separated` |
| `divorced` |
| `cohabiting` |
| `unknown` |

### `ParentChildLink.kind`

| Value |
| --- |
| `biological` |
| `adoptive` |
| `foster` |
| `step` |
| `guardian` |
| `unknown` |

### `EmotionalRelationship.kind`

| Value |
| --- |
| `close` |
| `distant` |
| `conflict` |
| `cutoff` |
| `enmeshed` |
| `abuse` |
| `supportive` |
| `unknown` |

### `EmotionalRelationship.direction`

Not supported by the current schema. There are no accepted `direction` values.

### `Role.category`

`Role.category` is any non-empty string and defaults to `general`. There is no fixed category enum in the current schema.

### `RoleAssignment.confidence`

| Value |
| --- |
| `reported` |
| `observed` |
| `inferred` |
| `unknown` |

### `EntityRef.kind`

| Value |
| --- |
| `person` |
| `union` |

## Complete Examples

### A. Minimal Person-Only Diagram

````markdown
```genogram-json
{
  "people": [
    {
      "id": "p_joel",
      "name": "Joel",
      "gender": "male",
      "birthYear": 1979
    }
  ],
  "unions": [],
  "parentChildLinks": [],
  "emotionalRelationships": [],
  "roles": [],
  "roleAssignments": []
}
```
````

### B. Basic Nuclear-Family Diagram

````markdown
```genogram-json
{
  "people": [
    { "id": "p_alex", "name": "Alex Chen", "gender": "female", "birthYear": 1981 },
    { "id": "p_jordan", "name": "Jordan Chen", "gender": "male", "birthYear": 1979 },
    { "id": "p_riley", "name": "Riley Chen", "gender": "unknown", "birthYear": 2012 }
  ],
  "unions": [
    {
      "id": "u_alex_jordan",
      "partners": ["p_alex", "p_jordan"],
      "relationship": "married",
      "startYear": 2008
    }
  ],
  "parentChildLinks": [
    {
      "parentUnionId": "u_alex_jordan",
      "childId": "p_riley",
      "kind": "biological"
    }
  ],
  "emotionalRelationships": [],
  "roles": [
    {
      "id": "role_caregiver",
      "name": "Caregiver",
      "category": "family",
      "canonicalKey": "caregiver",
      "visual": { "badgeLabel": "CG" }
    }
  ],
  "roleAssignments": [
    {
      "id": "ra_alex_caregiver",
      "roleId": "role_caregiver",
      "target": { "kind": "person", "id": "p_alex" },
      "scope": { "kind": "person", "id": "p_riley" },
      "confidence": "reported"
    }
  ]
}
```
````

### C. Multi-Relationship Diagram

````markdown
```genogram-json
{
  "people": [
    { "id": "p_maya", "name": "Maya Rivera", "gender": "female", "birthYear": 1980 },
    { "id": "p_daniel", "name": "Daniel Brooks", "gender": "male", "birthYear": 1978 },
    { "id": "p_sam", "name": "Sam Cho", "gender": "nonbinary", "birthYear": 1982 },
    { "id": "p_lena", "name": "Lena Brooks", "gender": "female", "birthYear": 2010 },
    { "id": "p_noah", "name": "Noah Brooks", "gender": "male", "birthYear": 2012 },
    { "id": "p_ari", "name": "Ari Cho", "gender": "unknown", "birthYear": 2020 }
  ],
  "unions": [
    {
      "id": "u_maya_daniel",
      "partners": ["p_maya", "p_daniel"],
      "relationship": "divorced",
      "startYear": 2006,
      "endYear": 2018
    },
    {
      "id": "u_maya_sam",
      "partners": ["p_maya", "p_sam"],
      "relationship": "partnered",
      "startYear": 2019
    }
  ],
  "parentChildLinks": [
    { "parentUnionId": "u_maya_daniel", "childId": "p_lena", "kind": "biological" },
    { "parentUnionId": "u_maya_daniel", "childId": "p_noah", "kind": "biological" },
    { "parentUnionId": "u_maya_sam", "childId": "p_ari", "kind": "biological" }
  ],
  "emotionalRelationships": [
    { "id": "er_lena_maya_close", "from": "p_lena", "to": "p_maya", "kind": "close" },
    { "id": "er_lena_daniel_conflict", "from": "p_lena", "to": "p_daniel", "kind": "conflict" }
  ],
  "roles": [
    {
      "id": "role_caregiver",
      "name": "Caregiver",
      "category": "family",
      "canonicalKey": "caregiver",
      "visual": { "badgeLabel": "CG" }
    },
    {
      "id": "role_coparent",
      "name": "Co-parent",
      "category": "family",
      "canonicalKey": "coparent",
      "visual": { "badgeLabel": "CP" }
    }
  ],
  "roleAssignments": [
    {
      "id": "ra_maya_caregiver",
      "roleId": "role_caregiver",
      "target": { "kind": "person", "id": "p_maya" },
      "scope": { "kind": "person", "id": "p_lena" },
      "confidence": "reported"
    },
    {
      "id": "ra_maya_sam_coparent",
      "roleId": "role_coparent",
      "target": { "kind": "union", "id": "u_maya_sam" },
      "confidence": "observed"
    }
  ],
  "layoutHints": [
    {
      "target": { "kind": "person", "id": "p_maya" },
      "lane": 1
    }
  ]
}
```
````

## Validation Notes

Common validation errors:

- Malformed JSON in the fenced block or raw editor contents.
- Missing `people`, or an empty `people` array.
- Missing required fields such as `person.id`, `person.name`, `union.id`, `union.partners`, `role.id`, or `roleAssignment.target`.
- Empty strings in required id/name fields.
- Invalid enum values.
- Duplicate person/union ids, role ids, emotional relationship ids, or role assignment ids.
- Missing referenced people in unions, parent-child links, emotional relationships, role assignment targets/scopes, or layout hints.
- Missing referenced unions in parent-child links, role assignment targets/scopes, or layout hints.
- Missing referenced roles in role assignments.
- `deathYear` earlier than `birthYear`, or `endYear` earlier than `startYear`.
- Years outside the accepted 1800 through 2200 range.
- Emotional relationships where `from` and `to` are the same person.

## Authoring Guidance

- Prefer stable semantic IDs like `p_joel`, `u_parents`, and `role_caregiver`.
- Keep sample data anonymized.
- Do not put private family, clinical, legal, or identifying data in public GitHub issues, pull requests, screenshots, fixtures, or examples.
- Use roles for semantic overlays instead of overloading `notes`.
- Use emotional relationships for overlay edges rather than structural parent/child relationships.
- Use `layoutHints` sparingly. Let the computed layout do the default placement, then add hints only where a diagram needs a specific ordering or pinned position.

## Compatibility / Future Schema Evolution

The current markup is the MVP schema. Future versions may evolve toward a more general ontology with:

- richer relationships
- events
- facts and states
- households
- sources and assertions
- notation profiles
- expanded layout hints

These items are planned/not yet supported unless they are documented above as current schema fields.
