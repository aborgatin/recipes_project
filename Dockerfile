FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:/root/.local/bin:$PATH"

WORKDIR /app

# Install Node for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Frontend build
COPY frontend/package.json frontend/
RUN cd frontend && npm install
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Backend install
COPY backend/pyproject.toml backend/
RUN cd backend && uv pip install --system -r pyproject.toml 2>/dev/null || uv pip install --system .
COPY backend/ backend/

# nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# persistent storage mount point
VOLUME ["/data"]

EXPOSE 7860

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
