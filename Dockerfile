# ---- Stage 1: Build React frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: Runtime ----
FROM python:3.11-slim
WORKDIR /app

# Install nginx
RUN apt-get update && apt-get install -y --no-install-recommends nginx && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir flask flask-socketio python-can

# Copy backend
COPY backend/ /app/backend/

# Copy built frontend
COPY --from=frontend-build /app/dist /var/www/html

# Nginx config: serve frontend + proxy /socket.io to backend
RUN cat > /etc/nginx/sites-available/default <<'EOF'
server {
    listen 80;
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
        proxy_read_timeout 86400;
    }
}
EOF

# Startup script
RUN cat > /app/start.sh <<'EOF'
#!/bin/sh
cd /app/backend && python3 can_bridge.py &
nginx -g "daemon off;"
EOF
RUN chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]
