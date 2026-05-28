export const sampleMarkdown = `# Rivera family genogram

\`\`\`genogram-json
{
  "people": [
    { "id": "p_elena", "name": "Elena Rivera", "gender": "female", "birthYear": 1952 },
    { "id": "p_rafael", "name": "Rafael Rivera", "gender": "male", "birthYear": 1950 },
    { "id": "p_maya", "name": "Maya Rivera", "gender": "female", "birthYear": 1980 },
    { "id": "p_tomas", "name": "Tomas Rivera", "gender": "male", "birthYear": 1983 },
    { "id": "p_daniel", "name": "Daniel Brooks", "gender": "male", "birthYear": 1978 },
    { "id": "p_sam", "name": "Sam Cho", "gender": "nonbinary", "birthYear": 1982 },
    { "id": "p_lena", "name": "Lena Brooks", "gender": "female", "birthYear": 2010 },
    { "id": "p_noah", "name": "Noah Brooks", "gender": "male", "birthYear": 2012 },
    { "id": "p_ari", "name": "Ari Cho", "gender": "unknown", "birthYear": 2020 }
  ],
  "unions": [
    {
      "id": "u_elena_rafael",
      "partners": ["p_elena", "p_rafael"],
      "relationship": "married",
      "startYear": 1974
    },
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
    { "parentUnionId": "u_elena_rafael", "childId": "p_maya", "kind": "biological" },
    { "parentUnionId": "u_elena_rafael", "childId": "p_tomas", "kind": "biological" },
    { "parentUnionId": "u_maya_daniel", "childId": "p_lena", "kind": "biological" },
    { "parentUnionId": "u_maya_daniel", "childId": "p_noah", "kind": "biological" },
    { "parentUnionId": "u_maya_sam", "childId": "p_ari", "kind": "biological" }
  ],
  "emotionalRelationships": [
    { "id": "er_lena_maya_close", "from": "p_lena", "to": "p_maya", "kind": "close" },
    { "id": "er_lena_daniel_conflict", "from": "p_lena", "to": "p_daniel", "kind": "conflict" },
    { "id": "er_tomas_maya_supportive", "from": "p_tomas", "to": "p_maya", "kind": "supportive" }
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
      "id": "role_identified_patient",
      "name": "Identified Patient",
      "category": "systems",
      "canonicalKey": "identified_patient",
      "visual": { "badgeLabel": "IP" }
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
      "id": "ra_lena_ip",
      "roleId": "role_identified_patient",
      "target": { "kind": "person", "id": "p_lena" },
      "confidence": "observed"
    },
    {
      "id": "ra_maya_sam_coparent",
      "roleId": "role_coparent",
      "target": { "kind": "union", "id": "u_maya_sam" },
      "confidence": "reported"
    }
  ],
  "layoutHints": [
    {
      "target": { "kind": "person", "id": "p_maya" },
      "lane": 1
    }
  ]
}
\`\`\`
`;
