# Farmacy Football

Farmacy Football is a full-stack FIFA football prediction campaign platform for Hetero Pharmaceutical teams and pharmacists across 30 countries.

## Stack

- React + Vite + JSX + Tailwind CSS
- React Router, Axios, Framer Motion, React Icons
- Flask, Flask SQLAlchemy, Flask JWT Extended, APScheduler, Flask CORS, Flask Limiter
- MySQL with PyMySQL
- Gunicorn on Render, with the React build served by Flask from one URL

## Local Setup

1. Create a MySQL database named `farmacy_football`.
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

Use `render.yaml` to create a single Python web service. Add environment variables from `.env.example`, especially:

- `DATABASE_URL`
- `ADMIN_SECRET_CODE`
- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `PUBLIC_APP_URL`
- `FOOTBALL_DATA_API_TOKEN`
- Twilio credentials when SMS reminders are enabled

The Render build command installs Python packages, installs frontend packages, builds React, and starts Gunicorn. Flask serves `frontend/dist` so the app uses one deployed URL.

## Authentication

Participants log in using their mobile number only. Admins log in by entering the `ADMIN_SECRET_CODE` value on the same login screen.

## Point Rules

- Enrollment: +100
- Match prediction participation: +50
- Correct winner prediction: +50
- Wrong prediction: no deduction

All datetimes are stored in UTC. Browser rendering uses the user's local timezone.

## Scheduled Jobs

APScheduler registers:

- Daily upcoming match sync from football-data.org
- Daily reminder SMS job for matches around 24 hours away
- Match status refresh every 15 minutes
- Prediction point awards every 20 minutes
- Leaderboard refresh job every 30 minutes

Set `SCHEDULER_ENABLED=false` for local sessions where background jobs are not desired.
