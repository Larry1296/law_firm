# 🔐 AUTHENTICATION SYSTEM (UPDATED)

## Overview

The system uses a custom authentication architecture built on top of Django + SimpleJWT.

It supports:

- Role-based authentication (system roles + firm roles)
- Law firm membership separation
- Staff onboarding with temporary passwords
- Forced password change on first login
- JWT-based stateless authentication

---

## 🧱 USER MODEL

- Custom User model (UUID primary key)
- Email-based authentication
- Password managed via Django auth system
- No firm data stored directly on User

### User Roles

```python
class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "Admin"
    STAFF = "STAFF", "Staff"
    OFFICIAL_CLIENT = "OFFICIAL_CLIENT", "Official Client"
    PROSPECT = "PROSPECT", "Prospect"
```
