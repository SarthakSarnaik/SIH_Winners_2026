# Deploying VajraKosh to Render & Vercel

> For the comprehensive, step-by-step deployment guide covering both **Render** (FastAPI backend + PostgreSQL) and **Vercel** (React Vite frontend), see **[`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)**.

---

## Quick Summary (1-Click Blueprint on Render)

1. Push your repository to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com) -> **New +** -> **Blueprint**.
3. Select your repository.
4. Render detects [`render.yaml`](./render.yaml) and provisions:
   - **`aicte-fdr-db`**: Managed PostgreSQL Database
   - **`aicte-fdr-backend`**: FastAPI Python Web Service
   - **`aicte-fdr-frontend`**: React Vite Static Site
5. Click **Apply**.
