FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

RUN chmod +x /app/docker-entrypoint.sh

# Expose port for gRPC
EXPOSE 8002

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["python", "src/main.py"]
