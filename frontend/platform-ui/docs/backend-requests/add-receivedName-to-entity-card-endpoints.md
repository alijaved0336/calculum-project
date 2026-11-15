# Add `receivedName` to Entity Card endpoints

Include the field `receivedName` (nullable string) in the response of the following endpoints:

| Endpoint | Description |
| --- | --- |
| `POST /api/entity-card/get-entity-cards` | Main list and search |
| `POST /api/entity-card/get-recent-entity-cards` | Recently viewed |

**Field:** `receivedName` — original supplier name from the spend file, before normalization. Return `null` if not available.
