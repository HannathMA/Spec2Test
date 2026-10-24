# Spec2Test AI

> **“Real requirements. Executable tests. Verified software.”**

Spec2Test AI is an AI-assisted requirements engineering and software verification workbench that converts natural-language software specifications into reviewed acceptance criteria, executable automated tests, real execution results, and verifiable, evidence-backed traceability.

---

## 1. Product Workflow

```
Requirements ──▶ Analysis ──▶ Refinement ──▶ Test Generation ──▶ Execution ──▶ Verification ──▶ Traceability ──▶ Change Impact
```

Spec2Test AI addresses fundamental software engineering questions:
1. **What is the software supposed to do?** Ingest requirements from pasted text or documents (`.pdf`, `.docx`, `.txt`, `.md`).
2. **Are requirements clear, complete, and testable?** Identify ambiguities, missing thresholds, unspecified error handling, and logical conflicts.
3. **What test cases verify each requirement?** Generate structured test cases spanning **Positive**, **Negative**, **Boundary**, **Edge Case**, **Performance**, and **Security**.
4. **Did those tests actually execute?** Run actual pytest test modules against a target API in an isolated subprocess sandbox.
5. **What passed, failed, or broke?** Capture stdout, stderr, execution duration, and assertion failures with full stack traces.
6. **What evidence supports each result?** Maintain permanent evidence records linked to test results.
7. **Which tests need updating when a requirement changes?** Detect parameter diffs, calculate change impact, flag stale tests and evidence, and regenerate tests.

---

## 2. Design System

Designed strictly following **Minimalist brutalism × Swiss editorial design × precision developer tooling**:

- **Color Palette**:
  - `Ink`: `#171717` (primary sidebar and high-contrast typography)
  - `Paper`: `#F5F4EF` (workspace background)
  - `Cobalt`: `#365CFF` (primary accents and interactive elements)
  - `Signal Lime`: `#C8F169` (distinctive highlight accents)
  - `Muted Gray`: `#777777` (metadata and technical tags)
  - `Border Gray`: `#D7D6D0` (crisp, fine hairline borders)
  - `Success Green`: `#16845B` (passing status and verified states)
  - `Error Red`: `#D93D3D` (failing assertions and critical findings)
- **Typography**: Inter (modern grotesque for headings and editorial copy), JetBrains Mono (test IDs, code modules, stack traces, and latency benchmarks).
- **Geometry**: Sharp rectangular buttons, fine visible borders, dense data tables, absence of generic SaaS glowing blobs or purple gradients.

---

## 3. Architecture & Tech Stack

```
spec2test/
├── frontend/                     # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/layout/    # AppShell (near-black sidebar, breadcrumb, status)
│   │   ├── components/common/    # Spec2TestLogo, StatusBadge, MetricCard
│   │   ├── features/
│   │   │   ├── overview/         # Page A: Metrics, Donut chart, Activity feed
│   │   │   ├── requirements/     # Page B: Ingestion, Analysis, Refinement
│   │   │   ├── test-lab/         # Page C: Test management & Pytest generator
│   │   │   ├── execution/        # Page D: Subprocess runner & Live Terminal
│   │   │   ├── traceability/     # Page E: Verification matrix & CSV/HTML reports
│   │   │   ├── change-impact/    # Page F: Diff comparison & stale invalidation
│   │   │   └── settings/         # Page G: Target connection test & AI config
│   │   ├── lib/                  # API client & utilities
│   │   └── types/                # Strict TypeScript entity definitions
├── backend/                      # Python 3.11+ / FastAPI / SQLAlchemy / SQLite
│   ├── app/
│   │   ├── api/v1/               # Versioned REST API endpoints
│   │   ├── core/                 # App settings, environment, and security
│   │   ├── db/                   # Database session and declarative Base
│   │   ├── models/               # Relational models (Requirements, Tests, Runs, Evidence)
│   │   ├── schemas/              # Pydantic request/response validation schemas
│   │   ├── services/
│   │   │   ├── ai/               # Analyzer, Generator, Pytest CodeGen, Impact
│   │   │   ├── requirements/     # Document parser (pypdf, python-docx, markdown)
│   │   │   ├── execution/        # Controlled subprocess runner & safety layer
│   │   │   └── traceability/     # Strict verification rules & report exports
│   │   ├── demo/                 # "Commerce API Verification" seed data & sample API
│   │   └── main.py               # FastAPI application entry point
│   └── tests/                    # Automated pytest backend test suite
├── .env.example
├── README.md
└── package.json                  # Root development orchestration
```

---

## 4. Quickstart Guide

### Prerequisites
- **Node.js** (v18+) and **npm**
- **Python** (3.11+) and **pip**

### Step 1: Install Dependencies
```bash
# Install root orchestration packages
npm install

# Install frontend packages
npm install --prefix frontend

# Ensure required Python packages are installed (if not already global)
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings httpx pytest pypdf python-docx
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*Note: Spec2Test runs in **Local Deterministic Mode** by default—no paid OpenAI API key is needed to demonstrate the full end-to-end workflow.*

### Step 3: Run the Application
Start both the FastAPI backend (`http://127.0.0.1:8000`) and Vite frontend (`http://localhost:5173`) with a single command:
```bash
npm run dev
```

Open your browser to: **`http://localhost:5173`**

---

## 5. Automated Tests & Production Build

### Run Backend Test Suite
The backend contains automated tests verifying requirement versioning, ambiguity detection, test generation, subprocess safety, traceability matrix calculations, and stale evidence invalidation:
```bash
npm run test:backend
# or
pytest backend/tests/test_backend.py -v
```

### Build Frontend for Production
```bash
npm run build
```

---

## 6. Verification Rules & Traceability Policy

Spec2Test AI implements a strict, conservative verification policy:
- **Verified**: A requirement is marked `Verified` **only** when its approved acceptance criteria have adequate linked tests and **all** linked tests have valid, passing execution evidence from the current version.
- **Failed**: A requirement is marked `Failed` whenever execution evidence demonstrates a requirement violation or assertion failure.
- **Unverified**: A requirement remains `Unverified` if:
  - It lacks linked test cases.
  - Tests have not yet been executed.
  - Execution produced an unhandled error or timeout.
  - Required criteria lack test coverage.
  - Linked tests are flagged as `Stale` due to an approved requirement change.

---

## 7. Execution Safety Architecture

The execution runner isolates test runs using the following safeguards:
- **No `shell=True`**: All subprocess commands are executed directly via `sys.executable -m pytest` with structured arguments.
- **Temporary Working Directories**: Each test run executes inside an isolated temporary directory cleaned up immediately after completion.
- **Environment Cleansing**: Sensitive server credentials (AI API keys, database URLs) are stripped from the test process environment.
- **SSRF Target Validation**: Target URLs must use `http` or `https` and are strictly barred from querying private cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`).
- **Resource Timeouts**: Test runs enforce a strict 45-second execution timeout.
- *Production Note*: For multi-tenant production deployments with untrusted user code, we recommend running test executions inside ephemeral Docker containers or gVisor sandboxes.
