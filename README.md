# law_firm
Django&amp;Rect-lawfirm System

[![CI](https://github.com/Larry1296/law_firm/actions/workflows/test.yml/badge.svg)](https://github.com/Larry1296/law_firm/actions/workflows/test.yml)

## Runtime requirements

- Python 3.12 or newer (Python 3.13 is the documented development version)
- Node.js 22
- PostgreSQL 17 for development, production, and concurrency-sensitive tests

Copy `.env.example` to `.env` and replace the placeholder secrets before running
the server. Fast local backend tests default to SQLite:

```bash
cd server
python test_all.py
```

Run the authoritative PostgreSQL suite with `TEST_DATABASE_BACKEND=postgresql`
and the `TEST_DB_*` variables documented in `.env.example`. CI uses PostgreSQL.
# 🏛 Law Firm Management System (Backend)

A modular, API-first **Law Firm Management System** built with **Django REST Framework** following a strict service-layer architecture.

## Public Kenyan Legal Information Assistant

The homepage assistant retrieves only active, published records maintained in Django Admin under **AI and Knowledge Base**. It then supplies a bounded set of passages to the configured OpenAI model and returns the answer with source metadata. If retrieval does not meet the relevance threshold, it returns an explicit no-verified-information response without calling the model.

Seed content is intentionally limited to selected official Kenya Law materials and the services already shown on the public homepage. Administrators must review seed articles, keep verification dates current, and add verified firm address, contact, hours, consultation, and staff information before the assistant can answer those questions. Unpublish any sample that is unsuitable for production.

Canonical firm records are projected into retrieval through the **Public firm knowledge policy** in Django Admin. The projection automatically follows approved changes to the firm description, active practice areas, selected public contact/location/hours, and optionally branches. Registration/KRA identifiers, owners, user accounts, security and portal settings are never projected. Staff creation is private by default; an advocate appears only after a separate **Public advocate profile** is explicitly approved and published.

Server configuration (never expose these values through Vite/browser variables):

```env
OPENAI_API_KEY=
OPENAI_MODEL=
KNOWLEDGE_BASE_MAX_CONTEXT_ITEMS=4
KNOWLEDGE_BASE_MIN_RELEVANCE=0.15
KNOWLEDGE_BASE_REQUEST_TIMEOUT=20
KNOWLEDGE_BASE_RATE_LIMIT=10/hour
```

`OPENAI_MODEL` is deliberately required rather than defaulting to a model name. With no key/model or an unavailable provider, the API returns a safe fallback and still exposes any retrieved source cards. The public endpoints are `GET /api/knowledge-base/` for active categories/suggestions and `POST /api/knowledge-base/ask/` for questions.

### Constitution ingestion

Install the server requirements and import the bundled official source into structured Preamble, Article, clause, Chapter, Part, and Schedule records:

```bash
cd server
venv/bin/pip install -r requirements.txt
venv/bin/python manage.py migrate
venv/bin/python manage.py import_kenyan_constitution
# Optional scheduled retention cleanup:
venv/bin/python manage.py purge_ai_assessments
```

The importer is checksum-based and idempotent. It rejects `:Zone.Identifier`, incomplete extraction, and imports with fewer than 200 credible Articles. Re-running updates changed units, leaves unchanged units intact, and unpublishes units no longer present in the source.

### Lawyer AI Case Analysis

Lawyers with `USE_AI_TOOLS` can use `/lawyer/ai` and `/lawyer/cases/:id/ai-analysis`. The API is under `/api/staff/lawyer/ai/cases/` and uses the existing assigned-matter queryset for firm and matter isolation.

Priority uses separately displayed time urgency, consequence severity, procedural risk, evidence readiness, and legal preparedness. The overall Critical/High/Medium/Low classification is an explainable risk index, not a probability of winning. Judgment dates affect urgency only. Explicit refresh creates an immutable version; material case, proceeding, filing, task, or document changes mark prior assessments stale without making an automatic provider request.

Selected text/PDF matter documents receive local extraction, quality, date/amount, page-citation, and missing-signature/annexure checks. The system never treats storage or extraction as proof of authenticity. External case research is disabled by default; only local published sources are cited. Kenya Law URL allowlisting and local citation existence checks are implemented, but there is no unattended web crawler or unrestricted model browsing.

Additional configuration:

```env
AI_EXTERNAL_RESEARCH_ENABLED=False
AI_CASE_ASSESSMENT_RETENTION_DAYS=365
AI_AUTOMATIC_REASSESSMENT_ENABLED=False
AI_KNOWLEDGE_INDEX_MODE=database
```

### Controlled continuous learning

Approved articles and imported legal provisions are indexed idempotently when they change. Drafts and withdrawn sources receive a withdrawn index state and never enter public retrieval. Django Admin exposes index status and a full re-index action. Public questions are privacy-minimized service logs only and are never promoted to legal knowledge.

Matter and proceeding changes mark assessments stale. Refreshing creates an immutable version carrying model, prompt, retrieval, scoring, priority, and knowledge-index versions plus a change summary. Paid automatic reassessment is disabled by default. Lawyer finding feedback starts pending; only administrators may approve it for evaluation, knowledge correction, or a future training candidate. Future-training manifests contain provenance only, not client content or documents.

Structured completed-matter outcomes must be verified before use in anonymized, same-firm comparisons. Configuration versions cannot be activated until evaluation thresholds pass and an administrator approves them; an older evaluated version can be activated for rollback. The schema records evaluation metrics and dataset/configuration versions. A production evaluation runner, scheduled job queue, approved Kenya Law ingestion connector, cost telemetry, and any separately authorized de-identification/export pipeline remain deployment integrations. This project performs no fine-tuning.

The system is designed for scalability, maintainability, and clear separation of concerns across legal operations, users, cases, billing, and future AI-driven insights.

---

## 🚀 Tech Stack

### Backend
- Django 5+
- Django REST Framework
- SimpleJWT (Authentication)
- PostgreSQL
- Python Decouple (Environment management)

### Architecture
- Service Layer Architecture
- Modular Django apps
- Role-Based Access Control (RBAC)
- Clean separation of concerns:
  - Views → Request handling only
  - Services → Business logic
  - Serializers → Validation & transformation
  - Models → Database layer

---

## 🧱 System Architecture

### Core System
- users (custom authentication system)
- authentication (JWT-based login/logout)
- permissions (RBAC system)
- common utilities

### Legal Business Layer
- clients
- lawyers (planned)
- secretaries (planned)
- cases (planned)
- tasks (planned)
- scheduling (planned)
- communications (planned)
- documents (planned)
- hearings (planned)

### Supporting Layers
- billing (planned)
- reports (planned)
- audit_logs (planned)
- AI integration (planned)
- portal (planned)

---

## 👤 User Roles (RBAC)

The system uses a centralized role system:

- ADMIN → System administration
- STAFF → Internal firm users (lawyers, secretaries, etc.)
- CLIENT → Official legal clients
- PROSPECT → External portal users (pre-client stage)

> Note: Lawyer and Secretary are domain-level concepts under STAFF, not system roles.

---

## 🔐 Authentication System

- Email-based authentication
- JWT Access & Refresh tokens
- Token blacklist support (secure logout)
- Login / Logout API endpoints

---

## 🛡 Permissions System

Centralized RBAC system using:

- PermissionService (business logic layer)
- DRF BasePermission classes:
  - IsAdmin
  - IsStaff
  - IsClient
  - IsProspect

---

## ⚖️ Business Rules

- A Case must always belong to a Client
- A Client is a legal entity, not just a login user
- Not all Users are Clients
- Portal users can be upgraded to Clients
- Internal users are managed via STAFF role

---

## 🔄 System Flow
# Matter lifecycle and compliance

The controlled Kenyan law-firm lifecycle, opening rules, financial controls, permission matrix, legacy procedure, API summary and administrator configuration are documented in [docs/MATTER_LIFECYCLE.md](docs/MATTER_LIFECYCLE.md).
