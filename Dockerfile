# ---- Stage 1: Build React frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: Runtime ----
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system packages (including libgpiod)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    libgpiod2 \
    libgpiod-dev \
    python3-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    flask \
    flask-socketio \
    python-can \
    gpiod

# Remove build-only packages
RUN apt-get update && apt-get remove -y python3-dev gcc && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY backend/ /app/backend/

# Copy built frontend
COPY --from=frontend-build /app/dist /var/www/html

# Nginx config: serve frontend + proxy /socket.io to backend
RUN cat > /etc/nginx/sites-available/default <<'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
EOF

# Startup script
RUN cat > /app/start.sh <<'EOF'
#!/bin/sh
set -e
cd /app/backend
python3 can_bridge.py &
exec nginx -g "daemon off;"
EOF
RUN chmod +x /app/start.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1/ || exit 1

CMD ["/app/start.sh"]
