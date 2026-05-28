# Azure Deployment Guide

This guide deploys the same GitHub repository as two separate Azure sites:

- Test site: 1 App Service instance, separate test database.
- Live site: 2 to 4 App Service instances, separate production database.

The app is a Flask + React project. Flask serves the built React files from `frontend/dist`. Azure starts the app with `startup.sh`, which creates missing database tables and inserts real country data before starting Gunicorn.

## 1. Recommended Azure Layout

Use one resource group so everything is easy to find:

```text
Resource group: rg-farmacy-football

Test:
  App Service: farmacy-football-test
  App Service Plan: asp-farmacy-football-test
  Database: farmacy_football_test

Live:
  App Service: farmacy-football-live
  App Service Plan: asp-farmacy-football-live
  Database: farmacy_football_live
```

For the database, you have two choices:

- Lower cost: one Azure Database for PostgreSQL flexible server with two databases, `farmacy_football_test` and `farmacy_football_live`.
- Stronger isolation: two PostgreSQL flexible servers, one for test and one for live.

For a first deployment, one PostgreSQL flexible server with two databases is usually enough. The important part is that test and live must use different `DATABASE_URL` values.

## 2. Prepare GitHub Branches

Recommended:

```text
develop -> deploys to test
main    -> deploys to live
```

If you only have `main` today:

```bash
git checkout -b develop
git push origin develop
```

Use test first. After testing is successful, merge `develop` into `main` to deploy live.

## 3. Create Resource Group

Open:

```text
Azure Portal -> Resource groups -> Create
```

Use:

```text
Resource group: rg-farmacy-football
Region: choose the region closest to your users
```

## 4. Create PostgreSQL Flexible Server

Open:

```text
Azure Portal -> Create a resource -> Azure Database for PostgreSQL flexible server
```

Use:

```text
Resource group: rg-farmacy-football
Server name: pg-farmacy-football
PostgreSQL version: 16
Authentication: PostgreSQL authentication
Admin username: choose a username
Admin password: save this securely
Networking: Public access for beginner setup
Firewall: Allow Azure services/resources to access this server
```

After the server is created, create two databases.

Open Azure Cloud Shell from the top-right terminal icon in Azure Portal, then run:

```bash
az postgres flexible-server db create \
  --resource-group rg-farmacy-football \
  --server-name pg-farmacy-football \
  --database-name farmacy_football_test

az postgres flexible-server db create \
  --resource-group rg-farmacy-football \
  --server-name pg-farmacy-football \
  --database-name farmacy_football_live
```

Your connection strings will look like this:

```text
postgresql://ADMIN_USER:ADMIN_PASSWORD@pg-farmacy-football.postgres.database.azure.com:5432/farmacy_football_test?sslmode=require

postgresql://ADMIN_USER:ADMIN_PASSWORD@pg-farmacy-football.postgres.database.azure.com:5432/farmacy_football_live?sslmode=require
```

Keep these private. They go into App Service environment variables.

## 5. Create Test App Service

Open:

```text
Azure Portal -> Create a resource -> Web App
```

Use:

```text
Resource group: rg-farmacy-football
Name: farmacy-football-test
Publish: Code
Runtime stack: Python 3.11
Operating System: Linux
Region: same as database
App Service Plan: create new asp-farmacy-football-test
Pricing plan: Basic B1 or similar is enough for test
```

After creation, open:

```text
App Service farmacy-football-test -> Settings -> Configuration
```

In **General settings**, set:

```text
Startup Command: bash startup.sh
```

In **Application settings**, add:

```text
SCM_DO_BUILD_DURING_DEPLOYMENT = 1
POST_BUILD_COMMAND = bash scripts/azure_post_build.sh
DATABASE_URL = postgresql://ADMIN_USER:ADMIN_PASSWORD@pg-farmacy-football.postgres.database.azure.com:5432/farmacy_football_test?sslmode=require
ADMIN_SECRET_CODE = your-test-admin-code
SECRET_KEY = long-random-test-secret
JWT_SECRET_KEY = another-long-random-test-secret
PUBLIC_APP_URL = https://farmacy-football-test.azurewebsites.net
CORS_ORIGINS = https://farmacy-football-test.azurewebsites.net
RATELIMIT_STORAGE_URI = memory://
FOOTBALLDATA_IO_API_KEY = your-api-key
FOOTBALLDATA_IO_BASE_URL = https://footballdata.io/api/v1
FOOTBALLDATA_IO_LEAGUE_IDS = 50
FOOTBALLDATA_IO_SEASON_ID = 618
FOOTBALLDATA_IO_LANG = en
FOOTBALLDATA_IO_SYNC_ENABLED = true
```

Click **Save**.

## 6. Connect Test App to GitHub

Open:

```text
App Service farmacy-football-test -> Deployment -> Deployment Center
```

Use:

```text
Source: GitHub
Organization: your GitHub organization/user
Repository: your repo
Branch: develop
Workflow option: GitHub Actions
```

Save. Azure will create or suggest a GitHub Actions workflow.

When the deployment finishes, open:

```text
https://farmacy-football-test.azurewebsites.net
```

Then check logs:

```text
App Service farmacy-football-test -> Monitoring -> Log stream
```

On first startup you should see:

```text
Database initialized.
```

That means `scripts/init_db.py` ran successfully.

## 7. Create Live App Service

Create another Web App:

```text
Azure Portal -> Create a resource -> Web App
```

Use:

```text
Resource group: rg-farmacy-football
Name: farmacy-football-live
Publish: Code
Runtime stack: Python 3.11
Operating System: Linux
Region: same as database
App Service Plan: create new asp-farmacy-football-live
Pricing plan: choose a plan that supports scale-out, for example Premium v3
```

Configure startup:

```text
App Service farmacy-football-live -> Settings -> Configuration -> General settings
Startup Command: bash startup.sh
```

Configure application settings:

```text
SCM_DO_BUILD_DURING_DEPLOYMENT = 1
POST_BUILD_COMMAND = bash scripts/azure_post_build.sh
DATABASE_URL = postgresql://ADMIN_USER:ADMIN_PASSWORD@pg-farmacy-football.postgres.database.azure.com:5432/farmacy_football_live?sslmode=require
ADMIN_SECRET_CODE = your-live-admin-code
SECRET_KEY = long-random-live-secret
JWT_SECRET_KEY = another-long-random-live-secret
PUBLIC_APP_URL = https://farmacy-football-live.azurewebsites.net
CORS_ORIGINS = https://farmacy-football-live.azurewebsites.net
RATELIMIT_STORAGE_URI = memory://
FOOTBALLDATA_IO_API_KEY = your-api-key
FOOTBALLDATA_IO_BASE_URL = https://footballdata.io/api/v1
FOOTBALLDATA_IO_LEAGUE_IDS = 50
FOOTBALLDATA_IO_SEASON_ID = 618
FOOTBALLDATA_IO_LANG = en
FOOTBALLDATA_IO_SYNC_ENABLED = true
```

Connect live to GitHub:

```text
App Service farmacy-football-live -> Deployment -> Deployment Center
Source: GitHub
Repository: your repo
Branch: main
Workflow option: GitHub Actions
```

## 8. Scale Live to 2-4 Instances

Open:

```text
App Service Plan asp-farmacy-football-live -> Settings -> Scale out
```

Set manual scale if you want exactly 2 instances:

```text
Instance count: 2
```

Set autoscale if you want 2 to 4 instances:

```text
Minimum instances: 2
Maximum instances: 4
Default instances: 2
Scale out rule: CPU percentage greater than 70% for 10 minutes
Scale in rule: CPU percentage less than 30% for 10 minutes
```

The test App Service Plan should stay at 1 instance.

## 9. Custom Domain

You do not need custom domains for both sites.

Recommended:

```text
Test: https://farmacy-football-test.azurewebsites.net
Live: your real custom domain
```

For live custom domain:

```text
App Service farmacy-football-live -> Settings -> Custom domains
```

Add your domain and follow Azure's DNS instructions. After the domain is connected, update live settings:

```text
PUBLIC_APP_URL = https://your-domain.com
CORS_ORIGINS = https://your-domain.com
```

## 10. What Creates the Tables?

Production startup runs:

```bash
python scripts/init_db.py
```

That script does:

```python
db.create_all()
seed_countries()
```

`db.create_all()` creates all missing tables from the app models:

```text
countries
participants
matches
predictions
points_history
admin_logs
api_sync_state
api_call_logs
```

`seed_countries()` inserts or updates only real country data from `scripts/country_seed.py`.

Do not run this in production:

```bash
python scripts/seed.py
```

`seed.py` is for demo/local data. It inserts demo participants, demo matches, demo predictions, and demo admin logs.

## 11. First Deployment Checklist

Do this in order:

```text
1. Create resource group.
2. Create PostgreSQL flexible server.
3. Create farmacy_football_test database.
4. Create farmacy_football_live database.
5. Create test App Service.
6. Add test environment variables.
7. Set test startup command to bash startup.sh.
8. Connect test app to GitHub develop branch.
9. Deploy and verify test site.
10. Create live App Service.
11. Add live environment variables with live DATABASE_URL.
12. Set live startup command to bash startup.sh.
13. Connect live app to GitHub main branch.
14. Scale live App Service Plan to 2-4 instances.
15. Add custom domain to live if required.
```

## 12. How to Verify

Open the test or live app URL. Then check:

```text
App Service -> Monitoring -> Log stream
```

Good signs:

```text
Database initialized.
Booting worker with pid
```

If the site opens but frontend is missing, check:

```text
App Service -> Deployment Center -> Logs
```

Make sure this ran successfully:

```bash
bash scripts/azure_post_build.sh
```

If the database fails, check:

```text
DATABASE_URL
PostgreSQL firewall/networking
PostgreSQL username/password
Database name: farmacy_football_test or farmacy_football_live
sslmode=require
```

## 13. Useful Azure CLI Commands

Set startup command:

```bash
az webapp config set \
  --resource-group rg-farmacy-football \
  --name farmacy-football-test \
  --startup-file "bash startup.sh"
```

Set test app settings:

```bash
az webapp config appsettings set \
  --resource-group rg-farmacy-football \
  --name farmacy-football-test \
  --settings \
  SCM_DO_BUILD_DURING_DEPLOYMENT=1 \
  POST_BUILD_COMMAND="bash scripts/azure_post_build.sh" \
  DATABASE_URL="postgresql://ADMIN_USER:ADMIN_PASSWORD@pg-farmacy-football.postgres.database.azure.com:5432/farmacy_football_test?sslmode=require" \
  ADMIN_SECRET_CODE="your-test-admin-code" \
  SECRET_KEY="long-random-test-secret" \
  JWT_SECRET_KEY="another-long-random-test-secret" \
  PUBLIC_APP_URL="https://farmacy-football-test.azurewebsites.net" \
  CORS_ORIGINS="https://farmacy-football-test.azurewebsites.net" \
  RATELIMIT_STORAGE_URI="memory://" \
  FOOTBALLDATA_IO_API_KEY="your-api-key" \
  FOOTBALLDATA_IO_BASE_URL="https://footballdata.io/api/v1" \
  FOOTBALLDATA_IO_LEAGUE_IDS="50" \
  FOOTBALLDATA_IO_SEASON_ID="618" \
  FOOTBALLDATA_IO_LANG="en" \
  FOOTBALLDATA_IO_SYNC_ENABLED="true"
```

Create databases:

```bash
az postgres flexible-server db create \
  --resource-group rg-farmacy-football \
  --server-name pg-farmacy-football \
  --database-name farmacy_football_test

az postgres flexible-server db create \
  --resource-group rg-farmacy-football \
  --server-name pg-farmacy-football \
  --database-name farmacy_football_live
```

