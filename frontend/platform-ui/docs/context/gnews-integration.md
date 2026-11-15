# GNews API Integration

## Summary
Integration of GNews API (https://gnews.io/) to display news articles related to suppliers in the Entity Card.

## Implementation Date
2026-01-14

## Architecture
The integration follows a backend proxy pattern:
- **Frontend** → calls Backend endpoint → **Backend** → calls GNews API

This approach:
- Keeps the API key secure (not exposed in frontend)
- Avoids CORS issues
- Centralizes query sanitization logic

## Files Created/Modified

### Backend (Symfony)

#### New Files
- `src/Controller/ExternalsAPIs/GNewsController.php` - Controller with endpoint `/api/externals-apis/gnews/search`

#### Modified Files
- `config/services.yaml` - Added `gnews_api_key` parameter

#### Environment Variable Required
```
GNEWS_API_KEY=your-api-key-here
```

### Frontend (Vue.js)

#### New Files
- `src/modules/home/entityCard/views/EntityCardNews.vue` - News tab component

#### Modified Files
- `src/modules/home/entityCard/api/index.ts` - Added `searchNews()` function following project pattern
- `src/stores/entityCard.ts` - Added `getNews()` store action
- `src/types/index.ts` - Added GNews types (GNewsArticle, GNewsResponse, GNewsSearchParams, etc.)
- `src/modules/home/entityCard/views/EntityCardOverview.vue` - Added News tab with feature flag
- `src/resources/locales/languages/en.json` - Added translations for news section
- `src/resources/locales/languages/es.json` - Added Spanish translations

## Feature Flag
The News tab is controlled by the existing feature flag `FEATURE_ENTITY_CARD_NEWSLETTER` (useFeatureEntityCardNewsletter).

## API Endpoint

### POST `/api/externals-apis/gnews/search`

**Request Body:**
```json
{
  "query": "Company Name",
  "lang": "en",
  "max": 10,
  "page": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalArticles": 100,
    "articles": [...]
  },
  "error": null
}
```

## Search Query Format

The component constructs advanced search queries using GNews operators:

```
"Entity Name" AND ("Cash Flow" OR "Supply Chain" OR "Supply Chain Finance" OR "SCF" OR "Financing" OR "Procurement")
```

### Query Construction (Frontend)
The `buildSearchQuery()` function in `EntityCardNews.vue`:
- Wraps entity name in **quotes** for exact phrase matching
- Adds **AND** operator to require the entity name
- Appends finance keywords with **OR** operators

### Finance Keywords
```typescript
const financeKeywords = ['Cash Flow', 'Supply Chain', 'Supply Chain Finance', 'SCF', 'Financing', 'Procurement'];
```

### Example Queries
| Entity Name | Generated Query |
|-------------|-----------------|
| `3M CO` | `"3M CO" AND ("Cash Flow" OR "Supply Chain" OR "Supply Chain Finance" OR "SCF" OR "Financing" OR "Procurement")` |
| `Apple` | `"Apple" AND ("Cash Flow" OR "Supply Chain" OR "Supply Chain Finance" OR "SCF" OR "Financing" OR "Procurement")` |

## Query Sanitization (Backend)
The `GNewsController` sanitizes queries intelligently:

**For advanced queries** (containing AND, OR, NOT, quotes, parentheses):
- Preserves GNews operators
- Only removes dangerous characters

**For simple queries**:
- Removes special characters
- Removes corporate suffixes: CO, INC, LLC, LTD, CORP, etc.

## Pagination (Load More)
- The "Load More" button is implemented but requires a **paid GNews plan**
- Free plan does NOT support the `page` parameter
- When a paid plan is configured, pagination will work automatically
- Each page loads 10 articles

## Error Handling
The backend handles the following HTTP status codes from GNews:
- 200: Success - returns articles
- 401: Invalid API key
- 403: Access forbidden / rate limit exceeded
- 429: Too many requests
- 500: GNews server error

## GNews API Limits
Based on subscription tier:
- Free: 100 requests/day, max 10 articles per request, 12-hour delay
- Essential: 1,000 requests/day, max 25 articles per request
- Business: 5,000 requests/day, max 50 articles per request
- Enterprise: 25,000 requests/day, max 100 articles per request

## Image Proxy (CSP Bypass)
GNews returns images from various external domains that may be blocked by the application's Content Security Policy (CSP).

To resolve this, images are served through **wsrv.nl** proxy:

```typescript
function getProxiedImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  return `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&w=400&q=80&we`;
}
```

**Benefits:**
- Bypasses CSP restrictions without modifying security headers
- Provides image optimization (resize to 400px width, 80% quality)
- Handles CORS automatically
- Free service with no rate limits for reasonable usage
- Error handling (`&we` parameter returns empty on source failure)

**Parameters:**
- `url`: Original image URL (URL encoded)
- `w`: Width in pixels (400px for thumbnails)
- `q`: Quality (80 = 80%)
- `we`: Ignore errors (returns empty image if source fails)

**CSP Configuration Required:**
The CSP `img-src` directive must include `wsrv.nl`:
```
img-src 'self' ... https://wsrv.nl https://images.weserv.nl ...
```

The CSP is configured at infrastructure level (CloudFront, ALB, etc.), not in the codebase.

## Notes
- **Paid plan required** - The advanced query with AND/OR operators works best with a paid GNews plan
- **Historical data** - Free plan only shows last 30 days; paid plans include historical data
- Pagination (`page` parameter) only works with paid plans
- The free plan has a 12-hour delay on news (not real-time)
- API key is securely stored in backend environment variables
- **Image proxy** - Images are served through wsrv.nl to bypass CSP restrictions

## Response Structure (Paid Plans)
Paid plans may return a different response structure:
```json
{
  "success": true,
  "data": {
    "articles": [...],
    "totalArticles": 100,
    "information": {
      "realTimeArticles": { "articles": [...] },
      "historicalArticles": { ... }
    },
    "articlesRemovedFromResponse": { ... }
  }
}
```

The component handles both response structures automatically.
