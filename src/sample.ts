export const sampleMarkdown = `# Rivera family genogram

\`\`\`genogram-json
{
  "people": [
    {
      "id": "p_maya",
      "name": "Maya Rivera",
      "gender": "female",
      "birthYear": 1980
    },
    {
      "id": "p_daniel",
      "name": "Daniel Rivera",
      "gender": "male",
      "birthYear": 1978
    },
    {
      "id": "p_lena",
      "name": "Lena Rivera",
      "gender": "female",
      "birthYear": 2010
    },
    {
      "id": "p_sam",
      "name": "Sam Cho",
      "gender": "nonbinary",
      "birthYear": 1982
    }
  ],
  "unions": [
    {
      "id": "u_maya_daniel",
      "partners": ["p_maya", "p_daniel"],
      "relationship": "divorced",
      "startYear": 2006,
      "endYear": 2018
    }
  ],
  "parentChildLinks": [
    {
      "parentUnionId": "u_maya_daniel",
      "childId": "p_lena",
      "kind": "biological"
    }
  ],
  "emotionalRelationships": [
    {
      "id": "er_1",
      "from": "p_lena",
      "to": "p_maya",
      "kind": "close"
    },
    {
      "id": "er_2",
      "from": "p_lena",
      "to": "p_daniel",
      "kind": "conflict"
    }
  ],
  "roles": [
    {
      "id": "role_caregiver",
      "name": "Caregiver",
      "category": "family",
      "canonicalKey": "caregiver",
      "visual": {
        "badgeLabel": "CG"
      }
    },
    {
      "id": "role_identified_patient",
      "name": "Identified Patient",
      "category": "systems",
      "canonicalKey": "identified_patient",
      "visual": {
        "badgeLabel": "IP"
      }
    },
    {
      "id": "role_coparent",
      "name": "Co-parent",
      "category": "family",
      "canonicalKey": "coparent",
      "visual": {
        "badgeLabel": "CP"
      }
    }
  ],
  "roleAssignments": [
    {
      "id": "ra_1",
      "roleId": "role_caregiver",
      "target": {
        "kind": "person",
        "id": "p_maya"
      },
      "scope": {
        "kind": "person",
        "id": "p_lena"
      },
      "confidence": "reported"
    },
    {
      "id": "ra_2",
      "roleId": "role_identified_patient",
      "target": {
        "kind": "person",
        "id": "p_lena"
      },
      "confidence": "observed"
    }
  ]
}
\`\`\`
`;
