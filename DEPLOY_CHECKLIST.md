# GeneLab — Deploy Checklist

**Current Status: DEPLOYED**  
Live URL: https://gene-lab-gray.vercel.app  
GitHub: https://github.com/Ti838/GENE-LAB

---

## What is already done (Production)

- [x] Repository pushed to GitHub (`main` branch)
- [x] MongoDB Atlas cluster connected (`MONGO_URI` set in Vercel)
- [x] JWT authentication working (`JWT_SECRET` set in Vercel)
- [x] Vercel project created and linked to GitHub repo
- [x] Frontend deployed as static site on Vercel
- [x] Backend API deployed as Vercel Serverless Functions
- [x] `vercel.json` routing configured (wildcard catch-all)
- [x] Health check live at `/api/health` — returns 200 OK
- [x] Admin account seeded (`admin@genelab.ai`)
- [x] Doctor and Researcher seed accounts created
- [x] All critical security vulnerabilities resolved (see `SECURITY_AUDIT_REPORT.md`)
- [x] Serverless filesystem crash fixed (`/tmp/uploads` on Vercel)
- [x] MongoDB fast-fail timeouts added (8s)
- [x] Demo login bypass removed from frontend

---

## What is optional / not yet done

- [ ] **Resend API Key** — Add `RESEND_API_KEY` to Vercel for real email verification  
  Get a free key at: https://resend.com

- [ ] **Redis (BullMQ queues)** — Add `REDIS_URL` to Vercel for async DNA analysis jobs  
  Use Upstash (free tier): https://upstash.com  
  Or Redis Cloud: https://redis.com/try-free/

- [ ] **FastAPI Bio Service** — Deploy `bioservice/` to Render or Railway for deep analysis  
  Use `render.yaml` from the repo root  
  Set `FASTAPI_URL` in Vercel once deployed

- [ ] **Firebase Storage** — Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`  
  For profile photos, DNA files, and report uploads on Vercel

- [ ] **Sentry** — Add `SENTRY_DSN` for production error monitoring

---

## Re-deploy steps (if you change code)

```powershell
# From the root directory:
git add .
git commit -m "your message"
git push origin main

# Then manually deploy to Vercel (CLI):
npx vercel --prod --yes
```

> Note: Vercel GitHub auto-deploy may not trigger reliably — use the CLI for guaranteed deploys.

---

## Environment Variables (Vercel → Settings → Environment Variables)

| Variable | Required | Value |
|----------|----------|-------|
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Random secret string (min 32 chars) |
| `JWT_EXPIRY` | No | `24h` (default) |
| `NODE_ENV` | Yes | `production` |
| `VERCEL` | Auto | Set by Vercel automatically |
| `FRONTEND_URL` | No | `https://gene-lab-gray.vercel.app` |
| `RESEND_API_KEY` | Optional | From resend.com |
| `FASTAPI_URL` | Optional | URL of deployed bio service |
| `REDIS_URL` | Optional | From Upstash or Redis Cloud |
| `DISABLE_QUEUES` | Optional | `true` if no Redis |
| `FIREBASE_PROJECT_ID` | Optional | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Optional | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Optional | Firebase service account private key |
| `FIREBASE_STORAGE_BUCKET` | Optional | Firebase Storage bucket name |
| `SENTRY_DSN` | Optional | From sentry.io |
| `NCBI_API_KEY` | Optional | For higher BLAST rate limits |

---

## Smoke Tests

After any deployment, run these to confirm the system is healthy:

```powershell
# 1. Health check
Invoke-WebRequest -Uri "https://gene-lab-gray.vercel.app/api/health" -UseBasicParsing

# 2. Admin login
$body = '{"email":"admin@genelab.ai","password":"GeneLabAdmin2026!"}' | ConvertTo-Json
Invoke-WebRequest -Uri "https://gene-lab-gray.vercel.app/api/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

Expected: both return HTTP 200.

---

*GeneLab v2.0.0 | Updated: 2026-05-26*
