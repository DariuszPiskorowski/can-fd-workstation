#!/usr/bin/env python3
"""
CAN FD WebSocket Bridge for Raspberry Pi
Requires: pip install flask flask-socketio python-can

Usage:
  python3 can_bridge.py

Listens on can0 and can1, forwards all RX frames to the UI via WebSocket.
Accepts send_frame, start_cyclic, stop_cyclic events from the UI.
"""

import atexit
import signal
import sys
import time
import threading
import can
from flask import Flask
from flask_socketio import SocketIO
from typing import Optional
from gpio_manager import init_gpio, cleanup_gpio, list_targets, get_state, set_state

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Active CAN buses
buses: dict[str, Optional[object]] = {"can0": None, "can1": None}

# messageId -> {"event": threading.Event, "thread": threading.Thread, "interface": str}
cyclic_tasks: dict[str, dict] = {}

shutdown_event = threading.Event()


def init_bus(interface: str):
    """Try to open a CAN interface. Returns None if not available."""
    try:
        bus = can.Bus(channel=interface, interface="socketcan", fd=True, receive_own_messages=False)
        print(f"[OK] {interface} opened (receive_own_messages=False)")
        return bus
    except Exception as e:
        print(f"[WARN] {interface} not available: {e}")
        return None


def get_status() -> dict:
    return {
        "can0": buses["can0"] is not None,
        "can1": buses["can1"] is not None,
    }


def parse_bool(value, default=False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


def parse_frame_payload(data: dict):
    """
    Parse and validate frame input from UI.

    Expected example:
    {
        "canId": "18FF50E5",
        "data": ["01", "02", "AA"],
        "interface": "can0",
        "isExtendedId": true
    }
    """
    iface = data.get("interface", "can0")
    if iface not in buses:
        raise ValueError(f"Unsupported interface: {iface}")

    bus = buses.get(iface)
    if bus is None:
        raise RuntimeError(f"{iface} not available")

    can_id_raw = data.get("canId")
    if can_id_raw is None:
        raise ValueError("Missing canId")

    can_id = int(str(can_id_raw), 16)

    data_list = data.get("data", [])
    if not isinstance(data_list, list):
        raise ValueError("data must be a list of hex byte strings")

    raw_data = bytes(int(str(b), 16) for b in data_list)

    if len(raw_data) > 64:
        raise ValueError("CAN FD payload cannot exceed 64 bytes")

    is_fd = parse_bool(data.get("isFd"), default=(len(raw_data) > 8))
    bitrate_switch = parse_bool(data.get("bitrateSwitch"), default=is_fd)
    is_extended_id = parse_bool(data.get("isExtendedId"), default=True)

    # Optional safety checks
    if not is_extended_id and can_id > 0x7FF:
        raise ValueError("Standard CAN ID cannot be greater than 0x7FF")

    if is_extended_id and can_id > 0x1FFFFFFF:
        raise ValueError("Extended CAN ID cannot be greater than 0x1FFFFFFF")

    if not is_fd and len(raw_data) > 8:
        raise ValueError("Classic CAN payload cannot exceed 8 bytes")

    return iface, bus, can_id, raw_data, is_extended_id, is_fd, bitrate_switch


def emit_error(message: str):
    socketio.emit("error", {"message": message})


def rx_listener(interface: str):
    """Background thread: read frames from a CAN bus and emit to WebSocket."""
    bus = buses.get(interface)
    if bus is None:
        return

    print(f"[RX] Listening on {interface}")

    while not shutdown_event.is_set():
        try:
            msg = bus.recv(timeout=1.0)
            if msg is None:
                continue

            # Ignore locally generated echo frames. Some SocketCAN/python-can setups
            # may still surface transmitted frames on the receive socket even when
            # receive_own_messages is disabled.
            if not bool(getattr(msg, "is_rx", True)):
                continue

            data_hex = [f"{b:02X}" for b in msg.data]

            socketio.emit("rx_frame", {
                "canId": f"{msg.arbitration_id:X}",
                "dlc": len(msg.data),
                "data": data_hex,
                "interface": interface,
                "timestamp": int(time.time() * 1000),
                "isFd": bool(getattr(msg, "is_fd", False)),
                "bitrateSwitch": bool(getattr(msg, "bitrate_switch", False)),
                "isExtendedId": bool(getattr(msg, "is_extended_id", False)),
            })

        except Exception as e:
            print(f"[ERR] {interface} rx: {e}")
            time.sleep(1)

    print(f"[RX] Listener stopped on {interface}")


@socketio.on("connect")
def handle_connect():
    print("[WS] Client connected")
    socketio.emit("status", get_status())


@socketio.on("disconnect")
def handle_disconnect():
    print("[WS] Client disconnected")


@socketio.on("send_frame")
def handle_send(data):
    """Send a single CAN/CAN FD frame."""
    try:
        iface, bus, can_id, raw_data, is_extended_id, is_fd, bitrate_switch = parse_frame_payload(data)

        msg = can.Message(
            arbitration_id=can_id,
            data=raw_data,
            is_extended_id=is_extended_id,
            is_fd=is_fd,
            bitrate_switch=bitrate_switch,
        )

        bus.send(msg)

    except Exception as e:
        emit_error(f"TX failed: {e}")


@socketio.on("start_cyclic")
def handle_start_cyclic(data):
    """
    Start cyclic sending.

    Expected example:
    {
        "messageId": "msg-1",
        "canId": "18FF50E5",
        "data": ["01", "02", "03"],
        "interface": "can0",
        "periodMs": 100,
        "isExtendedId": true,
        "isFd": false,
        "bitrateSwitch": false
    }
    """
    try:
        msg_id = data.get("messageId")
        if not msg_id:
            raise ValueError("Missing messageId")

        if msg_id in cyclic_tasks:
            print(f"[CYCLIC] Already running: {msg_id}")
            return

        iface, bus, can_id, raw_data, is_extended_id, is_fd, bitrate_switch = parse_frame_payload(data)

        period_ms = data.get("periodMs", 100)
        period = float(period_ms) / 1000.0
        if period <= 0:
            raise ValueError("periodMs must be > 0")

        stop_event = threading.Event()

        def cyclic_loop():
            msg = can.Message(
                arbitration_id=can_id,
                data=raw_data,
                is_extended_id=is_extended_id,
                is_fd=is_fd,
                bitrate_switch=bitrate_switch,
            )

            while not stop_event.is_set() and not shutdown_event.is_set():
                try:
                    bus.send(msg)
                except Exception as e:
                    print(f"[ERR] Cyclic TX {msg_id}: {e}")
                    emit_error(f"Cyclic TX failed for {msg_id}: {e}")
                    break

                stop_event.wait(period)

            print(f"[CYCLIC] Stopped {msg_id}")
            cyclic_tasks.pop(msg_id, None)

        t = threading.Thread(target=cyclic_loop, daemon=True)
        cyclic_tasks[msg_id] = {
            "event": stop_event,
            "thread": t,
            "interface": iface,
        }
        t.start()

        print(f"[CYCLIC] Started {msg_id} every {period_ms}ms on {iface}")

    except Exception as e:
        emit_error(f"start_cyclic failed: {e}")


@socketio.on("stop_cyclic")
def handle_stop_cyclic(data):
    msg_id = data.get("messageId")
    if not msg_id:
        emit_error("stop_cyclic failed: Missing messageId")
        return

    task = cyclic_tasks.get(msg_id)
    if task:
        task["event"].set()
    else:
        print(f"[CYCLIC] No active task for {msg_id}")


# ---- GPIO Socket Events ----

@socketio.on("gpio_list_targets")
def handle_gpio_list():
    try:
        targets = list_targets()
        socketio.emit("gpio_targets", {"targets": targets})
    except Exception as e:
        emit_error(f"gpio_list_targets failed: {e}")


@socketio.on("gpio_get")
def handle_gpio_get(data):
    try:
        target = data.get("target")
        if not target:
            raise ValueError("Missing target")
        result = get_state(target)
        socketio.emit("gpio_state", result)
    except Exception as e:
        emit_error(f"gpio_get failed: {e}")


@socketio.on("gpio_set")
def handle_gpio_set(data):
    try:
        target = data.get("target")
        state = data.get("state")
        if not target:
            raise ValueError("Missing target")
        if state is None:
            raise ValueError("Missing state")
        result = set_state(target, int(state))
        socketio.emit("gpio_state", result)
    except Exception as e:
        emit_error(f"gpio_set failed: {e}")


def cleanup():
    print("[SHUTDOWN] Cleaning up...")

    shutdown_event.set()
    cleanup_gpio()

    for msg_id, task in list(cyclic_tasks.items()):
        try:
            task["event"].set()
        except Exception:
            pass
    cyclic_tasks.clear()

    for iface, bus in buses.items():
        if bus is not None:
            try:
                bus.shutdown()
                print(f"[SHUTDOWN] Closed {iface}")
            except Exception as e:
                print(f"[WARN] Failed to close {iface}: {e}")


def handle_signal(signum, frame):
    print(f"[SIGNAL] Received {signum}, shutting down...")
    cleanup()
    sys.exit(0)


atexit.register(cleanup)
signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)


if __name__ == "__main__":
    # Initialize CAN buses
    for iface in ["can0", "can1"]:
        buses[iface] = init_bus(iface)

    # Initialize GPIO
    init_gpio()

    # Start RX listener threads
    for iface in ["can0", "can1"]:
        if buses[iface] is not None:
            t = threading.Thread(target=rx_listener, args=(iface,), daemon=True)
            t.start()

    print("[SERVER] Starting on :5000")
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)
