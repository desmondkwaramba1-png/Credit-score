FROM python:3.9

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user api/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy backend code to the current directory (/app)
COPY --chown=user api/*.py .
COPY --chown=user api/.env .
COPY --chown=user api/models/ ./models/

# Hugging Face Spaces uses port 7860 by default
ENV PORT=7860
EXPOSE 7860

CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "7860"]
