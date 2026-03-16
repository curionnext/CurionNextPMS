# API Service Contract

This document defines the common response envelope, error model, pagination helpers, and endpoint contracts for the PMS backend. All JSON responses returned through `res.json` automatically follow this contract via the global response formatter middleware.

## Response Envelope

- `success`: boolean indicating overall request outcome.
- `data`: payload for successful calls. May contain objects or arrays.
- `meta`: optional object with pagination or contextual metadata (for example `{ page, pageSize, totalCount }`).
- `error`: object populated only when `success` is `false`.

Example success response:

```
{
  "success": true,
  "data": {
    "users": [
      { "id": "u1", "displayName": "Front Desk" }
    ]
  },
  "meta": {
    "totalCount": 42
  }
}
```

Example error response:

```
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "statusCode": 400,
    "details": {
      "fieldErrors": {
        "email": ["Invalid email"]
      }
    }
  }
}
```

## Error Codes

Errors raised with `HttpError` include machine friendly codes. UI clients should branch on these values.

| Code | Status | Description |
| --- | --- | --- |
| AUTH_MISSING_TOKEN | 401 | Authorization header absent. |
| AUTH_INVALID_TOKEN | 401 | JWT invalid or expired. |
| AUTH_UNAUTHENTICATED | 401 | User context missing. |
| AUTH_FORBIDDEN | 403 | Authenticated user lacks required role. |
| VALIDATION_FAILED | 400 | Zod validation failure. |
| BAD_REQUEST | 400 | Generic input issue (fallback). |
| NOT_FOUND | 404 | Resource not located. |
| CONFLICT | 409 | State conflict such as duplicates. |
| INTERNAL_ERROR | 500 | Unhandled server error. |

Additional codes may be introduced alongside new `HttpError` usages; the UI should default to generic messaging for unrecognised codes.

## Pagination and Filtering

List endpoints accept the following optional query parameters:

- `page`: 1-based page number (defaults to 1).
- `pageSize`: max records per page (defaults to 25, capped at 100).
- `sortBy`: comma-separated list of `field:direction` tokens (direction `asc` or `desc`).
- `filter[...]`: scoped filters using dotted keys, for example `filter[status]=CONFIRMED`.

Handlers populate `res.locals.meta` with pagination metadata prior to calling `res.json`. The formatter middleware appends the metadata to the response envelope automatically.

Example metadata payload:

```
res.locals.meta = {
  page: 1,
  pageSize: 25,
  totalCount: 120,
  totalPages: 5
};
```

## Endpoint Reference

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | /api/dashboard/summary | SUPER_ADMIN, ADMIN, MANAGER, FRONT_DESK, ACCOUNTING | Returns occupancy %, ARR, RevPAR, revenue split, and pending housekeeping metrics for the requested date (defaults to today). Optional query `date=YYYY-MM-DD`. |
| GET | /api/reports/daily | SUPER_ADMIN, ADMIN, MANAGER, FRONT_DESK, ACCOUNTING | Provides arrivals, departures, stayovers, and financial summary for a specific date. Optional query `date=YYYY-MM-DD`. |
| GET | /api/reports/revenue | SUPER_ADMIN, ADMIN, MANAGER, FRONT_DESK, ACCOUNTING | Aggregates room/addon revenue and payments across a date range. Query parameters `startDate` and `endDate` (inclusive, YYYY-MM-DD). |
| GET | /api/alerts | SUPER_ADMIN, ADMIN, MANAGER, FRONT_DESK, HOUSEKEEPING, ACCOUNTING | Evaluates rules (late checkout, dirty room, payment pending, overbooking risk) and returns `active`, `acknowledged`, and `resolved` alerts. |
| POST | /api/alerts/acknowledge | Same as above | Body `{ "alertId": "..." }`. Marks alert as acknowledged and records the acting user. |

All endpoints require JWT authentication through the global middleware; role-based guards remain on each route to enforce RBAC.

## Metrics and Alert Payloads

`GET /api/dashboard/summary` response payload:

```
{
  "success": true,
  "data": {
    "summary": {
      "date": "2026-01-01",
      "totals": {
        "occupancyPercent": 82.5,
        "roomsSold": 66,
        "occupiedRooms": 64,
        "totalRooms": 80,
        "arr": 7200,
        "revpar": 5950,
        "roomRevenue": 475200,
        "addonRevenue": 38250,
        "otherRevenue": 0,
        "totalRevenue": 513450,
        "paymentsCollected": 498000
      },
      "revenueSplit": {
        "room": 475200,
        "addon": 38250,
        "other": 0
      },
      "housekeeping": {
        "pendingTasks": 4,
        "dirtyRooms": 3
      }
    }
  }
}
```

`GET /api/alerts` response payload:

```
{
  "success": true,
  "data": {
    "alerts": {
      "active": [
        {
          "id": "alrt1",
          "type": "LATE_CHECKOUT",
          "message": "Reservation RSV123 is past departure and still checked in",
          "context": { "reservationId": "RSV123", "roomId": "RM101" },
          "metadata": { "departureDate": "2025-12-31" },
          "createdAt": "2026-01-01T10:05:00.000Z"
        }
      ],
      "acknowledged": [],
      "resolved": []
    }
  }
}
```

## Change Management

- Any new endpoint must return responses through `res.json`, allowing the formatter to enforce the envelope automatically.
- When extending `HttpError`, provide a descriptive `code` to keep UI error handling deterministic.
- For list endpoints, set `res.locals.meta` prior to responding to surface pagination details.
- Filtering keys should map directly to persistent fields to keep client queries intuitive.

Please keep this document updated as new endpoints or error codes are introduced.
