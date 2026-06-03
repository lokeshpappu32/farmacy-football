# Farmacy Football

Farmacy Football is a full-stack football prediction campaign platform for Hetero Pharmaceutical teams, HETERO Representatives / Staff, and Farmacists.

## Stack

- React + Vite + JSX + Tailwind CSS
- React Router, Axios, Framer Motion, React Icons
- Flask, Flask SQLAlchemy, Flask JWT Extended, Flask CORS, Flask Limiter
- Azure SQL Database through `pyodbc`
- Gunicorn on Azure Linux App Service
- React production build served by Flask from one URL

## Azure Live Deployment

Use Azure Linux App Service with Python 3.11 and Azure SQL Database.

Startup command:

```bash
bash startup.sh
```

`startup.sh` runs:

```bash
python scripts/init_db.py
```

This creates missing tables and inserts/updates the production country list. Do not use `startup-test.sh` in live because it also runs demo seed data.

Recommended Azure App Service settings:

```env
AZURE_SQL_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=tcp:YOUR-SERVER.database.windows.net,1433;Database=YOUR-DB;Uid=YOUR-USER;Pwd=YOUR-PASSWORD;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;
SECRET_KEY=long-random-secret
JWT_SECRET_KEY=different-long-random-secret
JWT_ACCESS_TOKEN_EXPIRES_DAYS=90
SUPER_ADMIN_USER_ID=superadmin
SUPER_ADMIN_PASSWORD=secure-super-admin-password
PUBLIC_APP_URL=https://your-live-domain
CORS_ORIGINS=https://your-live-domain
RATELIMIT_STORAGE_URI=memory://
FOOTBALLDATA_IO_API_KEY=your-footballdata-api-key
FOOTBALLDATA_IO_BASE_URL=https://footballdata.io/api/v1
FOOTBALLDATA_IO_LEAGUE_IDS=50
FOOTBALLDATA_IO_SEASON_ID=618
FOOTBALLDATA_IO_LANG=en
FOOTBALLDATA_IO_SYNC_ENABLED=true
SCM_DO_BUILD_DURING_DEPLOYMENT=1
POST_BUILD_COMMAND=bash scripts/azure_post_build.sh
```

Leave `DATABASE_URL` unset for Azure SQL unless you intentionally want to use a full SQLAlchemy URL.

## Local Development

Local MySQL backups are kept under `.backup/local-mysql-*`. Restore the latest local backup if you want to test locally with MySQL.

Typical local commands after restoring MySQL mode:

```bash
pip install -r requirements.txt
python scripts/init_db.py
python scripts/seed.py
python wsgi.py
```

Frontend build:

```bash
cd frontend
npm install
npm run build
```

## Roles

- Farmacist: dashboard, schedule, performance, standings, points system
- HETERO Representative / Staff: dashboard, schedule, performance, own standing, Farmacist standing, points system
- Admin: global performance, HETERO staff standing, Farmacist standing, schedule, users
- Super Admin: developer/operations pages for match management, logs, API sync tracking, analytics

## Points

- Enrollment: `+100`
- Match participation: `+50`
- Correct winner or draw prediction: `+50`
- Wrong prediction: no deduction
- Cancelled match: participation points are retained

## Match Sync

Football API sync is triggered by normal page/API activity and by the super admin Sync Matches action. Database-backed smart windows prevent repeated external API calls:

- Upcoming sync: once every 2 hours
- Live sync: once every 5 minutes only when live candidates exist
- Results sync: once every 5 minutes only when result candidates exist
- Usage/health sync: once per day from admin/super admin tracking flows

If the football API fails, the application continues to serve existing database data and users are not interrupted. Admin/super admin can still update results manually.

## Translation

Browser-side translation supports Spanish and French for configured country/browser/IP signals. Super admin pages remain English.
