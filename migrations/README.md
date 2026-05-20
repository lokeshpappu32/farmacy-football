# Database Migrations

This project is wired for Flask-Migrate.

For a new environment:

```bash
flask --app wsgi:app db init
flask --app wsgi:app db migrate -m "initial schema"
flask --app wsgi:app db upgrade
```

For quick local demo setup, `python scripts/seed.py` calls `db.create_all()` and inserts sample data.
