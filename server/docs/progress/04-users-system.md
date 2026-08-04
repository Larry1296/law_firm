# 👤 USER SYSTEM

## Model Type

Custom Django User (UUID primary key)

---

## Fields

- email (unique)
- first_name
- last_name
- national_id_number
- phone_number
- role

---

## Profile System

- One-to-One Profile model
- Stores non-auth data (bio, address, photo)

---

## Roles

- ADMIN
- STAFF
- CLIENT
- PROSPECT

---

## User Manager

- create_user
- create_superuser
- role enforcement fixed

---

## Key Rule

User = identity layer only  
No business logic in User model
