from datetime import datetime, timedelta, timezone
from time import perf_counter

import requests
from flask import current_app

from app.extensions import db
from app.models import AdminLog, ApiCallLog, ApiSyncState, Match
from app.services.match_service import cancel_match, finalize_draw, manual_update_winner, reschedule_match
from app.utils.time import as_utc

PROVIDER = "footballdata.io"

SYNC_INTERVALS = {
    "upcoming": timedelta(hours=2),
    "live": timedelta(minutes=5),
    "results": timedelta(minutes=5),
    "usage": timedelta(days=1),
    "health": timedelta(days=1),
}


def maybe_sync_football_data(page, role=None, user_id=None, sync_types=None):
    if not current_app.config.get("FOOTBALLDATA_IO_SYNC_ENABLED"):
        return {"enabled": False, "results": []}
    if not current_app.config.get("FOOTBALLDATA_IO_API_KEY"):
        return {"enabled": False, "results": [{"status": "missing_api_key"}]}

    results = []
    for sync_type in sync_types or sync_types_for_page(page):
        results.append(sync_if_allowed(sync_type, page, role, user_id))
    return {"enabled": True, "results": results}


def sync_types_for_page(page):
    mapping = {
        "game_dashboard": ["upcoming", "live", "results"],
        "performance": ["results"],
        "leaderboard": ["results"],
        "mr_dashboard": ["results"],
        "admin_dashboard": ["upcoming", "live", "results", "usage", "health"],
        "admin_matches": ["upcoming", "live", "results"],
        "admin_analytics": ["results"],
    }
    return mapping.get(page, ["results"])


def sync_if_allowed(sync_type, page, role=None, user_id=None):
    now = datetime.now(timezone.utc)
    state = get_or_create_state(sync_type)
    interval = SYNC_INTERVALS.get(sync_type, timedelta(minutes=10))

    if state.locked_until and as_utc(state.locked_until) > now:
        log_call(sync_type, endpoint_for(sync_type), page, role, user_id, "skipped_locked", request_count=0)
        return {"sync_type": sync_type, "status": "skipped_locked"}

    if should_skip_for_campaign_window(sync_type, now):
        log_call(sync_type, endpoint_for(sync_type), page, role, user_id, "skipped_no_active_matches", request_count=0)
        return {"sync_type": sync_type, "status": "skipped_no_active_matches"}

    if state.last_synced_at and as_utc(state.last_synced_at) + interval > now:
        log_call(sync_type, endpoint_for(sync_type), page, role, user_id, "skipped_recent_sync", request_count=0)
        return {"sync_type": sync_type, "status": "skipped_recent_sync"}

    state.is_running = True
    state.locked_until = now + timedelta(minutes=2)
    db.session.commit()

    started = perf_counter()
    endpoint = endpoint_for(sync_type)
    try:
        payloads, status_code, request_count = fetch_payloads(sync_type, endpoint)
        synced = 0
        extra_request_count = 0
        extra_usage_snapshots = []
        sync_stats = {}
        for payload in payloads:
            payload_synced, payload_extra_requests, payload_usage_snapshots, payload_stats = apply_payload(sync_type, payload)
            synced += payload_synced
            extra_request_count += payload_extra_requests
            extra_usage_snapshots.extend(payload_usage_snapshots)
            sync_stats = merge_sync_stats(sync_stats, payload_stats)
        add_upcoming_sync_summary(sync_type, sync_stats)
        elapsed = int((perf_counter() - started) * 1000)
        state.last_synced_at = now
        state.locked_until = None
        state.is_running = False
        state.last_status = "success"
        state.last_error = None
        usage_snapshot = latest_usage_snapshot([*payloads, *extra_usage_snapshots])
        update_usage_snapshot(state, usage_snapshot)
        log_call(sync_type, endpoint, page, role, user_id, "success", status_code, request_count + extra_request_count, elapsed, usage_snapshot=usage_snapshot)
        db.session.commit()
        return {"sync_type": sync_type, "status": "success", "synced": synced}
    except Exception as exc:
        db.session.rollback()
        state = get_or_create_state(sync_type)
        state.locked_until = None
        state.is_running = False
        state.last_status = "failed"
        state.last_error = str(exc)[:1000]
        log_call(sync_type, endpoint, page, role, user_id, "failed", None, 1, int((perf_counter() - started) * 1000), str(exc))
        db.session.commit()
        current_app.logger.exception("Footballdata.io sync failed for %s", sync_type)
        return {"sync_type": sync_type, "status": "failed", "error": str(exc)}


def get_or_create_state(sync_type):
    state = ApiSyncState.query.filter_by(provider=PROVIDER, sync_type=sync_type).first()
    if state:
        return state
    state = ApiSyncState(provider=PROVIDER, sync_type=sync_type)
    db.session.add(state)
    db.session.commit()
    return state


def should_skip_for_campaign_window(sync_type, now):
    if sync_type == "live":
        return not has_live_candidates(now)
    if sync_type == "results":
        return not has_result_candidates(now)
    return False


def api_backed_open_matches():
    return Match.query.filter(
        Match.api_match_id.isnot(None),
        Match.api_match_id != "",
        Match.status.in_(["scheduled", "live"]),
    ).all()


def has_live_candidates(now):
    live_start_window = now - timedelta(hours=3)
    live_end_window = now + timedelta(hours=2)
    for match in api_backed_open_matches():
        if match.status == "live":
            return True
        match_time = as_utc(match.match_datetime)
        if live_start_window <= match_time <= live_end_window:
            return True
    return False


def has_result_candidates(now):
    for match in api_backed_open_matches():
        if as_utc(match.match_datetime) <= now:
            return True
    return False


def endpoint_for(sync_type):
    if sync_type == "upcoming":
        season_id = current_app.config.get("FOOTBALLDATA_IO_SEASON_ID")
        league_ids = configured_league_ids()
        if season_id and len(league_ids) == 1:
            return f"/leagues/{league_ids[0]}/matches"
        return "/fixtures/upcoming"
    if sync_type == "live":
        return "/fixtures/live"
    if sync_type == "results":
        return "/fixtures/results"
    if sync_type == "usage":
        return "/account/usage"
    if sync_type == "health":
        return "/meta/status"
    return "/fixtures/results"


def fetch_payloads(sync_type, endpoint):
    if sync_type == "upcoming" and current_app.config.get("FOOTBALLDATA_IO_SEASON_ID") and endpoint.startswith("/leagues/"):
        return call_paginated_footballdata(endpoint, {"season_id": current_app.config["FOOTBALLDATA_IO_SEASON_ID"]})
    payload, status_code = call_footballdata(endpoint)
    return [payload], status_code, 1


def call_paginated_footballdata(endpoint, extra_params=None):
    payloads = []
    page = 1
    status_code = 200
    while True:
        payload, status_code = call_footballdata(endpoint, {**(extra_params or {}), "page": page})
        payloads.append(payload)
        pagination = ((payload.get("meta") or {}).get("pagination") or {}) if isinstance(payload, dict) else {}
        total_pages = int(pagination.get("total_pages") or 1)
        if page >= total_pages:
            break
        page += 1
    return payloads, status_code, len(payloads)


def call_footballdata(endpoint, extra_params=None):
    base_url = current_app.config["FOOTBALLDATA_IO_BASE_URL"].rstrip("/")
    lang = current_app.config.get("FOOTBALLDATA_IO_LANG", "en")
    params = None if endpoint == "/account/usage" else {"lang": lang, **(extra_params or {})}
    response = requests.get(
        f"{base_url}{endpoint}",
        headers={"Authorization": f"Bearer {current_app.config['FOOTBALLDATA_IO_API_KEY']}"},
        params=params,
        timeout=25,
    )
    response.raise_for_status()
    return response.json(), response.status_code


def apply_payload(sync_type, payload):
    if sync_type in {"usage", "health"}:
        return 0, 0, [], {}
    matches = extract_matches(payload)
    synced = 0
    extra_requests = 0
    usage_snapshots = []
    stats = {}
    for item in matches:
        if not league_allowed(item):
            continue
        if should_confirm_match(sync_type, item):
            detail_item, detail_usage = fetch_match_detail(item)
            extra_requests += 1
            usage_snapshots.append(detail_usage)
            if detail_item:
                item = detail_item
        _, action = apply_api_match(sync_type, item)
        stats[action] = stats.get(action, 0) + 1
        synced += 1
    return synced, extra_requests, usage_snapshots, stats


def merge_sync_stats(current, incoming):
    merged = dict(current or {})
    for key, value in (incoming or {}).items():
        merged[key] = merged.get(key, 0) + int(value or 0)
    return merged


def add_upcoming_sync_summary(sync_type, stats):
    if sync_type != "upcoming" or not stats:
        return
    processed = sum(stats.values())
    same_kickoff = stats.get("same_kickoff", 0)
    finalized_skipped = stats.get("finalized_skipped", 0)
    created = stats.get("created", 0)
    rescheduled = stats.get("rescheduled", 0)
    updated = stats.get("updated", 0)
    no_changes = created == 0 and rescheduled == 0 and updated == 0
    details = (
        f"Upcoming sync checked {processed} API matches. "
        f"{same_kickoff} already existed with the same kickoff time. "
        f"{finalized_skipped} already finalized locally and skipped. "
        f"{created} new matches added. "
        f"{rescheduled} rescheduled. "
        f"{updated} updated."
    )
    if no_changes:
        details += " No schedule changes."
    db.session.add(AdminLog(admin_action="api_upcoming_sync_summary", details=details))


def should_confirm_match(sync_type, item):
    if sync_type not in {"live", "results"}:
        return False
    api_match_id = item.get("match_id")
    if not api_match_id:
        return False
    match = Match.query.filter_by(api_match_id=str(api_match_id)).first()
    return match is not None and not is_finalized_match(match)


def fetch_match_detail(item):
    api_match_id = item.get("match_id")
    payload, _ = call_footballdata(f"/matches/{api_match_id}")
    data = payload.get("data") if isinstance(payload, dict) else None
    if isinstance(data, dict):
        match = data.get("match")
        return match if isinstance(match, dict) else data, payload
    return None, payload


def extract_matches(payload):
    data = payload.get("data") if isinstance(payload, dict) else {}
    if isinstance(data, dict):
        matches = data.get("matches") or []
        parent_league = data.get("league")
        if parent_league:
            for item in matches:
                item.setdefault("league", parent_league)
        return matches
    if isinstance(data, list):
        return data
    return []


def league_allowed(item):
    season_id = current_app.config.get("FOOTBALLDATA_IO_SEASON_ID")
    if season_id and str((item.get("season") or {}).get("season_id")) != str(season_id):
        return False
    configured = set(configured_league_ids())
    if not configured:
        return True
    league = item.get("league") or {}
    league_id = league.get("league_id")
    return str(league_id) in configured


def configured_league_ids():
    configured = {
        value.strip()
        for value in str(current_app.config.get("FOOTBALLDATA_IO_LEAGUE_IDS") or "").split(",")
        if value.strip()
    }
    return sorted(configured)


def apply_api_match(sync_type, item):
    api_match_id = str(item.get("match_id"))
    if not api_match_id:
        return None, "skipped"

    match = Match.query.filter_by(api_match_id=api_match_id).first()
    if match and is_finalized_match(match):
        return match, "finalized_skipped"

    is_new = match is None
    had_same_kickoff = False
    if match:
        api_datetime_for_compare = parse_api_datetime(item)
        had_same_kickoff = same_kickoff_time(match.match_datetime, api_datetime_for_compare)
    if not match:
        match = Match(api_match_id=api_match_id, team1="", team2="", match_datetime=datetime.now(timezone.utc))
        db.session.add(match)
        db.session.flush()

    home = item.get("home_team") or {}
    away = item.get("away_team") or {}
    if is_new:
        match.team1 = home.get("team_name") or "Team 1"
        match.team2 = away.get("team_name") or "Team 2"
        match.team1_logo = home.get("team_logo")
        match.team2_logo = away.get("team_logo")

    api_datetime = parse_api_datetime(item)
    api_status = normalize_status(item, api_datetime)
    venue = item.get("venue") or {}
    if is_new:
        update_match_identity_from_api(match, home, away, venue, include_empty_logos=True)
    allow_upcoming_identity_update = sync_type == "upcoming" and match.status == "scheduled" and api_status == "scheduled"
    identity_updated = False
    if allow_upcoming_identity_update and not is_new:
        identity_updated = update_match_identity_from_api(match, home, away, venue)

    if api_status == "cancelled":
        if match.status != "cancelled":
            match.match_datetime = api_datetime
            db.session.commit()
            cancel_match(match, source="api")
            return match, "cancelled"
        return match, "same_kickoff" if had_same_kickoff else "updated"

    if api_status == "completed":
        match.match_datetime = api_datetime
        winner = winner_from_score(item, match)
        if winner == "Draw":
            match.status = "live"
            db.session.add(match)
            return match, "updated"
        elif winner:
            if match.status != "completed" or match.winner_team != winner:
                db.session.commit()
                manual_update_winner(match, winner, source="api")
                return match, "completed"
        else:
            match.status = "live"
            db.session.add(match)
            return match, "updated"
        return match, "same_kickoff" if had_same_kickoff else "updated"

    if is_new:
        match.match_datetime = api_datetime
        match.winner_team = None
        match.status = api_status
        db.session.add(match)
        db.session.add(AdminLog(admin_action="api_create_match", details=f"Added API match {match.team1} vs {match.team2} on {api_datetime.isoformat()}"))
        return match, "created"

    if match.status == "scheduled" and not same_kickoff_time(match.match_datetime, api_datetime):
        db.session.commit()
        reschedule_match(match, api_datetime, source="api")
        return match, "rescheduled"

    match.match_datetime = api_datetime
    match.winner_team = None
    match.status = api_status
    db.session.add(match)
    return match, "updated" if identity_updated else ("same_kickoff" if had_same_kickoff else "updated")


def update_match_identity_from_api(match, home, away, venue, include_empty_logos=False):
    changed = False
    fields = (
        ("team1", home.get("team_name")),
        ("team2", away.get("team_name")),
        ("venue_name", venue.get("stadium_name")),
        ("venue_location", venue.get("stadium_location")),
    )
    for field, value in fields:
        clean_value = str(value or "").strip()
        if clean_value and getattr(match, field) != clean_value:
            setattr(match, field, clean_value)
            changed = True

    logo_fields = (
        ("team1_logo", home.get("team_logo")),
        ("team2_logo", away.get("team_logo")),
    )
    for field, value in logo_fields:
        clean_value = str(value or "").strip()
        if (clean_value or include_empty_logos) and getattr(match, field) != clean_value:
            setattr(match, field, clean_value)
            changed = True
    return changed


def is_finalized_match(match):
    if not match:
        return False
    if match.status == "cancelled":
        return True
    return match.status == "completed" and bool(match.winner_team)


def parse_api_datetime(item):
    if item.get("date_unix"):
        return datetime.fromtimestamp(int(item["date_unix"]), tz=timezone.utc)
    value = item.get("match_date")
    if value:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def same_kickoff_time(current_value, api_value):
    current_utc = as_utc(current_value)
    api_utc = as_utc(api_value)
    if not current_utc or not api_utc:
        return current_utc == api_utc
    return int(current_utc.timestamp()) == int(api_utc.timestamp())


def normalize_status(item, match_datetime):
    status = str(item.get("status") or "").lower()
    if status in {"complete", "completed", "finished", "ft"}:
        return "completed"
    if status in {"cancelled", "canceled", "abandoned"}:
        return "cancelled"
    if status in {"postponed", "delayed"}:
        return "scheduled"
    if status in {"live", "in_play", "in-play", "halftime", "ht"}:
        return "live"
    if match_datetime <= datetime.now(timezone.utc) and status not in {"complete", "completed"}:
        return "live"
    return "scheduled"


def winner_from_score(item, match):
    score = item.get("score") or {}
    winner = str(score.get("winner") or item.get("winner") or "").lower()
    if winner in {"home", "home_team", "team1", "1"}:
        return match.team1
    if winner in {"away", "away_team", "team2", "2"}:
        return match.team2
    if winner in {"draw", "tie", "x"}:
        return "Draw"
    home = first_score_value(item, "home")
    away = first_score_value(item, "away")
    if home is not None and away is not None and int(home) == int(away):
        return "Draw"
    if home is not None and away is not None:
        return match.team1 if int(home) > int(away) else match.team2
    return None


def first_score_value(item, side):
    score = item.get("score") or {}
    candidate_keys = (
        side,
        f"{side}_score",
        f"{side}_goals",
        f"{side}_team_score",
        f"{side}TeamScore",
    )
    for source in (score, item):
        value = first_numeric_value(source, candidate_keys)
        if value is not None:
            return value
    for nested_key in ("fulltime", "full_time", "regular_time", "ft"):
        nested = score.get(nested_key) if isinstance(score, dict) else None
        value = first_numeric_value(nested or {}, candidate_keys)
        if value is not None:
            return value
    return None


def first_numeric_value(source, keys):
    if not isinstance(source, dict):
        return None
    for key in keys:
        value = source.get(key)
        if value is None or value == "":
            continue
        try:
            return int(value)
        except (TypeError, ValueError):
            continue
    return None


def latest_usage_snapshot(payloads):
    for payload in reversed(payloads):
        meta = payload.get("meta") if isinstance(payload, dict) else None
        data = payload.get("data") if isinstance(payload, dict) else None
        usage = data.get("usage") if isinstance(data, dict) else None
        source = usage or meta or {}
        if source:
            return {
                "requests_used": int(source.get("requests_used") or 0),
                "requests_limit": int(source.get("requests_limit") or 0),
                "requests_remaining": int(source.get("requests_remaining") or 0),
            }
    return {}


def update_usage_snapshot(state, usage_snapshot):
    source = usage_snapshot or {}
    if source:
        state.requests_used_snapshot = int(source.get("requests_used") or 0)
        state.requests_limit_snapshot = int(source.get("requests_limit") or 0)


def log_call(sync_type, endpoint, page, role, user_id, status, http_status=None, request_count=0, response_time_ms=None, error_message=None, usage_snapshot=None):
    usage_snapshot = usage_snapshot or {}
    db.session.add(
        ApiCallLog(
            provider=PROVIDER,
            endpoint=endpoint,
            sync_type=sync_type,
            triggered_by_page=page,
            triggered_by_role=role,
            triggered_by_user_id=str(user_id) if user_id is not None else None,
            status=status,
            http_status=http_status,
            request_count=request_count,
            requests_remaining_snapshot=usage_snapshot.get("requests_remaining"),
            requests_used_snapshot=usage_snapshot.get("requests_used"),
            requests_limit_snapshot=usage_snapshot.get("requests_limit"),
            response_time_ms=response_time_ms,
            error_message=str(error_message)[:1000] if error_message else None,
        )
    )
