# Course Requirement Audit

This folder is for a course-by-course eligibility requirement audit of the
current processed corpus.

Input corpus:

- `data/processed/programmes.jsonl`
- `data/processed/entry-requirements.jsonl`
- `data/processed/requirement-rules.jsonl`

Expected output per chunk:

- one `.jsonl` file with exactly one row for every programme row assigned to
  the chunk
- one summary `.md` file for that chunk

JSONL row shape:

```json
{
  "lineNumber": 1,
  "programmeName": "",
  "institutionName": "",
  "regulator": "",
  "awardLevel": "",
  "normalizedProgrammeName": "",
  "normalizedInstitutionName": "",
  "entryRouteTypes": "",
  "minimumEntryRequirements": "",
  "requirementRuleRowsFound": 0,
  "routeStatuses": {
    "form_four": "missing|structured|partial|unparsed",
    "form_six": "missing|structured|partial|unparsed",
    "certificate": "missing|structured|partial|unparsed",
    "diploma": "missing|structured|partial|unparsed",
    "equivalent": "missing|structured|partial|unparsed"
  },
  "reviewStatus": "ok|needs_parser_work|needs_source_cleanup|missing_requirements|manual_review",
  "reviewNotes": "",
  "recommendedAction": ""
}
```

The goal is not to hand-edit Convex rows. The goal is to produce a complete
course-level audit that tells us which courses are already usable, which need
parser work, and which need source cleanup/manual source investigation.
