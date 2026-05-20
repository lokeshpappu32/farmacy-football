from functools import wraps

from flask_jwt_extended import get_jwt, jwt_required


def participant_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "participant":
            return {"message": "Participant access required."}, 403
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "admin":
            return {"message": "Admin access required."}, 403
        return fn(*args, **kwargs)

    return wrapper
