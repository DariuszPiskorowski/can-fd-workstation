# CAN FD Bridge - Backend

Python WebSocket bridge between SocketCAN and the React UI.

## Requirements

```bash
pip install flask flask-socketio python-can
```

## Setup CAN interfaces on Raspberry Pi

```bash
sudo ip link set can0 up type can bitrate 500000 dbitrate 2000000 fd on
sudo ip link set can1 up type can bitrate 500000 dbitrate 2000000 fd on
```

## Run standalone

```bash
python3 can_bridge.py
```

## Run as Docker container

```bash
docker build -t can-fd-workstation .
docker run --privileged --network=host can-fd-workstation
```

The bridge listens on `ws://0.0.0.0:5000` and:
- Forwards all RX frames from can0/can1 to UI via `rx_frame` event (includes `isFd`, `bitrateSwitch`, `isExtendedId`)
- Accepts `send_frame` for one-shot TX (supports `isExtendedId`, `isFd`, `bitrateSwitch`)
- Accepts `start_cyclic` / `stop_cyclic` for cyclic sending
- Emits `status` with interface availability on connect
- Graceful shutdown with cleanup of CAN buses and cyclic tasks
