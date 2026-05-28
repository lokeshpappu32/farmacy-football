#!/usr/bin/env bash
set -euo pipefail

python scripts/init_db.py

PORT="${PORT:-8000}"
exec gunicorn wsgi:app \
  --bind "0.0.0.0:${PORT}" \
  --workers "${GUNICORN_WORKERS:-2}" \
  --threads "${GUNICORN_THREADS:-4}" \
  --timeout "${GUNICORN_TIMEOUT:-120}"
