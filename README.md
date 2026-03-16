# OnyeOA - Clinical Data Reconciliation Engine

Take-home implementation for the **Full Stack Developer - EHR Integration Intern** assessment.

## Overview

This app provides:

- `POST /api/reconcile/medication` for medication reconciliation
- `POST /api/validate/data-quality` for data quality scoring
- A React dashboard with separate Reconciliation and Validation tabs

## Architecture

The project is structured as a simple full-stack application:

frontend/
- React dashboard for reconciliation and validation workflows

backend/
- Express API server
- Business logic utilities for reconciliation and validation
- Middleware for authentication
- In-memory caching layer

examples/
- Sample request payloads for testing API endpoints

The frontend communicates with the backend via REST endpoints under `/api/*`.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express
- **LLM API:** OpenAI Responses API (`gpt-4.1-mini`)

## How To Run Locally

### Prerequisites

- Node.js 18+
- npm

### 1) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Configure environment

Create `backend/.env`:

```env
PORT=3001
USE_MOCK_OPENAI=true
OPENAI_API_KEY=your_openai_key_if_using_real_ai
APP_API_KEY=onye-dev-key
```

Create `frontend/.env`:

```env
VITE_APP_API_KEY=onye-dev-key
```

Notes:

- `USE_MOCK_OPENAI=true`: cost-free deterministic fallback for the main OA endpoints.
- `USE_MOCK_OPENAI=false` + valid `OPENAI_API_KEY`: real LLM responses.

### 3) Start backend

```bash
cd backend
npm run dev
```

### 4) Start frontend

```bash
cd frontend
npm run dev
```

Frontend proxies `/api` requests to `http://localhost:3001`.

## Test Data / Examples

Sample payloads are included in `examples/`:

- `examples/reconcile-request.json`
- `examples/validate-request.json`
- `examples/validate-empty-request.json`

Run example requests (from repo root):

```bash
curl -X POST http://localhost:3001/api/reconcile/medication \
  -H "Content-Type: application/json" \
  -H "x-api-key: onye-dev-key" \
  --data @examples/reconcile-request.json
```

```bash
curl -X POST http://localhost:3001/api/validate/data-quality \
  -H "Content-Type: application/json" \
  -H "x-api-key: onye-dev-key" \
  --data @examples/validate-request.json
```

## Which LLM API I Used and Why

- **API used:** OpenAI Responses API (`gpt-4.1-mini`) via official OpenAI Node SDK.
- **Why:**
  - Reliable structured JSON output for strict response schemas
  - Fast enough for interactive dashboard workflows
  - Clear SDK ergonomics for error handling and fallback integration

## Development Approach

- Implemented the backend first to define core reconciliation and validation logic.
- Built the React frontend after the API layer was stable.
- Integrated the frontend with backend endpoints and tested end-to-end flows.
- Used LLM-generated test cases to explore edge cases and debug system behavior.
- Implemented a mock AI response mode to allow deterministic testing without relying on external API calls.

## Requirements Coverage

- **Clean, modular code architecture**
  - Core logic extracted into reusable modules:
    - `backend/utils/reconcileUtils.js`
    - `backend/utils/validateUtils.js`
    - `backend/utils/cacheStore.js`
    - `backend/middleware/apiKeyAuth.js`
- **Input validation and error handling**
  - Request shape validation with clear `400` errors
  - Robust `500` handling for parse/model failures
  - Explicit `429` handling for LLM rate-limit errors
- **At least 5 unit tests covering core logic**
  - Implemented with Node test runner in `backend/tests/core.test.js`
  - Current suite: **7 passing tests**
  - Run tests with:
    ```bash
    cd backend
    npm test
    ```
- **Basic authentication/API key protection**
  - `x-api-key` middleware applied to `/api/*`
  - Backend key via `APP_API_KEY`
  - Frontend key via `VITE_APP_API_KEY`
- **README with setup instructions and design decisions**
  - Included in this file

## Key Design Decisions and Trade-offs

- **Stateless backend (no DB)** to deliver quickly
  - Trade-off: no persistence/history
- **Mock-mode fallback (`USE_MOCK_OPENAI`)** for no-cost OA demo
  - Trade-off: deterministic pseudo-analysis vs full model reasoning
- **In-memory response cache (5 min TTL)** to reduce repeated LLM calls
  - Trade-off: cache resets on server restart

## What I Would Improve With More Time

- Add route-level integration tests (supertest)
- Add persistent caching/storage (Redis/Postgres)
- Add richer clinical consistency checks and confidence calibration
- Add auth scopes and audit trail per request
- Add CI + deployment pipeline

## Estimated Time Spent

Approximately **16 hours**.
