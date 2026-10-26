# VajraKosh: Cloud Deployment Guide (Render & Vercel)
### Problem Statement ID: 26265 — AICTE Security Deposit & FDR Portal

This guide provides step-by-step instructions for deploying VajraKosh to **Render** (Backend API + Managed PostgreSQL) and **Vercel** or **Render** (React Frontend).

---

## 1. Deployment Architecture

```
                    +--------------------------------------------+
                    |           Vercel CDN / Render CDN          |
                    |         React 18 + Vite Frontend           |
                    |  (https://aicte-fdr-frontend.vercel.app)   |
                    +---------------------+----------------------+
                                          |
                                          | REST API / HTTPS
                                          v
                    +--------------------------------------------+
                    |             Render Web Service             |
                    |         FastAPI Python 3.11 Backend        |
                    |    (https://aicte-fdr-backend.onrender.com)|
                    +---------------------+----------------------+
                                          |
                                          | SQLAlchemy 2.0 / PostgreSQL
                                          v
                    +--------------------------------------------+
                    |          Render Managed PostgreSQL         |
                    |            Database: aicte-fdr-db          |
                    +--------------------------------------------+
```

---

## 2. Step 1: Push Repository to Your GitHub

1. Create a **New Repository** on your GitHub account (e.g., `https://github.com/<YOUR_USERNAME>/VajraKosh`).
2. In your local project directory (`AICTE-FDR-portal`), link your remote and push:
```bash
git remote add origin https://github.com/<YOUR_USERNAME>/VajraKosh.git
git branch -M main
git push -u origin main
```

---

## 3. Step 2: Deploy Backend & Database on Render (1-Click Blueprint)

Render provisions the FastAPI Web Service and Managed PostgreSQL database automatically from [`render.yaml`](./render.yaml).

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Select your GitHub repository (`VajraKosh`).
4. Render will detect [`render.yaml`](./render.yaml) and list:
   - **`aicte-fdr-db`**: Managed PostgreSQL Database
   - **`aicte-fdr-backend`**: FastAPI Web Service (`python run.py`)
5. Click **Apply**.
6. Render will provision the database, install Python dependencies, run database migrations, and seed the demo data.
7. Once deployed, copy your Backend Service URL (e.g. `https://aicte-fdr-backend.onrender.com`).
   - Check health: `https://aicte-fdr-backend.onrender.com/api/health`
   - Check API docs: `https://aicte-fdr-backend.onrender.com/docs`

---

## 4. Step 3: Deploy Frontend on Vercel

Vercel provides ultra-fast global CDN hosting for React/Vite single-page applications.

1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`VajraKosh`).
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Select `frontend` (or leave as root, since root `vercel.json` is already provided).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   Add this environment variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://aicte-fdr-backend.onrender.com` *(your Render backend URL from Step 2)*
6. Click **Deploy**.
7. Vercel will build and deploy your frontend in ~30 seconds. Your live portal URL will be ready (e.g. `https://deposit-ledger.vercel.app`).

---

## 5. Alternative: Deploy Frontend on Render

If you prefer to host both backend and frontend on Render, `render.yaml` already includes `aicte-fdr-frontend` as a Static Site. It automatically reads the backend host URL and deploys alongside the API.

---

## 6. Pre-Configured Demo Accounts (1-Click Login)

Once deployed, visit your frontend URL. The portal features 1-click persona buttons:

| Persona | Role | Email | Password |
|---|---|---|---|
| **College User** | Institution Submissions | `college@demo.aicte.gov.in` | `Demo@12345` |
| **AICTE Officer 1** | Scrutiny & Clearance A | `officer@demo.aicte.gov.in` | `Demo@12345` |
| **AICTE Officer 2** | Clearance B (Actor Separation) | `officer2@demo.aicte.gov.in` | `Demo@12345` |
| **Workflow Approver** | Final Authorization | `approver@demo.aicte.gov.in` | `Demo@12345` |
| **Administrator** | Governance & Audit | `admin@demo.aicte.gov.in` | `Demo@12345` |
| **Auditor** | Read-Only Observation | `auditor@demo.aicte.gov.in` | `Demo@12345` |

---

## 7. Troubleshooting & Tips

- **Render Cold Start:** Free-tier web services on Render spin down after 15 minutes of inactivity. When waking up, the first request may take 30–50 seconds. Hit `/api/health` 1 minute before your presentation to warm up the server.
- **CORS Configuration:** If accessing from a custom Vercel domain, ensure your frontend URL is listed in `CORS_ORIGINS` in your Render Backend environment variables.
- **SPA Rewrites:** Both `vercel.json` and `frontend/public/_redirects` are pre-configured with `/* -> /index.html` rewrites to prevent 404 errors on browser page reloads.
