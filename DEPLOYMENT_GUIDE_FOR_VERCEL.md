# Trading Journal SaaS - Complete Project Explanation & Vercel Deployment Guide

**Status:** ✅ Project is on GitHub only - ready for fresh deployment  
**Project Name:** Trading Journal SaaS  
**Purpose:** An intelligent trading analytics platform for MetaTrader 5 traders  
**Tech Stack:** React/TypeScript (Frontend) + FastAPI/Python (Backend)  
**Current Status:** GitHub repository only - No deployments yet

---

## 📋 TABLE OF CONTENTS
1. [Project Vision & Overview](#project-vision--overview)
2. [Technology Stack](#technology-stack)
3. [Complete Project Structure](#complete-project-structure)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Authentication System](#authentication-system)
9. [Key Features](#key-features)
10. [How the System Works](#how-the-system-works)
11. [Deployment Configuration](#deployment-configuration)
12. [Environment Variables](#environment-variables)
13. [Vercel Deployment Instructions](#vercel-deployment-instructions)

---

## PROJECT VISION & OVERVIEW

### What is this project?
Trading Journal is a **SaaS platform** that helps traders analyze their trading performance using MetaTrader 5 (MT5). It's designed as a multi-user cloud application where each trader can:

- **Sync trades** from their local MetaTrader 5 terminal
- **View analytics** with performance metrics, charts, and insights
- **Track psychology** by tagging trades with emotions and strategies
- **Get AI recommendations** based on their trading patterns
- **Manage multiple accounts** within a single dashboard

### Architecture Overview (To Be Deployed)
```
┌──────────────────────────────────────────────────────────┐
│  Web Browser                                              │
│  https://your-domain.vercel.app  (TO BE DEPLOYED)       │
│  (React SPA - Will be hosted on Vercel)                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/HTTPS API Calls
                       ↓
┌──────────────────────────────────────────────────────────┐
│  Backend API                                              │
│  https://your-backend.onrender.com  (TO BE DEPLOYED)   │
│  (FastAPI - Will be hosted on Render or other service)  │
└──────────────────────┬──────────────────────────────────┘
                       │ Database Queries
                       ↓
┌──────────────────────────────────────────────────────────┐
│  Database                                                 │
│  SQLite (development) / PostgreSQL (production)          │
└──────────────────────────────────────────────────────────┘

Additional Component:
┌─────────────────────────────────────────────────────────┐
│  Desktop Sync Agent (Optional)                           │
│  TradeJournal-Sync-Agent.exe (PyInstaller)             │
│  Runs on trader's Windows PC, reads local MT5,          │
│  uploads trades to backend via API key                  │
└─────────────────────────────────────────────────────────┘
```

---

## TECHNOLOGY STACK

### Frontend
- **React** (^19.2.5) - UI framework
- **TypeScript** (~6.0.2) - Type safety
- **Vite** (^8.0.10) - Build tool & dev server (much faster than Create React App)
- **TailwindCSS** (^4.2.4) - Utility-first CSS framework
- **Recharts** (^3.8.1) - React charts library
- **Axios** (^1.15.2) - HTTP client for API calls
- **React DOM** (^19.2.5) - React rendering library

### Backend
- **FastAPI** (0.115.6) - Modern Python web framework (like Express.js)
- **Uvicorn** (0.34.0) - ASGI server (Python web server)
- **SQLAlchemy** (2.0.36) - ORM (Object-Relational Mapping)
- **Pydantic** (2.10.3) - Data validation
- **bcrypt** (4.2.1) - Password hashing
- **python-dotenv** (1.0.1) - Environment variables
- **psycopg2-binary** (2.9.10) - PostgreSQL adapter (optional)
- **MetaTrader5** (optional) - Only for local MT5 sync

### Development Tools
- **ESLint** - JavaScript linter
- **TypeScript** - Type checking
- **Tailwind CSS** - CSS framework with TypeScript support

### Database Options
- **SQLite** (default for development) - File-based database, no setup needed
- **PostgreSQL** (production) - Robust relational database

---

## COMPLETE PROJECT STRUCTURE

```
trading-journal/
│
├── .env                                    # Environment variables (Frontend API URL)
├── .gitignore                             # Git ignore rules
├── docker-compose.yml                     # Docker Compose config for backend + database
├── vercel.json                            # Vercel deployment config
├── package.json                           # Root package config
├── package-lock.json                      # Locked dependencies
├── runtime.txt                            # Python version specification
├── trades.db                              # SQLite database (generated at runtime)
│
├── PROJECT_CONTEXT.md                     # Detailed project documentation
├── API_CONTRACT_AUDIT.md                  # API endpoint specifications
├── PHASE2_*.md                            # Deployment phase documentation
│
│
├── FRONTEND/ (Vite + React + TypeScript)
│   ├── package.json                       # Frontend dependencies
│   ├── vite.config.ts                     # Vite build configuration
│   ├── tsconfig.json                      # TypeScript configuration
│   ├── tsconfig.app.json                  # App-specific TypeScript config
│   ├── tsconfig.node.json                 # Node-specific TypeScript config
│   ├── eslint.config.js                   # ESLint rules
│   ├── index.html                         # Main HTML entry point
│   │
│   ├── src/
│   │   ├── main.tsx                       # React app entry point
│   │   ├── index.css                      # Global styles (TailwindCSS)
│   │   ├── App.tsx                        # Main app component (router, shell)
│   │   ├── api.ts                         # Axios client + API functions
│   │   ├── types.ts                       # TypeScript interfaces/types
│   │   ├── settings.ts                    # Local settings management
│   │   │
│   │   ├── AuthPage.tsx                   # Login/Signup page
│   │   ├── DashboardPage.tsx              # Home page (metrics, onboarding)
│   │   ├── TradesPage.tsx                 # Trade table with filters
│   │   ├── AnalyticsPage.tsx              # Charts and detailed analytics
│   │   ├── SettingsPage.tsx               # Settings + API key management
│   │   │
│   │   ├── components/
│   │   │   ├── Layout.tsx                 # App shell (sidebar + header)
│   │   │   ├── Header.tsx                 # Top navigation bar
│   │   │   ├── Sidebar.tsx                # Left navigation panel
│   │   │   ├── SyncStatusBar.tsx          # Backend connection status
│   │   │   ├── ErrorBoundary.tsx          # React error boundary
│   │   │   ├── PeriodSelector.tsx         # Date range filter
│   │   │   └── ui.tsx                     # Shared UI primitives (buttons, cards)
│   │   │
│   │   ├── context/
│   │   │   └── WorkspaceContext.tsx       # Global state (selected account)
│   │   │
│   │   └── assets/                        # Images, icons (if any)
│   │
│   ├── dist/                              # Built frontend (generated by `npm run build`)
│   │   ├── index.html
│   │   ├── assets/
│   │   │   ├── index-*.js
│   │   │   ├── index-*.css
│   │   │   └── ...
│   │   └── ...
│   │
│   └── public/                            # Static assets served as-is
│
│
├── BACKEND/ (FastAPI + SQLAlchemy + Pydantic)
│   ├── package.json                       # Package metadata
│   ├── requirements.txt                   # Python dependencies
│   ├── main.py                            # Simple entry point (backwards compat)
│   ├── Dockerfile                         # Docker image definition
│   ├── .env.example                       # Example environment variables
│   ├── trades.db                          # SQLite database (generated)
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                        # FastAPI app creation + routes registration
│   │   ├── config.py                      # Settings/configuration loaded from env vars
│   │   ├── database.py                    # SQLAlchemy engine, session, migrations
│   │   ├── models.py                      # Database models (User, Trade)
│   │   ├── schemas.py                     # Pydantic schemas (request/response DTOs)
│   │   ├── auth.py                        # JWT creation, password hashing, token validation
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                    # Auth endpoints (signup, login, API key)
│   │   │   └── trades.py                  # Trade endpoints (CRUD, analytics, sync)
│   │   │
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── mt5_service.py             # Reads from local MT5 terminal
│   │       ├── analytics_service.py       # Calculates performance metrics
│   │       ├── ai_service.py              # Rule-based AI insights
│   │       └── recommendation_service.py  # Trading recommendations
│   │
│   └── venv/                              # Python virtual environment (local)
│
│
└── DESKTOP/ (Optional - Windows Sync Agent)
    ├── main.py                            # Entry point for desktop app
    ├── mt5_service.py                     # Reads MT5 trades from Windows
    ├── requirements.txt                   # Python dependencies
    ├── README.md                          # Desktop agent documentation
    ├── build.bat                          # Build script for PyInstaller
    ├── tradejournal_agent.spec            # PyInstaller config
    ├── tradejournal_installer.iss         # Inno Setup installer config
    │
    ├── sync_agent/
    │   ├── __init__.py
    │   ├── agent.py                       # Main sync loop
    │   ├── config.py                      # Agent configuration
    │   ├── setup_ui.py                    # First-run setup window (Tkinter)
    │   ├── uploader.py                    # Uploads trades to backend
    │   ├── mt5_reader.py                  # Reads trades from MT5
    │   ├── process.py                     # Detects if MT5 is running
    │   ├── state.py                       # Sync state persistence
    │   ├── branding.py                    # App name, icon paths
    │   ├── lock.py                        # Prevents duplicate agents
    │   ├── startup.py                     # Windows startup task integration
    │   └── status_window.py                # Status display window
    │
    ├── assets/
    │   ├── tradejournal.ico               # App icon
    │   └── ...
    │
    ├── dist/
    │   └── TradeJournal-Sync-Agent.exe    # Packaged executable
    │
    └── build/                             # Build artifacts
        └── tradejournal_agent/
            ├── Analysis-00.toc
            ├── EXE-00.toc
            ├── PKG-00.toc
            └── ...

```

---

## FRONTEND ARCHITECTURE

### What the Frontend Does
The frontend is a **Single Page Application (SPA)** built with React and TypeScript. It's hosted on Vercel and communicates with the backend API to:

1. **Authenticate users** - Handle login/signup
2. **Display trades** - Show trade history from database
3. **Show analytics** - Display charts and metrics
4. **Manage settings** - Handle API key and preferences
5. **Sync trades** - Trigger backend to fetch from MT5

### Key Frontend Files

#### `frontend/src/main.tsx` (Entry Point)
```
Root component that initializes React.
Renders the App component.
```

#### `frontend/src/App.tsx` (Main Router & Shell)
- **Purpose:** Main application shell with routing
- **Key Functions:**
  - Routes users to different pages (Dashboard, Trades, Analytics, Settings)
  - Manages authentication state
  - Loads user workspace (accounts, API key)
  - Polls for account discovery during onboarding
- **Dependencies:** All pages, Layout component
- **State Management:** Auth token, user info, selected account, active page

#### `frontend/src/api.ts` (API Client)
- **Purpose:** Centralized HTTP client for all backend communication
- **Key Functions:**
  - Creates axios instance with `VITE_API_URL` (environment variable)
  - Handles JWT token injection in request headers
  - Manages token storage in localStorage
  - Provides helper functions for API errors
  - Exports specific API functions used by pages
- **API Base URL:** `https://tradejournal1.onrender.com` (from env var)
- **How it Works:**
  ```typescript
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
  });
  api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  ```

#### `frontend/src/types.ts` (TypeScript Types)
- **Purpose:** Defines all TypeScript interfaces used throughout the app
- **Key Types:**
  - `User` - Authenticated user info
  - `Trade` - Trade object from backend
  - `AuthResponse` - Login/signup response with JWT
  - `ApiKeyResponse` - API key response
  - `AccountInfo` - Multi-account information
  - And many more...

#### `frontend/src/settings.ts` (Local Settings)
- **Purpose:** Manages localStorage-based user preferences
- **Settings:**
  - Auto-sync enabled/disabled
  - Sync interval
  - Default analytics period
- **Storage Key:** Persisted in browser localStorage

#### Pages (Components)

**`frontend/src/AuthPage.tsx`**
- Login and signup form
- Handles both authentication flows
- Stores JWT token and user info
- Shows error messages

**`frontend/src/DashboardPage.tsx`**
- Home page with overview metrics
- Displays onboarding state if no trades
- Shows key statistics (PnL, win rate, etc.)
- Sync button to trigger trade upload
- Account selector

**`frontend/src/TradesPage.tsx`**
- Table of all trades
- Period filtering (7D, 30D, 90D, 365D)
- Editable fields: notes, emotion, strategy
- Pagination
- Delete capability
- Sync button

**`frontend/src/AnalyticsPage.tsx`**
- Multiple charts (equity curve, drawdown, distribution)
- Performance metrics
- Tag analytics (emotion, strategy impact)
- AI insights and recommendations
- Period-based filtering

**`frontend/src/SettingsPage.tsx`**
- Display and manage API key
- Regenerate or revoke API key
- Configuration guidance for desktop sync agent
- Instructions for setting up sync agent

#### Components (Reusable UI)

**`frontend/src/components/Layout.tsx`**
- Main app shell
- Contains Header and Sidebar
- Renders page content
- Provides responsive structure

**`frontend/src/components/Header.tsx`**
- Top navigation bar
- Account selector dropdown
- Logout button
- Branding

**`frontend/src/components/Sidebar.tsx`**
- Left navigation menu
- Links to all pages
- Active page highlighting

**`frontend/src/components/SyncStatusBar.tsx`**
- Shows backend connection status
- Green = connected, Red = offline
- Polls `/health` endpoint every 10 seconds

**`frontend/src/components/ui.tsx`**
- Shared UI components (Buttons, Cards, Panels)
- Consistent styling via TailwindCSS
- Reusable across all pages

**`frontend/src/components/ErrorBoundary.tsx`**
- React error boundary for catching errors

**`frontend/src/context/WorkspaceContext.tsx`**
- Global state for selected account
- Prevents prop drilling
- Shared across pages

### Frontend Build & Deployment

**Build Command:** `npm run build`
- Compiles TypeScript to JavaScript
- Bundles with Vite
- Outputs to `frontend/dist/`
- Minified and optimized

**Development Command:** `npm run dev`
- Starts dev server on localhost:5173
- Hot module replacement (instant updates)
- Uses Vite's fast reloading

---

## BACKEND ARCHITECTURE

### What the Backend Does
The backend is a **FastAPI server** hosted on Render. It:

1. **Handles authentication** - JWT tokens, password hashing, API key management
2. **Manages trades** - CRUD operations, filtering, storage
3. **Calculates analytics** - Performance metrics, charts data
4. **Provides AI insights** - Rule-based trading recommendations
5. **Syncs with MT5** - Optional endpoint to fetch trades from local MT5
6. **Serves frontend download** - Desktop sync agent executable

### Key Backend Files

#### `backend/app/main.py` (FastAPI App)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, ...)  # Allow frontend to make requests
app.include_router(auth.router)          # Auth routes
app.include_router(trades.router)        # Trade routes

@app.get("/health")                      # Health check
def health():
    return {"status": "ok"}
```

**Key Responsibilities:**
- Creates FastAPI app
- Configures CORS (allows requests from Vercel frontend)
- Registers routers (auth, trades)
- Initializes database tables
- Serves `/health` endpoint

#### `backend/app/config.py` (Configuration)
- **Purpose:** Load settings from environment variables
- **Environment Variables:**
  - `DATABASE_URL` - Database connection string (SQLite or PostgreSQL)
  - `JWT_SECRET_KEY` - Secret for signing JWT tokens
  - `ACCESS_TOKEN_EXPIRE_MINUTES` - JWT expiration time
  - `CORS_ORIGINS` - Allowed frontend origins
  - `HOST` - Server host (0.0.0.0)
  - `PORT` - Server port (8000)
  - `APP_ENV` - development, staging, production
- **Behavior:**
  - Defaults to SQLite if no DATABASE_URL
  - Detects if running on production
  - Parses comma-separated CORS origins

**Example Config Class:**
```python
@dataclass(frozen=True)
class Settings:
    database_url: str = "sqlite:///./trades.db"
    jwt_secret_key: str = "change-this-before-deployment"
    access_token_expire_minutes: int = 1440  # 24 hours
    cors_origins: List[str] = ["*"]  # Allow all origins (dev only)
    host: str = "0.0.0.0"
    port: int = 8000
```

#### `backend/app/database.py` (Database Layer)
- **Purpose:** SQLAlchemy database engine and session management
- **Key Functions:**
  - Creates database engine (SQLite or PostgreSQL)
  - Provides session maker for queries
  - Implements `get_db()` dependency for FastAPI routes
  - Handles schema migrations for auth columns
  - Database agnostic - same code works with SQLite and PostgreSQL

**How it Works:**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)

def get_db():
    """FastAPI dependency - injects DB session into routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### `backend/app/models.py` (Database Models)
Defines the database tables using SQLAlchemy ORM:

**User Model:**
```python
class User(Base):
    __tablename__ = "users"
    
    id: int (primary key)
    email: str (unique)
    password_hash: str
    api_key: str (unique, auto-generated)
    created_at: datetime
```

**Trade Model:**
```python
class Trade(Base):
    __tablename__ = "trades"
    
    id: int (primary key)
    user_id: int (foreign key to User)
    
    # Trade details
    symbol: str (e.g., "EURUSD")
    profit: float
    volume: float
    entry_price: float
    exit_price: float
    open_time: datetime
    close_time: datetime
    duration: int (seconds)
    ticket: int (MT5 trade ID)
    trade_type: str ("buy" or "sell")
    
    # Behavioral tracking
    strategy: str (e.g., "breakout")
    notes: str
    emotion: str (e.g., "fear", "greed")
    
    # Multi-account support
    account_id: str
    account_name: str
    time: datetime
```

#### `backend/app/schemas.py` (Data Validation)
- **Purpose:** Pydantic schemas for request/response validation
- **Key Schemas:**
  - `UserCreate` - Signup request (email, password)
  - `UserLogin` - Login request (email, password)
  - `Token` - Login response (JWT token, user info)
  - `Trade` - Trade object response
  - `TradeCreate` - Create trade request
  - `TradeUpdate` - Update trade request
  - And many more...

**Example:**
```python
class UserCreate(BaseModel):
    email: str
    password: str
    
    @field_validator("email")
    def validate_email(cls, v):
        # Email must be valid
        return v

class Token(BaseModel):
    access_token: str
    user: User
```

#### `backend/app/auth.py` (Authentication)
- **Purpose:** JWT creation, token validation, password hashing
- **Key Functions:**
  - `create_access_token()` - Creates JWT token
  - `decode_access_token()` - Verifies JWT token
  - `get_password_hash()` - Hashes password with bcrypt
  - `verify_password()` - Verifies password against hash
  - `get_current_user()` - FastAPI dependency to get authenticated user
  - `authenticate_user()` - Verifies email/password
  - `generate_api_key()` - Generates unique API key for desktop agent

**JWT Details:**
- **Algorithm:** HS256 (HMAC-SHA256)
- **Expiration:** 24 hours (configurable)
- **Secret:** JWT_SECRET_KEY environment variable
- **Payload:** Contains user ID as subject

#### Routes

**`backend/app/routes/auth.py` (Authentication Endpoints)**

```
POST /api/auth/signup
    Request: { email, password }
    Response: { access_token, user: { id, email } }
    Purpose: Register new user

POST /api/auth/login
    Request: { email, password }
    Response: { access_token, user: { id, email } }
    Purpose: Authenticate user

GET /api/auth/api-key
    Auth: Bearer token
    Response: { api_key }
    Purpose: Get user's API key for desktop agent

POST /api/auth/api-key/regenerate
    Auth: Bearer token
    Response: { api_key }
    Purpose: Generate new API key

DELETE /api/auth/api-key
    Auth: Bearer token
    Response: { api_key }
    Purpose: Revoke current API key
```

**`backend/app/routes/trades.py` (Trade Endpoints)**

```
GET /api/trades
    Auth: Bearer token
    Filters: days=30, start=YYYY-MM-DD, end=YYYY-MM-DD, account_id=
    Response: { data: Trade[], total, page, page_size }
    Purpose: Get user's trades with pagination

POST /api/trades/upload
    Auth: X-API-Key header
    Request: [{ symbol, profit, ... }]
    Response: { saved, skipped }
    Purpose: Bulk upload trades (used by desktop agent)

PUT /api/trades/{id}
    Auth: Bearer token
    Request: { strategy, notes, emotion }
    Response: Trade
    Purpose: Update trade metadata

GET /api/trades/{id}
    Auth: Bearer token
    Response: Trade
    Purpose: Get single trade

GET /api/trades/sync-mt5
    Auth: Bearer token
    Response: { synced_count }
    Purpose: Sync trades from local MT5 (optional)

GET /api/trades/accounts
    Auth: Bearer token
    Response: [{ account_id, account_name }]
    Purpose: Get all user's trading accounts

GET /api/trades/analytics
    Auth: Bearer token
    Filters: days=30, account_id=
    Response: { totalTrades, totalPnL, winRate, ... }
    Purpose: Get performance metrics

GET /api/trades/analytics/tags
    Auth: Bearer token
    Filters: days=30, account_id=
    Response: { strategies: {...}, emotions: {...} }
    Purpose: Get analytics by tags

GET /api/trades/analytics/ai
    Auth: Bearer token
    Filters: days=30, account_id=
    Response: { insights: ["...", "..."] }
    Purpose: Get AI-generated insights

GET /api/trades/analytics/recommendations
    Auth: Bearer token
    Filters: days=30, account_id=
    Response: { recommendations: ["...", "..."] }
    Purpose: Get trading recommendations
```

#### Services

**`backend/app/services/analytics_service.py`**
- Calculates performance metrics from trades
- Computes: PnL, win rate, profit factor, expectancy, drawdown, streaks, etc.
- Used by `/api/trades/analytics` endpoint
- All calculations happen on backend (not frontend) for accuracy

**`backend/app/services/ai_service.py`**
- Rule-based AI (not LLM-based)
- Analyzes metrics and generates insights
- Examples: "Your expectancy is negative", "FOMO trades lose money"
- Deterministic and fast (no API calls)

**`backend/app/services/recommendation_service.py`**
- Generates actionable recommendations based on trading patterns
- Examples: "Reduce position size", "Avoid trading when feeling FOMO"
- Based on emotion tracking and strategy analysis

**`backend/app/services/mt5_service.py`**
- Reads trades from local MetaTrader 5 terminal
- Only works on Windows with MT5 installed
- Used by optional `/api/trades/sync-mt5` endpoint
- Gracefully handles if MT5 is not available

---

## DATABASE SCHEMA

### User Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    api_key VARCHAR UNIQUE,
    created_at DATETIME DEFAULT NOW()
);
```

### Trade Table
```sql
CREATE TABLE trades (
    id INTEGER PRIMARY KEY,
    user_id INTEGER FOREIGN KEY REFERENCES users(id),
    
    -- Trade details
    symbol VARCHAR,
    profit FLOAT,
    volume FLOAT,
    entry_price FLOAT,
    exit_price FLOAT,
    open_time DATETIME,
    close_time DATETIME,
    duration INTEGER,
    ticket INTEGER,        -- MT5 trade ID
    trade_type VARCHAR,    -- "buy" or "sell"
    
    -- Behavioral tags
    strategy VARCHAR,
    notes VARCHAR,
    emotion VARCHAR,
    
    -- Multi-account support
    account_id VARCHAR,
    account_name VARCHAR,
    time DATETIME
);

CREATE INDEX idx_trade_user_id ON trades(user_id);
CREATE INDEX idx_trade_ticket ON trades(ticket);
CREATE INDEX idx_trade_time ON trades(time);
CREATE INDEX idx_trade_account ON trades(account_id);
```

### Relationships
- **User → Trade (1:Many)**
  - One user can have many trades
  - Trades are isolated per user via user_id
  - No cross-user data access possible

---

## API ENDPOINTS

### Summary of All Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/signup` | None | Register new user |
| POST | `/api/auth/login` | None | Login user |
| GET | `/api/auth/api-key` | Bearer | Get API key |
| POST | `/api/auth/api-key/regenerate` | Bearer | Regenerate API key |
| DELETE | `/api/auth/api-key` | Bearer | Revoke API key |
| GET | `/api/trades` | Bearer | List trades |
| POST | `/api/trades/upload` | X-API-Key | Upload trades |
| PUT | `/api/trades/{id}` | Bearer | Update trade |
| GET | `/api/trades/accounts` | Bearer | Get accounts |
| GET | `/api/trades/analytics` | Bearer | Get metrics |
| GET | `/api/trades/analytics/tags` | Bearer | Get tag analytics |
| GET | `/api/trades/analytics/ai` | Bearer | Get AI insights |
| GET | `/api/trades/analytics/recommendations` | Bearer | Get recommendations |
| GET | `/api/trades/sync-mt5` | Bearer | Sync from MT5 |
| GET | `/health` | None | Health check |
| GET | `/` | None | Root message |

### Authentication Methods

**Bearer Token (JWT)**
- Used by web frontend
- Header: `Authorization: Bearer <jwt_token>`
- Token obtained from `/api/auth/signup` or `/api/auth/login`
- Expires in 24 hours

**X-API-Key Header**
- Used by desktop sync agent
- Header: `X-API-Key: tj_<api_key>`
- Key obtained from `/api/auth/api-key` endpoint
- Never expires (until revoked)

---

## AUTHENTICATION SYSTEM

### How Authentication Works

1. **User Registration (Signup)**
   ```
   User fills email + password → POST /api/auth/signup
   Backend hashes password with bcrypt
   Backend creates User record in database
   Backend generates JWT token
   Frontend stores token in localStorage
   Frontend stores user info in localStorage
   ```

2. **User Login**
   ```
   User enters email + password → POST /api/auth/login
   Backend verifies email exists
   Backend verifies password hash matches
   Backend generates JWT token
   Frontend stores token + user info
   ```

3. **Authenticated Requests (Frontend)**
   ```
   Frontend includes JWT in Authorization header
   Backend extracts token from header
   Backend verifies token signature with JWT_SECRET_KEY
   Backend decodes token to get user ID
   Backend retrieves user from database
   Endpoint executes with user context
   ```

4. **API Key (Desktop Agent)**
   ```
   User visits Settings page
   Frontend shows API key from `/api/auth/api-key`
   User copies API key to agent config
   Agent includes API key in X-API-Key header when uploading
   Backend verifies API key exists in database
   Backend finds associated user
   Agent can upload trades without JWT
   ```

### Password Security
- Passwords are **never stored** as plain text
- bcrypt hashing with salt
- 72-byte truncation for compatibility
- Cannot be reversed

### JWT Token Structure
```
Header: { alg: "HS256", typ: "JWT" }
Payload: { sub: "user_id", iat: timestamp, exp: timestamp }
Signature: HMAC-SHA256(secret_key, header + payload)
```

---

## KEY FEATURES

### 1. Multi-User Authentication
- Each user has unique email + password
- Data is completely isolated per user
- Trades visible only to their owner
- API keys are per-user

### 2. Trade Management
- **Upload Trades** - Bulk upload from MT5 or manually
- **View Trades** - Filterable table with pagination
- **Edit Trades** - Add strategy, notes, emotion
- **Delete Trades** - Remove trades
- **Search/Filter** - By date range, period, account

### 3. Analytics Engine
- **Performance Metrics:**
  - Total P&L
  - Win rate
  - Profit factor
  - Expectancy
  - Max drawdown
  - Average win/loss
  - Win/loss streaks
  
- **Charts:**
  - Equity curve
  - Drawdown curve
  - Profit distribution
  - Symbol performance
  - Strategy performance
  - Emotion impact
  
- **Period-based Analysis:**
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - Last 365 days
  - Custom date range

### 4. Behavioral Tracking
- Tag trades with emotions (fear, greed, fomo, etc.)
- Tag trades with strategies (breakout, scalp, etc.)
- Add notes to trades
- Analyze which emotions/strategies are profitable

### 5. AI Insights (Rule-Based)
- Analyzes trading patterns
- Detects problems automatically
- Suggests improvements
- Examples:
  - "Your expectancy is negative"
  - "Max drawdown is 45%, consider risk management"
  - "FOMO trades lose money, avoid them"

### 6. Trading Recommendations
- Actionable advice based on data
- Examples:
  - "Reduce position size"
  - "Focus on your best strategy"
  - "Avoid trading when feeling FOMO"
  - "Use tighter stop losses"

### 7. Multi-Account Support
- Traders with multiple MT5 accounts
- Each account tracked separately
- Aggregate or isolate analytics by account
- Account selector in dashboard

### 8. Desktop Sync Agent (Optional)
- Windows executable that runs in background
- Automatically detects when MT5 is open
- Periodically reads trades from MT5
- Uploads trades to backend via API
- Prevents duplicate uploads with ticket ID
- Can be disabled in settings

---

## HOW THE SYSTEM WORKS

### Complete User Flow

#### 1. User Signs Up
```
1. Opens https://trade-journal1-five.vercel.app
2. Clicks "Sign Up"
3. Enters email and password
4. Frontend sends POST /api/auth/signup
5. Backend creates user record
6. Backend generates JWT token
7. Frontend stores token in localStorage
8. Frontend redirects to Dashboard
```

#### 2. User Lands on Dashboard (Onboarding)
```
1. Dashboard checks if user has trades
2. If no trades: shows "Get Started" guide
3. Guide explains:
   - MT5 remains local (not synced to cloud)
   - Must install desktop sync agent
   - Desktop agent will upload trades automatically
4. Shows CTA to download sync agent
5. Shows CTA to copy API key
```

#### 3. User Downloads & Installs Desktop Agent
```
1. User clicks "Download Agent"
2. Downloads TradeJournal-Sync-Agent.exe
3. Runs installer
4. First run opens setup window
5. User enters:
   - Backend URL (default: https://tradejournal1.onrender.com)
   - API key (from Settings page)
6. User clicks "Verify Connection" → health check
7. User clicks "Save and Launch"
8. Agent creates config file in AppData
9. Agent registers Windows startup task
10. Agent launches and starts syncing
```

#### 4. Desktop Agent Syncs Trades
```
1. Agent detects MT5 is running
2. Reads local trades from MT5 terminal
3. Filters new trades (not already synced)
4. Uploads to POST /api/trades/upload with API key
5. Backend deduplicates by (user_id, ticket)
6. Backend stores trades in database
7. Agent logs sync result
8. Next sync runs after sync interval (default: 5 min)
```

#### 5. Frontend Discovers Accounts
```
1. Frontend loads Shell state
2. Calls GET /api/trades/accounts
3. Backend queries distinct account_ids from trades
4. Frontend receives list of accounts
5. Account dropdown appears in header
6. User can select account to filter all data
```

#### 7. User Views Analytics
```
1. User navigates to Analytics page
2. Frontend calls multiple endpoints in parallel:
   - GET /api/trades/analytics (metrics)
   - GET /api/trades/analytics/tags (tag stats)
   - GET /api/trades/analytics/ai (insights)
   - GET /api/trades/analytics/recommendations
3. Backend calculates all metrics server-side
4. Frontend renders charts and insights
5. User can change period filter (7D, 30D, etc.)
```

#### 8. User Edits Trade Metadata
```
1. User clicks trade in Trades page
2. Inline edit appears (notes, emotion, strategy)
3. User types changes
4. Frontend sends PUT /api/trades/{id}
5. Backend updates database
6. Frontend refreshes trade display
```

---

## DEPLOYMENT CONFIGURATION

### Planned Deployment (Starting from GitHub)

**Frontend (To be deployed on Vercel):**
- Framework: Vite + React
- Build Command: `npm run build` (from frontend/ dir)
- Environment Variable: `VITE_API_URL` will point to backend URL (to be set during deployment)
- Will be auto-deployed on git push to main branch

**Backend (To be deployed on Render, Heroku, Railway, or similar):**
- Framework: FastAPI + Uvicorn
- Database: Start with SQLite, upgrade to PostgreSQL for production
- Environment Variables: Configure during deployment setup
- Will be auto-deployed on git push to main branch (if configured)

### Vercel Configuration (`vercel.json`)

```json
{
    "experimentalServices": {
        "frontend": {
            "root": "frontend",
            "routePrefix": "/",
            "framework": "vite"
        },
        "backend": {
            "root": "backend",
            "routePrefix": "/_/backend"
        }
    }
}
```

This configuration tells Vercel:
- Frontend is in the `frontend/` folder, build with Vite, serve at `/`
- Backend is in the `backend/` folder, serve at `/_/backend`
- Both can be deployed together

### Docker Configuration (`docker-compose.yml`)

For local development with Docker:
```yaml
services:
  backend:
    build: ./backend
    ports: [8000:8000]
    environment:
      DATABASE_URL: sqlite:///./data/trades.db
      # ... other env vars
  
  db:  # PostgreSQL (optional)
    image: postgres:16-alpine
    ports: [5432:5432]
```

---

## ENVIRONMENT VARIABLES

### Frontend (`.env` file in root - EXAMPLE)
```env
# Replace YOUR_BACKEND_URL with your actual backend domain
# Example: https://your-api.onrender.com or https://your-api.herokuapp.com

VITE_API_URL=https://YOUR_BACKEND_URL
VITE_DESKTOP_AGENT_DOWNLOAD_URL=https://YOUR_BACKEND_URL/downloads/desktop-sync-agent/windows
```

These are read at **build time** by Vite and embedded into the JavaScript bundle.

**Important:** Do NOT commit the actual `.env` file to GitHub. Add it to `.gitignore` and set these variables in Vercel's project settings instead.

### Backend (`.env.example` in backend/ folder)
```env
# Database - Start with SQLite for testing, use PostgreSQL for production
DATABASE_URL=sqlite:///./trades.db
# Or for PostgreSQL (recommended for production):
# DATABASE_URL=postgresql://username:password@db-host:5432/trading_journal

# JWT - GENERATE A SECURE SECRET KEY (minimum 32 characters)
JWT_SECRET_KEY=change-this-to-a-very-secure-random-key-at-least-32-characters
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS - Set this to your Vercel frontend URL once deployed
CORS_ORIGINS=http://localhost:5173,https://YOUR_VERCEL_DOMAIN.vercel.app

# Server
HOST=0.0.0.0
PORT=8000

# API Docs - Disable in production
ENABLE_API_DOCS=false

# Environment
APP_ENV=production
```

**Important:** Do NOT commit the actual `.env` file to GitHub. These are example values - you must generate your own secret keys and set real URLs during deployment.

### Desktop Agent (`agent_config.json` in sync_agent root)
```json
{
  "backend_url": "https://tradejournal1.onrender.com",
  "api_key": "tj_...",
  "account_id": "",
  "account_name": "",
  "quick_sync_interval_seconds": 300,
  "quick_sync_days": 7,
  "deep_sync_interval_hours": 12,
  "deep_sync_days": 730,
  "request_timeout_seconds": 30,
  "log_level": "INFO"
}
```

---

## VERCEL DEPLOYMENT INSTRUCTIONS

### Prerequisites
1. **GitHub repository** - Your project should be pushed to GitHub
2. **Vercel account** - Create free account at https://vercel.com
3. **Backend deployment planned** - Backend will be deployed separately (Render, Heroku, Railway, etc.)
4. **Backend URL** - You'll need this when configuring frontend environment variables

### Step 1: Prepare Your Repository

**Ensure your project structure is correct:**
```
trading-journal/  (root)
├── frontend/  (React + Vite)
├── backend/   (FastAPI)
├── vercel.json  (deployment config)
└── ...
```

**Current `vercel.json` configuration:**
```json
{
    "experimentalServices": {
        "frontend": {
            "root": "frontend",
            "routePrefix": "/",
            "framework": "vite"
        }
    }
}
```

**Note:** The `backend` service in vercel.json is experimental. For production deployment:
- **Option 1 (Recommended):** Deploy frontend to Vercel and backend separately to Render/Heroku/Railway
- **Option 2:** Deploy entire project to Vercel (using experimentalServices) - note this is still experimental

This guide focuses on Option 1, which is more stable.

### Step 2: Configure Environment Variables (Frontend)

**For Local Development Only:**

Create `frontend/.env` file:
```env
VITE_API_URL=http://localhost:8000
VITE_DESKTOP_AGENT_DOWNLOAD_URL=http://localhost:8000/downloads/desktop-sync-agent/windows
```

**Important:** Add `.env` to `.gitignore` - never commit it to GitHub.

**For Production (Vercel):** These will be set in Vercel's settings after you connect your repository (Step 4).

### Step 3: Connect to Vercel

1. **Login to Vercel:** https://vercel.com/login
2. **Click "Add New..."** → **"Project"**
3. **Import Git Repository:**
   - Connect your GitHub account if not already
   - Select your `trading-journal` repository
   - Click "Import"

### Step 4: Configure Vercel Settings

1. **Project Settings:**
   - **Project Name:** trading-journal (or your preference)
   - **Framework Preset:** Other (since we have custom setup)
   - **Root Directory:** ./ (root of repo)

2. **Build Settings:**
   - **Build Command:** (leave empty, Vercel will auto-detect from vercel.json)
   - **Output Directory:** frontend/dist (for SPA)

3. **Environment Variables:**
   - Add all variables from `.env` file:
     - `VITE_API_URL`
     - `VITE_DESKTOP_AGENT_DOWNLOAD_URL`
     - For backend: `DATABASE_URL`, `JWT_SECRET_KEY`, etc.

### Step 5: Deploy

1. Click **Deploy** (Frontend):**
   - `VITE_API_URL` - URL of your backend (will be set after backend is deployed)
   - `VITE_DESKTOP_AGENT_DOWNLOAD_URL` - Backend download endpoint
   - Example: `VITE_API_URL=https://your-api.onrender.com`
   - Start backend (if configured)
   - Assign you a domain (e.g., `trading-journal-123.vercel.app`)

### Step 6: Monitor Deployment

- **Deployments tab** shows build logs
- **Check frontend builds:** Look for `frontend/dist` output
- **Check backend logs:** If backend is on Vercel, look for startup logs
- **Visit your domain:** https://your-project.vercel.app

### Step 7: Custom Domain (Optional)

1. Go to **PDeploy Backend Separately

**IMPORTANT:** The frontend is now deployed, but you need to deploy the backend too.

Choose one of these services:

**Option A: Render (Recommended)**
1. Go to https://render.com
2. Sign up and create new Web Service
3. Connect your GitHub repository
4. Set root directory to `backend/`
5. Set build command: `pip install -r requirements.txt`
6. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables (DATABASE_URL, JWT_SECRET_KEY, CORS_ORIGINS, etc.)
8. Deploy
9. Copy the backend URL (e.g., https://your-api.onrender.com)

**Option B: Heroku**
1. Go to https://heroku.com
2. Create new app
3. Connect GitHub repository
4. Set buildpacks: Python
5. Add environment variables
6. Deploy

**Option C: Railway**
1. Go to https://railway.app
2. Create new project from GitHub
3. Auto-detects backend setup
4. Configure environment variables
5. Deploy

### Step 7: Update Frontend Environment Variables

Once backend is deployed:

1. Go to Vercel project settings
2. Go to **Environment Variables**
3. Add/update:
   - `VITE_API_URL` = `https://your-backend-url.com` (from Render/Heroku/Railway)
   - `VITE_DESKTOP_AGENT_DOWNLOAD_URL` = `https://your-backend-url.com/downloads/desktop-sync-agent/windows`
4. Vercel will automatically rebuild frontend with new variables

### Step 8: Monitor Deployments

**Vercel Frontend:**
- **Deployments tab** shows build logs
- Check for `frontend/dist` output
- Visit your domain: https://your-project.vercel.app

**Backend (Render/Heroku/Railway):**
- Check service logs for any startup errors
- Test `/health` endpoint: `https://your-backend-url.com/health`
- Should return: `{\"status\":\"ok\",...}`rontend domain
- Example: `CORS_ORIGINS=https://your-domain.vercel.app`

**Issue: "Can't find npm" or "Module not found"**
- Solution: Ensure `frontend/package.json` exists in correct location
- Check Vercel detected correct root directory

**Issue: Backend not deploying**
- Solution: Backend should be deployed separately (Render, Heroku, etc.)
- Vercel.json config with backend may not work - use separate services

---

## SUMMARY FOR ChatGPT

When sharing this document with ChatGPT, you can ask it to help with:

1. **Deployment Instructions:**
   - "How do I deploy the frontend to Vercel?"
   - "What are the steps to set up the backend on Render?"
   - "How do I configure environment variables?"

2. **Backend Configuration:**
   - "How do I set up PostgreSQL instead of SQLite?"
   - "How do I implement X feature in the backend?"
   - "What do these FastAPI endpoints do?"

3. **Frontend Questions:**
   - "How do I modify the dashboard page?"
   - "How do I add a new chart to analytics?"
   - "How does the state management work?"

4. **Database Questions:**
   - "How are trades stored?"
   - "How do I query trades by user?"
   - "What are the table relationships?"

5. **Troubleshooting:**
   - "Why is my frontend showing CORS errors?"
   - "Why can't I log in?"
   - "Why are my trades not syncing?"

---

## QUICK REFERENCE: KEY COMMANDS

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev             # Start dev server (localhost:5173)
npm run build           # Build for production (dist/)
npm run preview         # Preview production build locally
npm run lint            # Run ESLint
```

### Backend
```bash
cd backend
pip install -r requirements.txt  # Install dependencies
python -m uvicorn app.main:app --reload  # Start dev server (localhost:8000)
python -m pytest                 # Run tests (if configured)
```

### Docker
```bash
docker compose up -d             # Start backend + database
docker compose down              # Stop containers
docker compose logs -f backend   # View logs
```

### Desktop Agent
```bash
cd desktop
python -m sync_agent.agent --once  # Run one sync cycle
python -m sync_agent.agent         # Start continuous sync
build.bat                          # Build .exe
```

---

**End of Document**

This comprehensive guide covers the entire project. Use it to explain the project to ChatGPT for deployment guidance.
