# Trading Journal API Contract Audit Report

**Date:** May 15, 2026  
**Scope:** Complete backend API endpoint analysis vs frontend API consumption  
**Status:** Issues Found - See Critical Issues Section

---

## Executive Summary

This audit identifies the complete API contract between the trading-journal backend (FastAPI) and frontend (React/TypeScript). The analysis reveals **2 critical issues** with account filtering and response type handling, plus several consistency concerns that should be addressed before production deployment.

---

## Part 1: Backend API Endpoints Catalog

### Authentication Routes (`/api/auth`)

**Route File:** [backend/app/routes/auth.py](backend/app/routes/auth.py)

| Endpoint | Method | Line | Authentication | Request Body | Response Shape | Account Filter |
|----------|--------|------|---|---|---|---|
| `/api/auth/signup` | POST | [33](backend/app/routes/auth.py#L33) | None | `{email, password}` | `{access_token, token_type, user}` | N/A |
| `/api/auth/login` | POST | [59](backend/app/routes/auth.py#L59) | None | `{email, password}` | `{access_token, token_type, user}` | N/A |
| `/api/auth/api-key` | GET | [73](backend/app/routes/auth.py#L73) | Bearer Token | None | `{api_key}` | N/A |
| `/api/auth/api-key/regenerate` | POST | [78](backend/app/routes/auth.py#L78) | Bearer Token | None | `{api_key}` | N/A |
| `/api/auth/api-key` | DELETE | [90](backend/app/routes/auth.py#L90) | Bearer Token | None | `{api_key}` | N/A |

**Response Schemas:**
- **Token Response** (signup/login):
  ```json
  {
    "access_token": "string",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "user@example.com"
    }
  }
  ```
- **ApiKeyResponse**:
  ```json
  {
    "api_key": "tj_..." or null
  }
  ```

**User ID Extraction:** Token contains `sub` field with user_id, decoded in [auth.py](backend/app/auth.py#L128)

---

### Trades Routes (`/api/trades`)

**Route File:** [backend/app/routes/trades.py](backend/app/routes/trades.py)

#### Account Management

| Endpoint | Method | Line | Auth | Response | Account Filter |
|----------|--------|------|---|---|---|
| `/api/trades/accounts` | GET | [42](backend/app/routes/trades.py#L42) | Bearer Token | `[{account_id, account_name}]` | ✅ auto-filtered to current user |

**Response Schema:**
```json
[
  {
    "account_id": "123456",
    "account_name": "Live Account"
  }
]
```

**Implementation:** [lines 42-64](backend/app/routes/trades.py#L42-L64)
- Queries `Trade.account_id` and `Trade.account_name` distinct values
- Filters: `Trade.user_id == current_user.id` + `Trade.account_id.isnot(None)`
- **USER ISOLATION:** ✅ Properly filters by user_id

---

#### Trade List & Sync

| Endpoint | Method | Line | Auth | Params | Response | Account Filter |
|----------|--------|------|---|---|---|---|
| `/api/trades` | GET | [160](backend/app/routes/trades.py#L160) | Bearer Token | `days`, `start`, `end`, `limit`, `offset`, `account_id` | Paginated trades | ✅ via account_id param |
| `/api/trades/sync-mt5` | GET | [100](backend/app/routes/trades.py#L100) | Bearer Token | `account_id` (query), `account_name` (query) | Sync status | ✅ via account_id param |

**GET /api/trades Response Schema:**
```json
{
  "trades": [
    {
      "id": 1,
      "symbol": "EURUSD",
      "profit": 125.50,
      "volume": 1.0,
      "entry_price": 1.0950,
      "exit_price": 1.0965,
      "open_time": "2026-05-15T10:00:00",
      "close_time": "2026-05-15T11:30:00",
      "duration": 5400,
      "trade_type": "buy",
      "ticket": 123456789,
      "strategy": "breakout",
      "emotion": "confident",
      "notes": "Good entry",
      "account_id": "123456",
      "account_name": "Live Account"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "total_pages": 3
}
```

**Implementation Details:**
- Pagination: [lines 168-196](backend/app/routes/trades.py#L168-L196)
  - `DEFAULT_PAGE_SIZE = 50` [line 19](backend/app/routes/trades.py#L19)
  - `MAX_PAGE_SIZE = 1000` [line 20](backend/app/routes/trades.py#L20)
  - Safe clamping function: [lines 24-28](backend/app/routes/trades.py#L24-L28)
  - Query filter: `_filter_query()` [lines 32-37](backend/app/routes/trades.py#L32-L37)
- **USER ISOLATION:** ✅ Filters `Trade.user_id == current_user.id` [line 172](backend/app/routes/trades.py#L172)
- **PAGINATION:** ✅ Consistent implementation with safe defaults

**GET /api/trades/sync-mt5 Response:**
```json
{
  "message": "MT5 sync complete",
  "saved": 5,
  "total_fetched": 10,
  "account_id": "123456",
  "account_name": "Live Account"
}
```

**Implementation:** [lines 100-157](backend/app/routes/trades.py#L100-L157)
- Fetches from MT5 service: [line 109](backend/app/routes/trades.py#L109)
- De-duplication: Checks `Trade.ticket + Trade.user_id` uniqueness [lines 115-121](backend/app/routes/trades.py#L115-L121)
- **USER ISOLATION:** ✅ Filters `Trade.user_id == current_user.id` [line 119](backend/app/routes/trades.py#L119)

---

#### Trade Upload & Update

| Endpoint | Method | Line | Auth Type | Body | Response | Account Filter |
|----------|--------|------|---|---|---|---|
| `/api/trades/upload` | POST | [228](backend/app/routes/trades.py#L228) | API Key | `[TradeUpload]` | Status | ✅ via data |
| `/api/trades/{trade_id}` | PUT | [290](backend/app/routes/trades.py#L290) | Bearer Token | `{strategy, notes, emotion}` | Status | ✅ implicit via trade_id lookup |

**POST /api/trades/upload:**
```json
{
  "message": "Trades uploaded",
  "saved": 5,
  "skipped": 0,
  "total_received": 5
}
```

**Implementation:** [lines 228-288](backend/app/routes/trades.py#L228-L288)
- Auth: Uses `get_current_user_by_api_key` [line 233](backend/app/routes/trades.py#L233)
- De-duplication: Checks `Trade.ticket + Trade.user_id` [lines 239-244](backend/app/routes/trades.py#L239-L244)
- **USER ISOLATION:** ✅ Filters `Trade.user_id == current_user.id` [line 242](backend/app/routes/trades.py#L242)

**PUT /api/trades/{trade_id}:**
```json
{
  "message": "Trade updated"
}
```

**Implementation:** [lines 290-309](backend/app/routes/trades.py#L290-L309)
- Updates only: `strategy`, `notes`, `emotion` [lines 305-307](backend/app/routes/trades.py#L305-L307)
- **USER ISOLATION:** ✅ Filters both `Trade.id == trade_id` AND `Trade.user_id == current_user.id` [lines 300-302](backend/app/routes/trades.py#L300-L302)
- **SECURITY:** ✅ Prevents unauthorized updates via user_id check

---

#### Analytics Endpoints

| Endpoint | Method | Line | Auth | Params | Response | Account Filter |
|----------|--------|------|---|---|---|---|
| `/api/trades/analytics` | GET | [219](backend/app/routes/trades.py#L219) | Bearer Token | `account_id` (optional) | Analytics object | ✅ via account_id param |
| `/api/trades/analytics/ai` | GET | [91](backend/app/routes/trades.py#L91) | Bearer Token | `account_id` (optional) | AI insights | ✅ via account_id param |
| `/api/trades/analytics/tags` | GET | [82](backend/app/routes/trades.py#L82) | Bearer Token | `account_id` (optional) | Tag analytics | ✅ via account_id param |
| `/api/trades/analytics/recommendations` | GET | [73](backend/app/routes/trades.py#L73) | Bearer Token | `account_id` (optional) | Recommendations | ✅ via account_id param |

**GET /api/trades/analytics Response:**
```json
{
  "totalPnL": 5000.00,
  "winRate": 55.5,
  "profitFactor": 2.15,
  "expectancy": 100.50,
  "maxDrawdown": 500.00,
  "avgWin": 250.00,
  "avgLoss": -150.00,
  "maxWinStreak": 5,
  "maxLossStreak": 3,
  "bestSymbol": "EURUSD",
  "worstSymbol": "GBPUSD",
  "totalTrades": 50
}
```

**Service Implementation:** [backend/app/services/analytics_service.py](backend/app/services/analytics_service.py)
- Filter function: [lines 4-10](backend/app/services/analytics_service.py#L4-L10)
- Calculation: [lines 13-95](backend/app/services/analytics_service.py#L13-L95)
- **USER ISOLATION:** ✅ Uses `_apply_user_filters(query, user_id, account_id)` [line 15](backend/app/services/analytics_service.py#L15)

**GET /api/trades/analytics/tags Response:**
```json
{
  "strategy": {
    "breakout": {
      "profit": 1500.00,
      "count": 10
    }
  },
  "emotion": {
    "confident": {
      "profit": 2000.00,
      "count": 15
    }
  }
}
```

**Service Implementation:** [backend/app/services/analytics_service.py](backend/app/services/analytics_service.py#L98-L140)
- **USER ISOLATION:** ✅ Filters by user_id

**GET /api/trades/analytics/ai Response:**
```json
{
  "insights": [
    "Your expectancy is negative. You currently have no edge.",
    "Your win rate is low. Consider refining your entries."
  ]
}
```

**Service Implementation:** [backend/app/services/ai_service.py](backend/app/services/ai_service.py)
- **USER ISOLATION:** ✅ Filters by user_id

**GET /api/trades/analytics/recommendations Response:**
```json
{
  "recommendations": [
    "Review your strategy — current trades have negative expectancy.",
    "Be more selective — low win rate suggests poor entries."
  ]
}
```

**Service Implementation:** [backend/app/services/recommendation_service.py](backend/app/services/recommendation_service.py)
- **USER ISOLATION:** ✅ Filters by user_id

---

## Part 2: Frontend API Calls Catalog

**API Client Setup:** [frontend/src/api.ts](frontend/src/api.ts)
- Base URL: `http://127.0.0.1:8000` [line 5](frontend/src/api.ts#L5)
- Token storage: `localStorage` with key `trading_journal_token` [lines 7-9](frontend/src/api.ts#L7-L9)
- Auto Bearer token injection: [lines 19-24](frontend/src/api.ts#L19-L24)

### Auth Page

**File:** [frontend/src/AuthPage.tsx](frontend/src/AuthPage.tsx)

| Call | Endpoint | Line | Method | Request | Usage |
|------|----------|------|--------|---------|-------|
| Login/Signup | `/api/auth/signup` or `/api/auth/login` | [55](frontend/src/AuthPage.tsx#L55) | POST | `{email, password}` | Initial authentication |

**Implementation:**
```typescript
const res = await api.post<AuthResponse>(endpoint, { email, password });
setAuthToken(res.data.access_token);
```

**Expected Response Type:** [AuthPage.tsx lines 9-16](frontend/src/AuthPage.tsx#L9-L16)
```typescript
type AuthResponse = {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
  };
};
```

✅ **MATCH**: Backend Token schema matches

---

### Trades Page

**File:** [frontend/src/TradesPage.tsx](frontend/src/TradesPage.tsx)

| Call | Endpoint | Line | Method | Params | Response Type |
|------|----------|------|--------|--------|---|
| List trades | `/api/trades` | [36](frontend/src/TradesPage.tsx#L36) | GET | `days`, `limit`, `offset`, `account_id` | `PaginatedTradesResponse` |
| Load accounts | `/api/trades/accounts` | [52](frontend/src/TradesPage.tsx#L52) | GET | None | `AccountInfo[]` |
| Sync MT5 | `/api/trades/sync-mt5` | [26](frontend/src/TradesPage.tsx#L26) | GET | None (no account_id) | ignored |
| Update trade | `/api/trades/{id}` | [93](frontend/src/TradesPage.tsx#L93) | PUT | `{strategy, emotion, notes}` | ignored |

**Expected Response Types:** [types.ts](frontend/src/types.ts)
```typescript
interface Trade {
  id: number;
  symbol: string;
  profit: number;
  volume: number;
  entry_price: number;
  exit_price: number;
  open_time: string;
  close_time: string;
  duration: number;
  trade_type: string;
  ticket: number;
  strategy: string;
  emotion: string;
  notes: string;
  account_id?: string;
  account_name?: string;
}

interface PaginatedTradesResponse {
  trades: Trade[];
  total: number;
  limit: number;
  offset: number;
  total_pages: number;
}

interface AccountInfo {
  account_id: string;
  account_name: string;
}
```

**Implementation Details:**
- Pagination: Uses `limit=50`, `offset=pageNum * 50` [lines 28-29](frontend/src/TradesPage.tsx#L28-L29)
- Account filtering: [line 31](frontend/src/TradesPage.tsx#L31)
- ✅ **MATCH**: Response matches PaginatedTradesResponse

---

### Dashboard Page

**File:** [frontend/src/DashboardPage.tsx](frontend/src/DashboardPage.tsx)

| Call | Endpoint | Line | Method | Params | Response Type |
|------|----------|------|--------|--------|---|
| List trades | `/api/trades` | [35](frontend/src/DashboardPage.tsx#L35) | GET | `limit=10000`, `account_id` (optional) | Mixed |
| Load accounts | `/api/trades/accounts` | [42](frontend/src/DashboardPage.tsx#L42) | GET | None | `AccountInfo[]` |
| Sync MT5 | `/api/trades/sync-mt5` | [50](frontend/src/DashboardPage.tsx#L50) | GET | None | ignored |

**⚠️ CRITICAL ISSUE #1: Inconsistent Response Type Handling**

**Code:** [lines 35-37](frontend/src/DashboardPage.tsx#L35-L37)
```typescript
const res = await api.get(url);
const data = res.data;
setTrades(Array.isArray(data) ? data : data.trades ?? []);
```

**Problem:**
- Backend ALWAYS returns `{trades: [], ...}` (paginated response)
- Frontend tries to handle BOTH flat array AND paginated response
- This suggests either:
  1. API contract was changed but frontend wasn't fully updated, OR
  2. Developer was defensive about unknown response format

**Impact:** Works due to defensive coding, but indicates API contract confusion

---

### Analytics Page

**File:** [frontend/src/AnalyticsPage.tsx](frontend/src/AnalyticsPage.tsx)

| Call | Endpoint | Line | Method | Params | Response Type |
|------|----------|------|--------|--------|---|
| List trades | `/api/trades` | [26](frontend/src/AnalyticsPage.tsx#L26) | GET | `days=30` | Mixed array/paginated |
| Analytics | `/api/trades/analytics` | [27](frontend/src/AnalyticsPage.tsx#L27) | GET | None | Analytics object |
| Tag analytics | `/api/trades/analytics/tags` | [28](frontend/src/AnalyticsPage.tsx#L28) | GET | None | Tag data |
| AI insights | `/api/trades/analytics/ai` | [29](frontend/src/AnalyticsPage.tsx#L29) | GET | None | `{insights: []}` |
| Recommendations | `/api/trades/analytics/recommendations` | [30](frontend/src/AnalyticsPage.tsx#L30) | GET | None | `{recommendations: []}` |

**Expected Response Types:** Inferred from usage in [lines 49-83](frontend/src/AnalyticsPage.tsx#L49-L83)

**Implementation Details:**
```typescript
const [tradesRes, analyticsRes, tagsRes, aiRes, recRes] = await Promise.all([
  api.get(`/api/trades?days=30`),
  api.get("/api/trades/analytics"),
  api.get("/api/trades/analytics/tags"),
  api.get("/api/trades/analytics/ai"),
  api.get("/api/trades/analytics/recommendations"),
]);
```

---

### Settings Page

**File:** [frontend/src/SettingsPage.tsx](frontend/src/SettingsPage.tsx)

**No API calls** - Client-side localStorage only [lines 6-15](frontend/src/SettingsPage.tsx#L6-L15)

---

## Part 3: API Contract Mismatch Analysis

### ✅ Matching Contracts

| Feature | Status | Details |
|---------|--------|---------|
| Auth endpoints | ✅ MATCH | Token response format matches exactly |
| Trades list pagination | ✅ MATCH | Both use limit/offset, backend returns paginated response |
| Account filtering in trades | ✅ MATCH | Backend supports account_id, frontend provides it |
| Trade update fields | ✅ MATCH | Backend accepts strategy/notes/emotion, frontend sends them |
| Account dropdown data | ✅ MATCH | Backend returns correct structure |

### ⚠️ Inconsistencies & Mismatches

#### CRITICAL - Issue #1: Analytics Endpoints Don't Receive Account Filtering

**Severity:** 🔴 **CRITICAL**

**Description:** Backend supports account-specific analytics, but frontend never passes account_id

**Evidence:**

**Backend Support** [AnalyticsPage.tsx lines 73-83 show endpoints support account_id]:
```python
# /api/trades/analytics/recommendations
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    account_id: str = Query(None),  # ← Backend accepts this
):
    return generate_recommendations(db, user_id=current_user.id, account_id=account_id)
```

**Frontend Issue** [AnalyticsPage.tsx lines 26-30]:
```typescript
const [tradesRes, analyticsRes, tagsRes, aiRes, recRes] = await Promise.all([
  api.get(`/api/trades?days=30`),
  api.get("/api/trades/analytics"),                    // ← No account_id!
  api.get("/api/trades/analytics/tags"),              // ← No account_id!
  api.get("/api/trades/analytics/ai"),                // ← No account_id!
  api.get("/api/trades/analytics/recommendations"),   // ← No account_id!
]);
```

**Impact:**
- If user selects an account in TradesPage, analytics on AnalyticsPage won't filter by that account
- Users see aggregate analytics across all accounts even when viewing single-account trades
- Violates principle of least surprise

**Recommendation:**
1. Update AnalyticsPage to track selected account (add state)
2. Pass `&account_id={selectedAccount}` to all analytics endpoints
3. Match behavior with TradesPage and DashboardPage

---

#### CRITICAL - Issue #2: DashboardPage Defensive Response Type Handling

**Severity:** 🟠 **MEDIUM**

**Location:** [DashboardPage.tsx lines 35-37](frontend/src/DashboardPage.tsx#L35-L37)

**Code:**
```typescript
const res = await api.get(url);
const data = res.data;
setTrades(Array.isArray(data) ? data : data.trades ?? []);
```

**Problem:**
- Tries to handle both flat array responses AND paginated responses
- Backend ALWAYS returns paginated: `{trades: [], total: X, ...}`
- This defensive check suggests API contract uncertainty

**Possible Causes:**
1. API changed from returning flat array to paginated
2. Different endpoints return different formats
3. Copy-paste defensive code

**Recommendation:**
1. Verify API contract: `/api/trades?limit=10000` always returns `{trades: [], ...}` ✅ Confirmed
2. Simplify to: `setTrades(res.data.trades ?? [])`
3. Update similar patterns in AnalyticsPage [line 52](frontend/src/AnalyticsPage.tsx#L52) if present

---

#### Issue #3: Incomplete Account Filtering in DashboardPage

**Severity:** 🟡 **LOW** (Works, but inconsistent)

**Location:** [DashboardPage.tsx lines 40-50](frontend/src/DashboardPage.tsx#L40-L50)

**Code:**
```typescript
const loadTrades = async () => {
  let url = "/api/trades?limit=10000";
  if (selectedAccount) {
    url += `&account_id=${encodeURIComponent(selectedAccount)}`;
  }
  const res = await api.get(url);
  // ...
};
```

**Issue:** When `/api/trades/sync-mt5` is called with `selectedAccount`, it correctly adds `?account_id=X`, but this account context is lost when loading analytics. Backend would return all-accounts analytics even though trades are filtered to one account.

**Note:** DashboardPage doesn't call analytics endpoints, but pattern indicates incomplete account context passing.

---

### Response Shape Consistency Review

#### Trade Object

**Backend** [schemas.py TradeResponse](backend/app/schemas.py#L13-L18):
```python
class TradeResponse(TradeCreate):
    id: int
    class Config:
        from_attributes = True
```

**Frontend** [types.ts Trade interface](frontend/src/types.ts#L1-L24):
```typescript
interface Trade {
  id: number;
  symbol: string;
  profit: number;
  volume: number;
  entry_price: number;
  exit_price: number;
  open_time: string;
  close_time: string;
  duration: number;
  trade_type: string;
  ticket: number;
  strategy: string;
  emotion: string;
  notes: string;
  account_id?: string;
  account_name?: string;
}
```

✅ **MATCH**: All fields present, optional account fields correctly marked

#### Analytics Response

**Backend Returns** [analytics_service.py lines 80-91](backend/app/services/analytics_service.py#L80-L91):
```python
return {
    "totalPnL": total_pnl,
    "winRate": win_rate,
    "profitFactor": profit_factor,
    "expectancy": expectancy,
    "maxDrawdown": max_drawdown,
    "avgWin": avg_win,
    "avgLoss": avg_loss,
    "maxWinStreak": max_win_streak,
    "maxLossStreak": max_loss_streak,
    "bestSymbol": best_symbol,
    "worstSymbol": worst_symbol,
    "totalTrades": len(trades),
}
```

**Frontend Expects** [AnalyticsPage.tsx lines 80-95](frontend/src/AnalyticsPage.tsx#L80-L95):
```typescript
<Card label="Total PnL" value={`$${(analytics.totalPnL ?? 0).toFixed(2)}`} />
<Card label="Win Rate" value={`${(analytics.winRate ?? 0).toFixed(1)}%`} />
<Card label="Profit Factor" value={(analytics.profitFactor ?? 0).toFixed(2)} />
<Card label="Expectancy" value={`$${(analytics.expectancy ?? 0).toFixed(2)}`} />
// ... all other fields with nullish coalescing
```

✅ **MATCH**: All fields present, safe null handling with `?? 0`

---

## Part 4: Pagination Implementation Review

### Backend Pagination

**Configuration:**
- Default size: `50` [trades.py line 19](backend/app/routes/trades.py#L19)
- Max size: `1000` [trades.py line 20](backend/app/routes/trades.py#L20)
- Min offset: `0`

**Safe Clamping Function** [lines 24-28](backend/app/routes/trades.py#L24-L28):
```python
def _clamp(value: int | None, default: int, minimum: int, maximum: int) -> int:
    """Safely clamp an integer between min and max."""
    if value is None:
        return default
    return max(minimum, min(value, maximum))
```

**Pagination Logic** [lines 181-196](backend/app/routes/trades.py#L181-L196):
```python
safe_limit = _clamp(limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE)
safe_offset = _clamp(offset, 0, 0, max(total - 1, 0))

trades = (
    query
    .order_by(Trade.time.desc())
    .offset(safe_offset)
    .limit(safe_limit)
    .all()
)

total_pages = ceil(total / safe_limit) if safe_limit > 0 else 1

return {
    "trades": trades,
    "total": total,
    "limit": safe_limit,
    "offset": safe_offset,
    "total_pages": total_pages,
}
```

✅ **SAFE**: Properly clamps values, prevents negative/zero offsets

### Frontend Pagination

**TradesPage Implementation** [lines 60-62](frontend/src/TradesPage.tsx#L60-L62):
```typescript
const offset = pageNum * PAGE_SIZE;
let url = `/api/trades?days=${selectedPeriod}&limit=${PAGE_SIZE}&offset=${offset}`;
const res = await api.get<PaginatedTradesResponse>(url);
```

**Page Navigation** [lines 71-90](frontend/src/TradesPage.tsx#L71-L90):
```typescript
const goToPage = (newPage: number) => {
  if (newPage < 0 || newPage >= totalPages) return;
  setPage(newPage);
  loadTrades(period, newPage, selectedAccount);
};
```

✅ **CONSISTENT**: Uses same limit/offset pattern as backend

**DashboardPage** [line 35](frontend/src/DashboardPage.tsx#L35):
```typescript
let url = "/api/trades?limit=10000";
```

⚠️ **NOTE**: Requests all trades at once with `limit=10000`, bypassing pagination. Works due to `MAX_PAGE_SIZE=1000` being clamped down. Consider using pagination for large datasets.

---

## Part 5: Account Filtering Implementation Review

### Backend Implementation

**All Relevant Endpoints Support `account_id` Parameter:**

| Endpoint | Accepts `account_id` | Line | Filter Method |
|----------|---|---|---|
| `/api/trades` | ✅ | [175](backend/app/routes/trades.py#L175) | Query parameter |
| `/api/trades/sync-mt5` | ✅ | [106](backend/app/routes/trades.py#L106) | Query parameter |
| `/api/trades/accounts` | N/A | [42](backend/app/routes/trades.py#L42) | Auto-filtered |
| `/api/trades/analytics` | ✅ | [225](backend/app/routes/trades.py#L225) | Query parameter |
| `/api/trades/analytics/ai` | ✅ | [104](backend/app/routes/trades.py#L104) | Query parameter |
| `/api/trades/analytics/tags` | ✅ | [88](backend/app/routes/trades.py#L88) | Query parameter |
| `/api/trades/analytics/recommendations` | ✅ | [79](backend/app/routes/trades.py#L79) | Query parameter |

**Filter Application Helper** [trades.py lines 32-37](backend/app/routes/trades.py#L32-L37):
```python
def _filter_query(query, user_id, account_id=None):
    query = query.filter(Trade.user_id == user_id)
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    return query
```

✅ **IMPLEMENTED**: All endpoints have account filtering capability

### Frontend Implementation

| Page | Endpoint | Account Filter Passed | Status |
|------|----------|---|---|
| **TradesPage** | `/api/trades` | ✅ [line 31](frontend/src/TradesPage.tsx#L31) | ✅ CORRECT |
| **TradesPage** | `/api/trades/accounts` | N/A | ✅ N/A |
| **TradesPage** | `/api/trades/sync-mt5` | ❌ Not passed | ⚠️ ISSUE |
| **DashboardPage** | `/api/trades` | ✅ [line 37](frontend/src/DashboardPage.tsx#L37) | ✅ CORRECT |
| **DashboardPage** | `/api/trades/sync-mt5` | ✅ [implicit via state] | ✅ CORRECT |
| **AnalyticsPage** | `/api/trades` | ❌ Not passed | ❌ ISSUE |
| **AnalyticsPage** | `/api/trades/analytics` | ❌ Not passed | ❌ **CRITICAL ISSUE** |
| **AnalyticsPage** | `/api/trades/analytics/tags` | ❌ Not passed | ❌ **CRITICAL ISSUE** |
| **AnalyticsPage** | `/api/trades/analytics/ai` | ❌ Not passed | ❌ **CRITICAL ISSUE** |
| **AnalyticsPage** | `/api/trades/analytics/recommendations` | ❌ Not passed | ❌ **CRITICAL ISSUE** |

🔴 **CRITICAL GAPS**: AnalyticsPage never passes account filtering despite backend supporting it

---

## Part 6: User ID Filtering & Auth Isolation

### Backend User Isolation Implementation

**All Endpoints Properly Filter by User ID:**

| Route | Location | Filter Line | Method |
|-------|----------|---|---|
| `/api/trades` | [trades.py](backend/app/routes/trades.py) | [172](backend/app/routes/trades.py#L172) | `query.filter(Trade.user_id == current_user.id)` |
| `/api/trades/sync-mt5` | [trades.py](backend/app/routes/trades.py) | [119](backend/app/routes/trades.py#L119) | `Trade.user_id == current_user.id` |
| `/api/trades/accounts` | [trades.py](backend/app/routes/trades.py) | [50](backend/app/routes/trades.py#L50) | `Trade.user_id == current_user.id` |
| `/api/trades/analytics` | [analytics_service.py](backend/app/services/analytics_service.py) | [15](backend/app/services/analytics_service.py#L15) | `_apply_user_filters(query, user_id)` |
| `/api/trades/analytics/ai` | [ai_service.py](backend/app/services/ai_service.py) | [14](backend/app/services/ai_service.py#L14) | `_apply_user_filters(query, user_id)` |
| `/api/trades/analytics/tags` | [analytics_service.py](backend/app/services/analytics_service.py) | [99](backend/app/services/analytics_service.py#L99) | `_apply_user_filters(query, user_id)` |
| `/api/trades/analytics/recommendations` | [recommendation_service.py](backend/app/services/recommendation_service.py) | [15](backend/app/services/recommendation_service.py#L15) | `_apply_user_filters(query, user_id)` |
| `/api/trades/upload` | [trades.py](backend/app/routes/trades.py) | [242](backend/app/routes/trades.py#L242) | `Trade.user_id == current_user.id` |
| `/api/trades/{id}` | [trades.py](backend/app/routes/trades.py) | [300-302](backend/app/routes/trades.py#L300-L302) | Both trade_id AND user_id filters |

### User Extraction Flow

**Token → User ID Resolution:**

1. Frontend sends Bearer token in header [api.ts lines 19-24](frontend/src/api.ts#L19-L24)
2. Backend decodes JWT [auth.py lines 95-118](backend/app/auth.py#L95-L118)
3. Extracts `sub` field (contains user_id) [auth.py line 128](backend/app/auth.py#L128)
4. Queries user from database [auth.py line 131](backend/app/auth.py#L131)
5. Returns User object to endpoint

**Database Constraints Ensure Multi-User Isolation:**

| Constraint | Table | Columns | Purpose |
|---|---|---|---|
| Unique index | `trades` | `(user_id, ticket)` | Prevents duplicate trades for same user |
| Foreign key | `trades` | `user_id → users.id` | Enforces referential integrity |
| Unique index | `users` | `email` | One account per email |
| Unique index | `users` | `api_key` | API keys don't collide |

✅ **SECURE**: User isolation consistently enforced at DB and API layers

---

## Part 7: Request/Response Validation

### Response Status Codes

**Observed Backend Status Codes:**

| Endpoint | Success | Errors |
|----------|---------|--------|
| Auth endpoints | 200 | 400 (validation), 401 (auth) |
| All GET endpoints | 200 | 401 (auth), 404 (not found) |
| PUT endpoint | 200 | 400, 401 |
| POST endpoints | 200 | 400, 401 |

**Frontend Error Handling:**

- **AuthPage** [lines 8-20](frontend/src/AuthPage.tsx#L8-L20): Extracts error detail from `error.response.data.detail`
- **Other pages**: Minimal error handling with generic console.error()

⚠️ **ISSUE**: Frontend error handling is inconsistent and incomplete

---

## Part 8: Security Review

### Authentication Schemes

| Endpoint Type | Scheme | Validation |
|---|---|---|
| Auth routes | None | Email/password checked |
| Protected routes | Bearer JWT | Token decoded, signature verified |
| Upload endpoint | API Key header | Key looked up in DB |

**JWT Implementation** [auth.py lines 61-91](backend/app/auth.py#L61-L91):
- Manual JWT creation (not using library)
- Custom base64url encoding
- HMAC-SHA256 signature
- Expiry validation
- Signature verification

⚠️ **CONCERN**: Custom JWT implementation instead of standard library (e.g., PyJWT) - increases security risk

**Secure Elements:**
- ✅ Passwords hashed with bcrypt
- ✅ API keys are unique, generated with secrets module
- ✅ All trade queries filter by user_id
- ✅ Token stored in localStorage with Bearer scheme

⚠️ **Weaknesses:**
- ⚠️ Custom JWT implementation (harder to audit)
- ⚠️ Secret key in code with comment "change-this-dev-secret-before-deployment"
- ⚠️ CORS allows all origins [main.py line 22](backend/app/main.py#L22)

---

## Summary Table: All Endpoints & Frontend Consumption

| Backend Endpoint | Status Code | Frontend Called | Account Filter | User Isolation |
|---|---|---|---|---|
| **Auth** |  |  |  |  |
| POST /api/auth/signup | 200/400/401 | ✅ AuthPage | N/A | N/A |
| POST /api/auth/login | 200/400/401 | ✅ AuthPage | N/A | N/A |
| GET /api/auth/api-key | 200/401 | ❌ Not called | N/A | ✅ User token |
| POST /api/auth/api-key/regenerate | 200/401 | ❌ Not called | N/A | ✅ User token |
| DELETE /api/auth/api-key | 200/401 | ❌ Not called | N/A | ✅ User token |
| **Trades** |  |  |  |  |
| GET /api/trades/accounts | 200/401 | ✅ TradesPage, DashboardPage | Auto | ✅ Filtered |
| GET /api/trades | 200/401 | ✅ All pages | ✅ TradesPage, DashboardPage only | ✅ Filtered |
| GET /api/trades/sync-mt5 | 200/401 | ✅ All pages | ✅ TradesPage only | ✅ Filtered |
| POST /api/trades/upload | 200/400/401 | ❌ Not called | ✅ Supported | ✅ Filtered |
| PUT /api/trades/{id} | 200/400/401 | ✅ TradesPage | ✅ Implicit | ✅ Filtered |
| **Analytics** |  |  |  |  |
| GET /api/trades/analytics | 200/401 | ✅ AnalyticsPage | ✅ Backend, ❌ Frontend | ✅ Filtered |
| GET /api/trades/analytics/ai | 200/401 | ✅ AnalyticsPage | ✅ Backend, ❌ Frontend | ✅ Filtered |
| GET /api/trades/analytics/tags | 200/401 | ✅ AnalyticsPage | ✅ Backend, ❌ Frontend | ✅ Filtered |
| GET /api/trades/analytics/recommendations | 200/401 | ✅ AnalyticsPage | ✅ Backend, ❌ Frontend | ✅ Filtered |

---

## Critical Issues Summary

### 🔴 Issue #1: Analytics Endpoints Missing Account Filter (CRITICAL)

**Location:** [AnalyticsPage.tsx lines 26-30](frontend/src/AnalyticsPage.tsx#L26-L30)

**Problem:** Backend supports account filtering for all analytics endpoints, but frontend never passes it

**Affected Endpoints:**
- `/api/trades/analytics`
- `/api/trades/analytics/ai`
- `/api/trades/analytics/tags`
- `/api/trades/analytics/recommendations`

**Impact:** Users see aggregate analytics across all accounts even when viewing single-account trades

**Fix:** Add account state to AnalyticsPage and pass to all endpoints:
```typescript
const selectedAccount = useSelectedAccount(); // Add state
// Then in API calls:
api.get(`/api/trades/analytics?account_id=${selectedAccount}`)
```

---

### 🔴 Issue #2: Inconsistent Response Type Handling (MEDIUM)

**Location:** [DashboardPage.tsx lines 35-37](frontend/src/DashboardPage.tsx#L35-L37)

**Problem:** Defensive code tries to handle both flat array and paginated responses:
```typescript
setTrades(Array.isArray(data) ? data : data.trades ?? []);
```

**Root Cause:** API contract uncertainty - backend always returns paginated response

**Fix:** Remove array check and trust API contract:
```typescript
setTrades(res.data.trades ?? []);
```

---

## Recommendations

### Priority 1: Address Critical Issues
1. ✅ Add account filtering to AnalyticsPage analytics endpoints
2. ✅ Simplify DashboardPage response handling
3. ✅ Add error handling UI instead of console.error()

### Priority 2: Improve Consistency
1. ✅ Add optional `account_id` state to AnalyticsPage
2. ✅ Use consistent pagination patterns across all pages
3. ✅ Type all API responses with TypeScript interfaces

### Priority 3: Security Improvements
1. ⚠️ Replace custom JWT implementation with PyJWT library
2. ⚠️ Move JWT secret to environment variables
3. ⚠️ Restrict CORS origins to specific frontend URL
4. ⚠️ Add rate limiting on auth endpoints

### Priority 4: Documentation
1. ✅ Document API contract in OpenAPI/Swagger format
2. ✅ Add response examples to each endpoint
3. ✅ Document pagination requirements
4. ✅ Create API integration checklist for future endpoints

---

## Appendix: File Reference Map

### Backend
- Main app: [backend/app/main.py](backend/app/main.py)
- Auth module: [backend/app/auth.py](backend/app/auth.py)
- Database: [backend/app/database.py](backend/app/database.py)
- Models: [backend/app/models.py](backend/app/models.py)
- Schemas: [backend/app/schemas.py](backend/app/schemas.py)
- Auth routes: [backend/app/routes/auth.py](backend/app/routes/auth.py)
- Trades routes: [backend/app/routes/trades.py](backend/app/routes/trades.py)
- Analytics service: [backend/app/services/analytics_service.py](backend/app/services/analytics_service.py)
- AI service: [backend/app/services/ai_service.py](backend/app/services/ai_service.py)
- Recommendation service: [backend/app/services/recommendation_service.py](backend/app/services/recommendation_service.py)

### Frontend
- API client: [frontend/src/api.ts](frontend/src/api.ts)
- Type definitions: [frontend/src/types.ts](frontend/src/types.ts)
- Auth page: [frontend/src/AuthPage.tsx](frontend/src/AuthPage.tsx)
- Trades page: [frontend/src/TradesPage.tsx](frontend/src/TradesPage.tsx)
- Dashboard page: [frontend/src/DashboardPage.tsx](frontend/src/DashboardPage.tsx)
- Analytics page: [frontend/src/AnalyticsPage.tsx](frontend/src/AnalyticsPage.tsx)
- Settings page: [frontend/src/SettingsPage.tsx](frontend/src/SettingsPage.tsx)

---

**Report Generated:** May 15, 2026  
**Total API Endpoints:** 14  
**Frontend Pages:** 5  
**Critical Issues Found:** 2  
**Medium Issues Found:** 1  
**All User Isolation Checks:** ✅ PASSED
