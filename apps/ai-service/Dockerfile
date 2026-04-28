FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install CPU-only PyTorch first so ultralytics doesn't pull CUDA wheels (~2 GB).
# Versions are pinned so Docker can cache this layer and pip hash checks are stable.
RUN pip install --no-cache-dir --timeout 300 --retries 3 \
    "torch==2.11.0+cpu" "torchvision==0.26.0+cpu" \
    --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --timeout 300 --retries 3 -r requirements.txt

COPY . .

RUN mkdir -p weights generated

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
