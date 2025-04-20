# Multi-stage build for smaller final image
FROM python:3.9-slim as builder

WORKDIR /app

# Install system dependencies (ffmpeg for audio conversion)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Final image stage
FROM python:3.9-slim

WORKDIR /app

# Install runtime system dependencies again
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder stage
COPY --from=builder /root/.local /root/.local

# Make sure the installed binaries are accessible
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Set environment variables
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

# Expose the port used in app.py
EXPOSE 10000

# Health check for Render (optional but helpful)
HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:$PORT/ || exit 1

# Command to run app using gunicorn with dynamic PORT
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app"]
