# CAN FD Workstation

CAN FD Workstation is a browser-based diagnostic and test application that connects a React interface to real CAN hardware through a Python backend.

Developed for an internal engineering workflow and used in workplace diagnostics, it brings command transmission, live traffic inspection, response decoding, frame recording and GPIO control into one workstation. The application is packaged in Docker, with a GitHub Actions pipeline for building and publishing the Linux ARM64 image.

## User interface

The workspace combines a command library on the left, a live frame terminal in the centre, and response parsing and recording controls on the right. Pinned values are displayed above the main panels.

<!-- Insert one redacted screenshot of the workstation UI here using GitHub's image upload. -->
*UI screenshot to be added.*

## Main capabilities

### CAN and CAN FD communication

- Work with two Linux SocketCAN interfaces: `can0` and `can1`.
- Receive frames and display their timestamp, direction, CAN identifier, frame type, payload length and data bytes.
- Configure Classic CAN or CAN FD transmission, standard or extended identifiers, and CAN FD bitrate switching.
- Send individual frames or start and stop cyclic transmission with a configurable interval.
- Monitor backend connection state, interface availability and TX/RX counters.

The Python bridge validates transmission inputs, including interface availability, identifier ranges and payload limits. It also suppresses locally transmitted frame echoes before forwarding received traffic to the UI.

### Reusable command library and sequences

Users can create, edit, duplicate and organise predefined commands, including their identifiers, payloads, target interfaces, transmission settings, descriptions and notes.

Commands can contain multiple transmission steps with a configurable delay. Conditional sequences can send a request repeatedly and wait for a response before proceeding to the next enabled step.

Conditional steps support:

- An expected response CAN identifier
- Matching against the first eight response bytes
- `XX` wildcard bytes
- Configurable repeat intervals, transmission limits and response timeouts
- Progress, success and failure states
- An optional final message after successful completion

Command definitions can be exported and imported as JSON, allowing a prepared command library to be transferred between browser profiles or workstations.

### Response parsing and live values

Configurable parser rules turn selected response bytes into readable values. Rules specify the response identifier, optional interface filter, starting byte, byte length, byte order, interpretation, scale, offset and unit.

The application supports numeric and ASCII decoding, optional byte-pattern conditions with `XX` wildcards, and additional conditional fields within a rule. Parsed values can be pinned to the live-values area for quick observation during testing.

Parser definitions can be exported and imported as JSON.

### Live terminal and recording

The live terminal provides TX/RX filtering, CAN identifier filtering, payload-text searching, automatic scrolling and non-zero-byte highlighting.

The frame recorder captures TX and RX events handled by the current browser session. Recording can be started manually or armed with a start trigger. An optional stop trigger ends the capture and downloads the log.

Triggers match a CAN identifier and a configurable prefix of up to eight data bytes, with wildcard support.

Logs can be downloaded as:

- Plain-text `.txt` files
- Semicolon-separated `.csv` files containing timestamp, direction, CAN identifier, interface, frame type, payload length and data

Recording is performed in the browser session rather than by an independent background logging service. Pausing incoming-frame processing also pauses RX delivery to the recorder and response-processing logic in that client.

### GPIO control

Configurable UI switches control output lines exposed by the Python backend through `libgpiod`. The interface can discover available GPIO targets, read their state and request output changes.

Hardware target definitions are maintained in `backend/gpio_manager.py`, keeping GPIO chip and line configuration separate from the browser interface.

## Architecture

| Component | Role |
| --- | --- |
| React and TypeScript frontend | Command editing, traffic display, response parsing, sequences, recording and GPIO controls |
| Socket.IO connection | Exchanges live frames, commands, status updates and GPIO messages |
| Python Flask and Flask-SocketIO backend | Bridges browser commands and responses to the hardware interfaces |
| `python-can` and Linux SocketCAN | Provide access to the CAN buses |
| `gpiod` | Provides access to configured Linux GPIO output lines |
| Nginx | Serves the built frontend and proxies Socket.IO traffic to the backend |
| Docker | Packages the frontend, backend and runtime dependencies together |

In the container deployment, Nginx serves the application on port **80** and forwards `/socket.io/` traffic to the backend on port **5000**. The frontend uses the page origin as its default backend address.

CAN reception and cyclic transmission are handled by backend threads. The browser manages command definitions, conditional sequences, parser rules, live values and recording.

## Docker deployment model

The intended host is a Linux system with compatible CAN hardware, configured SocketCAN interfaces and access to the required GPIO devices, such as the Raspberry Pi platform used by the backend.

The multi-stage Dockerfile:

1. Builds the frontend using Node.js and Vite.
2. Creates a Python runtime image with the backend, CAN and GPIO dependencies.
3. Includes Nginx and the compiled frontend.
4. Starts the Python bridge and Nginx together.

Operators access the workstation through a web browser; they do not need to install the frontend development toolchain on their own computer.

Docker packages the application, but the host must still provide the correct hardware drivers, CAN interface configuration and device access. CAN bitrates and GPIO mappings must match the connected equipment.

The container includes an HTTP health check for the frontend endpoint. Hardware interface availability is reported separately by the application.

## GitHub Actions build and publishing

The manually triggered workflow **Build and Push can-fd-workstation** automates container-image delivery from the `main` branch.

It:

1. Checks out the repository.
2. Configures QEMU and Docker Buildx.
3. Authenticates to Docker Hub using repository secrets.
4. Builds the Docker image for **Linux ARM64**.
5. Publishes a timestamped image tag and the `latest` tag.

Required repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Image tags follow this pattern:

- `<dockerhub-user>/can-fd-workstation:YYYY-MM-DD-HH-MM`
- `<dockerhub-user>/can-fd-workstation:latest`

The workflow builds and publishes the image. Deployment to the hardware host is a separate step.

## Configuration and persistence

Command libraries, parser rules, parsed values, recorder settings and GPIO switch definitions are stored in the browser's local storage. They belong to that browser profile and origin rather than a shared server database.

Use the JSON export and import functions to transfer command libraries and parser rules. Captured traffic must be downloaded through the recorder when a persistent log is needed.

Device-specific command payloads, decoding rules and GPIO mappings are configured for the intended test setup.

## Technology

**Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui and Socket.IO client.

**Backend and hardware:** Python, Flask, Flask-SocketIO, python-can, Linux SocketCAN and libgpiod.

**Packaging and delivery:** Docker multi-stage build, Nginx, GitHub Actions, Docker Buildx, QEMU and Docker Hub.
