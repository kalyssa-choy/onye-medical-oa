# OnyeOA - Clinical Data Reconciliation Engine (Mini Version)

Full-stack take-home project for the **Full Stack Developer - EHR Integration Intern** assessment.

This app reconciles conflicting medication records and validates clinical data quality using an AI-integrated backend with a clinician-friendly frontend dashboard.

## Features

- **Medication Reconciliation** (`POST /api/reconcile/medication`)
  - Accepts conflicting medication sources plus patient context
  - Returns:
    - `reconciled_medication`
    - `confidence_score`
    - `reasoning`
    - `recommended_actions`
    - `clinical_safety_check`
- **Data Quality Validation** (`POST /api/validate/data-quality`)
  - Accepts demographics, meds, allergies, conditions, vitals, and recency
  - Returns:
    - `overall_score` (0-100)
    - score breakdown (`completeness`, `accuracy`, `timeliness`, `clinical_plausibility`)
    - `issues_detected`
- **Frontend Dashboard**
  - Tabbed UI for Reconciliation and Validation workflows
  - Clear score display, issue severity badges, and clinician-friendly result cards
  - Approve/Reject feedback state for reconciliation output

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express
- **AI SDK:** OpenAI Node SDK
- **Styling:** CSS Modules

## LLM API Used and Why

- **LLM API used:** OpenAI Responses API (`gpt-4.1-mini`) via the official Node SDK.
- **Why this choice:**
  - Reliable JSON generation when prompted with strict schema requirements.
  - Fast enough for interactive dashboard workflows.
  - Simple SDK integration and clear error semantics for fallback handling.
- **Cost/availability note:** For this OA, I added a mock-mode fallback (`USE_MOCK_OPENAI=true`) so the app is fully demoable even without paid API quota.

## Project Structure

```text
OnyeOA/
  backend/
    routes/
      reconcile.js
      validate.js
    server.js
  frontend/
    src/
      components/
        DataReconcileCard.tsx
        DataValidationCard.tsx
      main.tsx
```

## API Modes (Real AI vs Mock)

This project supports two runtime modes:

### 1) Real AI mode

- Uses OpenAI API for reconciliation and validation generation.
- Set:
  - `USE_MOCK_OPENAI=false`
  - valid `OPENAI_API_KEY`

### 2) Mock mode (cost-free demo mode)

- Uses deterministic fallback logic (no paid API calls for main OA endpoints).
- Set:
  - `USE_MOCK_OPENAI=true`
- In mock mode:
  - `/api/reconcile/medication` and `/api/validate/data-quality` return deterministic pseudo-analysis
  - `/api/chat` is intentionally unavailable and returns `503`

## Setup and Run Locally

### Prerequisites

- Node.js 18+
- npm

### 1) Clone and install dependencies

```bash
# backend deps
cd backend
npm install

# frontend deps
cd ../frontend
npm install
```

### 2) Configure backend environment

Create `backend/.env`:

```env
PORT=3001
USE_MOCK_OPENAI=true
OPENAI_API_KEY=your_key_if_using_real_ai
```

Notes:
- For no-cost OA demo, keep `USE_MOCK_OPENAI=true`.
- For real LLM calls, set `USE_MOCK_OPENAI=false` and provide a valid key.

### 3) Run backend

```bash
cd backend
npm run dev
```

### 4) Run frontend

```bash
cd frontend
npm run dev
```

Frontend runs on Vite dev server and proxies `/api` to `http://localhost:3001`.

## Key Endpoints

### `POST /api/reconcile/medication`

Input shape:

```json
{
  "patient_context": {
    "age": 67,
    "conditions": ["Type 2 Diabetes", "Hypertension"],
    "recent_labs": { "eGFR": 45 }
  },
  "sources": [
    {
      "system": "Hospital EHR",
      "medication": "Metformin 1000mg twice daily",
      "last_updated": "2024-10-15",
      "source_reliability": "high"
    }
  ]
}
```

### `POST /api/validate/data-quality`

Input shape:

```json
{
  "demographics": { "name": "John Doe", "dob": "1955-03-15", "gender": "M" },
  "medications": ["Metformin 500mg", "Lisinopril 10mg"],
  "allergies": [],
  "conditions": ["Type 2 Diabetes"],
  "vital_signs": { "blood_pressure": "120/80", "heart_rate": 72 },
  "last_updated": "2024-06-15"
}
```

## Prompt Engineering Approach

- Designed explicit JSON-only prompts for both reconciliation and validation endpoints.
- Included context-rich instructions:
  - source recency and reliability
  - patient conditions/labs relevance
  - explicit format constraints and score bounds
- Added strict response parsing + schema checks so malformed model output is safely handled.

## Error Handling Decisions

- Backend validates input shape and returns clear `400` errors for invalid payloads.
- LLM response parsing failures return `500` with structured error messages.
- Mock mode provides deterministic fallback responses to keep UI and API flows functional without paid quota.

## Architecture Decisions and Trade-offs

- **Decision:** Keep backend stateless and simple (no DB) for rapid OA delivery.
  - **Trade-off:** No persistence/history of reconciliations.
- **Decision:** Add mock AI mode controlled by env var.
  - **Trade-off:** Mock results are deterministic heuristics, not true model reasoning.
- **Decision:** Use CSS Modules + card/tab UX for clear clinical readability.
  - **Trade-off:** Limited design system abstraction for now.

## Testing

Current state:
- Manual validation completed for both endpoint workflows through UI and API calls.

Planned next step:
- Add at least 5 automated unit tests for:
  1. reconcile input validation
  2. validate input validation
  3. mock mode empty-input behavior (`0/100`)
  4. model JSON parsing safeguards
  5. score/severity mapping helpers on frontend

## What I Would Improve With More Time

- Add full automated unit/integration tests
- Add response caching for repeated payloads
- Add authentication and per-user audit trail
- Add confidence calibration and richer clinical rule checks
- Add deployment + CI pipeline

## Estimated Time Spent

Approximately **16 hours** total.

## Submission Notes

- This repository includes a complete full-stack implementation for the required endpoints and dashboard.
- For evaluators, switching to real AI mode only requires:
  - setting `USE_MOCK_OPENAI=false`
  - providing a valid `OPENAI_API_KEY`
