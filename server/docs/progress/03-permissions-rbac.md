# 🛡 RBAC (PERMISSIONS SYSTEM)

## Architecture

Centralized permission system using:

- PermissionService
- DRF BasePermission classes

---

## Roles

### System Roles

- ADMIN
- STAFF
- CLIENT
- PROSPECT

---

## Implemented Permissions

- IsAdmin
- IsStaff
- IsClient
- IsProspect

---

## Design Decision

- LAWYER and SECRETARY removed from system roles
- They will be implemented in domain apps:
  - lawyers app
  - secretaries app

---

## Permission Flow

User → Role → PermissionService → DRF Permission
