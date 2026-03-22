FROM python:3.11

# Install required system dependencies for compilation
RUN apt-get update && apt-get install -y build-essential curl libssl-dev libffi-dev pkg-config && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.cargo/bin:/home/user/.local/bin:$PATH"

# Install modern Rust compiler
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

WORKDIR /app

COPY --chown=user api/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy backend code to the current directory (/app)
COPY --chown=user api/*.py .
COPY --chown=user api/models/ ./models/

# Hugging Face Spaces uses port 7860 by default
ENV PORT=7860
EXPOSE 7860

CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "7860"]
