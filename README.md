# law_firm
Django&amp;Rect-lawfirm System

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
