FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git libsndfile1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml .
COPY src ./src
RUN pip install --no-cache-dir .
ENV TTS_PROVIDER=edge
EXPOSE 8000
CMD ["python", "-m", "src.server", "--transport", "sse", "--port", "8000"]
