# Farmacy Football

Farmacy Football is a full-stack FIFA football prediction campaign platform for Hetero Pharmaceutical teams and pharmacists across 30 countries.

## Stack

- React + Vite + JSX + Tailwind CSS
- React Router, Axios, Framer Motion, React Icons
- Flask, Flask SQLAlchemy, Flask JWT Extended, Flask CORS, Flask Limiter
- PostgreSQL for Render deployment
- Gunicorn on Render, with the React build served by Flask from one URL

## Local Setup

1. Create a PostgreSQL database named `farmacy_football`, or switch to the backed-up MySQL config for local-only development.
2. Copy `.env.example` to `.env` and update secrets and `DATABASE_URL`.
3. Install backend dependencies:

```bash
pip install -r requirements.txt
```

4. Install frontend dependencies:

```bash
cd frontend
npm install
```

5. Initialize database tables and sample data:

```bash
python scripts/seed.py
```

6. Run frontend during development:

```bash
cd frontend
npm run dev
```

7. Run Flask API:

```bash
python wsgi.py
```

For production-style local serving:

```bash
cd frontend
npm run build
cd ..
gunicorn wsgi:app --bind 0.0.0.0:5000
```

## Render Deployment

Use `render.yaml` to create one Python web service and one Render PostgreSQL database. Add environment variables from `.env.example`, especially:

- `DATABASE_URL` is linked automatically from the Render database in `render.yaml`
- `ADMIN_SECRET_CODE`
- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `PUBLIC_APP_URL`
- `FOOTBALLDATA_IO_API_KEY`

The Render build command installs Python packages, installs frontend packages, builds React, and starts Gunicorn. Flask serves `frontend/dist` so the app uses one deployed URL.

## Azure App Service Deployment

Use an Azure **Linux** App Service with Python 3.11 and an Azure Database for PostgreSQL flexible server.

For full test/live setup instructions, see [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md).

Enable Azure build automation and use this post-build command:

```bash
SCM_DO_BUILD_DURING_DEPLOYMENT=1
POST_BUILD_COMMAND=bash scripts/azure_post_build.sh
```

Startup command:

```bash
bash startup.sh
```

`startup.sh` runs `python scripts/init_db.py` before Gunicorn starts. That script creates the database tables and inserts/updates the real country list from `scripts/country_seed.py`. Do **not** run `python scripts/seed.py` in production unless you intentionally want demo participants, demo matches, demo predictions, and demo admin logs.

Recommended Azure application settings:

- `DATABASE_URL`: Azure PostgreSQL connection string, for example `postgresql://USER:PASSWORD@HOST.postgres.database.azure.com:5432/farmacy_football?sslmode=require`
- `ADMIN_SECRET_CODE`: your private admin login code
- `SECRET_KEY`: a long random secret
- `JWT_SECRET_KEY`: another long random secret
- `PUBLIC_APP_URL`: your Azure app URL, for example `https://your-app-name.azurewebsites.net`
- `CORS_ORIGINS`: same Azure app URL
- `RATELIMIT_STORAGE_URI`: `memory://`
- `SCM_DO_BUILD_DURING_DEPLOYMENT`: `1`
- `POST_BUILD_COMMAND`: `bash scripts/azure_post_build.sh`
- `FOOTBALLDATA_IO_API_KEY`: your football API key
- `FOOTBALLDATA_IO_BASE_URL`: `https://footballdata.io/api/v1`
- `FOOTBALLDATA_IO_LEAGUE_IDS`: `50`
- `FOOTBALLDATA_IO_SEASON_ID`: `618`
- `FOOTBALLDATA_IO_LANG`: `en`
- `FOOTBALLDATA_IO_SYNC_ENABLED`: `true`

If you deploy from your local machine as a ZIP/package, build the frontend first so `frontend/dist` is included:

```bash
pip install -r requirements.txt
cd frontend
npm ci
npm run build
cd ..
```

## Authentication

Participants log in using their mobile number only. Admins log in by entering the `ADMIN_SECRET_CODE` value on the same login screen.

## Point Rules

- Enrollment: +100
- Match prediction participation: +50
- Correct winner prediction: +50
- Wrong prediction: no deduction

All datetimes are stored in UTC. Browser rendering uses the user's local timezone.

## Match Sync

Football data sync is triggered by important pages and by the admin **Sync Matches** action. Database-backed throttling prevents repeated API calls when many users open the app at the same time.
