FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git libsndfile1 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml .
COPY src ./src
RUN pip install --no-cache-dir .
# Microsoft neural voices (Andrew & Ava Multilingual): free, no key, natural prosody.
ENV TTS_PROVIDER=edge
EXPOSE 8000
CMD ["python", "-m", "src.server", "--transport", "sse", "--host", "0.0.0.0", "--port", "8000"]
