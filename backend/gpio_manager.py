#!/usr/bin/env python3
"""
GPIO Manager using libgpiod (Linux character device API).
Manages output lines defined in GPIO_CONFIG.
"""

import atexit
import gpiod
from gpiod.line import Direction, Value

GPIO_CONFIG = {
    "linia17": {
        "chip": "/dev/gpiochip0",
        "line": 17,
        "direction": "out",
        "active_low": False,
        "default": 0,
    },
    "linia27": {
        "chip": "/dev/gpiochip0",
        "line": 27,
        "direction": "out",
        "active_low": False,
        "default": 0,
    },
    "linia22": {
        "chip": "/dev/gpiochip0",
        "line": 22,
        "direction": "out",
        "active_low": False,
        "default": 0,
    },
}

# Runtime state: target_name -> { "request": LineRequest, "state": 0|1, "config": dict }
_lines: dict[str, dict] = {}


def _val(state: int) -> Value:
    return Value.ACTIVE if state else Value.INACTIVE


def init_gpio():
    """Initialize all configured GPIO lines. Safe to call multiple times."""
    for name, cfg in GPIO_CONFIG.items():
        if name in _lines:
            continue
        try:
            request = gpiod.request_lines(
                cfg["chip"],
                consumer="can-fd-workstation",
                config={cfg["line"]: gpiod.LineSettings(direction=Direction.OUTPUT)},
            )
            default_val = cfg.get("default", 0)
            request.set_value(cfg["line"], _val(default_val))
            _lines[name] = {"request": request, "state": default_val, "config": cfg}
            print(f"[GPIO] {name} initialized (chip={cfg['chip']}, line={cfg['line']}, default={default_val})")
        except Exception as e:
            print(f"[GPIO][WARN] Failed to init {name}: {e}")


def cleanup_gpio():
    """Release all GPIO lines."""
    for name, entry in list(_lines.items()):
        try:
            entry["request"].release()
            print(f"[GPIO] Released {name}")
        except Exception as e:
            print(f"[GPIO][WARN] Failed to release {name}: {e}")
    _lines.clear()


atexit.register(cleanup_gpio)


def list_targets() -> list[dict]:
    """Return list of available GPIO targets with current state."""
    result = []
    for name, cfg in GPIO_CONFIG.items():
        entry = _lines.get(name)
        result.append({
            "name": name,
            "chip": cfg["chip"],
            "line": cfg["line"],
            "available": entry is not None,
            "state": entry["state"] if entry else None,
        })
    return result


def get_state(target: str) -> dict:
    """Get current state of a GPIO target."""
    if target not in GPIO_CONFIG:
        raise ValueError(f"Unknown GPIO target: {target}")
    entry = _lines.get(target)
    if entry is None:
        raise RuntimeError(f"GPIO target '{target}' not available (init failed)")
    return {"target": target, "state": entry["state"]}


def set_state(target: str, state: int) -> dict:
    """Set GPIO output state (0 or 1)."""
    if target not in GPIO_CONFIG:
        raise ValueError(f"Unknown GPIO target: {target}")
    entry = _lines.get(target)
    if entry is None:
        raise RuntimeError(f"GPIO target '{target}' not available (init failed)")

    state = 1 if state else 0
    cfg = entry["config"]

    if cfg.get("active_low", False):
        hw_val = _val(1 - state)
    else:
        hw_val = _val(state)

    entry["request"].set_value(cfg["line"], hw_val)
    entry["state"] = state
    print(f"[GPIO] {target} -> {state}")
    return {"target": target, "state": state}
