# API Documentation

Base path: `/api`

All protected routes require:

```http
Authorization: Bearer <jwt>
```

## Public/Auth

### POST `/enroll`

Creates a participant and awards +100 points.

```json
{
  "full_name": "Aarav Patel",
  "mobile_number": "+919876543210",
  "email": "aarav@example.com",
  "country": "India",
  "mr_id": "MR123"
}
```

### POST `/login`

Participant login by mobile number or admin login by `ADMIN_SECRET_CODE`.

```json
{ "mobile_number": "+919876543210" }
```

## Participant

### GET `/matches/upcoming`

Returns next scheduled match and the current participant prediction when authenticated.

### POST `/predictions`

Creates or updates the participant prediction for a match before kickoff.

```json
{
  "match_id": 1,
  "predicted_team": "Brazil",
  "favorite_drug": "CoviFor"
}
```

### PUT `/predictions/:id`

Updates a prediction before kickoff.

### GET `/performance`

Returns points, rank, accuracy, prediction history, and points ledger.

### GET `/leaderboard?country=India`

Returns global or country-filtered leaderboard.

## Admin

All admin routes require an admin JWT.

### GET `/admin/dashboard`

Returns participant totals, predictions, match totals, country analytics, top leaderboard, and logs.

### POST `/admin/sync-matches`

Syncs matches from football-data.org.

### POST `/admin/reminders`

Runs the Twilio reminder job manually.

### GET `/admin/matches`

Lists all matches.

### POST `/admin/matches`

Creates a match.

```json
{
  "team1": "Brazil",
  "team2": "Argentina",
  "team1_logo": "https://example.com/brazil.svg",
  "team2_logo": "https://example.com/argentina.svg",
  "match_datetime": "2026-06-01T18:00:00Z"
}
```

### PUT `/admin/matches/:id`

Updates match fields.

### POST `/admin/matches/:id/winner`

Completes a match, sets the winner, and awards correct prediction points.

```json
{ "winner_team": "Brazil" }
```

### DELETE `/admin/matches/:id`

Deletes a match.

### GET `/admin/users?q=MR123`

Searches users.

### PUT `/admin/users/:id`

Updates user profile and points.

### GET `/admin/export/users.csv`

Exports participant CSV.

### GET `/admin/analytics`

Returns campaign analytics.
