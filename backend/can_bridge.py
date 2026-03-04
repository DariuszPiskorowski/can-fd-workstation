#!/usr/bin/env python3
"""
CAN FD WebSocket Bridge for Raspberry Pi
Requires: pip install flask flask-socketio python-can

Usage:
  sudo python3 can_bridge.py

Listens on can0 and can1, forwards all RX frames to the UI via WebSocket.
Accepts send_frame, start_cyclic, stop_cyclic events from the UI.
"""

import time
import threading
import struct
import can
from flask import Flask
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Active CAN buses
buses: dict[str, can.Bus | None] = {"can0": None, "can1": None}
cyclic_tasks: dict[str, threading.Event] = {}


def init_bus(interface: str) -> can.Bus | None:
    """Try to open a CAN interface. Returns None if not available."""
    try:
        bus = can.Bus(channel=interface, interface="socketcan", fd=True)
        print(f"[OK] {interface} opened")
        return bus
    except Exception as e:
        print(f"[WARN] {interface} not available: {e}")
        return None


def get_status() -> dict:
    return {
        "can0": buses["can0"] is not None,
        "can1": buses["can1"] is not None,
    }


def rx_listener(interface: str):
    """Background thread: read frames from a CAN bus and emit to WebSocket."""
    bus = buses[interface]
    if bus is None:
        return
    print(f"[RX] Listening on {interface}")
    while True:
        try:
            msg = bus.recv(timeout=1.0)
            if msg is None:
                continue
            data_hex = [f"{b:02X}" for b in msg.data]
            socketio.emit("rx_frame", {
                "canId": f"{msg.arbitration_id:08X}",
                "dlc": len(msg.data),
                "data": data_hex,
                "interface": interface,
                "timestamp": int(time.time() * 1000),
            })
        except Exception as e:
            print(f"[ERR] {interface} rx: {e}")
            time.sleep(1)


@socketio.on("connect")
def handle_connect():
    print("[WS] Client connected")
    socketio.emit("status", get_status())


@socketio.on("disconnect")
def handle_disconnect():
    print("[WS] Client disconnected")


@socketio.on("send_frame")
def handle_send(data):
    """Send a single CAN frame.
    data: { canId: str, dlc: int, data: str[], interface: 'can0'|'can1' }
    """
    iface = data.get("interface", "can0")
    bus = buses.get(iface)
    if bus is None:
        socketio.emit("error", {"message": f"{iface} not available"})
        return

    can_id = int(data["canId"], 16)
    raw_data = bytes(int(b, 16) for b in data["data"])
    is_fd = len(raw_data) > 8

    msg = can.Message(
        arbitration_id=can_id,
        data=raw_data,
        is_extended_id=True,
        is_fd=is_fd,
    )
    try:
        bus.send(msg)
    except Exception as e:
        socketio.emit("error", {"message": f"TX failed: {e}"})


@socketio.on("start_cyclic")
def handle_start_cyclic(data):
    """Start cyclic sending.
    data: { messageId, canId, dlc, data, interface, periodMs }
    """
    msg_id = data["messageId"]
    if msg_id in cyclic_tasks:
        return  # already running

    stop_event = threading.Event()
    cyclic_tasks[msg_id] = stop_event

    iface = data.get("interface", "can0")
    bus = buses.get(iface)
    if bus is None:
        socketio.emit("error", {"message": f"{iface} not available"})
        return

    can_id = int(data["canId"], 16)
    raw_data = bytes(int(b, 16) for b in data["data"])
    period = data.get("periodMs", 100) / 1000.0
    is_fd = len(raw_data) > 8

    def cyclic_loop():
        msg = can.Message(
            arbitration_id=can_id,
            data=raw_data,
            is_extended_id=True,
            is_fd=is_fd,
        )
        while not stop_event.is_set():
            try:
                bus.send(msg)
            except Exception as e:
                print(f"[ERR] Cyclic TX: {e}")
                break
            stop_event.wait(period)
        print(f"[CYCLIC] Stopped {msg_id}")

    t = threading.Thread(target=cyclic_loop, daemon=True)
    t.start()
    print(f"[CYCLIC] Started {msg_id} every {data.get('periodMs')}ms on {iface}")


@socketio.on("stop_cyclic")
def handle_stop_cyclic(data):
    msg_id = data.get("messageId")
    event = cyclic_tasks.pop(msg_id, None)
    if event:
        event.set()


if __name__ == "__main__":
    # Initialize CAN buses
    for iface in ["can0", "can1"]:
        buses[iface] = init_bus(iface)

    # Start RX listener threads
    for iface in ["can0", "can1"]:
        if buses[iface]:
            t = threading.Thread(target=rx_listener, args=(iface,), daemon=True)
            t.start()

    print("[SERVER] Starting on :5000")
    socketio.run(app, host="0.0.0.0", port=5000)
