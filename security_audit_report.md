# 🔒 Security Audit Report — BHU Email Portal

**Date:** 2026-06-14  
**Scope:** Full codebase — Backend (NestJS) + Frontend (Next.js) + Infrastructure (Docker)  
**Standards:** OWASP Top 10 (2021), CWE/SANS Top 25, NIST SP 800-63B (Authentication)

---

## Executive Summary

The project has a **solid security foundation** — Helmet, CORS, rate limiting, Argon2 hashing, RBAC, and DTO validation are all in place. However, **12 vulnerabilities** were identified ranging from **Critical** to **Low** severity. Several relate to common patterns that are safe during development but **dangerous in production**.

| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟠 High | 4 |
| 🟡 Medium | 4 |
| 🔵 Low | 2 |

---

## Finding #1 — Hardcoded Default JWT Secrets (CRITICAL)

> [!CAUTION]
> If `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` env vars are unset, the app silently runs with publicly-known default secrets, allowing **any attacker to forge valid JWTs**.

**OWASP:** A07:2021 — Identification and Authentication Failures  
**CWE:** CWE-798 (Use of Hard-Coded Credentials)

**Affected Files:**
- [auth.service.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/auth.service.ts#L253) — `'default-access-secret'`
- [auth.service.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/auth.service.ts#L257) — `'default-refresh-secret'`
- [jwt.strategy.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/strategies/jwt.strategy.ts#L20) — `'default-access-secret'`
- [auth.module.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/auth.module.ts#L24) — `'default-access-secret'`

**Impact:** An attacker can craft a JWT with `role: "CC_ADMIN"`, sign it with `'default-access-secret'`, and gain full admin access.

**Recommended Fix:**
```diff
- secret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
+ secret: process.env.JWT_ACCESS_SECRET ?? (() => { throw new Error('JWT_ACCESS_SECRET is not set'); })(),
```
Alternatively, validate at bootstrap in `main.ts`:
```typescript
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('FATAL: JWT secrets must be configured. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.');
}
```

---

## Finding #2 — XSS via `innerHTML` in PDF Generator (CRITICAL)

> [!CAUTION]
> User-supplied data (name, designation, department, email choices, etc.) is interpolated directly into an HTML string assigned to `innerHTML` without any sanitization.

**OWASP:** A03:2021 — Injection  
**CWE:** CWE-79 (Cross-Site Scripting)

**Affected File:** [pdfGenerator.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/frontend/src/lib/pdfGenerator.ts#L131)

**Attack Example:**
If a user enters `<img src=x onerror=alert(document.cookie)>` as their name during application submission, this script executes when `container.innerHTML = html` runs.

**Recommended Fix:**
Add an HTML escaping utility and use it on all interpolated values:
```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Use it on every interpolated field:
const applicantName = escapeHtml(details.name || ...);
const designation = escapeHtml(details.designation || "");
// ... etc for ALL user-sourced values
```

---

## Finding #3 — JWT/Refresh Tokens Stored in localStorage (HIGH)

> [!WARNING]
> Access and refresh tokens are stored in `localStorage`, which is accessible to **any JavaScript running on the page** — including XSS payloads (see Finding #2).

**OWASP:** A07:2021 — Identification and Authentication Failures  
**CWE:** CWE-922 (Insecure Storage of Sensitive Information)

**Affected Files:**
- [store.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/frontend/src/lib/store.ts#L37-L39) — `localStorage.setItem("accessToken", ...)`
- [axios.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/frontend/src/lib/axios.ts#L24) — `localStorage.getItem("accessToken")`

**Impact:** Combined with XSS (Finding #2), an attacker steals both access and refresh tokens, gaining persistent account takeover.

**Recommended Fix:**
- Store **refresh tokens** in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie set by the backend.
- Keep only the short-lived access token in memory (Zustand state, not localStorage).
- Implement a `/auth/refresh` cookie-based flow on the backend.

---

## Finding #4 — IDOR on Application Details Endpoint (HIGH)

> [!WARNING]
> `GET /api/v1/applications/:id` returns full application details (name, DOB, mobile, email, department) to **any authenticated user** regardless of ownership.

**OWASP:** A01:2021 — Broken Access Control  
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

**Affected File:** [applications.controller.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/applications/applications.controller.ts#L175-L179)

```typescript
// Any authenticated user can fetch any application by ID
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.applicationsService.findById(id);
}
```

**Impact:** Any logged-in APPLICANT can view another applicant's personal details by guessing/enumerating UUIDs.

**Recommended Fix:**
```typescript
@Get(':id')
async findOne(
  @Param('id') id: string,
  @Req() req: Request & { user: { userId: string; role: string; departmentId?: string } }
) {
  const app = await this.applicationsService.findById(id);
  const user = req.user;
  
  // Applicants can only see their own applications
  if (user.role === 'APPLICANT' && app.applicantId !== user.userId) {
    throw new ForbiddenException('You can only view your own applications');
  }
  // HODs can only see applications from their department
  if (user.role === 'HOD' && app.departmentId !== user.departmentId) {
    throw new ForbiddenException('You can only view applications from your department');
  }
  // CC_ADMIN can view all
  return app;
}
```

---

## Finding #5 — IDOR on User Details Endpoint (HIGH)

> [!WARNING]
> `GET /api/v1/users/:id` allows any authenticated user to fetch any other user's profile.

**OWASP:** A01:2021 — Broken Access Control  
**CWE:** CWE-639

**Affected File:** [users.controller.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/users/users.controller.ts#L51-L57)

**Recommended Fix:** Restrict so users can only fetch their own profile, or restrict to CC_ADMIN:
```typescript
@Get(':id')
@UseGuards(JwtAuthGuard)
async findOne(
  @Param('id') id: string,
  @Req() req: Request & { user: { userId: string; role: string } }
) {
  if (req.user.role !== 'CC_ADMIN' && req.user.userId !== id) {
    throw new ForbiddenException('You can only view your own profile');
  }
  return this.usersService.findById(id);
}
```

---

## Finding #6 — Self-Assigned Role Escalation at Registration (HIGH)

> [!WARNING]
> The `CreateUserDto` accepts an optional `role` field. An attacker can register as `CC_ADMIN` or `HOD` by simply sending `"role": "CC_ADMIN"` in the registration payload.

**OWASP:** A01:2021 — Broken Access Control  
**CWE:** CWE-269 (Improper Privilege Management)

**Affected Files:**
- [create-user.dto.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/users/dto/create-user.dto.ts#L38-L41) — `@IsOptional() role?: Role`
- [users.service.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/users/users.service.ts#L73) — `role: role || 'APPLICANT'`

**Attack:**
```bash
curl -X POST /api/v1/users/register -d '{
  "alternateEmail": "attacker@evil.com",
  "password": "password123",
  "firstName": "Evil",
  "lastName": "Admin",
  "role": "CC_ADMIN",
  "otp": "123456"
}'
```

**Recommended Fix:**
Remove `role` from the public registration DTO entirely. Create a separate admin-only DTO for role assignment:
```diff
// create-user.dto.ts — Remove role field
- @IsEnum(Role)
- @IsOptional()
- role?: Role;

// users.service.ts — Always default to APPLICANT
- role: role || 'APPLICANT',
+ role: 'APPLICANT', // Role escalation only via admin action
```

---

## Finding #7 — Turnstile CAPTCHA Bypass in Production (MEDIUM)

> [!IMPORTANT]
> If `TURNSTILE_SECRET_KEY` is not set in production, ALL CAPTCHA verification is silently skipped. This is only logged as a warning, not an error.

**OWASP:** A07:2021 — Identification and Authentication Failures  
**CWE:** CWE-804 (Guessable CAPTCHA)

**Affected File:** [turnstile.service.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/turnstile.service.ts#L21-L28)

**Impact:** Without CAPTCHA, bots can automate brute-force login attempts, OTP spam, and bulk registration.

**Recommended Fix:**
```typescript
async verify(token: string | undefined): Promise<void> {
  if (!this.secretKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: TURNSTILE_SECRET_KEY must be configured in production');
    }
    this.logger.warn('[DEV MODE] Turnstile verification skipped');
    return;
  }
  // ... rest of verification
}
```

---

## Finding #8 — File Upload: No Content Validation (Path Traversal + Polyglot Risk) (MEDIUM)

> [!IMPORTANT]
> The file upload only validates MIME type via `file.mimetype`, which is client-supplied and trivially spoofable. No magic bytes/file header validation is performed.

**OWASP:** A04:2021 — Insecure Design  
**CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type)

**Affected File:** [applications.controller.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/applications/applications.controller.ts#L58-L66)

**Additional Risks:**
- The `filename` callback uses `extname(file.originalname)` — if `originalname` is `../../etc/config.jpg`, path traversal may occur depending on OS.
- Uploaded files are stored on disk without content scanning.

**Recommended Fix:**
```typescript
// 1. Validate file extension independently
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const ext = extname(file.originalname).toLowerCase();
if (!ALLOWED_EXTENSIONS.includes(ext)) {
  return cb(new Error('Invalid file extension'), false);
}

// 2. After upload, validate magic bytes
import { fileTypeFromFile } from 'file-type';
const type = await fileTypeFromFile(photo.path);
if (!type || !['image/jpeg', 'image/png'].includes(type.mime)) {
  fs.unlinkSync(photo.path); // Delete malicious file
  throw new BadRequestException('File content does not match a valid image');
}

// 3. Sanitize the filename to prevent path traversal
const safeName = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
```

---

## Finding #9 — Swagger/API Documentation Exposed (MEDIUM)

> [!IMPORTANT]
> Swagger UI is available at `/api/docs` without authentication, exposing every endpoint, DTO schema, parameter, and auth flow to attackers.

**OWASP:** A05:2021 — Security Misconfiguration  
**CWE:** CWE-200 (Exposure of Sensitive Information)

**Affected File:** [main.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/main.ts#L80-L81)

**Recommended Fix:**
```typescript
// Only enable Swagger in non-production environments
if (process.env.NODE_ENV !== 'production') {
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log(`📄 Swagger docs available at http://localhost:${port}/api/docs`);
}
```

---

## Finding #10 — Weak Password Policy (MEDIUM)

> [!NOTE]
> Passwords only require `@MinLength(8)`. There are no requirements for uppercase, lowercase, digits, or special characters. This allows passwords like `"aaaaaaaa"`.

**OWASP:** A07:2021 — Identification and Authentication Failures  
**CWE:** CWE-521 (Weak Password Requirements)  
**NIST:** SP 800-63B recommends checking against breached password lists.

**Affected Files:**
- [login.dto.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/dto/login.dto.ts#L23) — `@MinLength(8)`
- [reset-password.dto.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/dto/reset-password.dto.ts#L18) — `@MinLength(8)`
- [create-user.dto.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/users/dto/create-user.dto.ts#L25) — `@MinLength(8)`

**Recommended Fix:**
```typescript
import { Matches } from 'class-validator';

@IsString()
@MinLength(8)
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
  message: 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
})
password: string;
```

---

## Finding #11 — Docker Default Credentials in Version Control (LOW)

> [!NOTE]
> `docker-compose.yml` contains default database and PgAdmin credentials. While `.env` is gitignored, the compose file itself uses inline defaults that end up in git history.

**CWE:** CWE-798 (Hard-Coded Credentials)

**Affected File:** [docker-compose.yml](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/docker-compose.yml#L10-L12)

```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-bhu_secure_password_2024}
PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD:-admin123}
```

**Recommended Fix:**
- Remove default values from the compose file.
- Require `.env` to be present: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?error: POSTGRES_PASSWORD is required}`
- Ensure `.env.example` uses clearly fake values (already done ✓ but should not have `bhu_secure_password_2024` as it looks "real").

---

## Finding #12 — Information Disclosure in Error Responses (LOW)

> [!NOTE]
> The `AllExceptionsFilter` includes `exception.message` for non-HTTP errors, which may leak internal details (DB connection strings, query errors, Prisma schema info).

**CWE:** CWE-209 (Information Exposure Through Error Messages)

**Affected File:** [all-exceptions.filter.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/core/filters/all-exceptions.filter.ts#L51-L56)

**Recommended Fix:**
```typescript
} else if (exception instanceof Error) {
  // Log full error internally
  this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
  // But return generic message to client
  message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : exception.message; // Only show details in dev
}
```

---

## ✅ What's Already Done Well

| Security Control | Status | File |
|---|---|---|
| Helmet HTTP headers | ✅ Applied | [main.ts:L25](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/main.ts#L25) |
| CORS configured | ✅ Applied | [main.ts:L28](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/main.ts#L28) |
| Global rate limiting | ✅ 10 req/min | [app.module.ts:L29](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/app.module.ts#L29) |
| Endpoint-level rate limiting | ✅ OTP/login | [auth.controller.ts:L55](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/auth.controller.ts#L55) |
| Argon2 password hashing | ✅ Not bcrypt/SHA | [auth.service.ts:L9](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/auth.service.ts#L9) |
| Argon2-hashed OTPs | ✅ Not plaintext | [otp.service.ts:L39](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/otp.service.ts#L39) |
| Crypto-random OTP generation | ✅ `crypto.randomInt` | [otp.service.ts:L36](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/otp.service.ts#L36) |
| OTP brute-force protection | ✅ Max 5 attempts | [otp.service.ts:L122](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/otp.service.ts#L122) |
| DTO whitelist validation | ✅ Strips unknowns | [main.ts:L42](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/main.ts#L42) |
| RBAC guard system | ✅ Per-route roles | [roles.guard.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/core/guards/roles.guard.ts) |
| Refresh token hashed in DB | ✅ Argon2 | [auth.service.ts:L67](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/auth.service.ts#L67) |
| Audit logging | ✅ With IP tracking | [applications.service.ts:L63](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/applications/applications.service.ts#L63) |
| Sensitive fields excluded | ✅ `passwordHash` stripped | [users.service.ts:L105](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/users/users.service.ts#L105) |
| `.env` in `.gitignore` | ✅ | [.gitignore:L13](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/.gitignore#L13) |
| File size validation | ✅ 2MB limit | [applications.controller.ts:L77](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/applications/applications.controller.ts#L77) |
| Generic login error messages | ✅ No user enumeration | [auth.service.ts:L47](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/auth/auth.service.ts#L47) |

---

## Priority Remediation Order

| Priority | Finding | Effort |
|----------|---------|--------|
| 🔴 P0 — Do Now | #1 Hardcoded JWT secrets | 15 min |
| 🔴 P0 — Do Now | #6 Role escalation at registration | 10 min |
| 🔴 P0 — Do Now | #2 XSS in PDF generator | 30 min |
| 🟠 P1 — Before Staging | #4 IDOR on applications | 30 min |
| 🟠 P1 — Before Staging | #5 IDOR on users | 15 min |
| 🟠 P1 — Before Staging | #3 Token storage (localStorage → HttpOnly cookie) | 2-4 hrs |
| 🟡 P2 — Before Production | #7 Turnstile bypass in production | 15 min |
| 🟡 P2 — Before Production | #8 File upload validation | 1 hr |
| 🟡 P2 — Before Production | #9 Swagger in production | 5 min |
| 🟡 P2 — Before Production | #10 Password policy | 15 min |
| 🔵 P3 — Improvement | #11 Docker credentials | 10 min |
| 🔵 P3 — Improvement | #12 Error disclosure | 15 min |
