FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git libsndfile1 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Local Kokoro-82M voice model (~330 MB), baked into the image so renders run offline on the CPU.
RUN mkdir -p /models && \
    curl -fsSL -o /models/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx && \
    curl -fsSL -o /models/voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
COPY pyproject.toml .
COPY src ./src
RUN pip install --no-cache-dir ".[kokoro]"
ENV TTS_PROVIDER=kokoro \
    KOKORO_MODEL=/models/kokoro-v1.0.onnx \
    KOKORO_VOICES=/models/voices-v1.0.bin \
    OMP_NUM_THREADS=2
EXPOSE 8000
CMD ["python", "-m", "src.server", "--transport", "sse", "--host", "0.0.0.0", "--port", "8000"]
