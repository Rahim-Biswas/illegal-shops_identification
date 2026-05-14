# GeoAI Complaint System — Full Application Audit

## 1. API Authorization Matrix

Every endpoint has been reviewed. The table below shows the authorization guard applied.

| Route | Method | Guard | ✅ / ⚠️ |
|-------|--------|-------|---------|
| `/api/auth/register` | POST | Public (intentional) | ✅ |
| `/api/auth/login` | POST | Public (intentional) | ✅ |
| `/api/auth/me` | GET | `get_current_user` | ✅ |
| `/api/users/me` | GET | `get_current_user` | ✅ |
| `/api/users/me` | PUT | `get_current_user` | ✅ |
| `/api/users` | GET | `get_current_admin_user` | ✅ |
| `/api/users/create-admin` | POST | `get_current_admin_user` | ✅ |
| `/api/users/{id}` | GET | `get_current_user` + owner/admin check | ✅ |
| `/api/users/{id}` | DELETE | `get_current_admin_user` | ✅ |
| `/api/users/{id}/toggle-active` | PATCH | `get_current_admin_user` | ✅ |
| `/api/users/{id}/deactivate` | PATCH | `get_current_admin_user` | ✅ |
| `/api/complaints` | POST | `get_current_user` | ✅ |
| `/api/complaints` | GET | `get_current_user` + role filter | ✅ |
| `/api/complaints/map-data` | GET | `get_current_user` | ✅ |
| `/api/complaints/admin/statistics` | GET | `get_current_admin_user` | ✅ |
| `/api/complaints/admin/map-data` | GET | `get_current_admin_user` | ✅ |
| `/api/complaints/admin/download-logs` | GET | `get_current_admin_user` | ✅ |
| `/api/complaints/{id}` | GET | `get_current_user` + owner/admin check | ✅ |
| `/api/complaints/{id}` | PUT | `get_current_user` + owner/admin check | ✅ |
| `/api/complaints/{id}` | DELETE | `get_current_admin_user` | ✅ |
| `/api/complaints/{id}/comments` | POST | `get_current_user` | ✅ |
| `/api/complaints/{id}/comments` | GET | `get_current_user` + owner/admin check | ✅ |
| `/api/complaints/download-log` | POST | `get_current_user` | ✅ |
| `/api/kobo/submissions` | GET | `get_current_admin_user` | ✅ |
| `/api/kobo/submissions/{id}` | GET | `get_current_admin_user` | ✅ |
| `/api/kobo/sync` | POST | `get_current_admin_user` | ✅ |
| `/api/kobo/forms` | GET | `get_current_admin_user` | ✅ |
| `/health` | GET | Public (intentional) | ✅ |
| `/` | GET | Public (intentional) | ✅ |

> **Result: All 28 endpoints are properly authorized. Zero unprotected data endpoints.**

---

## 2. Security Assessment

### ✅ Strengths
| Area | Status | Detail |
|------|--------|--------|
| **Password Hashing** | ✅ Secure | `pbkdf2_sha256` via passlib — no plaintext storage |
| **JWT Auth** | ✅ Solid | HS256, expiry enforced, `user_id` + `role` encoded in payload |
| **Token Validation** | ✅ Thorough | DB lookup on every request — deactivated users instantly blocked |
| **RBAC** | ✅ Enforced | Two-tier: `get_current_user` + `get_current_admin_user` dependency chain |
| **Object-level Auth** | ✅ Present | `complaint.user_id != current_user.id` checks on GET, PUT, comments |
| **CORS** | ✅ Configured | Allowlist-based via `.env` `ALLOWED_ORIGINS` |
| **Error handling** | ✅ Safe | General exceptions return generic 500 — no stack traces leak to client in prod |
| **Inactive user check** | ✅ Present | `get_current_user` blocks `is_active=False` accounts with 403 |
| **Self-delete guard** | ✅ Present | Admin cannot delete or deactivate their own account |
| **Frontend hydration** | ✅ Fixed | Auth store reads localStorage synchronously — no refresh-redirect bug |

### ⚠️ Items to address before public deployment

| # | Issue | Risk | Fix |
|---|-------|------|-----|
| 1 | `SECRET_KEY = "change-me-in-production"` in `config.py` | 🔴 Critical | Set a 64-char random key in `.env` before deploying |
| 2 | `ADMIN_PASSWORD = "GeoAdmin@2024"` hardcoded in `config.py` | 🔴 Critical | Override via `.env` in production — never commit credentials |
| 3 | `DEBUG = True` default in `config.py` | 🟡 Medium | Set `DEBUG=False` in `.env` in production — disables SQL echo & tracebacks |
| 4 | `/api/auth/register` is fully open | 🟡 Medium | Consider adding email verification, invite-only mode, or CAPTCHA if public-facing |
| 5 | JWT token stored in `localStorage` | 🟡 Medium | Acceptable for desktop admin tools; for public browser use `httpOnly` cookies would be more secure against XSS |
| 6 | Token expiry is 60 min — no refresh token | 🟢 Low | Add a `POST /api/auth/refresh` endpoint for long sessions if needed |
| 7 | No rate limiting on `/login` | 🟡 Medium | Add `slowapi` or a reverse-proxy rate limit to prevent brute-force |
| 8 | OpenAPI `/docs` exposed in production | 🟢 Low | Disable with `docs_url=None` in production `FastAPI()` config |

---

## 3. Production Readiness Checklist

### Backend
| Item | Status |
|------|--------|
| PostgreSQL (not SQLite) | ✅ |
| Connection pooling configured | ✅ `pool_size=10, max_overflow=20, pool_recycle=3600` |
| Multi-worker support (`--prod` flag) | ✅ |
| Environment-variable config via `.env` | ✅ |
| `init_db()` creates tables on startup | ✅ |
| Graceful error handling (no crashes) | ✅ |
| Migrations (Alembic) | ❌ Not set up — currently uses `create_all` (safe for initial deploy, risky for schema changes later) |
| Logging to file/service | ❌ Only stdout — add structured logging (`logging` module or `loguru`) |
| Background tasks / async jobs | ❌ KoboToolbox sync is manual — no scheduler |

### Frontend
| Item | Status |
|------|--------|
| Role-based routing (ProtectedRoute / AdminRoute) | ✅ |
| Refresh-redirect bug fixed | ✅ |
| Export (CSV + Excel) working | ✅ |
| Map accessible to all users | ✅ |
| Download audit log → PostgreSQL | ✅ |
| Login tab UX (User / Admin) | ✅ |
| Logo & branding applied | ✅ |
| `.env` API base URL | ✅ via Vite `VITE_API_URL` |
| Production build tested | ❌ Run `npm run build` and verify before deploying |
| Error boundary components | ❌ No React Error Boundary — uncaught errors will blank the page |

---

## 4. Future Upgradability Assessment

The architecture is **well-structured for future growth**:

### ✅ What makes it upgradable

```
backend/
  src/
    routes/         ← Add new route files here, register in main.py
    models.py       ← Add new DB models — init_db() auto-creates tables
    schemas.py      ← Add Pydantic schemas alongside models
    security.py     ← Auth logic is centralised, easy to extend
    config.py       ← All settings driven by .env — no code changes for new env
```

```
frontend/
  src/
    pages/          ← Add new pages, register route in App.jsx
    services/api.jsx ← Single file for all API calls — easy to audit/extend
    store/store.jsx  ← Zustand stores are composable — add new slices here
    components/     ← Layout, shared components — reusable
```

### Planned upgrade paths that are straightforward to add

| Feature | Effort | Notes |
|---------|--------|-------|
| **Alembic DB migrations** | Low | `alembic init`, one `env.py` edit — preserves existing data |
| **KoboToolbox auto-sync (cron)** | Low | Add `apscheduler` to `main.py` — 5 lines |
| **Email notifications** | Low | SMTP config already in `settings` — just implement the sender |
| **File upload (images)** | Medium | Add `python-multipart` + S3/local storage |
| **Refresh tokens** | Low | Add `refresh_token` column to User + one new endpoint |
| **Multi-language (i18n)** | Medium | `react-i18next` — pages are component-isolated |
| **Push notifications** | Medium | Add WebSocket or Firebase — frontend is React so straightforward |
| **GIS analysis / heatmaps** | Medium | OpenLayers already in use — add layers |
| **Role expansion (Moderator, Viewer)** | Low | `UserRole` enum + new `Depends` guard |
| **API versioning** | Low | Change prefix from `/api/` to `/api/v1/` — one-line change per router |

### ⚠️ Things to fix before scaling

1. **Add Alembic** — `create_all` will not safely handle future schema changes
2. **Add structured logging** — essential for debugging in production
3. **Add rate limiting** — login endpoint is unprotected from brute force
4. **Set secrets via `.env`** — `SECRET_KEY` and `ADMIN_PASSWORD` must be overridden

---

## 5. Immediate Action Items (Priority Order)

```
🔴 CRITICAL (do before any public deployment)
  1. Set SECRET_KEY to a 64-char random string in .env
  2. Set ADMIN_PASSWORD to a strong unique password in .env
  3. Set DEBUG=False in .env

🟡 IMPORTANT (do before going live)
  4. Add rate limiting to /api/auth/login (e.g. 5 req/min)
  5. Set up Alembic for DB migrations
  6. Run npm run build and test the production bundle
  7. Set ALLOWED_ORIGINS to your real domain in .env

🟢 RECOMMENDED (for long-term health)
  8. Add React Error Boundary to App.jsx
  9. Add structured logging (loguru or Python logging)
  10. Add /api/auth/refresh token endpoint
  11. Disable /docs in production (docs_url=None in FastAPI config)
```
