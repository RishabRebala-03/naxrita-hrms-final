from typing import Any, Dict, List, Tuple


def require_fields(payload: Dict[str, Any], fields: List[str]) -> Tuple[bool, str]:
    missing = [f for f in fields if payload.get(f) in (None, "")]
    if missing:
        return False, f"Missing fields: {', '.join(missing)}"
    return True, ""
