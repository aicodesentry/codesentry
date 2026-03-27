FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Semgrep
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose default local port
EXPOSE 8001

# Cloud Run injects PORT; use src as app dir for reliable module import.
CMD ["sh", "-c", "uvicorn main:app --app-dir src --host 0.0.0.0 --port ${PORT:-8001}"]
