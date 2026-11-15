# Team CRUD - API Endpoints

Endpoints that the frontend must consume for the CRUD of teams belonging to a company.

---

## 1. List company teams (Read - Collection)

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/companies/{companyUuid}/teams` | Retrieves all teams of the company |

**Example:** `GET /api/companies/abc-123-uuid/teams`

---

## 2. Create team (Create)

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/teams` | Creates a new team associated with a company |

**Body (JSON):**
```json
{
  "name": "Team name",
  "company": "/api/companies/{companyUuid}"
}
```

**Permissions:** `ROLE_COMPANY_ADMIN`

---

## 3. Get a team (Read - Item)

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/teams/{teamUuid}` | Retrieves a team by UUID |

---

## 4. Update team (Update)

| Method | URL | Description |
|--------|-----|-------------|
| `PATCH` | `/api/teams/{teamUuid}` | Updates a team (e.g. name) |

**Headers:** `Content-Type: application/merge-patch+json`

**Body (JSON):**
```json
{
  "name": "New team name"
}
```

**Permissions:** `ROLE_ADMIN` or `ROLE_COMPANY_ADMIN`

---

## 5. Delete team (Delete)

| Method | URL | Description |
|--------|-----|-------------|
| `DELETE` | `/api/teams/{teamUuid}` | Deletes a team |

**Permissions:** `ROLE_ADMIN` or `ROLE_COMPANY_ADMIN`

---

## Current frontend implementation

In `src/modules/adminBackend/api/company.ts`:

- **GET (list):** `getCompanyTeams(companyId)` → `GET ${companyId}/teams`
  - `companyId` must be the full path, e.g. `/api/companies/{uuid}`
- **POST (create):** `postCompanyTeam(teamName, companyId)` → `POST /api/teams` with `{ name, company }`

**Not yet implemented:**
- `patchCompanyTeam(teamUuid, { name })` → `PATCH /api/teams/{teamUuid}`
- `deleteCompanyTeam(teamUuid)` → `DELETE /api/teams/{teamUuid}`

---

## 6. Bulk update Spend.team (manageTeam)

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/analyze/update-spend-program-configurations` | Bulk update procurement team (`Spend.team`) for selected spends, suppliers, or parents |

**Body (JSON):**
```json
{
  "program": "<programUuid>",
  "changed": {
    "key": "manageTeam",
    "value": "<teamUuid>"
  },
  "uuids": ["<entityUuid1>", "<entityUuid2>"],
  "level": "spends"
}
```

- **value**: Team UUID or `null` to remove team from spends
- **level**: Determines the meaning of `uuids`. **Omit** when `uuids` are config UUIDs.

| level | uuids represent | Use case |
|-------|-----------------|----------|
| `"spends"` | Row UUIDs from spend view (config UUIDs) | User selected individual spend rows; each row = one spend |
| `"suppliers"` | Supplier/provider UUIDs | User selected supplier rows; all spends under each supplier are updated |
| `"parents"` | Parent company UUIDs | User selected parent rows; all spends under each parent are updated |
| *(omit)* | Config UUIDs (`SpendProgramConfiguration.uuid`) | You already have config UUIDs; **do not send** `level` |

**Config UUIDs case (omit level):** When you have `SpendProgramConfiguration.uuid` values (e.g. from a previous response or from the spend view row identifier), send them in `uuids` and **do not include** `level` in the request. The backend treats omitted `level` as "uuids are config UUIDs". Validated in `AnalyzeSliderCalculationsTransformUuidTest`.

**Examples:**

```json
// 1. At spend level: update team for 3 specific spends
{
  "program": "program-uuid-123",
  "changed": { "key": "manageTeam", "value": "team-uuid-456" },
  "uuids": ["spend-row-uuid-a", "spend-row-uuid-b", "spend-row-uuid-c"],
  "level": "spends"
}

// 2. At supplier level: update team for all spends under 2 suppliers
{
  "program": "program-uuid-123",
  "changed": { "key": "manageTeam", "value": "team-uuid-789" },
  "uuids": ["supplier-uuid-x", "supplier-uuid-y"],
  "level": "suppliers"
}

// 3. At parent level: remove team from all spends under 2 parent companies
{
  "program": "program-uuid-123",
  "changed": { "key": "manageTeam", "value": null },
  "uuids": ["parent-uuid-p1", "parent-uuid-p2"],
  "level": "parents"
}

// 4. Config UUIDs (omit level): when you already have config UUIDs, do NOT send level
{
  "program": "program-uuid-123",
  "changed": { "key": "manageTeam", "value": null },
  "uuids": ["config-uuid-1", "config-uuid-2"]
}
```

- **No recalculations**: Only `Spend.team` is updated; views reflect changes on next load
