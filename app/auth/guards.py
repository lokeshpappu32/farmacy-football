from functools import wraps

from flask_jwt_extended import get_jwt, jwt_required


def participant_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") not in {"participant", "hetero_rep"}:
            return {"message": "Participant access required."}, 403
        return fn(*args, **kwargs)

    return wrapper


def hetero_rep_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "hetero_rep":
            return {"message": "HETERO Representative / Staff access required."}, 403
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") not in {"admin", "super_admin"}:
            return {"message": "Admin access required."}, 403
        return fn(*args, **kwargs)

    return wrapper


def super_admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "super_admin":
            return {"message": "Super admin access required."}, 403
        return fn(*args, **kwargs)

    return wrapper


def admin_or_super_admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") not in {"admin", "super_admin"}:
            return {"message": "Admin access required."}, 403
        return fn(*args, **kwargs)

    return wrapper


def mr_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "mr":
            return {"message": "MR access required."}, 403
        return fn(*args, **kwargs)

    return wrapper
