FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    libffi-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user api/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code to the current directory (/app)
COPY --chown=user api/*.py .
COPY --chown=user api/models/ ./models/

ENV PORT=10000
EXPOSE 10000

CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "10000"]
